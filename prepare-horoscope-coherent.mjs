import fs from "node:fs";

const path = "server.ts";
let source = fs.readFileSync(path, "utf8");

const start = source.indexOf("// 2. Custom Personalized Zodiac Horoscope for Home Members");
const routeStart = source.indexOf('app.get("/api/ai/horoscope"', start);
const instructionStart = source.indexOf("  const systemInstruction = `", routeStart);
const instructionEnd = source.indexOf("\n\n  const randomFactOrWord", instructionStart);
if (instructionStart < 0 || instructionEnd < 0) throw new Error("No se encontró el bloque de instrucciones del horóscopo.");

const instructionText = [
  "Eres Milo, el astrólogo cercano del hogar. Escribe en español claro, cálido y natural.",
  "",
  "Los usuarios de esta lectura deben ser únicamente los miembros reales enviados en el contexto.",
  "",
  "OBJETIVO: crear una lectura diaria que tenga UNA SOLA IDEA CENTRAL y que todo lo demás se desprenda de ella.",
  "",
  "REGLAS DE COHERENCIA:",
  "1. Define mentalmente un tema central del día para cada persona: foco, calma, comunicación, iniciativa, conexión o descanso.",
  "2. prediction debe presentar ese tema en 2-3 frases y conectarlo con el signo solar y el día actual.",
  "3. Salud, amor/convivencia, trabajo/propósito y espiritualidad deben desarrollar el MISMO tema.",
  "4. advice debe ser una acción concreta que se desprenda de esa lectura.",
  "5. No inventes estadísticas, hechos del hogar, eventos, sentimientos ni actividades.",
  "6. Si mencionas un tránsito o posición, explica inmediatamente su efecto práctico.",
  "7. El color debe ser común y usable en ropa. Usa SOLO: Blanco, Gris claro, Rojo, Rosa, Amarillo, Azul, Azul marino, Verde, Morado, Café, Naranja o Beige.",
  "8. Explica en una frase sencilla por qué conviene ese color hoy.",
  "9. Si hay dos usuarios, cada tarjeta debe ser individual. La compatibilidad se explica aparte cuando tenga sentido.",
  "10. Máximo 3 frases para la lectura central, 1 frase por área, 1 consejo y 1 frase sobre el color.",
  "11. Nunca menciones IA, algoritmos, modelos ni sistemas.",
  "",
  "Devuelve JSON exactamente con: userPredictions, homeCompatibility y astralClimate."
].join("\\n");

const newInstruction = "  const systemInstruction = `" + instructionText.replaceAll("`", "\\`") + "`;";
source = source.slice(0, instructionStart) + newInstruction + source.slice(instructionEnd);

const fallbackStart = source.indexOf("  const fallbackPredictions = activeUsers.map(u => {", routeStart);
const fallbackEnd = source.indexOf("\n\n  // Deterministic Climate Fallback", fallbackStart);
if (fallbackStart < 0 || fallbackEnd < 0) throw new Error("No se encontró el fallback del horóscopo.");

const fallbackBlock = [
  "  const weekdayColors = [",
  "    [\"Blanco\", \"claridad y empezar con ligereza\"],",
  "    [\"Rojo\", \"fuerza y decisión\"],",
  "    [\"Amarillo\", \"claridad mental y comunicación\"],",
  "    [\"Morado\", \"expansión y propósito\"],",
  "    [\"Rosa\", \"cercanía y armonía\"],",
  "    [\"Café\", \"estabilidad y arraigo\"],",
  "    [\"Azul\", \"calma y recuperación\"]",
  "  ];",
  "  const fallbackPredictions = activeUsers.map((u) => {",
  "    const normalizedSign = String(u.zodiacSign || \"\").replace(/[♈-♓]/g, \"\").trim() || \"tu signo\";",
  "    const seed = Math.abs(Array.from(String(u.id) + summary.today + normalizedSign).reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7));",
  "    const themePool = [\"foco\", \"calma\", \"comunicación\", \"iniciativa\", \"conexión\", \"descanso\"];",
  "    const theme = themePool[seed % themePool.length];",
  "    const colorForDay = weekdayColors[new Date(summary.today + \"T12:00:00\").getDay()];",
  "    const signAdjustments = {",
  "      Aries: \"dar el primer paso sin apresurarte\", Tauro: \"sostener lo que ya funciona\", Géminis: \"ordenar ideas antes de hablar\",",
  "      Cáncer: \"cuidar tu espacio emocional\", Leo: \"expresarte con seguridad sin sobrecargarte\", Virgo: \"poner orden a lo que te ocupa la cabeza\",",
  "      Libra: \"buscar acuerdos sin dejar tus necesidades de lado\", Escorpio: \"elegir con calma dónde poner tu energía\", Sagitario: \"avanzar sin dispersarte\",",
  "      Capricornio: \"priorizar una cosa importante y terminarla\", Acuario: \"dar espacio a una idea nueva sin perder estructura\", Piscis: \"escuchar tu intuición y bajar el ritmo cuando lo necesites\"",
  "    };",
  "    const signKey = Object.keys(signAdjustments).find(k => normalizedSign.toLowerCase().includes(k.toLowerCase())) || \"\";",
  "    const signAction = signAdjustments[signKey] || \"mantener un ritmo que te haga bien\";",
  "    return {",
  "      userId: u.id,",
  "      userName: u.name,",
  "      prediction: \"Hoy el tema para ti es \" + theme + \". Tu signo \" + (u.zodiacSign || \"solar\") + \" favorece \" + signAction + \"; lo importante será mantener esa línea durante el día.\",",
  "      predictionSalud: \"En bienestar, prioriza \" + theme + \": haz una pausa cuando la necesites y cuida tu energía sin exigirte de más.\",",
  "      predictionAmor: \"En la convivencia, expresa lo que necesitas con claridad y deja espacio para escuchar.\",",
  "      predictionTrabajo: \"En trabajo y propósito, concentra tus esfuerzos en una prioridad concreta y evita repartir tu atención.\",",
  "      predictionEspiritualidad: \"Para cerrar el día, busca unos minutos de silencio o calma que te permitan volver a tu centro.\",",
  "      advice: \"Consejo de Milo: \" + signAction + \" y no conviertas el día en una carrera.\",",
  "      luckyColor: colorForDay[0],",
  "      luckyColorDesc: colorForDay[0] + \" puede acompañarte hoy porque favorece \" + colorForDay[1] + \".\",",
  "      recommendedActivities: [\"Reserva 10 minutos para avanzar en algo relacionado con tu tema de \" + theme + \".\", \"Comparte un momento tranquilo en casa sin multitarea.\"]",
  "    };",
  "  });",
  ""
].join("\n");
source = source.slice(0, fallbackStart) + fallbackBlock + source.slice(fallbackEnd);

fs.writeFileSync(path, source, "utf8");
console.log("[AstroHogar] Horóscopo coherente preparado correctamente.");
