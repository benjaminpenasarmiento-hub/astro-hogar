import fs from "node:fs";

const path = "src/components/HomeDashboard.tsx";
let source = fs.readFileSync(path, "utf8");

const importAnchor = 'import { Avatar } from "./Avatar";';
if (!source.includes('import HomeLunarPanel from "./HomeLunarPanel";')) {
  if (!source.includes(importAnchor)) throw new Error("No se encontró el ancla de imports de HomeDashboard.");
  source = source.replace(importAnchor, importAnchor + '\nimport HomeLunarPanel from "./HomeLunarPanel";');
}

const startMarker = "      {/* 🌌 TARJETA 2: LUNA, CICLO Y ASTROS EN BOGOTÁ */}";
const endMarker = "      {/* ⚡ PÁGINA RÁPIDA DE ATAJOS (SHORTCUTS DASHBOARD) */}";
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

if (start >= 0 && end > start) {
  const block = [
    "      {/* 🌙 Luna de Inicio — vista estable */}",
    "      <HomeLunarPanel",
    "        moonInfo={moonInfo}",
    "        liveMoon={miloContextState?.moon}",
    "        city={homeCity || \"Bogotá\"}",
    "      />",
    "\n"
  ].join("\n");
  source = source.slice(0, start) + block + source.slice(end);
} else if (!source.includes("<HomeLunarPanel")) {
  throw new Error("No se encontró un punto seguro para montar HomeLunarPanel.");
}

fs.writeFileSync(path, source, "utf8");
console.log("[AstroHogar] Luna Inicio: componente estable montado sin generar JSX complejo.");
