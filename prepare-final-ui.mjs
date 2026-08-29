import fs from "node:fs";

function patch(path, fn, label) {
  const source = fs.readFileSync(path, "utf8");
  const next = fn(source);
  if (next !== source) {
    fs.writeFileSync(path, next, "utf8");
    console.log(`[AstroHogar final UI] ${label}`);
  }
}

// 1) The learning editor belongs only inside Milo's conversation, never on Home.
patch("src/components/HomeDashboard.tsx", source => source
  .replace('import MiloLearningCard from "./MiloLearningCard";\n', "")
  .replace(/\s*<MiloLearningCard\s+home=\{home\}\s+onRefreshAll=\{onRefreshAll\}\s*\/>\s*/g, "\n")
, "removed Milo learning card from HomeDashboard");

// 2) Make the environment strip truly compact, especially on phones.
patch("src/components/HomeEnvironmentStrip.tsx", source => source
  .replace('className="space-y-3"', 'className="space-y-1"')
  .replace('className="rounded-3xl border-2 border-[#E7E2D5] bg-white/95 p-4 sm:p-5 shadow-sm"', 'className="rounded-2xl border border-[#E7E2D5] bg-white/95 px-2 py-1.5 sm:px-2.5 sm:py-2 shadow-sm"')
  .replace('className="grid grid-cols-1 xl:grid-cols-5 gap-3"', 'className="grid grid-cols-2 lg:grid-cols-5 gap-1"')
  .replace('className="xl:col-span-2 rounded-2xl bg-[#FAF7F2] p-4"', 'className="col-span-2 lg:col-span-2 rounded-xl bg-[#FAF7F2] p-1.5"')
  .replace('className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4"', 'className="rounded-xl border border-blue-100 bg-blue-50/70 p-1.5"')
  .replace('className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4"', 'className="rounded-xl border border-amber-100 bg-amber-50/70 p-1.5"')
  .replace('className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4"', 'className="rounded-xl border border-violet-100 bg-violet-50/70 p-1.5"')
  .replace('className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-left', 'className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-1.5 text-left')
  .replace('className="text-base font-black text-[#2C2723] capitalize mt-1"', 'className="text-[11px] font-black text-[#2C2723] capitalize mt-0.5 leading-tight"')
  .replace('className="text-2xl font-black text-[#2C2723] mt-1 flex items-center gap-2"', 'className="text-sm font-black text-[#2C2723] mt-0.5 flex items-center gap-1"')
  .replace('className="text-xl font-black text-[#2C2723] mt-1"', 'className="text-sm font-black text-[#2C2723] mt-0.5"')
  .replace('className="text-4xl">🐾</div>', 'className="text-lg">🐾</div>')
  .replace('className="rounded-3xl border-2 border-amber-200 bg-amber-50/90 p-4 shadow-sm"', 'className="rounded-2xl border border-amber-200 bg-amber-50/90 px-2 py-1.5 shadow-sm"')
, "compacted Home environment strip");

// 3) Add a small learning action to Milo's own chat. It uses the existing Home settings API.
patch("src/components/GatitoAiChat.tsx", source => {
  let next = source;
  if (!next.includes('import { updateHomeSettings } from "../api";')) {
    next = next.replace('import { askGatitoChat } from "../api";', 'import { askGatitoChat, updateHomeSettings } from "../api";', 1);
  }
  if (!next.includes('home?: any;')) {
    next = next.replace('  onRequestCreate?: (type: string) => void;\n  users?: UserProfile[];', '  onRequestCreate?: (type: string) => void;\n  home?: any;\n  users?: UserProfile[];', 1);
  }
  if (!next.includes('onRequestCreate, home, users = []')) {
    next = next.replace('export default function GatitoAiChat({ onRefreshData, onRequestCreate, users = [] }: GatitoAiChatProps) {', 'export default function GatitoAiChat({ onRefreshData, onRequestCreate, home, users = [] }: GatitoAiChatProps) {', 1);
  }
  if (!next.includes('miloLearningOpen')) {
    next = next.replace('  const [catMood, setCatMood] = useState<"happy" | "calm" | "alert" | "busy" | "sleep">("happy");', '  const [catMood, setCatMood] = useState<"happy" | "calm" | "alert" | "busy" | "sleep">("happy");\n  const [miloLearningOpen, setMiloLearningOpen] = useState(false);\n  const [miloLearningNotes, setMiloLearningNotes] = useState(home?.settings?.miloLearningNotes || "");\n  const [miloLearningSaving, setMiloLearningSaving] = useState(false);\n  const [miloLearningSaved, setMiloLearningSaved] = useState(false);', 1);
  }
  if (!next.includes('setMiloLearningNotes(home?.settings?.miloLearningNotes')) {
    next = next.replace('  // Close everything when clicking outside', '  useEffect(() => { setMiloLearningNotes(home?.settings?.miloLearningNotes || ""); }, [home?.settings?.miloLearningNotes]);\n\n  const saveMiloLearning = async () => {\n    setMiloLearningSaving(true);\n    setMiloLearningSaved(false);\n    try {\n      await updateHomeSettings({ settings: { ...(home?.settings || {}), miloLearningNotes: miloLearningNotes.trim() } } as any);\n      setMiloLearningSaved(true);\n      onRefreshData?.();\n      window.setTimeout(() => setMiloLearningSaved(false), 2200);\n    } catch (error) {\n      console.warn("No se pudo guardar lo aprendido por Milo:", error);\n    } finally {\n      setMiloLearningSaving(false);\n    }\n  };\n\n  // Close everything when clicking outside', 1);
  }
  if (!next.includes('Enseñarle a Milo')) {
    const headerAnchor = '            {/* Chat Messages */}';
    const learningUi = `            <div className="border-b border-[#F3EFE6] bg-white px-3 py-2">\n              <button type="button" onClick={() => setMiloLearningOpen(v => !v)} className="w-full flex items-center justify-between text-left text-[11px] font-black text-[#625B57] hover:text-[#2C2723]">\n                <span>🧠 Enseñarle a Milo</span><span>{miloLearningOpen ? "▴" : "▾"}</span>\n              </button>\n              {miloLearningOpen && (\n                <div className="pt-2 space-y-2">\n                  <p className="text-[10px] text-[#8A817C]">Cuéntale cosas que le ayuden a entender cómo funciona vuestro nido.</p>\n                  <textarea value={miloLearningNotes} onChange={e => setMiloLearningNotes(e.target.value)} placeholder="Ej.: Los domingos hacemos mercado; Mafe prefiere recordatorios suaves..." className="w-full min-h-20 rounded-xl border border-[#E7E2D5] bg-[#FCFAF7] px-2.5 py-2 text-[11px] outline-none focus:ring-2 focus:ring-indigo-200 resize-y" />\n                  <div className="flex items-center justify-end gap-2">\n                    {miloLearningSaved && <span className="text-[10px] font-black text-emerald-600">Guardado ✓</span>}\n                    <button type="button" onClick={saveMiloLearning} disabled={miloLearningSaving} className="rounded-xl bg-[#2C2723] text-white px-3 py-1.5 text-[10px] font-black disabled:opacity-50">{miloLearningSaving ? "Guardando..." : "Guardar aprendizaje"}</button>\n                  </div>\n                </div>\n              )}\n            </div>\n\n${headerAnchor}`;
    next = next.replace(headerAnchor, learningUi, 1);
  }
  return next;
}, "moved Milo learning into the conversation");

// 4) Pass the active home into Milo so the learning action edits the correct household.
patch("src/App.tsx", source => {
  return source.replace('        onRequestCreate={handleRaiseCustomModal} \n        users={users}', '        onRequestCreate={handleRaiseCustomModal} \n        home={home}\n        users={users}', 1);
}, "passed active home into Milo chat");

console.log("[AstroHogar final UI] final home/chat polish applied.");
