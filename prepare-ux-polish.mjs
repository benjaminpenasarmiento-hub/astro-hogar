import fs from "node:fs";

const patchText = (path, replacer, message) => {
  let source = fs.readFileSync(path, "utf8");
  const next = replacer(source);
  if (next !== source) {
    fs.writeFileSync(path, next, "utf8");
    console.log(`[AstroHogar UX] ${message}`);
  }
};

// Keep the environment summary intentionally tiny so the greeting and next home action remain visible on phones.
patchText("src/components/HomeEnvironmentStrip.tsx", (source) => {
  return source
    .replace('className="space-y-3"', 'className="space-y-1.5"', 1)
    .replace('className="rounded-3xl border-2 border-[#E7E2D5] bg-white/95 p-4 sm:p-5 shadow-sm"', 'className="rounded-2xl border border-[#E7E2D5] bg-white/95 p-2 sm:p-2.5 shadow-sm"', 1)
    .replace('className="grid grid-cols-1 xl:grid-cols-5 gap-3"', 'className="grid grid-cols-2 lg:grid-cols-5 gap-1.5"', 1)
    .replace('className="xl:col-span-2 rounded-2xl bg-[#FAF7F2] p-4"', 'className="col-span-2 lg:col-span-2 rounded-xl bg-[#FAF7F2] p-2"', 1)
    .replace('className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4"', 'className="rounded-xl border border-blue-100 bg-blue-50/70 p-2"', 1)
    .replace('className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4"', 'className="rounded-xl border border-amber-100 bg-amber-50/70 p-2"', 1)
    .replace('className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4"', 'className="rounded-xl border border-violet-100 bg-violet-50/70 p-2"', 1)
    .replace('className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-left', 'className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2 text-left', 1)
    .replace('className="text-base font-black text-[#2C2723] capitalize mt-1"', 'className="text-xs font-black text-[#2C2723] capitalize mt-0.5 leading-tight"', 1)
    .replace('className="text-2xl font-black text-[#2C2723] mt-1 flex items-center gap-2"', 'className="text-sm font-black text-[#2C2723] mt-0.5 flex items-center gap-1"', 1)
    .replace('className="text-xl font-black text-[#2C2723] mt-1"', 'className="text-sm font-black text-[#2C2723] mt-0.5"', 1)
    .replace('className="text-4xl">🐾</div>', 'className="text-xl">🐾</div>', 1)
    .replace('className="rounded-3xl border-2 border-amber-200 bg-amber-50/90 p-4 shadow-sm"', 'className="rounded-2xl border border-amber-200 bg-amber-50/90 p-2 shadow-sm"', 1);
});

// Remove the learning teaser from the main home screen. Learning information belongs inside Milo's own conversation/menu.
for (const path of ["src/components/HomeDashboard.tsx", "src/components/HomeEnvironmentStrip.tsx", "src/App.tsx"]) {
  patchText(path, (source) => {
    // Handles simple JSX wrappers such as <div>...Milo aprende...</div> or <p>...Milo aprende...</p>.
    return source.replace(/\s*<([A-Za-z][^>]*)>\s*[^<]*Milo aprende[^<]*<\/\1>\s*/gi, "\n");
  }, `removed Milo learning teaser from ${path}`);
}

// Improve notification permission handling: request it immediately from the click, then persist.
patchText("src/components/HomeEnvironmentStrip.tsx", (source) => {
  const old = `  async function requestNotifications() {\n    if (!("Notification" in window)) return;\n    try {\n      const permission = await Notification.requestPermission();`;
  const next = `  async function requestNotifications() {\n    if (!("Notification" in window)) {\n      setNotificationStatus("unsupported");\n      return;\n    }\n    if (Notification.permission === "denied") {\n      setNotificationStatus("denied");\n      return;\n    }\n    try {\n      const permission = await Notification.requestPermission();`;
  return source.replace(old, next, 1);
});

// Add a clearer permission state card for denied notifications.
patchText("src/components/HomeEnvironmentStrip.tsx", (source) => {
  const old = `{notificationStatus !== "granted" && notificationStatus !== "unsupported" && <button type="button" onClick={requestNotifications}`;
  const next = `{notificationStatus === "denied" ? (\n                <div className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-rose-300 px-3 py-2 text-[11px] font-black text-rose-900">\n                  🔕 Notificaciones bloqueadas en el navegador\n                </div>\n              ) : notificationStatus !== "granted" && notificationStatus !== "unsupported" && <button type="button" onClick={requestNotifications}`;
  return source.replace(old, next, 1);
});

// Let the PWA install modal use the native Chromium install prompt when available.
patchText("src/components/MobileInstallModal.tsx", (source) => {
  if (!source.includes('usePwaInstall')) {
    source = source.replace(
      'import React, { useState } from "react";',
      'import React, { useState } from "react";\nimport { usePwaInstall } from "../hooks/usePwaInstall";',
      1
    );
    source = source.replace(
      '  const [copiedLink, setCopiedLink] = useState(false);',
      '  const [copiedLink, setCopiedLink] = useState(false);\n  const { canInstall, isInstalled, isIos, install } = usePwaInstall();\n  const [installMessage, setInstallMessage] = useState("");',
      1
    );
  }

  const marker = `        {/* QR Code and link block */}`;
  const block = `        {/* Native install action when the browser supports it */}\n        {isInstalled ? (\n          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center text-[11px] font-black text-emerald-900">\n            ✅ AstroHogar ya está instalado en este dispositivo.\n          </div>\n        ) : canInstall ? (\n          <button\n            type="button"\n            onClick={async () => {\n              const result = await install();\n              setInstallMessage(result.outcome === "accepted" ? "✅ ¡AstroHogar quedó instalado!" : result.outcome === "dismissed" ? "Puedes instalarlo cuando quieras desde este botón." : "No fue posible abrir el instalador.");\n            }}\n            className="w-full rounded-2xl bg-[#2C2723] hover:bg-black text-white px-4 py-3 text-sm font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"\n          >\n            <Download className="w-5 h-5" />\n            Instalar AstroHogar ahora\n          </button>\n        ) : isIos ? (\n          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold text-amber-950">\n            🍎 En iPhone, Safari no ofrece un botón de instalación web automático. Usa los pasos de “Agregar a pantalla de inicio” de abajo.\n          </div>\n        ) : installMessage ? (\n          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-[11px] font-bold text-indigo-950">{installMessage}</div>\n        ) : null}\n\n${marker}`;
  if (!source.includes('Instalar AstroHogar ahora')) source = source.replace(marker, block, 1);
  return source;
});

// Improve voice feedback once prepare-milo-build has injected the voice controls.
patchText("src/components/GatitoAiChat.tsx", (source) => {
  const marker = `              <div className="flex items-center gap-1.5">`;
  if (source.includes('Escuchando a Milo')) return source;
  const status = `              {voiceMode && voiceSupported && (\n                <div className={\`mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-black \${isListening ? "bg-red-100 text-red-700" : isSpeaking ? "bg-emerald-100 text-emerald-700" : "bg-[#F3EFE6] text-[#625B57]"}\`}>\n                  <span className={\`inline-block w-2 h-2 rounded-full \${isListening ? "bg-red-500 animate-pulse" : isSpeaking ? "bg-emerald-500 animate-pulse" : "bg-[#8A817C]"}\`} />\n                  {isListening ? "Escuchando… habla ahora" : isSpeaking ? "Milo está hablando…" : "Modo voz listo"}\n                </div>\n              )}\n`;
  return source.replace(marker, status + marker, 1);
});

console.log("[AstroHogar UX] Voice, permissions, home density and PWA install polish prepared.");
