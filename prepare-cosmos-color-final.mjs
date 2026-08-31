import fs from "node:fs";

const path = "src/components/CosmosModule.tsx";
let source = fs.readFileSync(path, "utf8");

if (!source.includes('import DailyEnergyColor from "./DailyEnergyColor";')) {
  source = source.replace('import { Avatar } from "./Avatar";', 'import { Avatar } from "./Avatar";\nimport DailyEnergyColor from "./DailyEnergyColor";');
}

// Keep the color recommendation inside each user's horoscope card.
const oldColorOpening = '{userPred?.luckyColor && (() => {';
if (source.includes(oldColorOpening)) {
  source = source.replace(oldColorOpening, '{false && (() => {');
}

const horoscopeMarker = '                      <p className="text-xs text-[#524B48] leading-relaxed italic font-medium">\n                        "{predictionText}"\n                      </p>';
const naturalColor = `${horoscopeMarker}\n\n                      <DailyEnergyColor userId={String(u.id)} zodiacSign={u.zodiacSign || ""} />`;
if (source.includes(horoscopeMarker) && !source.includes('<DailyEnergyColor userId={String(u.id)}')) {
  source = source.replace(horoscopeMarker, naturalColor, 1);
}

fs.writeFileSync(path, source, "utf8");
console.log("[AstroHogar] Cosmos: color natural, personal y diario dentro del horóscopo.");
