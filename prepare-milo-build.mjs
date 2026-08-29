import fs from "node:fs";

const chatPath = "src/components/GatitoAiChat.tsx";
let chat = fs.readFileSync(chatPath, "utf8");

if (!chat.includes('import { useMiloVoice } from "../hooks/useMiloVoice";')) {
  chat = chat.replace(
    'import { askGatitoChat } from "../api";',
    'import { askGatitoChat, initializeMiloHomeContext } from "../api";\nimport { useMiloVoice } from "../hooks/useMiloVoice";',
    1
  );
}

chat = chat.replace(
  'MessageSquare, X, Send, Sparkles, ',
  'MessageSquare, X, Send, Sparkles, Mic, MicOff, ',
  1
);

if (!chat.includes('onChangeTab?: (tab: string) => void;')) {
  chat = chat.replace(
    '  onRequestCreate?: (type: string) => void;\n  users?: UserProfile[];',
    '  onRequestCreate?: (type: string) => void;\n  onChangeTab?: (tab: string) => void;\n  users?: UserProfile[];',
    1
  );
}

if (!chat.includes('onChangeTab, users = []')) {
  chat = chat.replace(
    'export default function GatitoAiChat({ onRefreshData, onRequestCreate, users = [] }: GatitoAiChatProps) {',
    'export default function GatitoAiChat({ onRefreshData, onRequestCreate, onChangeTab, users = [] }: GatitoAiChatProps) {',
    1
  );
}

const voiceStateAnchor = '  const [catMood, setCatMood] = useState<"happy" | "calm" | "alert" | "busy" | "sleep">("happy");\n  const containerRef = useRef<HTMLDivElement>(null);';
const voiceStateReplacement = `  const [catMood, setCatMood] = useState<"happy" | "calm" | "alert" | "busy" | "sleep">("happy");\n  const [liveMiloContext, setLiveMiloContext] = useState<any>(null);\n  const [voiceMode, setVoiceMode] = useState(false);\n  const [voiceTranscript, setVoiceTranscript] = useState("");\n  const handleSendRef = useRef<((textToSend?: string) => Promise<void>) | null>(null);\n  const { isSupported: voiceSupported, isListening, isSpeaking, startListening, stopListening, speak, stopSpeaking } = useMiloVoice(setVoiceTranscript);\n  const containerRef = useRef<HTMLDivElement>(null);`;
if (!chat.includes('liveMiloContext')) {
  if (!chat.includes(voiceStateAnchor)) throw new Error("No se encontró el ancla de estado de Milo para voz/contexto.");
  chat = chat.replace(voiceStateAnchor, voiceStateReplacement, 1);
}

const commandAnchor = '  const handleSend = async (textToSend?: string) => {';
const commandBlock = `  const handleMiloUiCommand = (rawText: string) => {\n    const text = rawText.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");\n    const navigation: Array<{ tab: string; words: string[] }> = [\n      { tab: "inicio", words: ["inicio", "casa", "hogar", "dashboard"] },\n      { tab: "calendario", words: ["calendario", "agenda", "eventos", "eventos de hoy", "tareas"] },\n      { tab: "presupuesto", words: ["finanzas", "presupuesto", "plata", "gastos", "dinero"] },\n      { tab: "cosmos", words: ["cosmos", "horoscopo", "astrologia", "luna", "signos"] },\n      { tab: "mascotas", words: ["mascota", "mascotas", "perro", "gato", "peludo"] },\n      { tab: "plantas", words: ["planta", "plantas", "riego"] },\n      { tab: "metas", words: ["meta", "metas", "objetivos"] },\n      { tab: "recuerdos", words: ["recuerdo", "recuerdos", "memorias", "album"] },\n      { tab: "salud", words: ["salud", "ciclo", "bienestar"] },\n      { tab: "ejercicio", words: ["ejercicio", "entrenamiento", "entrenar", "templo", "rutina"] },\n      { tab: "closet", words: ["closet", "ropa", "outfit", "vestuario"] },\n    ];\n\n    const looksLikeNavigation = /\\b(abr(e|eme)|llevame|ve a|ir a|quiero ver|muestrame|abre|vamos a)\\b/.test(text);\n    if (looksLikeNavigation) {\n      const target = navigation.find(item => item.words.some(word => text.includes(word)));\n      if (target) {\n        onChangeTab?.(target.tab);\n        return true;\n      }\n    }\n\n    const creationWords: Array<{ type: string; words: string[] }> = [\n      { type: "event", words: ["crear evento", "nuevo evento", "agrega evento", "anota un evento"] },\n      { type: "task", words: ["crear tarea", "nueva tarea", "agrega una tarea", "anota una tarea"] },\n      { type: "pet", words: ["agregar mascota", "nueva mascota", "registrar mascota"] },\n      { type: "plant", words: ["agregar planta", "nueva planta", "registrar planta"] },\n      { type: "wish", words: ["agregar deseo", "nuevo deseo", "lista de deseos"] },\n      { type: "memory", words: ["guardar recuerdo", "nuevo recuerdo", "agregar recuerdo"] },\n      { type: "document", words: ["subir documento", "agregar documento", "guardar factura"] },\n    ];\n    const creation = creationWords.find(item => item.words.some(word => text.includes(word)));\n    if (creation) {\n      onRequestCreate?.(creation.type);\n      return true;\n    }\n    return false;\n  };\n\n  const handleSend = async (textToSend?: string) => {`;
if (!chat.includes('handleMiloUiCommand')) {
  if (!chat.includes(commandAnchor)) throw new Error("No se encontró handleSend en Milo.");
  chat = chat.replace(commandAnchor, commandBlock, 1);
}

const textExtractAnchor = '    const text = textToSend || userInput;\n    if (!text.trim() && pendingAttachments.length === 0) return;';
const textExtractReplacement = `    const text = textToSend || userInput;\n    if (!text.trim() && pendingAttachments.length === 0) return;\n\n    // Permitimos que Milo controle la navegación/acciones de interfaz mediante lenguaje natural.\n    handleMiloUiCommand(text);`;
if (!chat.includes('// Permitimos que Milo controle la navegación/acciones')) {
  if (!chat.includes(textExtractAnchor)) throw new Error("No se encontró el ancla de texto de handleSend.");
  chat = chat.replace(textExtractAnchor, textExtractReplacement, 1);
}

const aiCallAnchor = '      const responseText = await askGatitoChat(messagesForAi, { cycleConfig, cycleLogs });';
const aiCallReplacement = `      const clientContext = {\n        now: new Date().toISOString(),\n        localDate: new Intl.DateTimeFormat("es-CO", { dateStyle: "full" }).format(new Date()),\n        localTime: new Intl.DateTimeFormat("es-CO", { timeStyle: "short" }).format(new Date()),\n        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,\n        online: navigator.onLine,\n        activeUser: users.find(u => u.id === localStorage.getItem("astro_user_id")) || users[0] || null,\n        users: users.map(u => ({ id: u.id, name: u.name, zodiacSign: u.zodiacSign, environment: u.environment })),\n      };\n      const responseText = await askGatitoChat(messagesForAi, {\n        cycleConfig,\n        cycleLogs,\n        liveMiloContext,\n        clientContext,\n        instruction: "Usa estos datos como estado vivo del hogar. No contradigas fecha, hora, ubicacion ni clima presentes en el contexto.",\n      });`;
if (!chat.includes('clientContext')) {
  if (!chat.includes(aiCallAnchor)) throw new Error("No se encontró llamada de chat de Milo.");
  chat = chat.replace(aiCallAnchor, aiCallReplacement, 1);
}

const responseMessageAnchor = `      setMessages(prev => [\n        ...prev,\n        {\n          id: \`cat-\${Date.now()}\`,\n          sender: "cat",\n          text: responseText,\n          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })\n        }\n      ]);`;
const responseMessageReplacement = responseMessageAnchor + `\n      if (voiceMode) speak(responseText);`;
if (!chat.includes('if (voiceMode) speak(responseText);')) {
  if (!chat.includes(responseMessageAnchor)) throw new Error("No se encontró la inserción de respuesta de Milo.");
  chat = chat.replace(responseMessageAnchor, responseMessageReplacement, 1);
}

const suggestionAnchor = '  const suggestionChips = [';
const liveEffects = `  // Sincroniza el estado vivo cada vez que abrimos a Milo y al cambiar de usuario.\n  useEffect(() => {\n    if (!isChatOpen) return;\n    let cancelled = false;\n    initializeMiloHomeContext(true)\n      .then(context => { if (!cancelled) setLiveMiloContext(context); })\n      .catch(err => console.warn("Milo live context unavailable:", err));\n    return () => { cancelled = true; };\n  }, [isChatOpen, users]);\n\n  useEffect(() => {\n    handleSendRef.current = handleSend;\n  });\n\n  useEffect(() => {\n    if (!voiceTranscript.trim()) return;\n    const text = voiceTranscript.trim();\n    setVoiceTranscript("");\n    handleSendRef.current?.(text);\n  }, [voiceTranscript]);\n\n${suggestionAnchor}`;
if (!chat.includes('Sincroniza el estado vivo')) {
  if (!chat.includes(suggestionAnchor)) throw new Error("No se encontró el ancla de sugerencias de Milo.");
  chat = chat.replace(suggestionAnchor, liveEffects, 1);
}

const buttonAnchor = `                type="button"\n                onClick={() => fileInputRef.current?.click()}\n                title="Adjuntar archivo"`;
const voiceButton = `                type="button"\n                onClick={() => {\n                  if (!voiceSupported) return;\n                  setVoiceMode(true);\n                  if (isListening) stopListening(); else startListening();\n                }}\n                title={voiceSupported ? (isListening ? "Detener escucha" : "Hablar con Milo") : "La entrada de voz no está disponible en este navegador"}\n                aria-label={voiceSupported ? (isListening ? "Detener escucha" : "Hablar con Milo") : "Entrada de voz no disponible"}\n                className={\`p-2 rounded-full transition-all cursor-pointer shrink-0 \${isListening ? "bg-red-100 text-red-600 animate-pulse" : "text-[#8A817C] hover:text-[#2C2723] hover:bg-[#FAF7F2]"}\`}\n              >\n                {isListening ? <MicOff size={18} /> : <Mic size={18} />}\n              </button>\n              <button`;
if (!chat.includes('Hablar con Milo')) {
  if (!chat.includes(buttonAnchor)) throw new Error("No se encontró el botón de adjuntar archivos en Milo.");
  chat = chat.replace(buttonAnchor, voiceButton + '\n                onClick={() => fileInputRef.current?.click()}\n                title="Adjuntar archivo"', 1);
}

// Add a compact voice-state indicator to the chat header without disturbing the existing layout.
const headerStatusAnchor = '<h4 className="font-extrabold text-cute text-sm text-[#2C2723]">';
if (!chat.includes('Modo voz activo')) {
  const idx = chat.indexOf(headerStatusAnchor);
  if (idx !== -1) {
    chat = chat.slice(0, idx) + `\n                  {voiceMode && voiceSupported && <span className="text-[9px] font-black text-emerald-600">🎙️ Modo voz activo${isSpeaking ? " · Milo habla" : ""}</span>}\n` + chat.slice(idx);
  }
}

fs.writeFileSync(chatPath, chat, "utf8");

const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");
if (!app.includes('onChangeTab={setCurrentTab}')) {
  const anchor = `        onRequestCreate={handleRaiseCustomModal} \n        users={users}`;
  const replacement = `        onRequestCreate={handleRaiseCustomModal} \n        onChangeTab={setCurrentTab}\n        users={users}`;
  if (!app.includes(anchor)) throw new Error("No se encontró la instancia principal de GatitoAiChat en App.");
  app = app.replace(anchor, replacement, 1);
  fs.writeFileSync(appPath, app, "utf8");
}

console.log("[AstroHogar] Milo live context, voice and UI control integration prepared.");
