import fs from "node:fs";

const path = "src/components/HomeDashboard.tsx";
let source = fs.readFileSync(path, "utf8");

if (!source.includes('import HomeAstralToday from "./HomeAstralToday";')) {
  source = source.replace('import { Avatar } from "./Avatar";', 'import { Avatar } from "./Avatar";\nimport HomeAstralToday from "./HomeAstralToday";');
}

const start = '        {/* 🌌 TARJETA 2: LUNA, CICLO Y ASTROS EN BOGOTÁ */}';
const end = '      {/* ⚡ PÁGINA RÁPIDA DE ATAJOS (SHORTCUTS DASHBOARD) */}';
const startIndex = source.indexOf(start);
const endIndex = source.indexOf(end);

if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
  throw new Error("No se encontró el bloque antiguo de Cosmos/Luna en HomeDashboard.");
}

const replacement = `        <div className="lg:col-span-5">\n          <HomeAstralToday users={users} homeCity={homeCity} />\n        </div>\n\n      </div>\n\n\n`;
source = source.slice(0, startIndex) + replacement + source.slice(endIndex);

fs.writeFileSync(path, source, "utf8");
console.log("[AstroHogar] Inicio: Luna + horóscopo + color diarios integrados; Cosmos original preservado.");
