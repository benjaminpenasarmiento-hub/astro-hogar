import fs from 'fs';

const file = 'src/components/HomeDashboard.tsx';
let source = fs.readFileSync(file, 'utf8');

const importLine = 'import HomeLunarPanel from "./HomeLunarPanel";';
if (!source.includes(importLine)) {
  const anchor = 'import { Avatar } from "./Avatar";';
  if (!source.includes(anchor)) throw new Error('[AstroHogar] No se encontró ancla para importar HomeLunarPanel.');
  source = source.replace(anchor, `${anchor}\n${importLine}`);
}

const startMarker = '        {/* 🌌 TARJETA 2: LUNA, CICLO Y ASTROS EN BOGOTÁ */}';
const endMarker = '\n        </div>\n\n      </div>\n\n\n      {/* ⚡ PÁGINA RÁPIDA DE ATAJOS (SHORTCUTS DASHBOARD) */}';

const start = source.indexOf(startMarker);
if (start === -1) throw new Error('[AstroHogar] No se encontró la tarjeta lunar antigua en HomeDashboard.tsx.');
const end = source.indexOf(endMarker, start);
if (end === -1) throw new Error('[AstroHogar] No se encontró el cierre seguro de la tarjeta lunar antigua.');

const replacement = `        <HomeLunarPanel\n          moonInfo={moonInfo}\n          liveMoon={miloContextState?.moon}\n          city={homeCity}\n        />`;

source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(file, source, 'utf8');
console.log('[AstroHogar] Inicio: tarjeta lunar antigua reemplazada por HomeLunarPanel sin alterar el layout.');
