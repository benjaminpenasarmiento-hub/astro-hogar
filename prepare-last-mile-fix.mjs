import fs from "node:fs";

function patch(path, replacements) {
  let source = fs.readFileSync(path, "utf8");
  for (const [from, to] of replacements) {
    if (!source.includes(from)) console.warn(`[AstroHogar last-mile] No se encontró: ${from.slice(0, 90)}`);
    else source = source.replace(from, to);
  }
  fs.writeFileSync(path, source, "utf8");
}

// Keep the original HomeDashboard design, but move the environment panel out of the top
// and place the new compact weather/moon panel below the location/date block.
patch("src/components/HomeDashboard.tsx", [
  ['import HomeEnvironmentStrip from "./HomeEnvironmentStrip";\\nimport MiloLearningCard from "./MiloLearningCard";', 'import HomeWeatherMoonPanel from "./HomeWeatherMoonPanel";'],
  ['<HomeEnvironmentStrip home={home} users={users} activeUserId={activeUserId} onRefreshAll={onRefreshAll} />\\n            <MiloLearningCard home={home} onRefreshAll={onRefreshAll} />\\n            ', ''],
  ['const activeUser = users.find(u => u.id === activeUserId) || users[0] || { id: "mafe", name: "Mafe" };', 'const activeUser = users.find(u => u.id === activeUserId) || users[0] || { id: "unknown", name: "" };'],
]);

// Insert the new environment panel immediately before the right-side hero image,
// which is the end of the left content column and therefore keeps it below location/date.
let dashboard = fs.readFileSync("src/components/HomeDashboard.tsx", "utf8");
const marker = '        {/* LADO DERECHO: FOTO DEL NIDO DE AMOR */}';
if (!dashboard.includes('<HomeWeatherMoonPanel home={home} users={users} activeUserId={activeUserId} />')) {
  if (dashboard.includes(marker)) {
    dashboard = dashboard.replace(marker, '        <HomeWeatherMoonPanel home={home} users={users} activeUserId={activeUserId} />\\n\\n' + marker, 1);
  }
}
fs.writeFileSync("src/components/HomeDashboard.tsx", dashboard, "utf8");

// The current HomeWeatherMoonPanel should continue showing weather even before GPS permission:
// use a safe Bogotá fallback while clearly indicating that exact location can be enabled.
patch("src/components/HomeWeatherMoonPanel.tsx", [
  ['  const latitude = Number(environment?.latitude);\\n      const longitude = Number(environment?.longitude);\\n      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {\\n        setWeather(null);\\n        return;\\n      }', '  const latitude = Number.isFinite(Number(environment?.latitude)) ? Number(environment.latitude) : 4.711;\\n      const longitude = Number.isFinite(Number(environment?.longitude)) ? Number(environment.longitude) : -74.0721;'],
  ['  function requestLocation() {\\n    if (!("geolocation" in navigator)) return;\\n    navigator.geolocation.getCurrentPosition(', '  function requestLocation() {\\n    if (!("geolocation" in navigator)) return;\\n    navigator.geolocation.getCurrentPosition('],
  ['      () => setLocationStatus("granted"),\\n      () => setLocationStatus("denied"),', '      () => setLocationStatus("granted"),\\n      (error) => setLocationStatus(error.code === error.PERMISSION_DENIED ? "denied" : "prompt"),'],
  ['  const locationLabel = environment?.label || home.address || "Ubicación del hogar";', '  const locationLabel = environment?.label || home.address || "Ubicación aproximada del hogar";'],
]);

// Make Milo chat user-scoped and never invent names when the auth user is unknown.
patch("src/components/GatitoAiChat.tsx", [
  ['  const [messages, setMessages] = useState<ChatMessage[]>(() => {\\n    if (typeof window !== "undefined") {\\n      const saved = localStorage.getItem("milo_chat_history");', '  const [messages, setMessages] = useState<ChatMessage[]>(() => {\\n    if (typeof window !== "undefined") {\\n      const activeId = localStorage.getItem("astro_user_id") || "anonymous";\\n      localStorage.removeItem("milo_chat_history");\\n      const saved = localStorage.getItem(`milo_chat_history:${activeId}`);'],
  ['      const names = users.map(u => u.name).join(" & ") || "familia";', '      const activeId = typeof window !== "undefined" ? localStorage.getItem("astro_user_id") : null;\\n    const activeUser = activeId ? users.find(u => u.id === activeId) : undefined;\\n    const names = activeUser?.name || "";'],
  ['            text: `¡Hola ${names}! 👋🐾 Soy **Milo**, su compañero y guardián del bienestar. Estoy atento a todo lo que ocurre en el nido —sus emociones, finanzas, salud, tareas, entrenamientos, metas y recuerdos— para guiarlos siempre con empatía, paz y cuidado mutuo. ¿En qué les acompaño hoy?`,', '            text: `¡Hola${names ? ` ${names}` : ""}! 👋🐾 Soy **Milo**. Estoy aquí para acompañarte y ayudarte con lo que necesites del hogar. ¿En qué te acompaño hoy?`,'],
  ['      localStorage.setItem("milo_chat_history", JSON.stringify(messages));', '      const activeId = localStorage.getItem("astro_user_id") || "anonymous";\\n      localStorage.setItem(`milo_chat_history:${activeId}`, JSON.stringify(messages));'],
  ['    const names = users.map(u => u.name).join(" & ") || "familia";', '    const activeId = typeof window !== "undefined" ? localStorage.getItem("astro_user_id") : null;\\n    const activeUser = activeId ? users.find(u => u.id === activeId) : undefined;\\n    const names = activeUser?.name || "";'],
  ['      text: `¡Hola ${names}! 👋🐾 Soy **Milo**, su compañero y guardián del bienestar. Estoy atento a todo lo que ocurre en el nido —sus emociones, finanzas, salud, tareas, entrenamientos, metas y recuerdos— para guiarlos siempre con empatía, paz y cuidado mutuo. ¿En qué les acompaño hoy?`,', '      text: `¡Hola${names ? ` ${names}` : ""}! 👋🐾 Soy **Milo**. Estoy aquí para acompañarte y ayudarte con lo que necesites del hogar. ¿En qué te acompaño hoy?`,'],
  ['      localStorage.setItem("milo_chat_history", JSON.stringify([initialMsg]));', '      const activeId = localStorage.getItem("astro_user_id") || "anonymous";\\n      localStorage.setItem(`milo_chat_history:${activeId}`, JSON.stringify([initialMsg]));'],
]);

console.log("[AstroHogar last-mile] Weather fallback, location permission and Milo identity isolation applied.");
