import React, { useState, useEffect } from "react";
import { Sparkles, Sun, RefreshCw, Moon, Calendar, Eye } from "lucide-react";
import { UserProfile } from "../types";
import { getAiHoroscope } from "../api";
import { Avatar } from "./Avatar";

const getZodiacPalette = (sign: string) => {
  const s = (sign || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // strip accents
  
  if (s.includes("aries")) {
    return {
      bg: "bg-[#FFF5F5]",
      border: "border-red-200 hover:border-red-300",
      accent: "text-red-600 bg-red-50 border-red-100",
      label: "text-red-600",
      icon: "🔥",
      heading: "Aries",
      glow: "shadow-[0_0_15px_rgba(239,68,68,0.12)]",
    };
  }
  if (s.includes("tauro")) {
    return {
      bg: "bg-[#F0FDF4]",
      border: "border-emerald-200 hover:border-emerald-300",
      accent: "text-emerald-700 bg-emerald-50 border-emerald-100",
      label: "text-emerald-600",
      icon: "🪵",
      heading: "Tauro",
      glow: "shadow-[0_0_15px_rgba(16,185,129,0.12)]",
    };
  }
  if (s.includes("geminis") || s.includes("gemini")) {
    return {
      bg: "bg-[#FEFCE8]",
      border: "border-yellow-200 hover:border-yellow-300",
      accent: "text-yellow-700 bg-yellow-50 border-yellow-100",
      label: "text-yellow-600",
      icon: "💨",
      heading: "Géminis",
      glow: "shadow-[0_0_15px_rgba(234,179,8,0.12)]",
    };
  }
  if (s.includes("cancer")) {
    return {
      bg: "bg-[#ECFEFF]",
      border: "border-cyan-200 hover:border-cyan-300",
      accent: "text-cyan-700 bg-cyan-50 border-cyan-100",
      label: "text-cyan-600",
      icon: "🌊",
      heading: "Cáncer",
      glow: "shadow-[0_0_15px_rgba(6,182,212,0.12)]",
    };
  }
  if (s.includes("leo")) {
    return {
      bg: "bg-[#FFFBEB]",
      border: "border-amber-200 hover:border-amber-300",
      accent: "text-amber-700 bg-amber-50 border-amber-100",
      label: "text-amber-600",
      icon: "🔥",
      heading: "Leo",
      glow: "shadow-[0_0_15px_rgba(245,158,11,0.12)]",
    };
  }
  if (s.includes("virgo")) {
    return {
      bg: "bg-[#F4F9F4]",
      border: "border-teal-200 hover:border-teal-300",
      accent: "text-teal-700 bg-teal-50 border-teal-100",
      label: "text-teal-600",
      icon: "🪵",
      heading: "Virgo",
      glow: "shadow-[0_0_15px_rgba(20,184,166,0.12)]",
    };
  }
  if (s.includes("libra")) {
    return {
      bg: "bg-[#FDF2F8]",
      border: "border-pink-200 hover:border-pink-300",
      accent: "text-pink-700 bg-pink-50 border-pink-100",
      label: "text-pink-600",
      icon: "💨",
      heading: "Libra",
      glow: "shadow-[0_0_15px_rgba(236,72,153,0.12)]",
    };
  }
  if (s.includes("escorpio") || s.includes("scorpio")) {
    return {
      bg: "bg-[#FAF5FF]",
      border: "border-purple-200 hover:border-purple-300",
      accent: "text-purple-700 bg-purple-50 border-purple-100",
      label: "text-purple-600",
      icon: "🌊",
      heading: "Escorpio",
      glow: "shadow-[0_0_15px_rgba(139,92,246,0.12)]",
    };
  }
  if (s.includes("sagitario") || s.includes("sagittarius")) {
    return {
      bg: "bg-[#F3E8FF]",
      border: "border-indigo-200 hover:border-indigo-300",
      accent: "text-indigo-700 bg-indigo-50 border-indigo-100",
      label: "text-indigo-600",
      icon: "🔥",
      heading: "Sagitario",
      glow: "shadow-[0_0_15px_rgba(79,70,229,0.12)]",
    };
  }
  if (s.includes("capricornio") || s.includes("capricorn")) {
    return {
      bg: "bg-[#F8FAFC]",
      border: "border-slate-200 hover:border-slate-300",
      accent: "text-slate-700 bg-slate-50 border-slate-100",
      label: "text-slate-600",
      icon: "🪵",
      heading: "Capricornio",
      glow: "shadow-[0_0_15px_rgba(100,116,139,0.12)]",
    };
  }
  if (s.includes("acuario") || s.includes("aquarius")) {
    return {
      bg: "bg-[#EFF6FF]",
      border: "border-blue-200 hover:border-blue-300",
      accent: "text-blue-700 bg-blue-50 border-blue-100",
      label: "text-blue-600",
      icon: "💨",
      heading: "Acuario",
      glow: "shadow-[0_0_15px_rgba(59,130,246,0.12)]",
    };
  }
  if (s.includes("piscis") || s.includes("pisces")) {
    return {
      bg: "bg-[#F0FDF4]",
      border: "border-cyan-200 hover:border-cyan-300",
      accent: "text-cyan-700 bg-cyan-50 border-cyan-100",
      label: "text-cyan-600",
      icon: "🌊",
      heading: "Piscis",
      glow: "shadow-[0_0_15px_rgba(6,182,212,0.12)]",
    };
  }

  return {
    bg: "bg-[#FAF8FF]",
    border: "border-violet-200 hover:border-violet-300",
    accent: "text-violet-700 bg-violet-50 border-violet-100",
    label: "text-violet-600",
    icon: "✨",
    heading: "Sintonía Astral",
    glow: "shadow-[0_0_15px_rgba(109,40,217,0.10)]",
  };
};

interface CosmosModuleProps {
  users: UserProfile[];
  onRefreshAll?: () => void;
}

export default function CosmosModule({ users, onRefreshAll }: CosmosModuleProps) {
  const [zodiacPredictions, setZodiacPredictions] = useState<Array<{
    userId: string;
    userName: string;
    prediction: string;
    predictionSalud?: string;
    predictionAmor?: string;
    predictionTrabajo?: string;
    predictionEspiritualidad?: string;
    advice: string;
    luckyColor?: string;
    luckyColorDesc?: string;
    recommendedActivities?: string[];
  }>>([]);

  const [astralClimate, setAstralClimate] = useState<{
    sunSign: string;
    moonSign: string;
    sunMoonMeaning: string;
    otherPlanetsInfluence: string;
    cosmicEvent: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const loadData = async (forceRegenerate = false) => {
    setIsLoading(true);
    try {
      const data = await getAiHoroscope(forceRegenerate);
      if (data && Array.isArray((data as any).userPredictions)) {
        setZodiacPredictions((data as any).userPredictions);
        if ((data as any).astralClimate) {
          setAstralClimate((data as any).astralClimate);
        }
      } else if (data) {
        const mapped = Object.entries(data).map(([key, value]: [string, any]) => ({
          userId: key,
          userName: key.charAt(0).toUpperCase() + key.slice(1),
          prediction: value.prediction || "",
          predictionSalud: value.predictionSalud || "",
          predictionAmor: value.predictionAmor || "",
          predictionTrabajo: value.predictionTrabajo || "",
          predictionEspiritualidad: value.predictionEspiritualidad || "",
          advice: value.advice || "",
          luckyColor: value.luckyColor || "",
          luckyColorDesc: value.luckyColorDesc || "",
          recommendedActivities: value.recommendedActivities || []
        }));
        setZodiacPredictions(mapped);
        if ((data as any).astralClimate) {
          setAstralClimate((data as any).astralClimate);
        }
      }
    } catch (err) {
      console.error("Error loading cosmos", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const climate = astralClimate || {
    sunSign: "Géminis ♊",
    moonSign: "Acuario ♒",
    sunMoonMeaning: "La conjunción cósmica de hoy genera un aire fresco apto para la reconciliación cotidiana miau.",
    otherPlanetsInfluence: "Mercurio retrógrado te invita a comunicarte con total calma y revisar acuerdos antes de actuar miau.",
    cosmicEvent: "Lluvia de estrellas Líridas — Estimula vuestro tercer ojo y la intuición colectiva hoy."
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12 px-4 sm:px-6">
      
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-[#F3EFE6] pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#2C2723] uppercase tracking-tight flex items-center gap-2">
            🌌 Cosmos y Clima Astral
          </h2>
          <p className="text-xs text-[#8A817C] font-semibold">
            Sintonización astrológica completa para potenciar vuestro nido compartido
          </p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 transition-all shadow cursor-pointer disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          {isLoading ? "Recalculando..." : "Actualizar Sintonía Celestial"}
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-3xl p-12 text-center border-4 border-purple-100/60 shadow-xs space-y-3">
          <span className="text-4xl inline-block animate-spin">🌌</span>
          <p className="text-cute text-sm font-extrabold text-[#2C2723] animate-pulse">Sintonizando el alineamiento del cosmos...</p>
          <p className="text-[11px] text-[#8A817C]">Milo está usando el oráculo celestial para leer tu Sol miau 🐾</p>
        </div>
      ) : (
        <>
          {/* 🌌 CONECTIVIDAD CÓSMICA Y CLIMA SINÁSTRICO (Corto) */}
          <div className="bg-gradient-to-r from-purple-100/70 via-indigo-50/70 to-pink-100/70 p-4 sm:p-5 rounded-3xl border-2 border-purple-200/60 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl shrink-0 animate-bounce">✨</span>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-purple-900 bg-purple-100/80 px-2.5 py-0.5 rounded-full border border-purple-200 uppercase tracking-wider block w-fit">
                  💞 SINERGIA CELESTIAL DE PAREJA
                </span>
                <p className="text-xs font-black text-[#2C2723] leading-tight">
                  Compatibilidad Molecular: {users[0]?.name || "Inquilino 1"} ({users[0]?.zodiacSign || "Místico"}) & {users[1]?.name || "Inquilino 2"} ({users[1]?.zodiacSign || "Místico"})
                </p>
                <p className="text-[11px] text-[#5C5552] leading-normal font-semibold font-sans">
                  "Un tránsito planetario especial en conjunción hoy fusiona vuestros elementos estelares, estimulando la ternura y la fluidez del hogar en un 100%. Las vibraciones son perfectas para dar un cariñito o compartir una caminata miau🐾."
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 bg-white/70 px-3 py-2 rounded-2xl border border-purple-250/20 font-bold">
              <span className="text-xs text-purple-800">Clima Astral:</span>
              <span className="text-xs font-mono font-black text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-[#E7E2D5]">98% Sintonía</span>
            </div>
          </div>

          {/* Horóscopos de los Inquilinos de la Casa */}
          <div className="space-y-6">
            <div className="border-b border-[#FAF7F2] pb-3">
              <h3 className="font-extrabold text-[#2C2723] text-lg leading-tight flex items-center gap-2 tracking-tight">
                🔮 Horóscopo de los Inquilinos miau
              </h3>
              <p className="text-xs text-[#625B57]">
                Análisis astrológico en tiempo real cruzado con vuestras cartas astrales y signos miau.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {users.map((u, idx) => {
                const userPred = zodiacPredictions.find(p => p.userId === u.id || p.userName?.toLowerCase() === u.name?.toLowerCase());
                const predictionText = userPred?.prediction || `La energía celestial hoy impulsa tu signo solar ${u.zodiacSign || 'Espíritu Místico'}. Es un gran momento para compartir felicidad en el nido de amor miau.`;
                const adviceText = userPred?.advice || "Consejo de Milo: Siente el palpitar estelar de hoy y regala un cariñito.";
                
                // Detailed fallbacks if empty
                const predSalud = userPred?.predictionSalud || "Tu vitalidad física hoy está bendecida por el Sol. Buen momento para estiramientos tiernos tipo yoga felino miau.";
                const predAmor = userPred?.predictionAmor || "Tu signo favorece la reconciliación y caricias profundas. Tu nido se llena de calor hogareño y paz miau.";
                const predTrabajo = userPred?.predictionTrabajo || "Marte activa tu enfoque mental. Estás persiguiendo metas con excelente precisión y sin dar vueltas.";
                const predEspiritualidad = userPred?.predictionEspiritualidad || "Sube tu energía cósmica meditando en un rayito de sol templado. Tu tercer ojo brilla hoy.";

                const palette = getZodiacPalette(u.zodiacSign);
                const cardBg = `${palette.bg} ${palette.border} ${palette.glow}`;
                const labelColor = palette.label;
                
                return (
                  <div key={u.id} className={`${cardBg} rounded-[2rem] p-6 border-2 flex flex-col justify-between space-y-5 shadow-sm transition-all duration-500 hover:shadow-md`}>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-black/5 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-11 h-11 shrink-0">
                            <Avatar emoji={u.emoji} className="w-full h-full" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-[#2C2723] text-sm leading-tight">{u.name}</h4>
                            <p className={`text-[10px] uppercase tracking-wider font-extrabold ${labelColor}`}>{u.zodiacSign || "Signo Solar"}</p>
                          </div>
                        </div>
                        <span className="text-2xl" title={palette.heading}>{palette.icon}</span>
                      </div>
                      
                      <p className="text-xs text-[#524B48] leading-relaxed italic font-medium">
                        "{predictionText}"
                      </p>

                      {/* Detailed Categories Matrix */}
                      <div className="grid grid-cols-1 gap-2.5 pt-1">
                        <div className="bg-white/90 rounded-2xl p-3 border border-emerald-100 flex gap-2.5 items-start shadow-2xs">
                          <span className="text-sm shrink-0">💚</span>
                          <div className="space-y-0.5">
                            <span className="text-[9.5px] font-black uppercase text-emerald-800 tracking-wider">Salud y Vitalidad</span>
                            <p className="text-xs text-[#5C5552] leading-relaxed font-semibold">{predSalud}</p>
                          </div>
                        </div>
                        <div className="bg-white/90 rounded-2xl p-3 border border-pink-100 flex gap-2.5 items-start shadow-2xs">
                          <span className="text-sm shrink-0">💖</span>
                          <div className="space-y-0.5">
                            <span className="text-[9.5px] font-black uppercase text-pink-800 tracking-wider">Amor y Convivencia</span>
                            <p className="text-xs text-[#5C5552] leading-relaxed font-semibold">{predAmor}</p>
                          </div>
                        </div>
                        <div className="bg-white/90 rounded-2xl p-3 border border-amber-100 flex gap-2.5 items-start shadow-2xs">
                          <span className="text-sm shrink-0">💼</span>
                          <div className="space-y-0.5">
                            <span className="text-[9.5px] font-black uppercase text-amber-800 tracking-wider">Trabajo y Propósito</span>
                            <p className="text-xs text-[#5C5552] leading-relaxed font-semibold">{predTrabajo}</p>
                          </div>
                        </div>
                        <div className="bg-white/90 rounded-2xl p-3 border border-purple-100 flex gap-2.5 items-start shadow-2xs">
                          <span className="text-sm shrink-0">✨</span>
                          <div className="space-y-0.5">
                            <span className="text-[9.5px] font-black uppercase text-purple-800 tracking-wider">Espiritualidad</span>
                            <p className="text-xs text-[#5C5552] leading-relaxed font-semibold">{predEspiritualidad}</p>
                          </div>
                        </div>

                        {/* Favorable Color */}
                        {userPred?.luckyColor && (() => {
                          const swatch = (() => {
                            const lower = userPred.luckyColor.toLowerCase();
                            if (lower.includes("rojo") || lower.includes("red") || lower.includes("pasión") || lower.includes("pasion")) {
                              return { hex: "#EF4444", name: "Rojo" };
                            }
                            if (lower.includes("amarillo") || lower.includes("yellow") || lower.includes("brillante") || lower.includes("solar")) {
                              return { hex: "#EAB308", name: "Amarillo" };
                            }
                            if (lower.includes("azul") || lower.includes("celeste") || lower.includes("blue")) {
                              if (lower.includes("marino") || lower.includes("oscuro")) {
                                return { hex: "#1D4ED8", name: "Azul marino" };
                              }
                              return { hex: "#0EA5E9", name: "Azul claro" };
                            }
                            if (lower.includes("verde") || lower.includes("green") || lower.includes("oliva") || lower.includes("salvia") || lower.includes("musgo") || lower.includes("esperanza") || lower.includes("esmeralda")) {
                              if (lower.includes("oscuro") || lower.includes("esmeralda") || lower.includes("musgo")) {
                                return { hex: "#15803D", name: "Verde oscuro" };
                              }
                              return { hex: "#10B981", name: "Verde claro" };
                            }
                            if (lower.includes("rosa") || lower.includes("rosado") || lower.includes("pink") || lower.includes("amoroso") || lower.includes("fucsia") || lower.includes("magenta")) {
                              return { hex: "#EC4899", name: "Rosa" };
                            }
                            if (lower.includes("naranja") || lower.includes("orange") || lower.includes("creativo") || lower.includes("ámbar") || lower.includes("amber")) {
                              return { hex: "#F97316", name: "Naranja" };
                            }
                            if (lower.includes("morado") || lower.includes("púrpura") || lower.includes("purpura") || lower.includes("violeta") || lower.includes("purple") || lower.includes("espiritual") || lower.includes("amatista") || lower.includes("lavanda") || lower.includes("lila")) {
                              return { hex: "#8B5CF6", name: "Morado" };
                            }
                            if (lower.includes("blanco") || lower.includes("white") || lower.includes("purificador") || lower.includes("claridad")) {
                              return { hex: "#F8FAFC", name: "Blanco" };
                            }
                            if (lower.includes("dorado") || lower.includes("abundancia") || lower.includes("gold") || lower.includes("oro")) {
                              return { hex: "#F59E0B", name: "Dorado" };
                            }
                            if (lower.includes("plateado") || lower.includes("silver") || lower.includes("gris") || lower.includes("gray") || lower.includes("templanza") || lower.includes("protector")) {
                              return { hex: "#9CA3AF", name: "Plateado" };
                            }
                            if (lower.includes("marrón") || lower.includes("marron") || lower.includes("brown") || lower.includes("tierra") || lower.includes("terracota") || lower.includes("siena") || lower.includes("arcilla") || lower.includes("cafe") || lower.includes("café")) {
                              return { hex: "#B45309", name: "Café" };
                            }
                            return { hex: "#6366F1", name: userPred.luckyColor };
                          })();

                          return (
                            <div className="bg-white/95 rounded-2xl p-3.5 border border-[#FFE8CC] flex gap-3.5 items-start shadow-2xs bg-gradient-to-r from-amber-50/20 to-orange-50/15">
                              <div className="relative mt-0.5 flex-shrink-0">
                                <div 
                                  className="w-8 h-8 rounded-full border shadow-sm transition-transform duration-300 hover:scale-110 flex items-center justify-center cursor-help"
                                  style={{ backgroundColor: swatch.hex, borderColor: swatch.hex }}
                                  title={`Tu color de poder hoy: ${swatch.name}`}
                                >
                                  <div className="w-3 h-3 rounded-full bg-white/60 mix-blend-overlay animate-pulse" />
                                </div>
                                <span className="absolute -bottom-1 -right-1 text-[10px] bg-white rounded-full p-0.5 shadow-xs border border-amber-100">🧥</span>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase text-[#884400] tracking-wider block">Vestimenta y Color de Poder</span>
                                <div className="text-xs text-[#5C5552] leading-tight font-medium">
                                  <strong className="text-amber-950 font-extrabold">{userPred.luckyColor}: </strong>
                                  <span className="block mt-1 text-[#6B6461] text-[11px] leading-relaxed">{userPred.luckyColorDesc || "Sintoniza hoy con este color de poder."}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Cat Advice */}
                    <div className="bg-white/95 p-4 rounded-2.5xl text-xs text-[#423C39] border border-white/95 space-y-2.5 shadow-2xs">
                      <div className="flex gap-2 items-center pb-2 border-b border-black/5">
                        <span className="shrink-0 text-lg">🐾</span>
                        <div>
                          <strong className="text-amber-850 font-black uppercase text-[9px] tracking-wide block leading-none mb-1">Consejo del Oráculo Gatuno</strong>
                          <span className="text-xs font-semibold leading-relaxed italic">"{adviceText}"</span>
                        </div>
                      </div>
                      
                      {userPred?.recommendedActivities && userPred.recommendedActivities.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[9.5px] font-black uppercase text-purple-800 tracking-wider block">🪴 Actividades armonizadoras recomendadas hoy:</span>
                          <ul className="space-y-1.5 list-none pl-0">
                            {userPred.recommendedActivities.map((act, aIdx) => (
                              <li key={aIdx} className="text-xs text-[#5C5552] flex gap-2 items-start leading-tight font-semibold">
                                <span className="text-purple-600 font-bold shrink-0">🐾</span>
                                <span>{act}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
