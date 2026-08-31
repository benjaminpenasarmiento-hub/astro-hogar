import fs from "node:fs";

const path = "src/components/HomeDashboard.tsx";
let source = fs.readFileSync(path, "utf8");

const markerStart = "      {/* 🌌 TARJETA 2: LUNA, CICLO Y ASTROS EN BOGOTÁ */}";
const markerEnd = "      {/* ⚡ PÁGINA RÁPIDA DE ATAJOS (SHORTCUTS DASHBOARD) */}";

const start = source.indexOf(markerStart);
const end = source.indexOf(markerEnd, start);

if (start === -1 || end === -1) {
  throw new Error("No se encontró el bloque de Luna de Inicio para restaurarlo.");
}

const moonCard = `      {/* 🌌 TARJETA 2: LUNA, CICLO Y ASTROS EN BOGOTÁ */}
      <div className="lg:col-span-5 bg-gradient-to-br from-[#1A162B] via-[#231C38] to-[#120E20] text-white rounded-3xl p-5 sm:p-6 border-4 border-purple-900/40 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between">
        <div className="absolute right-0 top-0 w-40 h-40 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-purple-800/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-purple-900/60 text-purple-200 rounded-2xl text-lg border border-purple-700/50">🌌</span>
              <div>
                <h3 className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-1.5">Cosmos & Luna en Bogotá</h3>
                <p className="text-[10.5px] text-purple-200/80 font-medium">Ciclo lunar y próximos cielos del nido</p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-purple-950 text-purple-200 border border-purple-700/60 rounded-full">Hemisferio Norte 📍</span>
          </div>

          <div className="bg-purple-950/70 p-3.5 rounded-2xl border border-purple-800/60 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-purple-300 block">Fase Lunar Hoy</span>
              <p className="text-base font-black text-amber-200 flex items-center gap-1.5"><span>{moonInfo ? moonInfo.phase : moonPhase.name}</span></p>
              <p className="text-[10.5px] text-purple-200/90 leading-tight">{moonInfo ? moonInfo.meaning : moonPhase.description}</p>
            </div>
            <div className="text-right shrink-0 bg-purple-900/40 p-2.5 rounded-xl border border-purple-700/40">
              <span className="text-xs font-mono font-black text-purple-200 block">{miloContextState?.moon?.illuminationPct ?? moonInfo?.illuminationPct ?? 0}% Iluminada</span>
              <span className="text-[9.5px] text-purple-300 block">{miloContextState?.moon?.age ?? moonInfo?.age ?? 0} días de edad</span>
            </div>
          </div>

          <div className="bg-purple-950/50 p-3 rounded-2xl border border-purple-800/50 space-y-2">
            <div className="flex items-center justify-between text-[9.5px] font-black uppercase tracking-wider text-purple-300">
              <span>Recorrido lunar</span>
              <span>{miloContextState?.moon?.nextNewMoonText || moonInfo?.nextNewMoonText || "Próxima Luna nueva"}</span>
            </div>
            <div className="relative px-1 pt-2 pb-1">
              <div className="absolute left-2 right-2 top-5 h-1 rounded-full bg-purple-900 border border-purple-800" />
              <div className="relative z-10 grid grid-cols-8 gap-1">
                {["🌑","🌒","🌓","🌔","🌕","🌖","🌗","🌘"].map((icon, idx) => (
                  <div key={icon} className={`flex flex-col items-center gap-1 ${idx === 5 ? "scale-110" : ""}`}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center border ${idx === 5 ? "bg-amber-200 border-amber-300 shadow-lg" : "bg-purple-950/95 border-purple-700"}`}>{icon}</span>
                    <span className="text-[7.5px] text-purple-300 text-center leading-tight">{["Nueva","Creciente","1er cuarto","Gibosa","Llena","Gibosa","3er cuarto","Menguante"][idx]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-purple-800/50 space-y-2">
          <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/60 p-3 rounded-2xl border border-indigo-800/50 space-y-1">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1"><Sparkles size={12} className="text-amber-300" /> Próximo evento astronómico</span>
            <p className="text-xs font-extrabold text-white">🌘 Eclipse lunar penumbral · 20 de febrero de 2027</p>
            <p className="text-[10.5px] text-purple-200/80 leading-relaxed">Será el próximo eclipse que podremos seguir desde Bogotá; Milo podrá avisarte cuando se acerque. 📍🌙</p>
          </div>
          <div className="flex items-center justify-between text-[11px] font-extrabold text-purple-200">
            <span className="flex items-center gap-1"><Moon size={12} className="text-purple-300" /> Próxima Luna nueva:</span>
            <span className="text-amber-200 font-mono">{miloContextState?.moon?.nextNewMoonText || moonInfo?.nextNewMoonText || "—"}</span>
          </div>
        </div>
      </div>

    </div>\n\n`;

source = source.slice(0, start) + moonCard + source.slice(end);
fs.writeFileSync(path, source, "utf8");
console.log("[AstroHogar] Inicio: restaurada la vista lunar aprobada + próximo evento astronómico.");
