import fs from "node:fs";

const homePath = "src/components/HomeDashboard.tsx";
let home = fs.readFileSync(homePath, "utf8");

const importLine = 'import HomeLunarPanel from "./HomeLunarPanel";';
if (!home.includes(importLine)) {
  const anchor = 'import { Avatar } from "./Avatar";';
  if (home.includes(anchor)) {
    home = home.replace(anchor, anchor + "\n" + importLine);
  } else {
    throw new Error("No se encontró un ancla segura para importar HomeLunarPanel.");
  }
}

const marker = "{/* 🌌 TARJETA 2: LUNA, CICLO Y ASTROS EN BOGOTÁ */}";
const markerIndex = home.indexOf(marker);
if (markerIndex === -1) {
  throw new Error("No se encontró la tarjeta lunar antigua en HomeDashboard.");
}

const firstDiv = home.indexOf("<div", markerIndex);
if (firstDiv === -1) throw new Error("No se encontró el contenedor de la tarjeta lunar.");

const tagRegex = /<\/?div\b[^>]*>/g;
tagRegex.lastIndex = firstDiv;
let depth = 0;
let endIndex = -1;
let match;
while ((match = tagRegex.exec(home))) {
  const tag = match[0];
  if (tag.startsWith("</")) depth -= 1;
  else if (!tag.endsWith("/>") && !tag.startsWith("<!--")) depth += 1;
  if (depth === 0) {
    endIndex = tagRegex.lastIndex;
    break;
  }
}
if (endIndex === -1) throw new Error("No se pudo cerrar de forma segura la tarjeta lunar.");

const replacement = '<HomeLunarPanel moonInfo={moonInfo} liveMoon={miloContextState?.moon} city={homeCity} />';
home = home.slice(0, markerIndex) + replacement + home.slice(endIndex);
fs.writeFileSync(homePath, home);

const serverPath = "server.ts";
let server = fs.readFileSync(serverPath, "utf8");
server = server.replaceAll("Mafe y Benja", "las personas registradas en este nido");
server = server.replaceAll("del nido de Mafe y Benja", "del nido y sus personas registradas");
server = server.replaceAll("hogar de Mafe y Benja", "hogar de las personas registradas");
server = server.replaceAll("órbitas celestes de Mafe y Benja", "órbitas celestes de las personas registradas");
server = server.replaceAll("Mafe y Benja hoy", "las personas registradas hoy");
fs.writeFileSync(serverPath, server);

console.log("[AstroHogar] Panel lunar real conectado sin reconstruir HomeDashboard.");
console.log("[AstroHogar] Milo horoscope sanitized to registered users only.");
