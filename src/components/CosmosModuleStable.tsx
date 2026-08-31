import React, { useEffect, useMemo, useState } from "react";
import { RefreshCw, Moon, CalendarDays, MapPin, Sparkles } from "lucide-react";
import { UserProfile } from "../types";
import { getAiHoroscope, getAiMoonInfo } from "../api";

interface CosmosModuleStableProps {
  users: UserProfile[];
  onRefreshAll?: () => void;
}

const PHASES = [
  { key: "new", label: "Luna nueva", emoji: "🌑" },
  { key: "waxing", label: "Cuarto creciente", emoji: "🌓" },
  { key: "full", label: "Luna llena", emoji: "🌕" },
  { key: "waning", label: "Cuarto menguante", emoji: "🌗" }
] as const;

function phaseIndexFromName(name: string) {
  const n = name.toLowerCase();
  if (n.includes("nueva")) return 0;
  if (n.includes("crec") || n.includes("wax")) return 1;
  if (n.includes("llena") || n.includes("full")) return 2;
  return 3;
}

function phaseProgress(age: number) {
  return Math.max(0, Math.min(100, ((age % 29.53059) / 29.53059) * 100));
}

function formatLocalDate(date: Date, timeZone?: string) {
  try {
    return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone }).format(date);
  } catch {
    return date.toLocaleDateString("es-CO");
  }
}

export default function CosmosModuleStable({ users, onRefreshAll }: CosmosModuleStableProps) {
  const [moon, setMoon] = useState<any>(null);
  const [horoscope, setHoroscope] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [locationLabel, setLocationLabel] = useState("Ubicación local no disponible");
  const [timeZone, setTimeZone] = useState<string | undefined>(undefined);

  const load = async () => {
    setLoading(true);
    try {
      const [moonData, horoscopeData] = await Promise.all([getAiMoonInfo(), getAiHoroscope(false)]);
      setMoon(moonData);
      setHoroscope(horoscopeData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (typeof window !== "undefined") {
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => setLocationLabel(`${coords.latitude.toFixed(2)}°, ${coords.longitude.toFixed(2)}°`),
          () => setLocationLabel("Usando contexto horario del dispositivo")
        );
      }
    }
  }, []);

  const phaseName = moon?.phase || moon?.phaseName || "Fase lunar actual";
  const age = Number(moon?.age ?? 0);
  const illumination = Number(moon?.illuminationPct ?? 0);
  const progress = phaseProgress(age);
  const currentPhaseIndex = phaseIndexFromName(phaseName);
  const currentPhase = PHASES[currentPhaseIndex];

  const phaseDates = useMemo(() => {
    const now = new Date();
    const newMoonDate = new Date(now.getTime() - age * 86400000);
    const step = 29.53059 / 4;
    return PHASES.map((phase, index) => {
      const offset = ((index - currentPhaseIndex + 4) % 4) * step;
      return { ...phase, date: new Date(newMoonDate.getTime() + index * step * 86400000 + (index === 0 ? 0 : 0)), offset, formatted: formatLocalDate(new Date(newMoonDate.getTime() + index * step * 86400000), timeZone) };
    });
  }, [age, currentPhaseIndex, timeZone]);

  const nextEvent = horoscope?.astralClimate?.cosmicEvent || horoscope?.astralClimate?.cosmic_event || "Milo buscará el próximo fenómeno astronómico relevante para vuestra ubicación.";

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-[#F3EFE6] pb-4">
        <div>
          <h2 className="text-xl font-black text-[#2C2723] flex items-center gap-2">🌌 Cosmos</h2>
          <p className="text-xs text-[#8A817C] font-semibold">La Luna de hoy, su ciclo y lo que viene cerca.</p>
        </div>
        <button onClick={load} disabled={loading} className="px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E7E2D5] text-xs font-black flex items-center gap-2 hover:bg-white disabled:opacity-50">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""}/>
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-gradient-to-br from-[#1A162B] via-[#231C38] to-[#120E20] text-white rounded-3xl p-5 border-4 border-purple-900/40 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-purple-900/60 border border-purple-700/50 flex items-center justify-center text-2xl">{currentPhase.emoji}</span>
              <div>
                <div className="text-[9px] font-black uppercase tracking-wider text-purple-300">Fase lunar de hoy</div>
                <div className="font-black text-lg text-amber-200">{phaseName}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-black text-purple-200">{illumination}% iluminada</div>
              <div className="text-[9px] text-purple-300">Día {age.toFixed(1)} del ciclo</div>
            </div>
          </div>

          <div className="relative pt-4 pb-2">
            <div className="absolute top-[31px] left-4 right-4 h-1 rounded-full bg-purple-900/70"/>
            <div className="relative flex justify-between">
              {phaseDates.map((phase, idx) => {
                const active = idx === currentPhaseIndex;
                return (
                  <div key={phase.key} className="flex flex-col items-center gap-1 w-1/4">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-sm ${active ? "bg-amber-300 text-[#241A08] border-amber-200 scale-110" : "bg-purple-950 text-purple-200 border-purple-700"}`}>{phase.emoji}</span>
                    <span className="text-[9px] font-black text-center">{phase.label}</span>
                    <span className="text-[8px] text-purple-300 text-center">{phase.formatted}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 h-2 rounded-full bg-purple-950/80 overflow-hidden border border-purple-800/60">
            <div className="h-full bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-300 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[9px] text-purple-300">
            <span>Luna nueva</span>
            <span>Ahora</span>
            <span>Próxima luna nueva</span>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl p-5 border-2 border-[#E7E2D5] shadow-sm">
            <div className="flex items-center gap-2 mb-2"><Moon size={16} className="text-purple-600"/><span className="text-[10px] font-black uppercase tracking-wider text-[#6D5A8D]">Próxima luna nueva</span></div>
            <p className="text-lg font-black text-[#2C2723]">{moon?.nextNewMoonText || "Calculando…"}</p>
            <p className="mt-1 text-[10px] text-[#8A817C]">El ciclo se actualiza con el estado lunar calculado para hoy.</p>
          </div>

          <div className="bg-[#FAF7F2] rounded-3xl p-5 border-2 border-[#E7E2D5]">
            <div className="flex items-center gap-2 mb-2"><Sparkles size={16} className="text-amber-600"/><span className="text-[10px] font-black uppercase tracking-wider text-[#8C5D23]">Evento astronómico cercano</span></div>
            <p className="text-sm font-extrabold text-[#2C2723] leading-snug">{nextEvent}</p>
            <p className="mt-3 text-[10px] text-[#8A817C] flex items-center gap-1"><MapPin size={11}/> Contexto local: {locationLabel}</p>
            <p className="mt-1 text-[10px] text-[#8A817C] flex items-center gap-1"><CalendarDays size={11}/> Zona horaria: {timeZone || "local"}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border-2 border-[#E7E2D5] p-5">
        <h3 className="font-black text-[#2C2723] text-sm mb-3">✨ ¿Cómo puede sentirse en el hogar?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {users.map((u) => {
            const prediction = horoscope?.userPredictions?.find((p: any) => p.userId === u.id || p.userName?.toLowerCase() === u.name?.toLowerCase());
            return (
              <div key={u.id} className="bg-[#FCFAF7] rounded-2xl p-3 border border-[#F3EFE6]">
                <div className="text-xs font-black text-[#2C2723]">{u.name} · {u.zodiacSign || "signo no registrado"}</div>
                <p className="text-[11px] text-[#625B57] mt-1 leading-relaxed">{prediction?.prediction || "Milo todavía no tiene una lectura específica para este usuario."}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
