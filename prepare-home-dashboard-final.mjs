import fs from "node:fs";

const path = "src/components/HomeDashboard.tsx";
let source = fs.readFileSync(path, "utf8");

const importAnchor = 'import { Avatar } from "./Avatar";';
if (!source.includes('import HomeLunarPanel from "./HomeLunarPanel";')) {
  if (!source.includes(importAnchor)) throw new Error("No se encontró el ancla de import de HomeDashboard.");
  source = source.replace(importAnchor, importAnchor + '\nimport HomeLunarPanel from "./HomeLunarPanel";');
}

const marker = "{/* 🌌 TARJETA 2: LUNA, CICLO Y ASTROS EN BOGOTÁ */}";
const markerIndex = source.indexOf(marker);
if (markerIndex < 0) throw new Error("No se encontró la tarjeta lunar original de Inicio.");

const openingIndex = source.indexOf("<div", markerIndex + marker.length);
if (openingIndex < 0) throw new Error("No se encontró el contenedor de la tarjeta lunar.");

let depth = 0;
let i = openingIndex;
let closingIndex = -1;
const token = /<div\b[^>]*>|<\/div>/g;
token.lastIndex = openingIndex;
let match;
while ((match = token.exec(source))) {
  if (match[0].startsWith("<div")) depth += 1;
  else depth -= 1;
  if (depth === 0) {
    closingIndex = token.index + match[0].length;
    break;
  }
}
if (closingIndex < 0) throw new Error("No se pudo localizar el cierre de la tarjeta lunar original.");

const replacement = `<HomeLunarPanel\n  moonInfo={moonInfo}\n  liveMoon={miloContextState?.moon}\n  city={homeCity}\n/>`;
source = source.slice(0, openingIndex) + replacement + source.slice(closingIndex);

fs.writeFileSync(path, source, "utf8");
console.log("[AstroHogar] Inicio: Luna conectada como componente estable, preservando el resto del diseño.");
