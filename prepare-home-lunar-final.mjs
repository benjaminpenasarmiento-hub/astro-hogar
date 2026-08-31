import fs from "node:fs";

const path = "src/components/HomeDashboard.tsx";
let source = fs.readFileSync(path, "utf8");

const startMarker = "      {/* 🌌 TARJETA 2: LUNA, CICLO Y ASTROS EN BOGOTÁ */}";
const endMarker = "      {/* ⚡ PÁGINA RÁPIDA DE ATAJOS (SHORTCUTS DASHBOARD) */}";
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error("No se encontró el bloque lunar de Inicio.");

const moonCard = `      {/* 🌙 TARJETA LUNAR DE INICIO — fuente única */}
      {(() => {
        const age = Number(miloContextState?.moon?.age ?? moonInfo?.age ?? 0);
        const synodic = 29.530588853;
        const normalizedAge = ((age % synodic) + synodic) % synodic;
        const stages = [
          { age: 0, icon: "🌑", name: "Luna nueva" },
          { age: 3.691, icon: "🌒", name: "Creciente" },
          { age: 7.382, icon: "🌓", name: "Cuarto creciente" },
          { age: 11.073, icon: "🌔", name: "Gibosa creciente" },
          { age: 14.765, icon: "🌕", name: "Luna llena" },
          { age: 18.456, icon: "🌖", name: "Gibosa menguante" },
          { age: 22.147, icon: "🌗", name: "Cuarto menguante" },
          { age: 25.838, icon: "🌘", name: "Menguante" }
        ];
        let currentIndex = 0;
        for (let i = 0; i < stages.length; i += 1) {
          if (normalizedAge >= stages[i].age) currentIndex = i;
        }
        const illumination = Math.round(((1 - Math.cos((normalizedAge / synodic) * Math.PI * 2)) / 2) * 100);
        const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
        const currentDate = new Date();
        const cycleStart = new Date(knownNewMoon + Math.floor((currentDate.getTime() - knownNewMoon) / (synodic * 86400000)) * synodic * 86400000);
        const cycleStartMs = cycleStart.getTime();
        const dateForAge = (targetAge) => {
          const cyclesAhead = normalizedAge <= targetAge ? 0 : 1;
          return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(
            new Date(cycleStartMs + (cyclesAhead * synodic + targetAge) * 86400000)
          );
        };
        const nextIndex = (currentIndex + 1) % stages.length;
        const nextAge = stages[nextIndex].age;
        const deltaToNext = ((nextAge - normalizedAge) + synodic) % synodic || synodic;
        const nextPhaseDate = new Date(currentDate.getTime() + deltaToNext * 86400000);
        const nextNewMoonDate = new Date(currentDate.getTime() + (synodic - normalizedAge) * 86400000);
        const progress = Math.max(0, Math.min(100, (normalizedAge / synodic) * 100));
        const phase = stages[currentIndex];

        return (
          <div className="lg:col-span-5 bg-gradient-to-br from-[#1A162B] via-[#231C38] to-[#120E20] text-white rounded-3xl p-5 sm:p-6 border-4 border-purple-900/40 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-0 top-0 w-40 h-40 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-purple-800/60 pb-3">
                <div>
                  <h3 className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-1.5">🌌 Cosmos & Luna en Bogotá</h3>
                  <p className="text-[10.5px] text-purple-200/80 font-medium">Estado lunar de hoy y recorrido del ciclo</p>
                </div>
                <span className="text-xl">{phase.icon}</span>
              </div>

              <div className="bg-purple-950/70 p-3.5 rounded-2xl border border-purple-800/60 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-purple-300 block">Fase lunar hoy</span>
                  <p className="text-base font-black text-amber-200 mt-1">{phase.name} {phase.icon}</p>
                  <p className="text-[10.5px] text-purple-200/90">{illumination}% iluminada · {normalizedAge.toFixed(1)} días de edad</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-purple-900/50 border border-purple-700/60 flex items-center justify-center text-3xl">{phase.icon}</div>
              </div>

              <div className="bg-purple-950/50 p-3 rounded-2xl border border-purple-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-purple-300">Ciclo lunar</span>
                  <span className="text-[9px] text-amber-200 font-black">Ahora: {phase.name}</span>
                </div>
                <div className="relative pt-4 px-2">
                  <div className="absolute left-3 right-3 top-7 h-1 rounded-full bg-purple-900 border border-purple-800" />
                  <div className="relative z-10 grid grid-cols-8 gap-1">
                    {stages.map((stage, index) => {
                      const active = index === currentIndex;
                      return (
                        <div key={stage.name} className="min-w-0 text-center">
                          <div className={(active ? "bg-amber-200 border-amber-300 scale-110 shadow-lg " : "bg-purple-950 border-purple-700 ") + "w-8 h-8 mx-auto rounded-full border flex items-center justify-center transition-transform"}>
                            <span className="text-base">{stage.icon}</span>
                          </div>
                          <p className={(active ? "text-amber-200 font-black " : "text-purple-300 ") + "text-[7px] leading-tight mt-1"}>{stage.name}</p>
                          <p className="text-[6.5px] text-purple-400 mt-0.5">{dateForAge(stage.age)}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="relative mt-2 h-1.5 rounded-full bg-purple-950 border border-purple-800 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-400 via-amber-300 to-purple-400 rounded-full" style={{ width: progress + "%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-purple-800/50 space-y-2">
              <div className="bg-indigo-950/60 p-3 rounded-2xl border border-indigo-800/50">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-indigo-300">✨ Próximo evento astronómico</span>
                <p className="text-xs font-extrabold text-white mt-1">🌘 Eclipse lunar penumbral · 20 de febrero de 2027</p>
                <p className="text-[10px] text-purple-200/80 mt-1">Milo lo tendrá presente para avisarte cuando se acerque.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-purple-950/40 rounded-xl border border-purple-800/50 p-2.5">
                  <p className="text-[9px] uppercase font-black text-purple-300">Próxima fase</p>
                  <p className="text-[10px] font-black text-white mt-1">{stages[nextIndex].icon} {stages[nextIndex].name}</p>
                  <p className="text-[9px] text-purple-300">{new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(nextPhaseDate)}</p>
                </div>
                <div className="bg-purple-950/40 rounded-xl border border-purple-800/50 p-2.5">
                  <p className="text-[9px] uppercase font-black text-purple-300">Próxima Luna nueva</p>
                  <p className="text-[10px] font-black text-white mt-1">🌑 {new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(nextNewMoonDate)}</p>
                  <p className="text-[9px] text-purple-300">Cierre del ciclo</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

`;

source = source.slice(0, start) + moonCard + source.slice(end);
fs.writeFileSync(path, source, "utf8");
console.log("[AstroHogar] Inicio: vista lunar única restaurada con ciclo, fechas y evento cercano.");
