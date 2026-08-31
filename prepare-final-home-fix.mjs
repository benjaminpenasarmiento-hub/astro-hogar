import fs from "node:fs";

const dashboardPath = "src/components/HomeDashboard.tsx";
let dashboard = fs.readFileSync(dashboardPath, "utf8");

// Remove the two build-time blocks that were being injected above the approved hero.
dashboard = dashboard
  .replace(/import HomeEnvironmentStrip from \"\.\/HomeEnvironmentStrip\";\n/, "")
  .replace(/import MiloLearningCard from \"\.\/MiloLearningCard\";\n/, "")
  .replace(/\s*<HomeEnvironmentStrip home=\{home\} users=\{users\} activeUserId=\{activeUserId\} onRefreshAll=\{onRefreshAll\} \/>\n/, "\n")
  .replace(/\s*<MiloLearningCard home=\{home\} onRefreshAll=\{onRefreshAll\} \/>\n/, "\n");

// Restore the original climate + moon cards. Keep the solar strip hidden; the user asked to remove it from Home.
dashboard = dashboard
  .replace(
    'className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 p-3.5 rounded-2xl border border-amber-200/80 space-y-2.5 text-xs hidden"',
    'className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 p-3.5 rounded-2xl border border-amber-200/80 space-y-2.5 text-xs hidden"'
  )
  .replace(
    'className="lg:col-span-5 bg-gradient-to-br from-[#1A162B] via-[#231C38] to-[#120E20] text-white rounded-3xl p-5 sm:p-6 border-4 border-purple-900/40 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between hidden"',
    'className="lg:col-span-5 bg-gradient-to-br from-[#1A162B] via-[#231C38] to-[#120E20] text-white rounded-3xl p-5 sm:p-6 border-4 border-purple-900/40 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between"'
  );

// Never default to Mafe when there is no registered user.
dashboard = dashboard.replace(
  'const activeUser = users.find(u => u.id === activeUserId) || users[0] || { id: "mafe", name: "Mafe" };',
  'const activeUser = users.find(u => u.id === activeUserId) || users[0] || null;'
);

// Keep the approved hero, but make the greeting identity strictly data-driven.
dashboard = dashboard.replace(
  'Hola {users.length > 0 ? users.map(u => u.name).join(" & ") : "Inquilinos Cósmicos"}',
  'Hola {activeUser?.name || ""}'
);

// Remove Armonía and decorative quote marks at source level as well as through the existing minimal pass.
dashboard = dashboard.replace(/\n\s*\{miloContextState\?\.harmonyScore && \([\s\S]*?\n\s*\)\}\n/, "\n");
dashboard = dashboard.replace(/\s*\"\{dailyGreeting\}\"\s*/, ' {(dailyGreeting || "").replace(/^[\\s\\"“”]+|[\\s\\"“”]+$/g, "")} ');

// Add local date/time directly below the existing nido-location row, only if not already present.
const locationRow = `            <div className="flex items-center gap-2 pt-2 border-t border-[#F3EFE6]">\n              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200/80 px-3 py-1 rounded-xl text-[11px] font-extrabold">\n                <MapPin size={12} className="text-amber-700" />\n                <span>Ubicación Nido: {homeCity}</span>\n              </div>\n              <span className="text-[10.5px] font-mono text-gray-400">Sabana de Bogotá · 2.640 msnm</span>\n            </div>`;
if (dashboard.includes(locationRow) && !dashboard.includes("astrohogar-date-line")) {
  const extra = `${locationRow}\n            <div className="astrohogar-date-line flex items-center gap-2 text-[10px] text-[#8A817C] pt-1">\n              <Clock size={11} className="text-[#8C5D23]" />\n              <span className="capitalize">{new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}</span>\n              <span>·</span>\n              <span className="font-mono font-black">{new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit" }).format(new Date())}</span>\n            </div>`;
  dashboard = dashboard.replace(locationRow, extra);
}

// Replace the hard-coded daily transit text with a compact, neutral nearby-event label.
dashboard = dashboard.replace(
  'Tránsito Astro del Día:',
  'Evento celeste cercano:'
);
dashboard = dashboard.replace(
  '♓ Luna en Piscis · Energía Intuitiva & Romántica',
  '🌙 Revisa la fase lunar y los próximos hitos desde tu ubicación'
);

dashboard = dashboard.replace(
  'Cielos propicios para descansar, escuchar música suave y disfrutar del abrigo en el nido miau. 🐾',
  'La fase y visibilidad se muestran usando la hora local y la ubicación autorizada del usuario.'
);

fs.writeFileSync(dashboardPath, dashboard, "utf8");

// Make Milo Chat history and first greeting strictly per registered user.
const chatPath = "src/components/GatitoAiChat.tsx";
let chat = fs.readFileSync(chatPath, "utf8");
chat = chat.replace(
  'const saved = localStorage.getItem("milo_chat_history");',
  'const activeId = typeof window !== "undefined" ? (localStorage.getItem("astro_user_id") || "anonymous") : "anonymous";\n      const saved = localStorage.getItem(`milo_chat_history:${activeId}`);'
);
chat = chat.replace(
  'localStorage.setItem("milo_chat_history", JSON.stringify(messages));',
  'const activeId = localStorage.getItem("astro_user_id") || "anonymous";\n      localStorage.setItem(`milo_chat_history:${activeId}`, JSON.stringify(messages));'
);
chat = chat.replace(
  'const names = users.map(u => u.name).join(" & ") || "familia";',
  'const names = users.length === 1 ? users[0].name : users.length > 1 ? users.map(u => u.name).join(" & ") : "";'
);
chat = chat.replace(
  'localStorage.setItem("milo_chat_history", JSON.stringify([initialMsg]));',
  'const activeId = localStorage.getItem("astro_user_id") || "anonymous";\n      localStorage.setItem(`milo_chat_history:${activeId}`, JSON.stringify([initialMsg]));'
);
chat = chat.replace(
  'text: `¡Hola ${names}! 👋🐾 Soy **Milo**, su compañero y guardián del bienestar. Estoy atento a todo lo que ocurre en el nido —sus emociones, finanzas, salud, tareas, entrenamientos, metas y recuerdos— para guiarlos siempre con empatía, paz y cuidado mutuo. ¿En qué les acompaño hoy?`,',
  'text: names ? `¡Hola ${names}! 👋🐾 Soy **Milo**. Estoy aquí para acompañarte y aprender solo lo que me compartas sobre el nido. ¿En qué te ayudo hoy?` : `¡Hola! 👋🐾 Soy **Milo**. Aún no tengo información registrada sobre ti. Cuéntame cómo quieres que te llame y empezamos.`,'
);
fs.writeFileSync(chatPath, chat, "utf8");

console.log("[AstroHogar final fix] Home layout, climate/moon visibility and Milo identity rules applied.");
