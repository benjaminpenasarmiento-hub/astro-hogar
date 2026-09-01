import fs from "node:fs";

const appPath = "src/App.tsx";
const homePath = "src/components/HomeDashboard.tsx";

const app = fs.readFileSync(appPath, "utf8");
const home = fs.readFileSync(homePath, "utf8");

function writeIfChanged(path, current, next) {
  if (current !== next) fs.writeFileSync(path, next, "utf8");
}

// Remove the global floating Milo instance from App.tsx. HomeDashboard owns the inline chat.
const floating = /\n\s*\/\* Persistent floating triggers \*\/\n\s*<GatitoAiChat\s+onRefreshData=\{refreshAllData\}\s+onRequestCreate=\{handleRaiseCustomModal\}\s+users=\{users\}\s*\/>(?:\n|\r\n)/;
let nextApp = app.replace(floating, "\n");
if (nextApp === app && app.includes("<GatitoAiChat")) {
  throw new Error("No se pudo retirar el Milo flotante de App.tsx; se cancela el parche.");
}

// Add the import once.
let nextHome = home;
if (!nextHome.includes('import GatitoAiChat from "./GatitoAiChat";')) {
  const importAnchor = 'import { Avatar } from "./Avatar";';
  if (!nextHome.includes(importAnchor)) throw new Error("No se encontró el import anchor de HomeDashboard.");
  nextHome = nextHome.replace(importAnchor, `${importAnchor}\nimport GatitoAiChat from "./GatitoAiChat";`);
}

// Place Milo immediately after the hero/message area and before location/climate.
const marker = "            {/* Ubicación del Nido */}";
const block = `            {/* 🐱 MILO EN EL INICIO: conversación integrada */}\n            <GatitoAiChat\n              embedded\n              onRefreshData={onRefreshAll}\n              onRequestCreate={onOpenCreateModal}\n              users={users}\n            />\n\n`;
if (!nextHome.includes("<GatitoAiChat\n              embedded")) {
  if (!nextHome.includes(marker)) throw new Error("No se encontró el marcador de Ubicación del Nido.");
  nextHome = nextHome.replace(marker, block + marker);
}

writeIfChanged(appPath, app, nextApp);
writeIfChanged(homePath, home, nextHome);

console.log("[AstroHogar] Milo integrado dentro de Inicio y eliminado del overlay flotante.");
