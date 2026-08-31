import fs from "node:fs";

const path = "server.ts";
let source = fs.readFileSync(path, "utf8");

const start = source.indexOf('// 2. Custom Personalized Zodiac Horoscope for Home Members');
const routeStart = source.indexOf('app.get("/api/ai/horoscope"', start);
const instructionStart = source.indexOf('  const systemInstruction = `', routeStart);
const instructionEnd = source.indexOf('\n\n  const randomFactOrWord', instructionStart);
if (instructionStart < 0 || instructionEnd < 0) throw new Error("No se encontró el bloque de instrucciones del horóscopo.");

const newInstruction = `  const systemInstruction = \`Eres Milo, el astrólogo cercano del hogar. Escribe en español claro, cálido y natural.

Los únicos usuarios de esta lectura son: \${activeUsers.map(u => u.name).join(", ")}. Nunca inventes ni agregues otros nombres.
Fecha: \${summary.today}.

OBJETIVO: crear una lectura diaria que tenga UNA SOLA IDEA CENTRAL y que todo lo demás se desprenda de ella. La lectura debe sentirse como una conversación coherente, no como cinco frases independientes.

REGLAS DE COHERENCIA:
1. Primero define mentalmente un tema central del día para cada persona (por ejemplo: foco, calma, comunicación, iniciativa, conexión o descanso).
2. 'prediction' debe presentar ese tema en 2-3 frases, conectándolo con el signo solar y con el día actual.
3. Salud, amor/convivencia, trabajo/propósito y espiritualidad deben desarrollar EL MISMO tema desde cada área; no introduzcas ideas nuevas que contradigan la lectura central.
4. 'advice' debe ser una acción concreta que se desprenda de esa misma lectura.
5. No uses estadísticas inventadas, porcentajes ni tecnicismos astrológicos si no son necesarios.
6. Si mencionas un tránsito o posición, explica inmediatamente qué significa para la persona; no lo menciones como dato aislado.
7. No inventes hechos del hogar, eventos, sentimientos ni actividades.
8. El color debe ser común y usable en ropa. Usa SOLO uno de estos colores: Blanco, Gris claro, Rojo, Rosa, Amarillo, Azul, Azul marino, Verde, Morado, Café, Naranja o Beige.
9. El color debe tener sentido con el tema central, el signo y el día de la semana. La descripción debe explicar en una frase sencilla por qué conviene usarlo hoy.
10. No uses nombres rebuscados como oliva, petróleo, terracota, cacao, salvia, índigo, peltre, etc.
11. Si hay dos usuarios, cada tarjeta debe ser claramente individual. La compatibilidad del hogar se explica aparte y solo si tiene sentido con las dos lecturas.
12. Máximo 3 frases para la lectura central, 1 frase por cada área, 1 consejo y 1 frase sobre el color.
13. Nada de 'Mafe y Benja' a menos que esos nombres aparezcan realmente entre los usuarios registrados.

Devuelve JSON exactamente con: userPredictions, homeCompatibility y astralClimate.\`;
`;

source = source.slice(0, instructionStart) + newInstruction + source.slice(instructionEnd);

const fallbackStart = source.indexOf('  const fallbackPredictions = activeUsers.map(u => {', routeStart);
const fallbackEnd = source.indexOf('\n\n  // Deterministic Climate Fallback', fallbackStart);
if (fallbackStart < 0 || fallbackEnd < 0) throw new Error("No se encontró el fallback del horóscopo.");

const newFallback = `  const weekdayColors = [
    ["Blanco", "claridad y empezar con ligereza"],
    ["Rojo", "fuerza y decisión"],
    ["Amarillo", "claridad mental y comunicación"],
    ["Morado", "expansión y propósito"],
    ["Rosa", "cercanía y armonía"],
    ["Café", "estabilidad y arraigo"],
    ["Azul", "calma y recuperación"]
  ];
  const fallbackPredictions = activeUsers.map((u) => {
    const transit = getAstroProfile(u.id, summary.today).transitData;
    const normalizedSign = String(u.zodiacSign || "").replace(/[♈-♓]/g, "").trim() || "tu signo";
    const seed = Math.abs(Array.from(String(u.id) + summary.today + normalizedSign).reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7));
    const themePool = ["foco", "calma", "comunicación", "iniciativa", "conexión", "descanso"];
    const theme = themePool[seed % themePool.length];
    const colorForDay = weekdayColors[new Date(summary.today + "T12:00:00").getDay()];
    const signAdjustments = {
      Aries: "dar el primer paso sin apresurarte",
      Tauro: "sostener lo que ya funciona",
      Géminis: "ordenar ideas antes de hablar",
      Cáncer: "cuidar tu espacio emocional",
      Leo: "expresarte con seguridad sin sobrecargarte",
      Virgo: "poner orden a lo que te ocupa la cabeza",
      Libra: "buscar acuerdos sin dejar tus necesidades de lado",
      Escorpio: "elegir con calma dónde poner tu energía",
      Sagitario: "avanzar sin dispersarte",
      Capricornio: "priorizar una cosa importante y terminarla",
      Acuario: "dar espacio a una idea nueva sin perder estructura",
      Piscis: "escuchar tu intuición y bajar el ritmo cuando lo necesites"
    };
    const signKey = Object.keys(signAdjustments).find(k => normalizedSign.toLowerCase().includes(k.toLowerCase())) || "";
    const signAction = signAdjustments[signKey] || "mantener un ritmo que te haga bien";
    return {
      userId: u.id,
      userName: u.name,
      prediction: `Hoy el tema para ti es ${theme}. Tu signo ${u.zodiacSign || "solar"} favorece ${signAction}; lo importante será mantener esa línea durante el día.`,
      predictionSalud: `En bienestar, prioriza ${theme}: haz una pausa cuando la necesites y cuida tu energía sin exigirte de más.`,
      predictionAmor: `En la convivencia, expresa lo que necesitas con claridad y deja espacio para escuchar; esa será la mejor forma de cuidar el vínculo hoy.`,
      predictionTrabajo: `En trabajo y propósito, concentra tus esfuerzos en una prioridad concreta y evita repartir tu atención entre demasiadas cosas.`,
      predictionEspiritualidad: `Para cerrar el día, busca unos minutos de silencio o calma que te permitan volver a tu centro.`,
      advice: `Consejo de Milo: ${signAction} y no conviertas el día en una carrera.`,
      luckyColor: `${colorForDay[0]}`,
      luckyColorDesc: `${colorForDay[0]} puede acompañarte hoy porque favorece ${colorForDay[1]} y encaja con el ritmo de tu día.`,
      recommendedActivities: [
        `Reserva 10 minutos para avanzar en algo que represente tu tema de ${theme}.`,
        "Comparte un momento tranquilo en casa sin multitarea."
      ]
    };
  });`;
source = source.slice(0, fallbackStart) + newFallback + source.slice(fallbackEnd);

fs.writeFileSync(path, source, "utf8");
console.log("[AstroHogar] Horóscopo coherente: una idea central por usuario, áreas conectadas y color simple por día/signo.");
