import fs from "node:fs";

function patchRegex(path, rules) {
  let source = fs.readFileSync(path, "utf8");
  for (const [pattern, replacement] of rules) {
    const next = source.replace(pattern, replacement);
    if (next === source) console.warn(`[AstroHogar final] No se encontró patrón en ${path}: ${pattern}`);
    source = next;
  }
  fs.writeFileSync(path, source, "utf8");
}

// Keep the original visual HomeDashboard and remove only the old top-injected panels.
patchRegex("src/components/HomeDashboard.tsx", [
  [/import HomeEnvironmentStrip from "\.\/HomeEnvironmentStrip";\s*import MiloLearningCard from "\.\/MiloLearningCard";/, 'import HomeWeatherMoonPanel from "./HomeWeatherMoonPanel";'],
  [/<HomeEnvironmentStrip\s+home=\{home\}\s+users=\{users\}\s+activeUserId=\{activeUserId\}\s+onRefreshAll=\{onRefreshAll\}\s*\/?>\s*<MiloLearningCard\s+home=\{home\}\s+onRefreshAll=\{onRefreshAll\}\s*\/?>/s, ""],
  [/const activeUser = users\.find\(u => u\.id === activeUserId\) \|\| users\[0\] \|\| \{ id: "mafe", name: "Mafe" \};/, 'const activeUser = users.find(u => u.id === activeUserId) || users[0] || { id: "unknown", name: "" };'],
]);

let dashboard = fs.readFileSync("src/components/HomeDashboard.tsx", "utf8");
if (!dashboard.includes('<HomeWeatherMoonPanel home={home} users={users} activeUserId={activeUserId} />')) {
  const marker = '        {/* LADO DERECHO: FOTO DEL NIDO DE AMOR */}';
  if (!dashboard.includes(marker)) throw new Error("No se encontró el lugar estable para el panel ambiental");
  dashboard = dashboard.replace(marker, '        <HomeWeatherMoonPanel home={home} users={users} activeUserId={activeUserId} />\n\n' + marker, 1);
}
fs.writeFileSync("src/components/HomeDashboard.tsx", dashboard, "utf8");

// Always render weather using exact GPS when available and a safe local fallback otherwise.
patchRegex("src/components/HomeWeatherMoonPanel.tsx", [
  [/const latitude = Number\(environment\?\.latitude\);\s*const longitude = Number\(environment\?\.longitude\);\s*if \(!Number\.isFinite\(latitude\) \|\| !Number\.isFinite\(longitude\)\) \{\s*setWeather\(null\);\s*return;\s*\}/s, 'const latitude = Number.isFinite(Number(environment?.latitude)) ? Number(environment.latitude) : 4.711;\n      const longitude = Number.isFinite(Number(environment?.longitude)) ? Number(environment.longitude) : -74.0721;'],
  [/function requestLocation\(\) \{\s*if \(!\("geolocation" in navigator\)\) return;\s*navigator\.geolocation\.getCurrentPosition\(/s, 'function requestLocation() {\n    if (!("geolocation" in navigator)) { setLocationStatus("denied"); return; }\n    navigator.geolocation.getCurrentPosition('],
  [/\(\) => setLocationStatus\("granted"\),\s*\(\) => setLocationStatus\("denied"\),/, '() => setLocationStatus("granted"),\n      (error) => setLocationStatus(error.code === error.PERMISSION_DENIED ? "denied" : "prompt"),'],
]);

// Scope Milo's local chat to the authenticated user and remove the legacy shared history.
patchRegex("src/components/GatitoAiChat.tsx", [
  [/localStorage\.getItem\("milo_chat_history"\)/g, 'localStorage.getItem(`milo_chat_history:${localStorage.getItem("astro_user_id") || "anonymous"}`)'],
  [/localStorage\.setItem\("milo_chat_history",/g, 'localStorage.setItem(`milo_chat_history:${localStorage.getItem("astro_user_id") || "anonymous"}`,'],
  [/const names = users\.map\(u => u\.name\)\.join\(" & "\) \|\| "familia";/g, 'const currentId = typeof window !== "undefined" ? localStorage.getItem("astro_user_id") : null;\n    const currentUser = currentId ? users.find(u => u.id === currentId) : undefined;\n    const names = currentUser?.name || "";'],
  [/¡Hola \$\{names\}! 👋🐾 Soy \*\*Milo\*\*, su compañero y guardián del bienestar\. Estoy atento a todo lo que ocurre en el nido —sus emociones, finanzas, salud, tareas, entrenamientos, metas y recuerdos— para guiarlos siempre con empatía, paz y cuidado mutuo\. ¿En qué les acompaño hoy\?/g, '¡Hola${names ? ` ${names}` : ""}! 👋🐾 Soy **Milo**. Estoy aquí para acompañarte y ayudarte con lo que necesites del hogar. ¿En qué te acompaño hoy?'],
]);

console.log("[AstroHogar final] Home weather/moon + location + Milo identity fix applied.");
