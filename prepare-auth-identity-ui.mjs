import fs from "fs";

const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

const marker = "// ASTRO_AUTH_UI_IDENTITY_V3";

if (!app.includes('import { useAuth } from "./auth";')) {
  const importAnchor = 'import React, { useState, useEffect } from "react";\n';
  if (!app.includes(importAnchor)) throw new Error("App React import anchor not found");
  app = app.replace(importAnchor, importAnchor + 'import { useAuth } from "./auth";\n');
}

// There must be exactly one component-level authUser declaration.
const authDecl = 'const { user: authUser } = useAuth();';
const occurrences = [...app.matchAll(/const \{ user: authUser \} = useAuth\(\);/g)].map(m => m.index ?? -1).filter(i => i >= 0);
if (occurrences.length === 0) {
  const componentAnchor = 'export default function App() {\n';
  if (!app.includes(componentAnchor)) throw new Error("App component anchor not found");
  app = app.replace(componentAnchor, componentAnchor + `  ${marker}\n  ${authDecl}\n`);
} else if (occurrences.length > 1) {
  // Keep the first declaration (normally the one installed by prepare-identity-fix)
  // and remove subsequent duplicate declarations, including their identity marker.
  let first = true;
  app = app.replace(/\n\s*(?:\/\/\s*ASTRO_AUTH_UI_IDENTITY_V\d+\s*\n\s*)?const \{ user: authUser \} = useAuth\(\);/g, (match) => {
    if (first) {
      first = false;
      return match;
    }
    return "";
  });
}

if (!app.includes(marker)) {
  const firstDecl = app.indexOf(authDecl);
  if (firstDecl >= 0) {
    app = app.slice(0, firstDecl) + `// ${marker}\n  ` + app.slice(firstDecl);
  }
}

// Make the active session derive from Firebase Auth rather than localStorage or users[0].
const activeIdentityMarker = "Firebase Auth is the source of truth for the active session.";
if (!app.includes(activeIdentityMarker)) {
  const oldEffect = `  useEffect(() => {\n    const savedUserId = localStorage.getItem("astro_user_id");\n    if (savedUserId) {\n      setActiveUserId(savedUserId);\n    } else if (users.length > 0) {\n      setActiveUserId(users[0].id);\n    }\n  }, [users]);`;
  const newEffect = `  // Firebase Auth is the source of truth for the active session.\n  useEffect(() => {\n    const uid = String(authUser?.uid || "").trim();\n    const email = String(authUser?.email || "").trim().toLowerCase();\n    const matched = users.find((u) =>\n      (uid && String(u?.authUid || "").trim() === uid) ||\n      (email && String(u?.email || "").trim().toLowerCase() === email)\n    );\n\n    setActiveUserId(matched?.id || "");\n    if (matched?.id) localStorage.setItem("astro_user_id", matched.id);\n    else localStorage.removeItem("astro_user_id");\n  }, [users, authUser?.uid, authUser?.email]);`;
  if (app.includes(oldEffect)) app = app.replace(oldEffect, newEffect);
}

// Resolve the registered profile for the authenticated account.
if (!app.includes("const authenticatedProfile = users.find((u) =>")) {
  const anchor = '  useEffect(() => {\n    if (users.length > 0 && !userToCustomizeShortcuts) {';
  if (!app.includes(anchor)) throw new Error("Profile effect anchor not found");
  const injected = `  const authenticatedProfile = users.find((u) =>\n    (authUser?.uid && String(u?.authUid || "").trim() === authUser.uid) ||\n    (authUser?.email && String(u?.email || "").trim().toLowerCase() === authUser.email.trim().toLowerCase())\n  );\n\n${anchor}`;
  app = app.replace(anchor, injected);
}

// Visible session label: authenticated profile first, Google displayName second.
app = app.replace(
  /Sesión: <strong className="text-\[#2C2723\] font-black">\{users\.find\(u => u\.id === activeUserId\)\?\.name \|\| "Milo"\}<\/strong> 🐾/,
  'Sesión: <strong className="text-[#2C2723] font-black">{authenticatedProfile?.name || authUser?.displayName || "Usuario"}</strong> 🐾'
);

// Add a visible session chip beside the mobile controls exactly once.
if (!app.includes('>Sesión</span>')) {
  const anchor = '        <div className="flex items-center gap-2">\n          {/* Active profiles mini trigger with active user indicator */}';
  if (app.includes(anchor)) {
    const replacement = `        <div className="flex items-center gap-2">\n          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#FAF7F2] border border-[#E7E2D5]">\n            <span className="w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse" />\n            <span className="text-[9px] text-[#8A817C] font-black">Sesión</span>\n            <span className="text-[9px] text-[#2C2723] font-black max-w-[100px] truncate">{authenticatedProfile?.name || authUser?.displayName || "Usuario"}</span>\n          </div>\n\n          {/* Active profiles mini trigger with active user indicator */}`;
    app = app.replace(anchor, replacement);
  }
}

fs.writeFileSync(appPath, app);
console.log("Firebase-authenticated session UI prepared successfully.");
