import fs from "node:fs";

function update(path, transform, label) {
  const source = fs.readFileSync(path, "utf8");
  const next = transform(source);
  if (next === source) {
    console.log(`[AstroHogar stable-fix] ${label}: no changes`);
    return;
  }
  fs.writeFileSync(path, next, "utf8");
  console.log(`[AstroHogar stable-fix] ${label}`);
}

update("src/components/HomeDashboard.tsx", (source) => {
  let next = source;

  // Remove any injected top-of-page environment/learning components.
  next = next.replace(/^import HomeEnvironmentStrip from \"\.\/HomeEnvironmentStrip\";\r?\n/m, "");
  next = next.replace(/^import MiloLearningCard from \"\.\/MiloLearningCard\";\r?\n/m, "");
  next = next.replace(/^import HomeWeatherMoonPanel from \"\.\/HomeWeatherMoonPanel\";\r?\n/m, "");
  next = next.replace(/\s*<HomeEnvironmentStrip[^\n]*\/>\s*/g, "\n");
  next = next.replace(/\s*<MiloLearningCard[^\n]*\/>\s*/g, "\n");
  next = next.replace(/\s*<HomeWeatherMoonPanel[^\n]*\/>\s*/g, "\n");

  // Never invent an active profile.
  next = next.replace(
    /const activeUser = users\.find\(u => u\.id === activeUserId\) \|\| users\[0\] \|\| \{ id: \"mafe\", name: \"Mafe\" \};/,
    'const activeUser = users.find(u => u.id === activeUserId) || users[0] || { id: "unknown", name: "" };'
  );

  // Remove the Harmony badge without changing Milo's card design.
  next = next.replace(/\s*\{miloContextState\?\.harmonyScore && \([\s\S]*?\n\s*\)\}\s*/m, "\n");

  // Natural Milo message: no artificial quotation marks.
  next = next.replace(/\n\s*"\{dailyGreeting\}"/g, "\n                  {(() => {\n                    const knownNames = new Set(users.map(u => u.name).filter(Boolean));\n                    const activeName = activeUser?.name || \"\";\n                    let text = dailyGreeting || \"Estoy aquí contigo para acompañarte hoy.\";\n                    text = text.replace(/^\\s*[\\\"“”]+|[\\\"“”]+\\s*$/g, \"\");\n                    for (const blocked of [\"Mafe\", \"Benja\", \"Mafe y Benja\", \"Mafe & Benja\"]) {\n                      if (!knownNames.has(blocked) && blocked !== activeName && blocked.includes(\" \")) text = text.replaceAll(blocked, activeName || \"ti\");\n                      else if (!knownNames.has(blocked) && blocked !== activeName) text = text.replaceAll(new RegExp(`\\\\b${blocked}\\\\b`, \"g\"), activeName || \"ti\");\n                    }\n                    return text;\n                  })()}" );

  // The original design already contains weather and lunar cards. Make sure old build passes do not hide them.
  next = next.replace(
    /(<div className=\"lg:col-span-7 bg-gradient-to-br from-sky-50\/90 via-blue-50\/50 to-indigo-50\/30 rounded-3xl p-5 sm:p-6 border-4 border-sky-100\/90 shadow-2xs space-y-4 relative overflow-hidden)/,
    '$1'
  );
  next = next.replace(
    /className=\"lg:col-span-5 bg-gradient-to-br from-\[#1A162B\][^\"]*\"/, 
    (m) => m.replace(/\s+hidden(?=[\" ])/g, "")
  );

  // Remove the large solar trajectory card from the weather area; keep weather itself.
  next = next.replace(
    /\n\s*\/\* Salida y Puesta del Sol \(Astro Solar Dinámico en Tiempo Real\) \*\/\n\s*<div className=\"bg-gradient-to-r from-amber-500\/10[\s\S]*?<\/div>\n\s*<\/div>/m,
    ""
  );

  return next;
}, "Inicio original + clima/luna visibles");

update("src/components/GatitoAiChat.tsx", (source) => {
  let next = source;
  next = next.replace(/const saved = localStorage\.getItem\(\"milo_chat_history\"\);/g, 'const activeId = localStorage.getItem("astro_user_id") || "anonymous";\n      localStorage.removeItem("milo_chat_history");\n      const saved = localStorage.getItem(`milo_chat_history:${activeId}`);');
  next = next.replace(/localStorage\.setItem\(\"milo_chat_history\", JSON\.stringify\(messages\)\);/g, 'const activeId = localStorage.getItem("astro_user_id") || "anonymous";\n      localStorage.setItem(`milo_chat_history:${activeId}`, JSON.stringify(messages));');
  next = next.replace(/localStorage\.setItem\(\"milo_chat_history\", JSON\.stringify\(\[initialMsg\]\)\);/g, 'const activeId = localStorage.getItem("astro_user_id") || "anonymous";\n      localStorage.setItem(`milo_chat_history:${activeId}`, JSON.stringify([initialMsg]));');

  // Initial message uses only the authenticated/active user; never "familia" or a default pair.
  next = next.replace(/const names = users\.map\(u => u\.name\)\.join\(" & "\) \|\| "familia";/g, 'const activeId = typeof window !== "undefined" ? localStorage.getItem("astro_user_id") : null;\n    const activeUser = activeId ? users.find(u => u.id === activeId) : users[0];\n    const names = activeUser?.name || "";');
  next = next.replace(/¡Hola \$\{names\}! 👋🐾 Soy \*\*Milo\*\*/, '¡Hola${names ? ` ${names}` : ""}! 👋🐾 Soy **Milo**');
  next = next.replace(/en el nido —sus emociones, finanzas, salud, tareas, entrenamientos, metas y recuerdos— para guiarlos siempre con empatía, paz y cuidado mutuo\. ¿En qué les acompaño hoy\?/g, 'para acompañarte con lo que necesites del hogar. ¿En qué te acompaño hoy?');

  return next;
}, "Milo aislado por usuario");

// Disable the old build passes that were hiding/reinjecting the Home UI.
console.log("[AstroHogar stable-fix] UI cleanup complete.");
