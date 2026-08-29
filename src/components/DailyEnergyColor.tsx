import React, { useMemo } from "react";

const COLORS = [
  { name: "Amarillo solar", hex: "#F4C542", energy: "claridad y vitalidad", cue: "Un detalle amarillo, dorado o crema." },
  { name: "Azul sereno", hex: "#5B8DEF", energy: "calma y comunicación", cue: "Camisa, accesorio o pequeño detalle azul." },
  { name: "Verde renovación", hex: "#62B36C", energy: "equilibrio y renovación", cue: "Algo verde: prenda, planta o accesorio." },
  { name: "Rosa afectivo", hex: "#E98DA3", energy: "ternura y conexión", cue: "Un toque rosa o rosado." },
  { name: "Violeta intuitivo", hex: "#8B6FD9", energy: "intuición y reflexión", cue: "Un detalle violeta o lila." },
  { name: "Naranja creativo", hex: "#F28C45", energy: "movimiento y creatividad", cue: "Un acento naranja o terracota." },
  { name: "Turquesa fluido", hex: "#42B8B0", energy: "fluidez y ligereza", cue: "Un toque turquesa o aguamarina." },
  { name: "Rojo vital", hex: "#D95C5C", energy: "determinación y presencia", cue: "Un detalle rojo, vino o coral." },
  { name: "Lavanda suave", hex: "#B49AE8", energy: "descanso y sensibilidad", cue: "Algo lavanda o malva." },
  { name: "Marfil cálido", hex: "#E7D9BF", energy: "estabilidad y armonía", cue: "Blanco roto, beige o marfil." },
  { name: "Cobre", hex: "#B8754A", energy: "conexión y acción", cue: "Un detalle cobre, café o canela." },
  { name: "Índigo", hex: "#5268B8", energy: "profundidad y enfoque", cue: "Un detalle índigo, azul noche o denim." }
];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getDailyEnergyColor(date = new Date(), userId = "hogar") {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${userId}`;
  return COLORS[hash(key) % COLORS.length];
}

export default function DailyEnergyColor({ userId = "hogar" }: { userId?: string }) {
  const color = useMemo(() => getDailyEnergyColor(new Date(), userId), [userId]);
  return (
    <div className="rounded-2xl border border-[#E7E2D5] bg-white/80 p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl shrink-0 border border-black/5 shadow-inner" style={{ backgroundColor: color.hex }} aria-label={`Color del día: ${color.name}`} />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-black text-[#8A817C]">🎨 Color de hoy</p>
        <p className="text-sm font-black text-[#2C2723]">{color.name}</p>
        <p className="text-[10px] text-[#625B57]">{color.energy}. {color.cue}</p>
      </div>
    </div>
  );
}
