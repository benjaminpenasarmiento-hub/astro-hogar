import fs from "node:fs";

const path = "src/App.tsx";
let source = fs.readFileSync(path, "utf8");

const importLine = 'import MiloVoiceChat from "./components/MiloVoiceChat";';

if (!source.includes(importLine)) {
  const anchor = 'import GatitoAiChat from "./components/GatitoAiChat";';
  if (!source.includes(anchor)) {
    throw new Error("No se encontró el import de GatitoAiChat en App.tsx");
  }
  source = source.replace(anchor, `${anchor}\n${importLine}`);
  fs.writeFileSync(path, source);
  console.log("[AstroHogar] MiloVoiceChat import agregado a App.tsx.");
} else {
  console.log("[AstroHogar] MiloVoiceChat ya estaba importado.");
}
