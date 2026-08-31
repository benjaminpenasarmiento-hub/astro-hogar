import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Moon, Sparkles } from "lucide-react";
import { getAiHoroscope, getAiMoonInfo } from "../api";
import { UserProfile } from "../types";

const SYNODIC = 29.53059;
const PHASES = [
  { age: 0, label: "Luna nueva", emoji: "🌑" },
  { age: 3.691, label: "Creciente", emoji: "🌒" },
  { age: 7.382, label: "Cuarto creciente", emoji: "🌓" },
  { age: 11.073, label: "Gibosa creciente", emoji: "🌔" },
  { age: 14.765, label: "Luna llena", emoji: "🌕" },
  { age: 18.456, label: "Gibosa menguante", emoji: "🌖" },
  { age: 22.147, label: "Cuarto menguante", emoji: "🌗" },
  { age: 25.838, label: "Menguante", emoji: "🌘" },
] as const;

function fmtDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short" }).format(date);
}

function currentPhaseIndex(age: number) {
  const normalized = ((age % SYNODIC) + SYNODIC) % SYNODIC;
  let idx = 0;
  for (let i = 0; i < PHASES.length; i++) {
    if (normalized >= PHASES[i].age) idx = i;
  }
  return idx;
}

function phaseDates(age: number) {
  const now = new Date();
  const currentIdx = currentPhaseIndex(age);
  const currentAge = ((age % SYNODIC) + SYNODIC) % SYNODIC;
  const lastNew = new Date(now.getTime() - currentAge * 86400000);
  const quarter = SYNODIC / 8;
  return PHASES.map((phase, idx) => {
    let delta = (phase.age - currentAge + SYNODIC) % SYNODIC;
    if (idx === currentIdx) delta = 0;
    return { ...phase, date: idx === currentIdx ? now : new Date(lastNew.getTime() + phase.age * 86400000), delta };
  });
}

function localNextMajorPhase(age: number) {
  const now = new Date();
  const normalized = ((age % SYNODIC) + SYNODIC) % SYNODIC;
  const next = PHASES.find(p => p.age > normalized) || PHASES[0];
  const days = next.age > normalized ? next.age - normalized : SYNODIC - normalized + next.age;
  return { ...next, date: new Date(now.getTime() + days * 86400000) };
}

export default function HomeAstralToday({ users, homeCity }: { users: UserProfile[]; homeCity: string }) {
  const [moon, setMoon] = useState<any>(null);
  const [horoscope, setHoroscope] = useState<any>(null);

  useEffect(() => {
    Promise.all([getAiMoonInfo(), getAiHoroscope(false)]).then(([m, h]) => {
      setMoon(m);
      setHoroscope(h);
    }).catch(() => {});
  }, []);

  const age = Number(moon?.age ?? 0);
  const illumination = Number(moon?.illuminationPct ?? 0);
  const phaseName = moon?.phase || moon?.phaseName || "Fase lunar de hoy";
  const idx = currentPhaseIndex(age);
  const phases = useMemo(() => phaseDates(age), [age]);
  const nextPhase = useMemo(() => localNextMajorPhase(age), [age]);

  return (
    <div className="bg-gradient-to-br from-[#1A162B] via-[#231C38] to-[#120E20] text-white rounded-3xl p-5 border-4 border-purple-900/40 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-purple-800/60 pb-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-wider text-purple-300">🌙 Estado de la Luna hoy</div>
          <div className="font-black text-lg text-amber-200 flex items-center gap-2">{phaseName} <span>{PHASES[idx].emoji}</span></div>
          <div className="text-[10px] text-purple-200/80">{homeCity} · {illumination}% iluminada · {age.toFixed(1)} días de edad</div>
        </div>
        <Moon size={22} className="text-purple-200" />
      </div>

      <div className="relative pt-3">
        <div className="absolute left-[5%] right-[5%] top-[29px] h-1 rounded-full bg-purple-900/80" />
        <div className="relative grid grid-cols-4 md:grid-cols-8 gap-1">
          {phases.map((p, i) => (
            <div key={p.label} className="flex flex-col items-center text-center gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 text-sm ${i === idx ? "bg-amber-300 text-[#241A08] border-amber-100 scale-110" : "bg-purple-950 text-purple-100 border-purple-700"}`}>{p.emoji}</div>
              <div className="text-[8px] font-black leading-tight">{p.label}</div>
              <div className="text-[8px] text-purple-300">{fmtDate(p.date)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-purple-950/60 rounded-2xl border border-purple-800/60 p-3">
          <div className="text-[9px] uppercase font-black tracking-wider text-purple-300">Próxima fase</div>
          <div className="font-black text-sm mt-1 text-white">{nextPhase.emoji} {nextPhase.label}</div>
          <div className="text-[10px] text-purple-200 mt-1">{fmtDate(nextPhase.date)}</div>
        </div>
        <div className="bg-purple-950/60 rounded-2xl border border-purple-800/60 p-3">
          <div className="text-[9px] uppercase font-black tracking-wider text-purple-300 flex items-center gap-1"><CalendarDays size={11}/> Próxima Luna nueva</div>
          <div className="font-black text-sm mt-1 text-white">{moon?.nextNewMoonText || "Calculando…"}</div>
          <div className="text-[10px] text-purple-200 mt-1">Ciclo lunar sincronizado con la fecha local.</div>
        </div>
      </div>

      <div className="bg-white/5 rounded-2xl border border-purple-800/50 p-3">
        <div className="text-[9px] uppercase font-black tracking-wider text-amber-300 flex items-center gap-1"><Sparkles size={11}/> Horóscopo y color de hoy</div>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          {users.map((u) => {
            const pred = horoscope?.userPredictions?.find((p: any) => p.userId === u.id || p.userName?.toLowerCase() === u.name?.toLowerCase());
            const color = pred?.luckyColor || "Color no definido";
            return <div key={u.id} className="bg-white/5 border border-purple-800/40 rounded-xl p-2.5">
              <div className="text-xs font-black">{u.name} · {u.zodiacSign || "signo no registrado"}</div>
              <p className="text-[10px] text-purple-100 mt-1 leading-relaxed">{pred?.prediction || "Milo todavía no tiene una lectura personalizada para hoy."}</p>
              <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded-full bg-amber-300/15 border border-amber-300/30 text-amber-200 text-[9px] font-black">🎨 {color}</div>
            </div>;
          })}
          {!users.length && <div className="text-[10px] text-purple-200">Todavía no hay usuarios registrados para personalizar el horóscopo.</div>}
        </div>
      </div>
    </div>
  );
}
