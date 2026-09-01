import fs from "fs";

const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

// Firebase Auth is the source of truth for the active identity.
if (!app.includes('import { useAuth } from "./auth";')) {
  app = app.replace(
    'import React, { useState, useEffect } from "react";\n',
    'import React, { useState, useEffect } from "react";\nimport { useAuth } from "./auth";\n'
  );
}

const authDeclaration = '  const { user: authUser } = useAuth();\n';
if (!app.includes('const { user: authUser } = useAuth();')) {
  app = app.replace('export default function App() {\n', 'export default function App() {\n' + authDeclaration);
}

const oldSessionEffect = /  useEffect\(\(\) => \{\n    const savedUserId = localStorage\.getItem\("astro_user_id"\);\n    if \(savedUserId\) \{\n      setActiveUserId\(savedUserId\);\n    \} else if \(users\.length > 0\) \{\n      setActiveUserId\(users\[0\]\.id\);\n    \}\n  \}, \[users\]\);/s;
const cleanSessionEffect = `  // Firebase Auth is the source of truth for the active session.\n  useEffect(() => {\n    const uid = String(authUser?.uid || "").trim();\n    const email = String(authUser?.email || "").trim().toLowerCase();\n    const matched = users.find((u) =>\n      (uid && String(u?.authUid || "").trim() === uid) ||\n      (email && String(u?.email || "").trim().toLowerCase() === email)\n    );\n\n    if (matched) {\n      setActiveUserId(matched.id);\n      localStorage.setItem("astro_user_id", matched.id);\n    } else if (authUser) {\n      localStorage.removeItem("astro_user_id");\n      setActiveUserId("");\n    } else {\n      const saved = localStorage.getItem("astro_user_id");\n      setActiveUserId(saved && users.some((u) => u.id === saved) ? saved : "");\n    }\n  }, [users, authUser?.uid, authUser?.email]);`;
if (oldSessionEffect.test(app)) app = app.replace(oldSessionEffect, cleanSessionEffect);

// Remove any previously injected duplicate authenticatedProfile block before the final declaration.
app = app.replace(/\n  const authenticatedProfile = users\.find\(\(u\) =>[\s\S]*?\);\n\n(?=  useEffect\(\(\) => \{\n    if \(users\.length > 0 && !userToCustomizeShortcuts\))/g, "\n");

const authenticatedProfileBlock = `  const authenticatedProfile = users.find((u) =>\n    (authUser?.uid && String(u?.authUid || "").trim() === authUser.uid) ||\n    (authUser?.email && String(u?.email || "").trim().toLowerCase() === authUser.email.trim().toLowerCase())\n  );\n\n`;
const profileAnchor = '  useEffect(() => {\n    if (users.length > 0 && !userToCustomizeShortcuts) {';
if (!app.includes('const authenticatedProfile = users.find((u) =>')) {
  app = app.replace(profileAnchor, authenticatedProfileBlock + profileAnchor);
}

// Replace the entire mobile top header so no old name/avatar/session controls can survive.
const headerStart = app.indexOf('      {/* MOBILE TOP HEADER */}');
const headerEnd = app.indexOf('      {/* Sidebar navigation */}', headerStart);
if (headerStart >= 0 && headerEnd > headerStart) {
  const cleanHeader = `      {/* MOBILE TOP HEADER */}\n      <header className="md:hidden flex items-center justify-between gap-3 px-4 py-3.5 bg-white/95 backdrop-blur-md border-b border-[#E7E2D5] shrink-0 select-none shadow-sm">\n        <div className="flex items-center gap-2.5 min-w-0">\n          <div className="w-9 h-9 bg-[#FFE5D9] rounded-xl flex items-center justify-center text-base shadow-inner leading-none shrink-0">\n            🏡\n          </div>\n          <div className="min-w-0">\n            <h1 className="font-bold text-cute text-xs text-[#2C2723] leading-tight truncate">{home?.name}</h1>\n            <p className="text-[10px] text-[#625B57] font-semibold truncate mt-0.5">\n              Sesión: <strong className="text-[#2C2723] font-black">{authUser?.displayName || authenticatedProfile?.name || "Usuario"}</strong>\n            </p>\n          </div>\n        </div>\n\n        <div className="flex items-center gap-2 shrink-0">\n          <SyncStatusIndicator\n            showLabel={true}\n            onForceRefresh={forceFullDataRefresh}\n            className="px-2.5 py-1.5"\n          />\n\n          <button\n            onClick={handleOpenNotificationCenter}\n            className="p-2 bg-[#FAF7F2] hover:bg-amber-100 rounded-xl text-amber-900 border border-[#E7E2D5] transition-all cursor-pointer relative shrink-0"\n            title="Ver notificaciones miau 🔔"\n          >\n            <Bell size={15} className={unreadCount > 0 ? "animate-bounce" : ""} />\n            {unreadCount > 0 && (\n              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-extrabold text-[8px] px-1 rounded-full border border-white flex items-center justify-center min-w-[14px] h-[14px]">\n                {unreadCount}\n              </span>\n            )}\n          </button>\n\n          <button\n            onClick={() => setShowInstallModal(true)}\n            className="p-2 bg-[#FAF7F2] hover:bg-amber-100 rounded-xl text-amber-900 border border-[#E7E2D5] transition-all cursor-pointer shrink-0"\n            title="Instalar App en Celular"\n          >\n            <Download size={15} />\n          </button>\n        </div>\n      </header>\n\n`;
  app = app.slice(0, headerStart) + cleanHeader + app.slice(headerEnd);
}

fs.writeFileSync(appPath, app);

// Make the single status control explicitly describe both app/session and sync state.
const syncPath = "src/components/SyncStatusIndicator.tsx";
let sync = fs.readFileSync(syncPath, "utf8");
sync = sync.replace('labelText = "Sincronizado";', 'labelText = "Activo · Sincronizado";');
sync = sync.replace('labelText = pendingWrites > 0 ? `Offline · ${pendingWrites}` : "Sin conexión";', 'labelText = pendingWrites > 0 ? `Offline · ${pendingWrites}` : "Sin conexión";');
sync = sync.replace('labelText = "Cuota";', 'labelText = "Activo · Cuota";');
sync = sync.replace('labelText = pendingWrites > 0 ? `Guardando · ${pendingWrites}` : "Guardando...";', 'labelText = pendingWrites > 0 ? `Activo · Guardando · ${pendingWrites}` : "Activo · Guardando...";');
sync = sync.replace('labelText = "Error de sync";', 'labelText = "Activo · Error de sync";');
fs.writeFileSync(syncPath, sync);

console.log("Mobile header cleaned and sync status unified.");
