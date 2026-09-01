import fs from "node:fs";

const file = "server.ts";
let src = fs.readFileSync(file, "utf8");
const routeStart = src.indexOf('app.get("/api/ai/horoscope"');
if (routeStart === -1) throw new Error("No se encontró la ruta /api/ai/horoscope.");

const instructionStart = src.indexOf("  const systemInstruction = `", routeStart);
const randomAnchor = src.indexOf("  const randomFactOrWord = [", instructionStart);
if (instructionStart === -1 || randomAnchor === -1) throw new Error("No se encontró el bloque de instrucciones del horóscopo.");

const coherentInstruction = `  const systemInstruction = \`Eres Milo, astrólogo cercano del hogar. Escribe un horóscopo diario claro, conectado y útil para cada persona registrada.

REGLAS:
- Usa exclusivamente los datos reales de la persona y el contexto recibido.
- Construye una sola idea central para el día y haz que salud, amor/convivencia, trabajo/dinero y bienestar emocional desarrollen esa misma idea.
- Evita enumerar planetas o puntos astrológicos sin explicar su efecto práctico.
- No inventes nombres, relaciones, prendas, mascotas, eventos ni preferencias.
- No uses tecnicismos innecesarios.
- El texto debe sonar natural y comprensible, no como frases aleatorias.
- El color recomendado debe ser un color común para vestir: Blanco, Gris, Rojo, Rosa, Amarillo, Azul, Azul marino, Verde, Morado, Café, Naranja o Beige.
- El color se elige según el día de la semana y se ajusta al signo solar; si existe información real del Closet, prioriza una prenda que la persona ya tenga.
- Explica el color en una sola frase: cómo puede acompañar la intención del día.
- Usa 2 actividades concretas y coherentes con la lectura.
- Máximo 2-3 frases por área.
- Nunca menciones IA, algoritmos, modelos ni sistemas.

Devuelve JSON válido según el esquema existente.\`;

src = src.slice(0, instructionStart) + coherentInstruction + src.slice(randomAnchor);

const fallbackStart = src.indexOf("  const fallbackPredictions = activeUsers.map", routeStart);
const fallbackEnd = src.indexOf("  // Deterministic Climate Fallback", fallbackStart);
if (fallbackStart === -1 || fallbackEnd === -1) throw new Error("No se encontró el fallback del horóscopo.");

const fallbackBlock = `  const dayThemes = [
    { day: 1, theme: "claridad y nuevos comienzos", colors: ["Blanco 🤍", "Gris claro 🩶"] },
    { day: 2, theme: "fuerza y movimiento", colors: ["Rojo 🔴", "Rosa 💗"] },
    { day: 3, theme: "comunicación y enfoque", colors: ["Amarillo 💛", "Azul 💙"] },
    { day: 4, theme: "expansión y confianza", colors: ["Morado 💜", "Violeta 💜"] },
    { day: 5, theme: "armonía y bienestar", colors: ["Verde 💚", "Rosa 💗"] },
    { day: 6, theme: "estabilidad y descanso", colors: ["Café 🟤", "Beige 🤎"] },
    { day: 0, theme: "calma y energía vital", colors: ["Azul 💙", "Naranja 🧡"] }
  ];

  const fallbackPredictions = activeUsers.map(u => {
    const dayTheme = dayThemes[dayOfWeek];
    let zodiacHash = 0;
    const zodiacText = u.zodiacSign || "";
    for (const ch of zodiacText) zodiacHash += ch.charCodeAt(0);
    const color = dayTheme.colors[(zodiacHash + u.name.length + dayOfMonth) % dayTheme.colors.length];
    const zodiac = zodiacText || "tu signo";

    return {
      userId: u.id,
      userName: u.name,
      prediction: "Hoy el foco para " + u.name + " está en " + dayTheme.theme + ". Con " + zodiac + ", lo mejor será mantener una sola prioridad y evitar dispersarse.",
      predictionSalud: "En bienestar: baja un cambio donde notes tensión y deja espacio para recuperar energía. En el nido, una rutina simple te favorecerá más que exigirte de más.",
      predictionAmor: "En amor y convivencia: habla claro y con calma; una conversación breve y sincera puede resolver más que darle vueltas a las cosas.",
      predictionTrabajo: "En trabajo y dinero: ordena primero lo importante y termina una cosa antes de abrir otra. Esa disciplina te dará sensación de avance real.",
      predictionEspiritualidad: "Para cerrar el día: busca un momento tranquilo sin ruido ni pendientes y revisa qué sí funcionó hoy.",
      advice: "Tu clave de hoy: elige una prioridad y protégela de distracciones.",
      luckyColor: color,
      luckyColorDesc: "Este color acompaña la energía de " + dayTheme.theme + " y es fácil de incorporar a tu ropa de hoy.",
      recommendedActivities: [
        "Dedica 10 minutos a ordenar un espacio que uses mucho.",
        "Reserva un momento del día para hacer algo que realmente te relaje."
      ]
    };
  });

`;
src = src.slice(0, fallbackStart) + fallbackBlock + src.slice(fallbackEnd);
fs.writeFileSync(file, src, "utf8");
console.log("[AstroHogar] Horóscopo: lectura coherente + color diario común y personal por usuario.");
