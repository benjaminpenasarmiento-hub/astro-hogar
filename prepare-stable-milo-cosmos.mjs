import fs from "node:fs";

const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

const oldChat = 'import GatitoAiChat from "./components/GatitoAiChat";';
const newChat = 'import GatitoAiChat from "./components/GatitoAiChatStable";';
if (app.includes(oldChat)) app = app.replace(oldChat, newChat);

const oldCosmos = 'import CosmosModule from "./components/CosmosModule";';
const newCosmos = 'import CosmosModule from "./components/CosmosModuleStable";';
if (app.includes(oldCosmos)) app = app.replace(oldCosmos, newCosmos);

fs.writeFileSync(appPath, app, "utf8");

const chatPath = "src/components/GatitoAiChat.tsx";
let chat = fs.readFileSync(chatPath, "utf8");
chat = chat.replace(/localStorage\.getItem\("milo_chat_history"\)/g, 'null');
chat = chat.replace(/localStorage\.setItem\("milo_chat_history",[^;]+;/g, "void 0;");
fs.writeFileSync(chatPath, chat, "utf8");

console.log("[AstroHogar] Stable Milo + Cosmos components selected.");
