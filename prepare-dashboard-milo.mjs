import fs from "node:fs";

const appPath = "src/App.tsx";
const homePath = "src/components/HomeDashboard.tsx";
const miloPath = "src/components/GatitoAiChat.tsx";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, current, next) { if (current !== next) fs.writeFileSync(path, next, "utf8"); }

// Keep Milo mounted once from App as a controller for the compact floating chat.
// Do not transform GatitoAiChat into an inline dashboard panel here: that would
// overwrite the floating-chat implementation during every Vercel build.
const app = read(appPath);
let nextApp = app;

// Remove any legacy Milo JSX that may still exist in App, but keep the import
// out of the dashboard because the shortcut communicates with Milo by event.
nextApp = nextApp.replace(/\s*<GatitoAiChat\b[\s\S]*?\/>(?:\r?\n)?/g, "\n");
nextApp = nextApp.replace(/\s*import GatitoAiChat from [^;]+;\r?\n/g, "\n");
write(appPath, app, nextApp);

// Home dashboard: change the old "Mascotas / Milo" shortcut into the single
// intentional entry point for Milo. The chat itself is rendered by App.
const home = read(homePath);
let nextHome = home;
const legacyMiloShortcut = /<button\n\s*onClick=\{\(\) => onChangeTab\("mascotas"\)\}\n\s*className="p-3\.5 bg-white rounded-2xl border-2 border-orange-150 hover:border-orange-400 hover:shadow-md transition-all text-left group cursor-pointer flex flex-col justify-between space-y-2"\n\s*>\n\s*<div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">\n\s*<Dog size=\{18\} />\n\s*</div>\n\s*<div>\n\s*<p className="text-xs font-black text\-\[#2C2723\] group-hover:text-orange-800">Mascotas / Milo</p>\n\s*<p className="text-\[10px\] text-gray-500 font-medium leading-tight">Vacunas y comida</p>\n\s*</div>\n\s*</button>/;

if (legacyMiloShortcut.test(nextHome)) {
  nextHome = nextHome.replace(legacyMiloShortcut, `<button\n            onClick={() => window.dispatchEvent(new CustomEvent("astro-open-milo"))}\n            className="p-3.5 bg-white rounded-2xl border-2 border-orange-150 hover:border-orange-400 hover:shadow-md transition-all text-left group cursor-pointer flex flex-col justify-between space-y-2"\n            type="button"\n          >\n            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">\n              <span className="text-lg leading-none">🐱</span>\n            </div>\n            <div>\n              <p className="text-xs font-black text-[#2C2723] group-hover:text-orange-800">Hablar con Milo</p>\n              <p className="text-[10px] text-gray-500 font-medium leading-tight">Tu asistente del hogar 🐾</p>\n            </div>\n          </button>`);
}

write(homePath, home, nextHome);
write(miloPath, read(miloPath), read(miloPath));

console.log("[AstroHogar Milo] Milo queda como chat flotante compacto; el único acceso del dashboard es 'Hablar con Milo'.");
