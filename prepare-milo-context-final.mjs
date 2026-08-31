import fs from "node:fs";

function update(path, transform, label) {
  const source = fs.readFileSync(path, "utf8");
  const next = transform(source);
  if (next === source) {
    console.log(`[AstroHogar Milo] ${label}: sin cambios`);
    return;
  }
  fs.writeFileSync(path, next, "utf8");
  console.log(`[AstroHogar Milo] ${label}`);
}

update("src/components/HomeDashboard.tsx", (source) => {
  let s = source;

  // Remove old injected environment/learning cards. The original dashboard keeps the approved design.
  s = s.replace(/^import HomeEnvironmentStrip from \"\.\/HomeEnvironmentStrip\";\r?\n/m, "");
  s = s.replace(/^import MiloLearningCard from \"\.\/MiloLearningCard\";\r?\n/m, "");
  s = s.replace(/^import HomeWeatherMoonPanel from \"\.\/HomeWeatherMoonPanel\";\r?\n/m, "");
  s = s.replace(/\s*<HomeEnvironmentStrip[^\n]*\/?>\s*/g, "\n");
  s = s.replace(/\s*<MiloLearningCard[^\n]*\/?>\s*/g, "\n");
  s = s.replace(/\s*<HomeWeatherMoonPanel[^\n]*\/?>\s*/g, "\n");

  // Never invent the active profile.
  s = s.replace(
    /const activeUser = users\.find\(u => u\.id === activeUserId\) \|\| users\[0\] \|\| \{ id: \"mafe\", name: \"Mafe\" \};/,
    'const activeUser = users.find(u => u.id === activeUserId) || users[0] || { id: "unknown", name: "" };'
  );

  // Remove Harmony badge only; keep the original Milo card.
  s = s.replace(/\s*\{miloContextState\?\.harmonyScore && \([\s\S]*?\n\s*\)\}\s*/m, "\n");

  // Add local date/time next to the existing location row once.
  const locationLine = '<span className="text-[10.5px] font-mono text-gray-400">Sabana de Bogotá · 2.640 msnm</span>';
  const dateLine = '<span className="text-[10px] font-mono text-gray-400">{new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(currentDate)} · {new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit" }).format(currentDate)}</span>';
  if (s.includes(locationLine) && !s.includes('format(currentDate)} · {new Intl.DateTimeFormat("es-CO"')) {
    s = s.replace(locationLine, `${locationLine}\n              ${dateLine}`, 1);
  }

  // Natural greeting without quotes and without duplicate/unregistered names.
  if (!s.includes('const safeMiloGreeting =')) {
    s = s.replace(
      '  return (\n',
      `  const safeMiloGreeting = (() => {\n    let text = (dailyGreeting || "Estoy aquí para acompañarte hoy.").trim();\n    text = text.replace(/^[\\\"“”]+|[\\\"“”]+$/g, "");\n    const registeredNames = users.map(u => u.name).filter(Boolean);\n    const activeName = activeUser?.name || "";\n    if (activeName) {\n      text = text.replaceAll(activeName + " y " + activeName, activeName);\n      text = text.replaceAll(activeName + " & " + activeName, activeName);\n    }\n    if (registeredNames.length <= 1) {\n      for (const otherName of ["Mafe", "Benja"]) {\n        if (otherName && otherName !== activeName && !registeredNames.includes(otherName)) {\n          text = text.replaceAll(otherName + " y " + (activeName || otherName), activeName || "ti");\n          text = text.replaceAll((activeName || otherName) + " y " + otherName, activeName || "ti");\n          text = text.replaceAll(otherName, activeName || "ti");\n        }\n      }\n    }\n    return text;\n  })();\n\n  return (\n`,
      1
    );
  }
  s = s.replace(/\{dailyGreeting\}/g, "{safeMiloGreeting}");

  // Keep climate + lunar cards visible.
  s = s.replace(/className=\"([^\"]*lg:col-span-7[^\"]*)\" hidden/g, 'className="$1"');
  s = s.replace(/className=\"([^\"]*lg:col-span-5[^\"]*)\" hidden/g, 'className="$1"');

  return s;
}, "Inicio conservado + fecha junto a ubicación + saludo seguro");

update("src/components/GatitoAiChat.tsx", (source) => {
  let s = source;

  // Import the real voice/learning experience.
  if (!s.includes('import MiloVoiceLearningPanel from "./MiloVoiceLearningPanel";')) {
    s = s.replace('import { askGatitoChat } from "../api";', 'import { askGatitoChat } from "../api";\nimport MiloVoiceLearningPanel from "./MiloVoiceLearningPanel";');
  }

  // User-scoped chat history. Legacy global history is intentionally discarded to avoid identity leakage.
  s = s.replace(
    'const saved = localStorage.getItem("milo_chat_history");',
    'const activeId = localStorage.getItem("astro_user_id") || "anonymous";\n      localStorage.removeItem("milo_chat_history");\n      const saved = localStorage.getItem(`milo_chat_history:${activeId}`);'
  );
  s = s.replace(
    'localStorage.setItem("milo_chat_history", JSON.stringify(messages));',
    'const activeId = localStorage.getItem("astro_user_id") || "anonymous";\n      localStorage.setItem(`milo_chat_history:${activeId}`, JSON.stringify(messages));'
  );
  s = s.replace(
    'localStorage.setItem("milo_chat_history", JSON.stringify([initialMsg]));',
    'const activeId = localStorage.getItem("astro_user_id") || "anonymous";\n      localStorage.setItem(`milo_chat_history:${activeId}`, JSON.stringify([initialMsg]));'
  );

  // Only initialize a name from an actual active user. No "familia" fallback.
  s = s.replace(
    'const names = users.map(u => u.name).join(" & ") || "familia";',
    'const activeId = typeof window !== "undefined" ? localStorage.getItem("astro_user_id") : null;\n    const activeUser = activeId ? users.find(u => u.id === activeId) : users[0];\n    const names = activeUser?.name || "";'
  );
  s = s.replace(
    'text: `¡Hola ${names}! 👋🐾 Soy **Milo**, su compañero y guardián del bienestar. Estoy atento a todo lo que ocurre en el nido —sus emociones, finanzas, salud, tareas, entrenamientos, metas y recuerdos— para guiarlos siempre con empatía, paz y cuidado mutuo. ¿En qué les acompaño hoy?`,',
    'text: `¡Hola${names ? ` ${names}` : ""}! 👋🐾 Soy **Milo**. Estoy aquí para acompañarte con lo que necesites del hogar. ¿En qué te acompaño hoy?`,'
  );

  // Clear action rail that exposed unrelated document upload.
  s = s.replace(/\n\s*\{ type: "document", label: "Subir Documento",[\s\S]*?\},/m, "");

  // Send only the recent conversation and explicit live identity/learning context.
  s = s.replace(
    'const messagesForAi = updatedMessages.map(m => {',
    'const messagesForAi = updatedMessages.slice(-12).map(m => {'
  );
  s = s.replace(
    'const responseText = await askGatitoChat(messagesForAi, { cycleConfig, cycleLogs });',
    `const activeId = localStorage.getItem("astro_user_id") || "";\n      const activeUser = users.find(u => u.id === activeId);\n      const registeredUsers = users.map(u => ({ id: u.id, name: u.name, zodiacSign: u.zodiacSign }));\n      const learningRaw = localStorage.getItem(\`milo_learning_notes:\${activeId || "anonymous"}\`);\n      let learningNotes = null;\n      try { learningNotes = learningRaw ? JSON.parse(learningRaw) : null; } catch {}\n      const responseText = await askGatitoChat(messagesForAi, {\n        cycleConfig,\n        cycleLogs,\n        activeUser: activeUser ? { id: activeUser.id, name: activeUser.name, zodiacSign: activeUser.zodiacSign } : null,\n        registeredUsers,\n        learningNotes,\n        now: new Date().toISOString(),\n        rule: "Solo utiliza nombres, preferencias y hechos explícitamente registrados. Nunca inventes información ni usuarios."\n      });`
  );

  // Compute latest Milo answer for the voice output button.
  if (!s.includes('const lastMiloMessage =')) {
    s = s.replace(
      '  return (\n',
      '  const lastMiloMessage = [...messages].reverse().find(m => m.sender === "cat")?.text || "";\n\n  return (\n',
      1
    );
  }

  // Put voice + learning inside the actual Milo conversation, immediately before quick suggestions.
  const marker = '            {/* Quick Suggestions Chips */}';
  if (s.includes(marker) && !s.includes('<MiloVoiceLearningPanel')) {
    s = s.replace(marker, '            <MiloVoiceLearningPanel users={users} lastMiloMessage={lastMiloMessage} onTranscript={setUserInput} />\n\n' + marker, 1);
  }

  return s;
}, "Milo: voz, aprendizaje, identidad y contexto aislados");

update("src/api.ts", (source) => {
  let s = source;
  // Remove hardcoded identity from client fallbacks.
  s = s.replace(/¡Hola Mafe & Benja! Les deseo un día hermoso, tranquilo y lleno de amor en el nido 🐾🏡✨\./g, 'Estoy aquí para acompañarte hoy 🐾🏡✨.');
  return s;
}, "Fallbacks de Milo sin nombres inventados");

update("server.ts", (source) => {
  let s = source;
  // The server prompt must never hardcode the former pair identity.
  s = s.replaceAll('Mafe y Benja', 'los usuarios registrados del hogar');
  s = s.replaceAll('Mafe & Benja', 'los usuarios registrados del hogar');
  s = s.replaceAll('Mafe, Benja', 'los usuarios registrados');
  s = s.replaceAll('de Mafe', 'del usuario registrado');
  s = s.replaceAll('de Benja', 'del usuario registrado');
  s = s.replaceAll('Hogar de Mafe y Benjamin', 'Hogar');
  return s;
}, "Prompts de servidor sin identidad fija");

console.log("[AstroHogar Milo] Final context pass complete.");
