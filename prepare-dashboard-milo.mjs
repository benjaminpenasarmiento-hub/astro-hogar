import fs from "node:fs";

const appPath = "src/App.tsx";
const homePath = "src/components/HomeDashboard.tsx";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, current, next) { if (current !== next) fs.writeFileSync(path, next, "utf8"); }

// Keep Milo mounted once from App as the controller for the compact floating chat.
// This build step must never transform GatitoAiChat into an inline dashboard panel.
const app = read(appPath);
let nextApp = app;
nextApp = nextApp.replace(/\s*<GatitoAiChat\b[\s\S]*?\/>(?:\r?\n)?/g, "\n");
nextApp = nextApp.replace(/\s*import GatitoAiChat from [^;]+;\r?\n/g, "\n");
write(appPath, app, nextApp);

// Replace the legacy Milo shortcut with the only intentional dashboard entry point.
const home = read(homePath);
let nextHome = home;
nextHome = nextHome.replace(
  'onClick={() => onChangeTab("mascotas")}',
  'onClick={() => window.dispatchEvent(new CustomEvent("astro-open-milo"))}'
);
nextHome = nextHome.replace('<Dog size={18} />', '<span className="text-lg leading-none">🐱</span>');
nextHome = nextHome.replace('Mascotas / Milo', 'Hablar con Milo');
nextHome = nextHome.replace('Vacunas y comida', 'Tu asistente del hogar 🐾');
write(homePath, home, nextHome);

console.log("[AstroHogar Milo] Chat flotante compacto; acceso únicamente desde 'Hablar con Milo' en Atajos Rápidos.");
