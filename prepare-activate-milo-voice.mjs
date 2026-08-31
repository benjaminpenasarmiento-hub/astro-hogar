import fs from "node:fs";

const path = "src/App.tsx";
let source = fs.readFileSync(path, "utf8");

source = source.replace('import GatitoAiChat from "./components/GatitoAiChat";', 'import GatitoAiChat from "./components/GatitoAiChat";\nimport MiloVoiceChat from "./components/MiloVoiceChat";');

const old = `      <GatitoAiChat \n        onRefreshData={refreshAllData} \n        onRequestCreate={handleRaiseCustomModal} \n        users={users}\n      />`;

const replacement = `      <MiloVoiceChat\n        users={users}\n        onRefreshData={refreshAllData}\n        onRequestCreate={handleRaiseCustomModal}\n      />`;

if (!source.includes(old)) {
  // Build-safe fallback: replace the existing component invocation through its closing />.
  const start = source.indexOf("      <GatitoAiChat");
  if (start !== -1) {
    const end = source.indexOf("      />", start);
    if (end !== -1) {
      source = source.slice(0, start) + replacement + source.slice(end + 9);
    }
  }
} else {
  source = source.replace(old, replacement);
}

fs.writeFileSync(path, source, "utf8");
console.log("[AstroHogar] Milo voice assistant activated directly in App.tsx.");
