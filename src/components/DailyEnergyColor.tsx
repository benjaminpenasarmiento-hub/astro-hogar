import React, { useMemo } from "react";

const WEEKDAY_COLORS = {
  0: [
    { name: "Azul cielo", hex: "#6F93B2", energy: "paz interior y renovación", cue: "camisa, camiseta o accesorio azul" },
    { name: "Naranja suave", hex: "#C98257", energy: "calidez y energía vital", cue: "detalle naranja, terracota o coral" },
  ],
  1: [
    { name: "Blanco cálido", hex: "#EDE6D8", energy: "claridad y nuevos comienzos", cue: "blanco roto, crema o marfil" },
    { name: "Gris claro", hex: "#B9B6AF", energy: "serenidad y equilibrio", cue: "gris claro o perla" },
  ],
  2: [
    { name: "Rojo vino", hex: "#8C4B55", energy: "fuerza y acción", cue: "vino, granate o rojo profundo" },
    { name: "Rosa viejo", hex: "#B77D89", energy: "vitalidad y conexión", cue: "rosa viejo o palo de rosa" },
  ],
  3: [
    { name: "Amarillo mostaza", hex: "#B79B4D", energy: "claridad y comunicación", cue: "mostaza, ocre o amarillo suave" },
    { name: "Azul denim", hex: "#67829B", energy: "fluidez y enfoque", cue: "jean, azul medio o azul cielo" },
  ],
  4: [
    { name: "Morado ciruela", hex: "#765A78", energy: "expansión y propósito", cue: "morado, ciruela o violeta" },
    { name: "Lavanda", hex: "#9F91B2", energy: "abundancia y calma", cue: "lavanda, lila o malva" },
  ],
  5: [
    { name: "Verde oliva", hex: "#77794D", energy: "armonía y equilibrio", cue: "oliva, salvia o verde suave" },
    { name: "Rosa palo", hex: "#C18D96", energy: "amor y belleza", cue: "rosa palo o rosa viejo" },
  ],
  6: [
    { name: "Café cacao", hex: "#765548", energy: "tierra y estabilidad", cue: "café, chocolate o canela" },
    { name: "Beige arena", hex: "#C8B79B", energy: "centrado y descanso", cue: "beige, arena o camel" },
  ],
} as const;

const ZODIAC_BIAS: Record<string, string[]> = {
  aries: ["Rojo vino", "Naranja suave", "Rosa viejo"],
  tauro: ["Verde oliva", "Rosa palo", "Beige arena"],
  geminis: ["Amarillo mostaza", "Azul denim", "Gris claro"],
  cancer: ["Blanco cálido", "Azul cielo", "Rosa viejo"],
  leo: ["Naranja suave", "Amarillo mostaza", "Rojo vino"],
  virgo: ["Verde oliva", "Beige arena", "Azul denim"],
  libra: ["Rosa palo", "Blanco cálido", "Azul cielo"],
  escorpio: ["Rojo vino", "Morado ciruela", "Café cacao"],
  sagitario: ["Morado ciruela", "Naranja suave", "Azul denim"],
  capricornio: ["Café cacao", "Gris claro", "Verde oliva"],
  acuario: ["Azul denim", "Azul cielo", "Lavanda"],
  piscis: ["Lavanda", "Azul cielo", "Rosa viejo"],
};

function normalize(value: string) {
  return (value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

export function getDailyEnergyColor(date = new Date(), userId = "hogar", zodiacSign = "") {
  const weekday = date.getDay();
  const dailyOptions = WEEKDAY_COLORS[weekday as keyof typeof WEEKDAY_COLORS];
  const preferred = ZODIAC_BIAS[normalize(zodiacSign)] || [];
  const ordered = [...dailyOptions].sort((a, b) => {
    const aMatch = preferred.includes(a.name) ? 0 : 1;
    const bMatch = preferred.includes(b.name) ? 0 : 1;
    return aMatch - bMatch;
  });
  const rotation = hash(`${userId}|${normalize(zodiacSign)}|${date.toISOString().slice(0, 10)}`) % ordered.length;
  return ordered[rotation];
}

export default function DailyEnergyColor({ userId = "hogar", zodiacSign = "" }: { userId?: string; zodiacSign?: string }) {
  const color = useMemo(() => getDailyEnergyColor(new Date(), userId, zodiacSign), [userId, zodiacSign]);
  return (
    <div className="rounded-2xl border border-[#E7E2D5] bg-white/80 p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl shrink-0 border border-black/5 shadow-inner" style={{ backgroundColor: color.hex }} aria-label={`Color recomendado de hoy: ${color.name}`} />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-black text-[#8A817C]">🎨 Color recomendado hoy</p>
        <p className="text-sm font-black text-[#2C2723]">{color.name}</p>
        <p className="text-[10px] text-[#625B57]">{color.energy}. Usa {color.cue}.</p>
      </div>
    </div>
  );
}
