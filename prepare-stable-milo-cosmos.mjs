import fs from "node:fs";

const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

const chatImportRegex = /import\s+GatitoAiChat\s+from\s+["']\.\/components\/GatitoAiChat(?:Stable|VoiceHome)?["'];/;
const newChat = 'import GatitoAiChat from "./components/GatitoAiChatVoiceHome";';
app = app.replace(chatImportRegex, newChat);

const cosmosImportRegex = /import\s+CosmosModule\s+from\s+["']\.\/components\/CosmosModule(?:Stable)?["'];/;
const newCosmos = 'import CosmosModule from "./components/CosmosModule";';
app = app.replace(cosmosImportRegex, newCosmos);

fs.writeFileSync(appPath, app, "utf8");
console.log("[AstroHogar] Milo voice active + original Cosmos restored.");
