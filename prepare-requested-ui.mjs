import fs from "node:fs";

function update(path, transform, label) {
  const source = fs.readFileSync(path, "utf8");
  const next = transform(source);
  if (next === source) {
    console.log(`[AstroHogar UI] ${label}: no changes needed`);
    return;
  }
  fs.writeFileSync(path, next, "utf8");
  console.log(`[AstroHogar UI] ${label}`);
}

update("src/components/HomeDashboard.tsx", (source) => {
  let next = source;

  const harmony = `                  {miloContextState?.harmonyScore && (\n                    <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-full">\n                      Armonía: {miloContextState.harmonyScore}%\n                    </span>\n                  )}\n`;
  next = next.replace(harmony, "");

  next = next.replace(
    'Hola {users.length > 0 ? users.map(u => u.name).join(" & ") : "Inquilinos Cósmicos"}',
    'Hola {activeUser.name || "hogar"}'
  );

  next = next.replace(
    '                  "{dailyGreeting}"',
    '                  {(dailyGreeting || "Estoy aquí contigo para acompañarte hoy.").replace(/^[\\s\\"“”]+|[\\s\\"“”]+$/g, "")}'
  );

  const dateVars = `  const todayLoveQuote = INSPIRATIONAL_LOVE_QUOTES[todayQuoteIndex];\n`;
  const replacementVars = `  const todayLoveQuote = INSPIRATIONAL_LOVE_QUOTES[todayQuoteIndex];\n  const todayLabel = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(currentDate);\n  const currentTimeLabel = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit" }).format(currentDate);\n`;
  next = next.replace(dateVars, replacementVars);

  next = next.replace(
    'className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 p-3.5 rounded-2xl border border-amber-200/80 space-y-2.5 text-xs"',
    'className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 p-3.5 rounded-2xl border border-amber-200/80 space-y-2.5 text-xs hidden"'
  );

  next = next.replace(
    'className="lg:col-span-5 bg-gradient-to-br from-[#1A162B] via-[#231C38] to-[#120E20] text-white rounded-3xl p-5 sm:p-6 border-4 border-purple-900/40 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between"',
    'className="lg:col-span-5 bg-gradient-to-br from-[#1A162B] via-[#231C38] to-[#120E20] text-white rounded-3xl p-5 sm:p-6 border-4 border-purple-900/40 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between hidden"'
  );

  const locationBlock = `            <div className="flex items-center gap-2 pt-2 border-t border-[#F3EFE6]">\n              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200/80 px-3 py-1 rounded-xl text-[11px] font-extrabold">\n                <MapPin size={12} className="text-amber-700" />\n                <span>Ubicación Nido: {homeCity}</span>\n              </div>\n              <span className="text-[10.5px] font-mono text-gray-400">Sabana de Bogotá · 2.640 msnm</span>\n            </div>`;
  const locationAndDate = `${locationBlock}\n            <div className="flex items-center gap-2 text-[10px] text-[#8A817C] pt-1">\n              <Clock size={11} className="text-[#8C5D23]" />\n              <span className="capitalize">{todayLabel}</span>\n              <span>·</span>\n              <span className="font-mono font-black text-[#5C5552]">{currentTimeLabel}</span>\n            </div>`;
  next = next.replace(locationBlock, locationAndDate);

  return next;
}, "Inicio: solo cambios solicitados");

update("src/components/CosmosModule.tsx", (source) => {
  let next = source;

  const synergyClass = 'className="bg-gradient-to-r from-purple-100/70 via-indigo-50/70 to-pink-100/70 p-4 sm:p-5 rounded-3xl border-2 border-purple-200/60 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in mb-6"';
  next = next.replace(synergyClass, synergyClass.replace('"', '"hidden '));

  next = next.replace(
    '            Sintonización astrológica completa para potenciar vuestro nido compartido',
    '            Lectura celestial de hoy'
  );

  const outer = '    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12 px-4 sm:px-6">';
  next = next.replace(outer, '    <div className="space-y-5 animate-fade-in max-w-7xl mx-auto pb-10 px-4 sm:px-6">');

  const transitStart = '            <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/60 p-3 rounded-2xl border border-indigo-800/50 space-y-1">';
  const transitEnd = '            </div>\n          </div>\n\n          {/* Próximos Hitos Celestiales & Astros Visibles */}';
  const start = next.indexOf(transitStart);
  if (start !== -1) {
    const end = next.indexOf(transitEnd, start);
    if (end !== -1) {
      const replacement = `            <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/60 p-3 rounded-2xl border border-indigo-800/50 space-y-2">\n              <span className="text-[9.5px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1">\n                <Sparkles size={12} className="text-amber-300" /> Señal astral cercana\n              </span>\n              <p className="text-xs font-extrabold text-white leading-snug">\n                {climate.cosmicEvent}\n              </p>\n              <p className="text-[10.5px] text-purple-200/80 leading-snug">\n                Influencia para {users.map(u => u.name).join(" y ") || "vuestro nido"}: {climate.sunSign} · {climate.moonSign}.\n              </p>\n            </div>\n\n            {/* Próximos Hitos Celestiales & Astros Visibles */}`;
      next = next.slice(0, start) + replacement + next.slice(end + transitEnd.length);
    }
  }

  // Compact the main cosmic card without changing its visual language.
  next = next.replace(
    'className="lg:col-span-5 bg-gradient-to-br from-[#1A162B] via-[#231C38] to-[#120E20] text-white rounded-3xl p-5 sm:p-6 border-4 border-purple-900/40 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between"',
    'className="lg:col-span-5 bg-gradient-to-br from-[#1A162B] via-[#231C38] to-[#120E20] text-white rounded-3xl p-4 sm:p-5 border-4 border-purple-900/40 shadow-sm space-y-3 relative overflow-hidden flex flex-col justify-between"'
  );

  return next;
}, "Cosmos: compacto y centrado en fase/eventos");

console.log("[AstroHogar UI] Requested-only UI pass complete.");
