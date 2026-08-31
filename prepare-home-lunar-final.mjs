import fs from "node:fs";

const path = "src/components/HomeDashboard.tsx";
let source = fs.readFileSync(path, "utf8");

if (!source.includes('import HomeLunarPanel from "./HomeLunarPanel";')) {
  const anchor = 'import { Avatar } from "./Avatar";';
  if (source.includes(anchor)) {
    source = source.replace(anchor, anchor + '\nimport HomeLunarPanel from "./HomeLunarPanel";');
  } else {
    throw new Error("No se encontró un ancla segura para importar HomeLunarPanel.");
  }
}

const startMarker = "      {/* 🌌 TARJETA 2: LUNA, CICLO Y ASTROS EN BOGOTÁ */}";
const endMarker = "      {/* ⚡ PÁGINA RÁPIDA DE ATAJOS (SHORTCUTS DASHBOARD) */}";
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

if (start >= 0 && end >= start) {
  const replacement = [
    "      {/* 🌙 Luna de Inicio — componente estable */}",
    "      <HomeLunarPanel",
    "        moonInfo={moonInfo}",
    "        liveMoon={miloContextState?.moon}",
    "        city={homeCity || \"Bogotá\"}",
    "      />",
    "\n"
  ].join("\n");
  source = source.slice(0, start) + replacement + source.slice(end);
} else if (!source.includes("<HomeLunarPanel")) {
  throw new Error("No se encontró el bloque lunar ni un HomeLunarPanel existente.");
}

fs.writeFileSync(path, source, "utf8");
console.log("[AstroHogar] Inicio: Luna estable con ciclo visual y evento cercano.");
