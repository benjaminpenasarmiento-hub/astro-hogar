import React, { useMemo } from "react";

// Natural, wearable tones commonly found in everyday Colombian clothing:
// tierra, cacao, arena, oliva/salvia, denim, vino, terracota, mostaza, etc.
const COLORS = [
  { name: "Verde salvia", hex: "#789276", energy: "equilibrio y calma", cue: "Una camiseta, camisa o accesorio verde salvia." },
  { name: "Azul índigo", hex: "#3F5874", energy: "enfoque y seguridad", cue: "Denim, azul índigo o una prenda azul profunda." },
  { name: "Terracota", hex: "#B8654A", energy: "presencia y creatividad", cue: "Una prenda terracota, ladrillo o arcilla." },
  { name: "Mostaza suave", hex: "#B79A4B", energy: "ánimo y claridad", cue: "Un detalle mostaza, ocre o amarillo tierra." },
  { name: "Café cacao", hex: "#795548", energy: "arraigo y estabilidad", cue: "Café, chocolate o tonos de madera." },
  { name: "Rosa viejo", hex: "#B77C88", energy: "cercanía y sensibilidad", cue: "Un toque rosa viejo, palo de rosa o malva." },
  { name: "Arena", hex: "#C9B79C", energy: "ligereza y serenidad", cue: "Beige, arena, crema o lino natural." },
  { name: "Oliva", hex: "#73784B", energy: "serenidad y constancia", cue: "Verde oliva, militar suave o khaki." },
  { name: "Azul cielo", hex: "#7FA5B8", energy: "fluidez y comunicación", cue: "Azul cielo, aguamarina o una camisa clara." },
  { name: "Vino suave", hex: "#7C4650", energy: "determinación y profundidad", cue: "Vino, granate o rojo oscuro." },
  { name: "Canela", hex: "#A86F4C", energy: "calidez y movimiento", cue: "Canela, cuero o café cálido." },
  { name: "Marfil", hex: "#E7DDCA", energy: "claridad y descanso", cue: "Blanco roto, marfil o crema." },
  { name: "Lavanda", hex: "#A89ABF", energy: "intuición y suavidad", cue: "Lavanda, lila apagado o malva." },
  { name: "Verde bosque", hex: "#46624D", energy: "firmeza y conexión", cue: "Verde bosque, pino o musgo." },
  { name: "Jeans lavado", hex: "#71879B", energy: "naturalidad y apertura", cue: "Denim claro o azul grisáceo." },
  { name: "Coral tierra", hex: "#C97965", energy: "calidez y expresión", cue: "Coral apagado, salmón tierra o ladrillo claro." }
];

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

export function getDailyEnergyColor(date = new Date(), userId = "hogar", zodiacSign = "") {
  const day = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const key = `${userId}|${zodiacSign}|${day}`;
  return COLORS[hash(key) % COLORS.length];
}

export default function DailyEnergyColor({ userId = "hogar", zodiacSign = "" }: { userId?: string; zodiacSign?: string }) {
  const color = useMemo(() => getDailyEnergyColor(new Date(), userId, zodiacSign), [userId, zodiacSign]);
  return (
    <div className="rounded-2xl border border-[#E7E2D5] bg-white/80 p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl shrink-0 border border-black/5 shadow-inner" style={{ backgroundColor: color.hex }} aria-label={`Color recomendado de hoy: ${color.name}`} />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-black text-[#8A817C]">🎨 Color recomendado hoy</p>
        <p className="text-sm font-black text-[#2C2723]">{color.name}</p>
        <p className="text-[10px] text-[#625B57]">{color.energy}. {color.cue}</p>
      </div>
    </div>
  );
}
