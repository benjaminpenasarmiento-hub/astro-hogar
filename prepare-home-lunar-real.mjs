import fs from "node:fs";

const file = "src/components/HomeDashboard.tsx";
let src = fs.readFileSync(file, "utf8");

const startMarker = "      {/* 🌌 TARJETA 2: LUNA, CICLO Y ASTROS EN BOGOTÁ */}";
const endMarker = "\n\n\n      {/* ⚡ PÁGINA RÁPIDA DE ATAJOS";
const start = src.indexOf(startMarker);
if (start === -1) throw new Error("No se encontró la tarjeta Cosmos antigua de Inicio.");
const end = src.indexOf(endMarker, start);
if (end === -1) throw new Error("No se encontró el final de la tarjeta Cosmos antigua de Inicio.");

if (!src.includes('import HomeLunarPanel from "./HomeLunarPanel";')) {
  const importAnchor = 'import { Avatar } from "./Avatar";';
  if (!src.includes(importAnchor)) throw new Error("No se encontró el anchor de imports de HomeDashboard.");
  src = src.replace(importAnchor, `${importAnchor}\nimport HomeLunarPanel from "./HomeLunarPanel";`);
}

const replacement = `      <HomeLunarPanel\n        moonInfo={moonInfo}\n        liveMoon={miloContextState?.moon}\n        city={homeCity}\n      />`;

src = src.slice(0, start) + replacement + src.slice(end);
fs.writeFileSync(file, src, "utf8");
console.log("[AstroHogar] Inicio: tarjeta Cosmos antigua reemplazada por HomeLunarPanel real.");
