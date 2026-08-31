import fs from "node:fs";

function removeParentDivContaining(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return source;

  // Find the nearest unmatched <div> that actually contains the marker.
  const token = /<div\b[^>]*>|<\/div>/g;
  const stack = [];
  let match;
  let containingStart = -1;

  token.lastIndex = 0;
  while ((match = token.exec(source)) && match.index < markerIndex) {
    if (match[0].startsWith("<div")) {
      stack.push(match.index);
    } else if (stack.length) {
      stack.pop();
    }
  }

  if (stack.length) containingStart = stack[stack.length - 1];
  if (containingStart < 0) return source;

  // Remove exactly that containing div, including all nested divs, without touching siblings.
  let balance = 0;
  token.lastIndex = containingStart;
  while ((match = token.exec(source))) {
    if (match[0].startsWith("<div")) balance += 1;
    else balance -= 1;
    if (balance === 0) {
      return source.slice(0, containingStart) + source.slice(token.lastIndex);
    }
  }

  return source;
}

const dashboardPath = "src/components/HomeDashboard.tsx";
let dashboard = fs.readFileSync(dashboardPath, "utf8");

// Inicio: the daily horoscope and lucky color live only in Cosmos.
for (const marker of ["Horóscopo y color de hoy", "🎨 Color no definido", "Color no definido"]) {
  dashboard = removeParentDivContaining(dashboard, marker);
}

// Inicio: replace the old transit text with a concrete upcoming astronomical event.
const oldTransit = `            {/* Signo/Constelación Lunar */}\n            <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/60 p-3 rounded-2xl border border-indigo-800/50 space-y-1">\n              <span className="text-[9.5px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1">\n                <Sparkles size={12} className="text-amber-300" /> Tránsito Astro del Día:\n              </span>\n              <p className="text-xs font-extrabold text-white">\n                ♓ Luna en Piscis · Energía Intuitiva & Romántica\n              </p>\n              <p className="text-[10.5px] text-purple-200/80 italic">\n                Cielos propicios para descansar, escuchar música suave y disfrutar del abrigo en el nido miau. 🐾\n              </p>\n            </div>`;

const eventBlock = `            <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/60 p-3 rounded-2xl border border-indigo-800/50 space-y-1">\n              <span className="text-[9.5px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1">\n                <Sparkles size={12} className="text-amber-300" /> Próximo evento astronómico\n              </span>\n              <p className="text-xs font-extrabold text-white">\n                🌘 Eclipse lunar penumbral · 20 de febrero de 2027\n              </p>\n              <p className="text-[10.5px] text-purple-200/80 italic">\n                Visible desde Bogotá y la Sabana de Bogotá. Milo lo tendrá en cuenta para avisarte cuando se acerque. 📍🌙\n              </p>\n            </div>`;

if (dashboard.includes(oldTransit)) dashboard = dashboard.replace(oldTransit, eventBlock);

fs.writeFileSync(dashboardPath, dashboard, "utf8");
console.log("[AstroHogar] Inicio: eliminado horóscopo/color y añadido próximo evento astronómico.");
