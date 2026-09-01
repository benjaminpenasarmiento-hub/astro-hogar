import fs from "node:fs";

const appPath = "src/App.tsx";
const homePath = "src/components/HomeDashboard.tsx";
const miloPath = "src/components/GatitoAiChat.tsx";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, current, next) { if (current !== next) fs.writeFileSync(path, next, "utf8"); }

// Remove any legacy Milo JSX from App. Keep the import removal separate.
const app = read(appPath);
let nextApp = app.replace(/\s*<GatitoAiChat\b[\s\S]*?\/>(?:\r?\n)?/g, "\n");
nextApp = nextApp.replace(/\s*import GatitoAiChat from [^;]+;\r?\n/g, "\n");
write(appPath, app, nextApp);

// Make Milo a normal dashboard section, not a portal/overlay.
let milo = read(miloPath);
milo = milo.replace('import { createPortal } from "react-dom";\n', "");
milo = milo.replace(/\s*const \[open, setOpen\] = useState\(false\);/, "  const [open, setOpen] = useState(true);");
milo = milo.replace(/\s*const chatUi = \(/, "\n  const chatUi = (");
milo = milo.replace(/\s*style=\{\{[\s\S]*?maxHeight: "calc\(100dvh - 32px\)"\s*\}\}/, "");
milo = milo.replace(/className=\"bg-white rounded-\[24px\][^\"]*\"/, 'className="bg-white rounded-[28px] border-2 border-[#F3EFE6] shadow-[0_12px_35px_rgba(44,39,35,0.10)] overflow-hidden flex flex-col w-full h-[460px] sm:h-[500px]"');
milo = milo.replace(/\s*role=\"dialog\" aria-label=\"Chat con Milo\"/, ' role="region" aria-label="Chat con Milo"');
milo = milo.replace(/\n\s*if \(typeof document === "undefined"\) return null;\n\s*return createPortal\(chatUi, document\.body\);/s, '\n  return chatUi;');
milo = milo.replace(/\n\s*\{!open && \([\s\S]*?\n\s*\}\)\n\s*<\/\>/s, "\n    </>");
write(miloPath, read(miloPath), milo);

// Add Milo beneath the dashboard greeting, before location/climate.
const home = read(homePath);
let nextHome = home;
if (!nextHome.includes('import GatitoAiChat from "./GatitoAiChat";')) {
  const anchor = 'import { Avatar } from "./Avatar";';
  if (nextHome.includes(anchor)) nextHome = nextHome.replace(anchor, `${anchor}\nimport GatitoAiChat from "./GatitoAiChat";`);
}
if (!nextHome.includes('<GatitoAiChat')) {
  const marker = "            {/* Ubicación del Nido */}";
  const block = `            <section className="mb-6 w-full">\n              <div className="mb-3 px-1">\n                <div className="flex items-center gap-2">\n                  <span className="text-xl">🐱</span>\n                  <h2 className="text-lg sm:text-xl font-black text-[#2C2723]">Milo está aquí</h2>\n                </div>\n                <p className="text-xs sm:text-sm text-[#8A817C] mt-1">Tu asistente del hogar, conectado con lo que pasa en tu nido.</p>\n              </div>\n              <GatitoAiChat onRefreshData={onRefreshAll} onRequestCreate={onOpenCreateModal} users={users} />\n            </section>\n\n`;
  if (nextHome.includes(marker)) nextHome = nextHome.replace(marker, block + marker);
}
write(homePath, home, nextHome);

console.log("[AstroHogar Milo] Panel integrado al dashboard; overlay y voz heredada desactivados.");
