import fs from "node:fs";

const appPath = "src/App.tsx";
const homePath = "src/components/HomeDashboard.tsx";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, current, next) { if (current !== next) fs.writeFileSync(path, next, "utf8"); }

// Milo is rendered by HomeDashboard. Keep App free of any duplicate mount.
const app = read(appPath);
let nextApp = app;
nextApp = nextApp.replace(/\s*<GatitoAiChat\b[\s\S]*?\/>(?:\r?\n)?/g, "\n");
nextApp = nextApp.replace(/\s*import GatitoAiChat from [^;]+;\r?\n/g, "\n");
write(appPath, app, nextApp);

// Home dashboard gets the only visible entry point: "Hablar con Milo".
const home = read(homePath);
let nextHome = home;
nextHome = nextHome.replace(
  'onClick={() => onChangeTab("mascotas")}',
  'onClick={() => window.dispatchEvent(new CustomEvent("astro-open-milo"))}'
);
nextHome = nextHome.replace('<Dog size={18} />', '<span className="text-lg leading-none">🐱</span>');
nextHome = nextHome.replace('Mascotas / Milo', 'Hablar con Milo');
nextHome = nextHome.replace('Vacunas y comida', 'Tu asistente del hogar 🐾');

// Mount Milo once INSIDE HomeDashboard. The component uses a portal,
// so this mount does not add layout space. Use a stable dashboard marker
// instead of guessing the JSX root closing tag.
if (!nextHome.includes('import GatitoAiChat from "./GatitoAiChat";')) {
  const avatarImport = 'import { Avatar } from "./Avatar";';
  if (!nextHome.includes(avatarImport)) throw new Error("No se encontró el import de Avatar en HomeDashboard.");
  nextHome = nextHome.replace(avatarImport, `${avatarImport}\nimport GatitoAiChat from "./GatitoAiChat";`);
}

if (!nextHome.includes('<GatitoAiChat')) {
  const marker = '      {/* CONTENIDO PRINCIPAL EN 2 COLUMNAS */}';
  if (!nextHome.includes(marker)) throw new Error("No se encontró el marcador estable de HomeDashboard para montar Milo.");
  const miloMount = `      <GatitoAiChat\n        onRefreshData={onRefreshAll}\n        onRequestCreate={onOpenCreateModal}\n        users={users}\n      />\n\n`;
  nextHome = nextHome.replace(marker, miloMount + marker);
}

write(homePath, home, nextHome);

console.log("[AstroHogar Milo] Milo montado dentro de HomeDashboard; acceso desde 'Hablar con Milo' y chat flotante compacto.");
