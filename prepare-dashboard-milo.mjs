import fs from "node:fs";

const appPath = "src/App.tsx";
const homePath = "src/components/HomeDashboard.tsx";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, current, next) { if (current !== next) fs.writeFileSync(path, next, "utf8"); }

// Milo must be a compact floating chat controlled from the dashboard shortcut.
// Never convert it into an inline panel during the build.
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

// Mount Milo once inside HomeDashboard so the shortcut event always has a listener.
// GatitoAiChat renders through a portal, so this does not occupy dashboard space.
if (!nextHome.includes('import GatitoAiChat from "./GatitoAiChat";')) {
  const avatarImport = 'import { Avatar } from "./Avatar";';
  if (nextHome.includes(avatarImport)) {
    nextHome = nextHome.replace(avatarImport, `${avatarImport}\nimport GatitoAiChat from "./GatitoAiChat";`);
  }
}

if (!nextHome.includes('<GatitoAiChat')) {
  const closingRoot = nextHome.lastIndexOf('\n  );\n}');
  if (closingRoot !== -1) {
    const miloMount = `\n      <GatitoAiChat\n        onRefreshData={onRefreshAll}\n        onRequestCreate={onOpenCreateModal}\n        users={users}\n      />\n`;
    nextHome = nextHome.slice(0, closingRoot) + miloMount + nextHome.slice(closingRoot);
  }
}

write(homePath, home, nextHome);

console.log("[AstroHogar Milo] Milo montado en HomeDashboard; se abre desde 'Hablar con Milo' como chat flotante compacto.");
