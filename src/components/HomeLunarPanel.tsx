import React, { useMemo } from "react";

type MoonSource = {
  phase?: string;
  illuminationPct?: number;
  age?: number;
  nextNewMoonText?: string;
} | null | undefined;

type LunarStage = {
  key: string;
  icon: string;
  short: string;
  long: string;
  age: number;
};

const STAGES: LunarStage[] = [
  { key: "new", icon: "🌑", short: "Nueva", long: "Luna nueva", age: 0 },
  { key: "waxing-crescent", icon: "🌒", short: "Creciente", long: "Creciente", age: 3.691 },
  { key: "first-quarter", icon: "🌓", short: "Cuarto", long: "Cuarto creciente", age: 7.382 },
  { key: "waxing-gibbous", icon: "🌔", short: "Gibosa ↗", long: "Gibosa creciente", age: 11.073 },
  { key: "full", icon: "🌕", short: "Llena", long: "Luna llena", age: 14.765 },
  { key: "waning-gibbous", icon: "🌖", short: "Gibosa ↘", long: "Gibosa menguante", age: 18.456 },
  { key: "last-quarter", icon: "🌗", short: "Cuarto", long: "Cuarto menguante", age: 22.147 },
  { key: "waning-crescent", icon: "🌘", short: "Menguante", long: "Menguante", age: 25.838 },
];

const SYNODIC_MONTH = 29.530588853;
const REFERENCE_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);

function normalizeAge(value: number) {
  const age = Number.isFinite(value) ? value : 0;
  return ((age % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
}

/**
 * Determina la fase por el punto medio entre hitos para no adelantar/atrasar
 * la fase cuando la edad cae cerca del límite de cada etapa.
 */
function phaseIndex(age: number) {
  const normalized = normalizeAge(age);
  const thresholds = STAGES.map((stage, index) => {
    const nextAge = index === STAGES.length - 1 ? SYNODIC_MONTH : STAGES[index + 1].age;
    return stage.age + (nextAge - stage.age) / 2;
  });

  for (let index = 0; index < thresholds.length; index += 1) {
    if (normalized < thresholds[index]) return index;
  }

  return 0;
}

function localDateLabel(date: Date) {
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(date);
}

function dateForAge(now: Date, age: number) {
  const elapsedDays = (now.getTime() - REFERENCE_NEW_MOON) / 86400000;
  const cycles = Math.floor(elapsedDays / SYNODIC_MONTH);
  const cycleStart = REFERENCE_NEW_MOON + cycles * SYNODIC_MONTH * 86400000;
  return new Date(cycleStart + age * 86400000);
}

export default function HomeLunarPanel({
  moonInfo,
  liveMoon,
  city = "Bogotá",
}: {
  moonInfo?: MoonSource;
  liveMoon?: MoonSource;
  city?: string;
}) {
  const model = liveMoon || moonInfo || {};
  const age = normalizeAge(Number(model.age ?? 0));
  const currentIndex = phaseIndex(age);
  const currentStage = STAGES[currentIndex];
  const progress = Math.max(0, Math.min(100, (age / SYNODIC_MONTH) * 100));
  const illumination = Number(
    model.illuminationPct ??
      Math.round(((1 - Math.cos((age / SYNODIC_MONTH) * Math.PI * 2)) / 2) * 100),
  );
  const now = new Date();

  const nextIndex = (currentIndex + 1) % STAGES.length;
  const nextStage = STAGES[nextIndex];
  const daysToNext =
    ((nextStage.age - age) + SYNODIC_MONTH) % SYNODIC_MONTH || SYNODIC_MONTH;
  const nextPhaseDate = new Date(now.getTime() + daysToNext * 86400000);
  const daysToNewMoon = (SYNODIC_MONTH - age) % SYNODIC_MONTH || SYNODIC_MONTH;
  const nextNewMoon = new Date(now.getTime() + daysToNewMoon * 86400000);

  /**
   * Recorrido centrado en la fase actual:
   * 3 fases anteriores → AHORA → 4 fases siguientes.
   * Así nunca se pierde la mitad menguante del ciclo y el flujo visual
   * siempre avanza cronológicamente.
   */
  const cycleStages = useMemo(
    () =>
      Array.from({ length: STAGES.length }, (_, offset) => {
        const index = (currentIndex - 3 + offset + STAGES.length) % STAGES.length;
        return { stage: STAGES[index], index };
      }),
    [currentIndex],
  );

  const stageDates = useMemo(() => {
    return cycleStages.map(({ stage }) => {
      const delta = stage.age - age;
      const forwardDelta = delta >= 0 ? delta : delta + SYNODIC_MONTH;
      return new Date(now.getTime() + forwardDelta * 86400000);
    });
  }, [age, cycleStages]);

  const event = {
    name: "Eclipse lunar penumbral",
    date: "20 feb 2027",
    note: `Evento para seguir desde ${city}. Milo puede recordarlo cuando se acerque.`,
  };

  return (
    <div className="lg:col-span-5 bg-gradient-to-br from-[#1A162B] via-[#231C38] to-[#120E20] text-white rounded-3xl p-5 sm:p-6 border-4 border-purple-900/40 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between">
      <div className="absolute right-0 top-0 w-40 h-40 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="space-y-3 relative">
        <div className="flex items-center justify-between border-b border-purple-800/60 pb-3">
          <div>
            <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">🌙 Luna en {city}</h3>
            <p className="text-[10.5px] text-purple-200/80 font-medium">Estado de hoy y recorrido del ciclo</p>
          </div>
          <span className="text-2xl">{currentStage.icon}</span>
        </div>

        <div className="bg-purple-950/70 p-3.5 rounded-2xl border border-purple-800/60 flex items-center justify-between gap-3">
          <div>
            <span className="text-[9.5px] font-black uppercase tracking-wider text-purple-300 block">Fase lunar hoy</span>
            <p className="text-base font-black text-amber-200 mt-1">
              {currentStage.long} {currentStage.icon}
            </p>
            <p className="text-[10.5px] text-purple-200/90">
              {illumination}% iluminada · {age.toFixed(1)} días de edad
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-purple-900/50 border border-purple-700/60 flex items-center justify-center text-3xl shrink-0">
            {currentStage.icon}
          </div>
        </div>

        <div className="bg-purple-950/50 p-3 rounded-2xl border border-purple-800/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-purple-300">Ciclo lunar</span>
            <span className="text-[9px] text-amber-200 font-black">Ahora · {currentStage.short}</span>
          </div>

          <div className="relative px-1">
            <div className="relative">
              <div className="absolute left-4 right-4 top-7 h-1 rounded-full bg-purple-900 border border-purple-800" />

              <div className="relative z-10 grid grid-cols-8 gap-1">
                {cycleStages.map(({ stage, index }, position) => {
                  const active = index === currentIndex;
                  const stageDate = stageDates[position];

                  return (
                    <div key={stage.key} className="min-w-0 text-center">
                      <div
                        className={
                          (active
                            ? "bg-amber-200 border-amber-300 scale-110 shadow-lg "
                            : "bg-purple-950 border-purple-700 ") +
                          "w-8 h-8 mx-auto rounded-full border flex items-center justify-center transition-transform"
                        }
                      >
                        <span className="text-base">{stage.icon}</span>
                      </div>
                      <p
                        className={
                          (active ? "text-amber-200 font-black " : "text-purple-300 ") +
                          "text-[7px] leading-tight mt-1"
                        }
                      >
                        {stage.short}
                      </p>
                      <p className="text-[6.5px] text-purple-400 mt-0.5">
                        {localDateLabel(stageDate)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="relative mt-2 h-1.5 rounded-full bg-purple-950 border border-purple-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-400 via-amber-300 to-purple-400 rounded-full"
                  style={{ width: progress + "%" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-purple-800/50 space-y-2 relative">
        <div className="bg-indigo-950/60 p-3 rounded-2xl border border-indigo-800/50">
          <span className="text-[9.5px] font-black uppercase tracking-wider text-indigo-300">
            ✨ Próximo evento astronómico
          </span>
          <p className="text-xs font-extrabold text-white mt-1">
            🌘 {event.name} · {event.date}
          </p>
          <p className="text-[10px] text-purple-200/80 mt-1">{event.note}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-purple-950/40 rounded-xl border border-purple-800/50 p-2.5">
            <p className="text-[9px] uppercase font-black text-purple-300">Próxima fase</p>
            <p className="text-[10px] font-black text-white mt-1">
              {nextStage.icon} {nextStage.long}
            </p>
            <p className="text-[9px] text-purple-300">{localDateLabel(nextPhaseDate)}</p>
          </div>

          <div className="bg-purple-950/40 rounded-xl border border-purple-800/50 p-2.5">
            <p className="text-[9px] uppercase font-black text-purple-300">Próxima Luna nueva</p>
            <p className="text-[10px] font-black text-white mt-1">
              🌑 {localDateLabel(nextNewMoon)}
            </p>
            <p className="text-[9px] text-purple-300">Cierre del ciclo</p>
          </div>
        </div>
      </div>
    </div>
  );
}
