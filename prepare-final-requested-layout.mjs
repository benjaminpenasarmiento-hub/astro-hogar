import fs from "node:fs";

const homePath = "src/components/HomeDashboard.tsx";
let home = fs.readFileSync(homePath, "utf8");

// Remove the build-time injections that were incorrectly appearing above the hero.
home = home.replace(/\s*<HomeEnvironmentStrip home=\{home\} users=\{users\} activeUserId=\{activeUserId\} onRefreshAll=\{onRefreshAll\} \/>/, "");
home = home.replace(/\s*<MiloLearningCard home=\{home\} onRefreshAll=\{onRefreshAll\} \/>/, "");
home = home.replace(/\nimport HomeEnvironmentStrip from "\.\/HomeEnvironmentStrip";/, "");
home = home.replace(/\nimport MiloLearningCard from "\.\/MiloLearningCard";/, "");

// Keep the original hero and move the environmental information below it.
if (!home.includes('import HomeWeatherMoonPanel from "./HomeWeatherMoonPanel";')) {
  home = home.replace('import { Avatar } from "./Avatar";', 'import { Avatar } from "./Avatar";\nimport HomeWeatherMoonPanel from "./HomeWeatherMoonPanel";', 1);
}

const moduleStart = home.indexOf('      {/* 🌤️ & 🌌 MÓDULO VISUAL: CLIMA BOGOTÁ Y COSMOS / ASTROS EN VIVO */}');
const shortcutsStart = home.indexOf('      {/* ⚡ PÁGINA RÁPIDA DE ATAJOS (SHORTCUTS DASHBOARD) */}', moduleStart + 1);
if (moduleStart !== -1 && shortcutsStart !== -1) {
  home = home.slice(0, moduleStart) +
    '      <HomeWeatherMoonPanel home={home} users={users} activeUserId={activeUserId} />\n\n\n' +
    home.slice(shortcutsStart);
}

// Milo identity rules: use only registered users and a user-scoped chat history.
const chatPath = "src/components/GatitoAiChat.tsx";
let chat = fs.readFileSync(chatPath, "utf8");
if (!chat.includes("const chatStorageKey =")) {
  chat = chat.replace(
    '  const [messages, setMessages] = useState<ChatMessage[]>(() => {',
    '  const chatStorageKey = `milo_chat_history:${users.length === 1 ? String(users[0]?.id || "unknown") : users.map(u => String(u.id)).sort().join("|") || "anonymous"}`;\n\n  const [messages, setMessages] = useState<ChatMessage[]>(() => {',
    1
  );
}
chat = chat.replace('localStorage.getItem("milo_chat_history")', 'localStorage.getItem(chatStorageKey)');
chat = chat.replace('localStorage.setItem("milo_chat_history", JSON.stringify(messages));', 'localStorage.setItem(chatStorageKey, JSON.stringify(messages));');
chat = chat.replace('localStorage.setItem("milo_chat_history", JSON.stringify([initialMsg]));', 'localStorage.setItem(chatStorageKey, JSON.stringify([initialMsg]));');
chat = chat.replace(
  'const names = users.map(u => u.name).join(" & ") || "familia";',
  'const names = users.length === 1 ? users[0].name : users.length > 1 ? users.map(u => u.name).join(" & ") : "";'
);
chat = chat.replace(
  'text: `¡Hola ${names}! 👋🐾 Soy **Milo**, su compañero y guardián del bienestar. Estoy atento a todo lo que ocurre en el nido —sus emociones, finanzas, salud, tareas, entrenamientos, metas y recuerdos— para guiarlos siempre con empatía, paz y cuidado mutuo. ¿En qué les acompaño hoy?`,',
  'text: names ? `¡Hola ${names}! 👋🐾 Soy **Milo**, estoy aquí para acompañarte con la información que ya forma parte de este hogar. ¿En qué te acompaño hoy?` : `Hola 👋🐾 Soy **Milo**. Todavía no tengo información de ningún usuario registrado en este hogar. Cuando alguien se registre, podré acompañarlo con los datos que me haya compartido.`,'
);
fs.writeFileSync(chatPath, chat, "utf8");

// Remove stale hard-coded partner wording from the hero overlay; only show it when both users are registered.
home = home.replace(
  '<p className="text-xs font-bold text-white mt-0.5">Mafe & Benja</p>',
  '<p className="text-xs font-bold text-white mt-0.5">{users.length > 1 ? users.map(u => u.name).join(" & ") : users[0]?.name || ""}</p>'
);

fs.writeFileSync(homePath, home, "utf8");
console.log("[AstroHogar] Final requested layout applied: original hero preserved, date below, weather+moon below, no Milo learning on Home.");
console.log("[AstroHogar] Milo chat storage scoped to registered users only; no fallback user names.");
