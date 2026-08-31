import fs from "node:fs";

const path = "src/components/GatitoAiChatStable.tsx";
let source = fs.readFileSync(path, "utf8");

if (!source.includes('from "./MiloVoiceControls"')) {
  const importAnchor = 'import { askGatitoChat } from "../api";';
  source = source.replace(importAnchor, `${importAnchor}\nimport MiloVoiceControls from "./MiloVoiceControls";`);
}

if (!source.includes("<MiloVoiceControls")) {
  const stateAnchor = '  const [activeView, setActiveView] = useState<"chat" | "learn">("chat");';
  const stateBlock = `${stateAnchor}\n  const lastCatMessage = useMemo(() => [...messages].reverse().find((m) => m.sender === "cat"), [messages]);`;
  source = source.replace(stateAnchor, stateBlock);

  const marker = '                <div className="px-4 py-2 border-t border-[#F3EFE6] bg-[#FAF7F2] flex gap-2 overflow-x-auto">';
  const voiceBlock = `                <div className="px-4 pb-2 pt-2 border-t border-[#F3EFE6] bg-[#FAF7F2]">\n                  <MiloVoiceControls\n                    onTranscript={(text) => setInput(text)}\n                    textToSpeak={lastCatMessage?.text}\n                  />\n                </div>\n\n`;
  if (source.includes(marker)) {
    source = source.replace(marker, voiceBlock + marker);
  }
}

fs.writeFileSync(path, source, "utf8");
console.log("[AstroHogar] Voz de Milo conectada con estado visual y permisos explícitos.");
