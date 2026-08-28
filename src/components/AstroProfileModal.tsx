import React, { useState, useEffect } from "react";
import { UserProfile, Home } from "../types";
import { updateUserProfile } from "../api";
import { Avatar, CUSTOM_AVATARS } from "./Avatar";
import { Sparkles, Calendar, Clock, MapPin, User, Save, Heart, Eye, Settings } from "lucide-react";
import SettingsModule from "./SettingsModule";

interface AstroProfileModalProps {
  user: UserProfile;
  allUsers?: UserProfile[];
  onClose: () => void;
  onRefreshData: () => void;
  home?: Home | null;
  onOpenInstallModal?: () => void;
  pets?: any[];
  plants?: any[];
  activeUserId?: string;
  initialTab?: "natal" | "edit" | "synastry" | "settings";
}

const CUTE_EMOJIS = [
  "🐱", "🐹", "🦊", "🐻", "🐼", "🐨", "🦁", "🐰", "🐶", "🐸", "🦉", "🦄", "🐣", "🐝", "🦋", 
  "🌸", "🌻", "🍀", "💫", "🌶️", "🥑", "🎨", "🎮", "🎸", "⛺", "🍿", "🍕", "🧸", "✨", "❤️", "🌙", "☀️", "👑", "🚀"
];

// High quality assertive interpretations in Spanish
const MOON_SIGN_DESCRIPTIONS: Record<string, { title: string, desc: string, advice: string }> = {
  "Aries": {
    title: "Luna en Aries ♈ - Sentimiento Apasionado e Independiente",
    desc: "Vives tus emociones con una intensidad vibrante y una gran necesidad de acción independiente. No soportas el estancamiento ni los rodeos sentimentales: para ti, amar es proponer y avanzar con coraje. En el hogar compartido, requieres honestidad total, confianza en tu criterio, momentos para quemar energía física y que tus iniciativas sean recibidas con optimismo sin trabas.",
    advice: "Tu reto sagrado es sintonizar con la impaciencia hogareña. Respeta los silencios reflexivos de tu pareja sin tomarlos como lejanía."
  },
  "Tauro": {
    title: "Luna en Tauro ♉ - Refugio del Confort y Afecto Seguro",
    desc: "Tu corazón encuentra paz en la estabilidad material sólida, las caricarías lentas y la rutina apacible. Conectas a través de los sentidos: una comida rica en pareja, textiles suaves, olores agradables y momentos de tranquilidad absoluta en casa. Eres el pacificador paciente del nido, pero puedes resistirte tozudamente a cambios o sorpresas que amenacen tu confort.",
    advice: "Embellecer el nidito juntos nutre profundamente tu alma. Vigila no estancarte en dinámicas fijas por simple comodidad."
  },
  "Géminis": {
    title: "Luna en Géminis ♊ - El Vínculo de la Palabra y la Risa",
    desc: "Procesas lo que sientes conversando, leyendo y creando puentes mentales. Buscas un nido fresco, ágil, lleno de tertulias nocturnas, bromas compartidas e inspiración constante. El silencio gélido o el desinterés intelectual te apagan rápidamente. Sientes seguridad emocional cuando puedes hablar de tus vulnerabilidades sin miedo al juicio.",
    advice: "El amor verdadero también se alimenta en el silencio cómplice. Permítete desconectar la mente y abrazar con el cuerpo miau."
  },
  "Cáncer": {
    title: "Luna en Cáncer ♋ - La Máxima Calidez del Nido Protector",
    desc: "Estás en el templo natural de las emociones. Tu sensibilidad es intuitiva, profunda y sumamente protectora con las personas de tu hogar. El nido para ti es un santuario sagrado; necesitas mimar, cocinar con cariño, atesorar recuerdos hermosos y sentir que tu vulnerabilidad está segura. Tus estados de ánimo fluctúan con la marea cósmica.",
    advice: "No temas expresar tus sentimientos con palabras claras. Tu pareja no puede leer tu mente, por mucho amor que exista."
  },
  "Leo": {
    title: "Luna en Leo ♌ - Corazón Generoso y Brillo Alegre",
    desc: "Expresas tus sentimientos con orgullo inquebrantable, mimos llenos de dramatismo divertido y obsequios muy creativos. Anhelas ver que tu entrega es apreciada y celebrada mutuamente. En el nido, necesitas luz, calidez y afecto sincero. Si sientes frialdad o indiferencia, tu león interior se retrae herido en su amor propio.",
    advice: "Regala momentos donde tu pareja sea quien reciba toda la admiración y protagonismo del nido. Eso amplía el canal de armonía."
  },
  "Virgo": {
    title: "Luna en Virgo ♍ - Amor en Detalles Útiles y Afecto Diario",
    desc: "Para ti, amar se demuestra en el servicio útil de cada día: preparar el café, ordenar los rincones del hogar, cuidar las plantas y estar atento(a) a qué aliviaría la rutina de tu pareja. Sientes calma emocional cuando las cosas están limpias y estructuradas, pero puedes caer en la sobreexigencia y el estrés mental analítico.",
    advice: "Celebra las pequeñas imperfecciones de la vida del nido. Despójate de la crítica y felicítate por tu esfuerzo bondadoso."
  },
  "Libra": {
    title: "Luna en Libra ♎ - Búsqueda de Paz, Belleza y Acuerdos",
    desc: "Anhelas una paz estética y diplomática constante en tu vida de pareja. El conflicto brusco, las discusiones airadas o el desorden visual agotan tu batería emocional. Tu refugio ideal tiene un balance armonioso de objetos hermosos y una atmósfera serena de acuerdos compartidos justos y recíprocos en el nido de amor.",
    advice: "Evitar confrontaciones a toda costa a veces acumula resentimientos. Di lo que piensas con cariño antes de que el vaso se llene."
  },
  "Escorpio": {
    title: "Luna en Escorpio ♏ - Fusión Intuitiva y Confianza Profunda",
    desc: "Experimentas las emociones con una intensidad magnética e incorruptible. Buscas una fusión auténtica con tu pareja, detestas las apariencias vacías y valoras la lealtad absoluta sobre todas las cosas. Tu nido debe ser un templo privado infranqueable donde puedas sanar tus tormentas y expresar tu pasión con total intimidad.",
    advice: "Sintoniza tu necesidad de control protectivo. Confiar de verdad es abrir los brazos y soltar amarras cómicas miau."
  },
  "Sagitario": {
    title: "Luna en Sagitario ♐ - Optimismo Libre y Alegría de Vivir",
    desc: "Tu bienestar requiere respirar aire fresco, expandir horizontes y mantener siempre viva la chispa de la aventura compartida. Buscas una pareja con quien reírte de todo, tener pláticas de filosofía hogareña e integrar plantas y espacios libres que no se sientan rígidos. El nido es tu puerto de partida feliz, no un encierro.",
    advice: "La rutina cotidiana también tiene magia íntima y orden necesario. Ayuda en las bases prácticas antes de volar lejos."
  },
  "Capricornio": {
    title: "Luna en Capricornio ♑ - Fidelidad, Estructura y Protección Real",
    desc: "Expresas afecto asumiendo responsabilidades serias, protegiendo solidamente el hogar y cumpliendo tus promesas con constancia. No te atrae el drama volátil; buscas metas comunes sólidas a futuro. En tus momentos de tensión te cierras silenciosamente para resolver las cosas sin molestar, lo cual puede interpretarse como distancia fría.",
    advice: "El nido es para soltar el escudo y descansar. Regálale a tu pareja la bendición de ver y abrazar tu tierna vulnerabilidad."
  },
  "Acuario": {
    title: "Luna en Acuario ♒ - Hermandad Espiritual y Mentes Libres",
    desc: "Para ti la base del amor es la amistad inteligente y el respeto profundo por las libertades ajenas. No toleras los reclamos posesivos tradicionales. Te entusiasma construir un nido con ideas progresistas, decoraciones eclécticas y debates de vanguardia. Quieres que el nido sea un rincón igualitario de mentes unidas.",
    advice: "Conectar con el cuerpo y dar un abrazo largo sin palabras es vital. Baja a ratos de la mente y déjate mimar con suavidad."
  },
  "Piscis": {
    title: "Luna en Piscis ♓ - Sensibilidad Empática y Conexión de Alma",
    desc: "Absorbes el clima emocional de tu hogar de forma telepática, como una tierna esponja miau. Tu sensibilidad es poética, afectuosa y profundamente empática. Disfrutas fundir tus límites leyendo poesía, compartiendo arte o estando abrazados viendo pelis mágicas. Necesitas rincones acogedores para aislarte y recargar tu batería mística.",
    advice: "Pon límites saludables para proteger tu energía de las tensiones del día a día. Tu paz es primordial para cuidar a quien amas."
  }
};

const SOLAR_SIGN_DESCRIPTIONS: Record<string, string> = {
  "Aries": "Tu Sol central irradia fuego de liderazgo, honestidad inmediata y empuje audaz hoy miau.",
  "Tauro": "Tu esencia solar es un roble de fortaleza, lealtad perseverante y aprecio estético detallista.",
  "Géminis": "Tu Sol nutre tu nido con versatilidad intelectual, gran ingenio de ideas y un diálogo constante.",
  "Cáncer": "Brillas con sol protector, infinita empatía nutricia y un amor inmenso por el cobijo en pareja.",
  "Leo": "Tu esencia despliega nobleza generosa, lealtad regia, calidez lúdica y mucha luz radiante.",
  "Virgo": "Tu Sol irradia prudencia bondadosa, amor por el trabajo cuidadoso y precisión impecable.",
  "Libra": "Tu sol busca infatigablemente el equilibrio estético, la justicia y la sintonía tierna en pareja.",
  "Escorpio": "Brillas en la esfera profunda, dotando al nido de intuición mágica, transformación y devoción total.",
  "Sagitario": "Tu esencia solar es un faro de optimismo, risa libre, aventuras felices y generosidad sincera.",
  "Capricornio": "Tu Sol brinda estabilidad inquebrantable, responsabilidad robusta, compromiso real y perseverancia silenciosa.",
  "Acuario": "Brillas con visión moderna, amistad cósmica indomable y una mente ágil sin prejuicios tradicionales.",
  "Piscis": "Esencia mística de alta sensibilidad creadora, amor incondicional y gran empatía dulce hogareña."
};

const MERCURY_SIGN_DESCRIPTIONS: Record<string, { title: string, desc: string }> = {
  "Aries": {
    title: "Mercurio en Aries ♈ - Comunicación Directa y Veloz",
    desc: "Hablas con absoluta franqueza mental y agilidad innata. Detestas los rodeos y prefieres resolver cualquier asunto del nido de inmediato con honestidad cruda. Te entusiasma proponer ideas disruptivas."
  },
  "Tauro": {
    title: "Mercurio en Tauro ♉ - Mente Práctica y Conversación Serena",
    desc: "Tu comunicación es constructiva, pausada y muy realista. Decides con bases firmes y prefieres dialogar sobre presupuestos, arreglos físicos del hogar o planes estables con total calma y argumentos sólidos."
  },
  "Géminis": {
    title: "Mercurio en Géminis ♊ - El Flujo Infinito de Ideas y Risa",
    desc: "Mente curiosa, brillante e incansable. Te encanta debatir, bromear, enviar links, música o memes divertidos a tu persona favorita y planear mil juegos nuevos para vuestras mascotas."
  },
  "Cáncer": {
    title: "Mercurio en Cáncer ♋ - Palabras Dulces cargadas de Memoria",
    desc: "Tu intelecto está profundamente ligado a tu corazón. Te comunicas con gran tacto emocional, recuerdas fechas especiales con precisión asombrosa y hablas con cariño protector de vuestra historia."
  },
  "Leo": {
    title: "Mercurio en Leo ♌ - Expresión Dramática, Creativa y Apasionada",
    desc: "Hablas con el corazón en la mano, un toque dramático de humor adorable y gran orgullo. Te encanta elogiar verbalmente a tu pareja y liderar el diseño de vuestros proyectos creativos comunes."
  },
  "Virgo": {
    title: "Mercurio en Virgo ♍ - Mente Analítica y Soluciones Prácticas",
    desc: "Atención impecable al detalle. Expresas tu inteligencia organizando vuestra agenda, proponiendo listas de mercado eficaces y buscando soluciones lógicas para aliviar la rutina doméstica."
  },
  "Libra": {
    title: "Mercurio en Libra ♎ - Diálogo Armonioso y Conciliador",
    desc: "Conversas con infinita dulzura, buscando siempre el acuerdo mutuo y detestando las palabras bruscas. Eres el mediador ideal ante cualquier pequeña discrepancia cotidiana del nido."
  },
  "Escorpio": {
    title: "Mercurio en Escorpio ♏ - Intelecto Intuitivo y Misterio Magnético",
    desc: "Mente detectivesca que lee entre líneas de inmediato miau. No te interesan las charlas superficiales; buscas pláticas sinceras y profundas sobre vuestros miedos, deseos y secretos más íntimos."
  },
  "Sagitario": {
    title: "Mercurio en Sagitario ♐ - Pensamiento Optimista y Pláticas Filosóficas",
    desc: "Tu mente es expansiva, alegre y motivadora. Te encanta planear viajes exóticos, iniciar debates de filosofía casual a altas horas y contagiar de risas el hogar con tu incorregible sentido del humor."
  },
  "Capricornio": {
    title: "Mercurio en Capricornio ♑ - Comunicación Realista y Compromiso Firme",
    desc: "Tu palabra es tu ley cósmica. Hablas con seriedad protectora, prefiriendo enfocarte en metas de futuro, planes de ahorro y la construcción del nido sobre bases indestructibles."
  },
  "Acuario": {
    title: "Mercurio en Acuario ♒ - Pensamiento Vanguardista y Visión Original",
    desc: "Tienes una perspectiva única de la vida y el hogar. Te entusiasma hablar de tecnología, ideas progresistas, y proponer dinámicas de pareja alejadas de lo convencional con total libertad mental."
  },
  "Piscis": {
    title: "Mercurio en Piscis ♓ - Comunicación Telepática, Poética e Inmaterial",
    desc: "Mente sumamente imaginativa, intuitiva y sensible. Te cuesta a veces de manera objetiva estructurar ideas frías, pero te conectas de forma hermosa mediante el arte, la música y la comprensión silenciosa."
  }
};

const VENUS_SIGN_DESCRIPTIONS: Record<string, { title: string, desc: string }> = {
  "Aries": {
    title: "Venus en Aries ♈ - Romance Apasionado e Iniciativa Audaz",
    desc: "Amas con una intensidad espontánea, juguetona y muy dinámica. Te encanta conquistar verbalmente a tu pareja, iniciar momentos de juego espontáneo en casa y sentir que la chispa de la pasión está permanentemente encendida."
  },
  "Tauro": {
    title: "Venus en Tauro ♉ - Amor Sensual, Caricias y Confort Pleno",
    desc: "Tu lenguaje del amor favorito es el tacto físico, los regalos hermosos y los placeres compartidos: masajes lentos, dormir abrazados miau, la comida exquisita y un hogar decorado con un gusto exquisito."
  },
  "Géminis": {
    title: "Venus en Géminis ♊ - Amor Alegre, Flirteo Intelectual y Cosquillas",
    desc: "Para ti, el romance entra por el cerebro y el sentido del humor. Te enamoras de la inteligencia de tu pareja, compartiendo risas, paseos espontáneos, notas secretas y pláticas ingeniosas en la cama."
  },
  "Cáncer": {
    title: "Venus en Cáncer ♋ - Afecto Hogareño, Cocina Familiar y Apapachos",
    desc: "Tu máxima expresión del amor es cuidar. Disfrutas cocinar para tu persona favorita, preparar un baño tibio, arroparle en la noche y crear un santuario de amor súper tierno alejado del ruido exterior."
  },
  "Leo": {
    title: "Venus en Leo ♌ - Romance Generoso, Detalles Regios y Orgullo Lindo",
    desc: "Amas con una devoción enorme, orgullosa y radiante. Te encanta gritar tu amor a los cuatro vientos, llenar a tu pareja de halagos cariñosos y compartir momentos teatrales y muy románticos juntos."
  },
  "Virgo": {
    title: "Venus en Virgo ♍ - Amor Cómplice a través de Pequeños Detalles Útiles",
    desc: "Para ti, un nido limpio, la ropa doblada con cariño, un té caliente cuando la otra persona está cansada, o ayudarle con sus tareas son declaraciones de amor infinitas e invaluables."
  },
  "Libra": {
    title: "Venus en Libra ♎ - Romance Elegante, Flores y Galantería Dulce",
    desc: "Anhelas una relación simétrica, romántica de cuento y sumamente estética. Adoras las citas con velitas, la música ambiental suave, los piropos poéticos y un trato tierno, armonioso y recíproco."
  },
  "Escorpio": {
    title: "Venus en Escorpio ♏ - Pasión Magnética, Fusión de Almas y Lealtad Incondicional",
    desc: "Amas con una pasión arrolladora, posesiva pero absolutamente devota. Buscas una entrega emocional total sin secretos, donde las miradas en silencio lo dicen todo y la intimidad física es mágica y sanadora."
  },
  "Sagitario": {
    title: "Venus en Sagitario ♐ - Amor Aventurero, Risa y Crecimiento Compartido",
    desc: "Tu romance ideal incluye viajes improvisados, campamentos bajo las estrellas, caminatas persiguiendo el atardecer, reírse hasta que duela la panza miau, y motivarse mutuamente a crecer como almas libres."
  },
  "Capricornio": {
    title: "Venus en Capricornio ♑ - Devoción Comprometida y Refugio Seguro de Vida",
    desc: "Tu amor es silencioso pero indestructivo. Quizá no seas de mimos excesivos en público, pero expresas tu compromiso construyendo seguridad material, apoyando los proyectos profesionales del otro y estando ahí en cada momento difícil."
  },
  "Acuario": {
    title: "Venus en Acuario ♒ - Amor Compasivo, Hermandad Cósmica y Libertad Alegre",
    desc: "Para ti ser novios es también ser los mejores amigos del universo. Amas experimentar cosas nuevas, respetando los espacios personales del otro y celebrando vuestras peculiaridades únicas sin exigencias rígidas."
  },
  "Piscis": {
    title: "Venus en Piscis ♓ - Amor Incondicional, Poético y de Cuento de Hadas",
    desc: "Vives el romance en una dimensión mágica y profundamente espiritual. Eres sumamente tierno, compasivo y capaz de una entrega desinteresada y sanadora por la felicidad de tu pareja en el nido."
  }
};

const MARS_SIGN_DESCRIPTIONS: Record<string, { title: string, desc: string }> = {
  "Aries": {
    title: "Marte en Aries ♈ - Acción Inmediata, Coraje Imparable e Impulso",
    desc: "Fuerza motora de alta velocidad miau. Si hay algo que hacer en el hogar, lo inicias al instante con entusiasmo. Ante una tensión, prefieres desahogarte honestamente rápido y seguir adelante sin rencores."
  },
  "Tauro": {
    title: "Marte en Tauro ♉ - Energía Firme, Resistencia Tenaz y Esfuerzo",
    desc: "Trabajas por tus metas con una perseverancia a prueba de balas. Si hay un quehacer pesado o una meta difícil en pareja, avanzas paso a paso sin cansarte. Eso sí, si te enojas, tardas en explotar reflexivamente."
  },
  "Géminis": {
    title: "Marte en Géminis ♊ - Acción Multitarea, Intelecto Inquieto y Debate",
    desc: "Canalizas tu energía en múltiples proyectos simultáneos: puedes estar reparando algo, buscando información en el celular y conversando, todo a la vez. Resuelves cualquier reto del nido mediante el ingenio verbal."
  },
  "Cáncer": {
    title: "Marte en Cáncer ♋ - Iniciativa Protectora de la Familia y del Nido",
    desc: "Tu fuerza brota de tu deseo protector. Haces lo que sea por defender la calma de tu pareja y de tus mascotas. Ante las tensiones cotidianas, tiendes a refugiarte en tu caparazón antes de actuar."
  },
  "Leo": {
    title: "Marte en Leo ♌ - Energía Vibrante, Creatividad Regia y Orgullo Alegre",
    desc: "Emprendes acciones con un entusiasmo magnético y un brillo innegable. Te motiva liderar dinámicas de diversión y juegos en el nido. Defiendes tus posturas con un orgullo noble pero muy cariñoso."
  },
  "Virgo": {
    title: "Marte en Virgo ♍ - Acción Detallista, Eficiencia Impecable e Hilo Fino",
    desc: "Tu energía es quirúrgica y metódica. Te encanta planear con precisión cirujana, arreglar desperfectos físicos en casa con tus manos, organizar y purificar los espacios para que todo corra con fluidez impecable."
  },
  "Libra": {
    title: "Marte en Libra ♎ - Acción Pacífica, Diplomacia y Decisiones Balanceadas",
    desc: "Detestas la agresividad o la brusquedad. Prefieres actuar a través de la cooperación mutua y buscar el consenso equilibrado. Tu impulso sagrado siempre está dirigido a sembrar equidad en la convivencia."
  },
  "Escorpio": {
    title: "Marte en Escorpio ♏ - Fuerza de Voluntad Inquebrantable e Instinto Tenaz",
    desc: "Dotado de una reservas de energía emocional extraordinarias. Cuando te propones una meta con tu pareja, nada ni nadie los puede detener. Actúas con paciencia estratégica e inmensa devoción protectora."
  },
  "Sagitario": {
    title: "Marte en Sagitario ♐ - Entusiasmo Expansivo, Iniciativa Deportiva y Risa",
    desc: "Tu impulso vital es alegre y buscador de horizontes miau. Actúas movido por ideales altos y optimismo. Te recargas de energía saliendo al aire libre, jugando con mascotas o planeando sueños ambiciosos."
  },
  "Capricornio": {
    title: "Marte en Capricornio ♑ - Energía Disciplinada, Metas Sólidas e Integridad",
    desc: "Estás en la posición de máxima madurez de acción. Planificas vuestro bienestar material a largo plazo con una seriedad ejemplar. Terminas cada tarea con excelencia ciega antes de sentarte a descansar."
  },
  "Acuario": {
    title: "Marte en Acuario ♒ - Iniciativa Innovadora, Libertad y Acción Original",
    desc: "Actúas de forma original y altruista. Te motiva reformar vuestros hábitos domésticos mediante métodos eco-amigables o tecnológicos innovadores. Resuelves discrepancias apelando a la lógica amigable."
  },
  "Piscis": {
    title: "Marte en Piscis ♓ - Acción sutil, Creatividad Sensible y Afecto Sanador",
    desc: "Tu fuerza fluye silenciosa y tierna. Actúas guiado por la intuición, ayudando a los demás o canalizando tu energía en la música, el arte o el descanso reparador en pareja. Solucionas fricciones con inmensa compasión."
  }
};

export default function AstroProfileModal({ 
  user, 
  allUsers = [], 
  onClose, 
  onRefreshData,
  home,
  onOpenInstallModal,
  pets = [],
  plants = [],
  activeUserId,
  initialTab = "natal"
}: AstroProfileModalProps) {
  const [activeUser, setActiveUser] = useState<UserProfile>(user);
  const [activeTab, setActiveTab] = useState<"natal" | "edit" | "synastry" | "settings">(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  // Edit Form States
  const [name, setName] = useState(activeUser.name);
  const [email, setEmail] = useState(activeUser.email || "");
  const [birthDate, setBirthDate] = useState(activeUser.birthDate ? activeUser.birthDate.split("T")[0] : "");
  const [birthTime, setBirthTime] = useState(activeUser.birthTime || "");
  const [birthPlace, setBirthPlace] = useState(activeUser.birthPlace || "");
  const [emoji, setEmoji] = useState(activeUser.emoji || "🐱");
  
  const [compareWithId, setCompareWithId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [msgSave, setMsgSave] = useState("");

  useEffect(() => {
    setName(activeUser.name);
    setEmail(activeUser.email || "");
    setBirthDate(activeUser.birthDate ? activeUser.birthDate.split("T")[0] : "");
    setBirthTime(activeUser.birthTime || "");
    setBirthPlace(activeUser.birthPlace || "");
    setEmoji(activeUser.emoji || "🐱");
    setMsgSave("");
    const others = allUsers.filter(u => u.id !== activeUser.id);
    if (others.length > 0) {
      setCompareWithId(others[0].id);
    }
  }, [activeUser, allUsers]);

  // Client Side deterministic fallback algorithms to support retroactive profiles perfectly
  const getClientSeed = (dateStr: string): number => {
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash << 5) - hash + dateStr.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const getFallbackMercury = (sunSign: string, dateStr: string): string => {
    const signs = ["Aries ♈", "Tauro ♉", "Géminis ♊", "Cáncer ♋", "Leo ♌", "Virgo ♍", "Libra ♎", "Escorpio ♏", "Sagitario ♐", "Capricornio ♑", "Acuario ♒", "Piscis ♓"];
    let sun = sunSign.replace(/[\u2600-\u27BF]/g, "").trim().split(" ")[0].toLowerCase();
    let sunIndex = signs.findIndex(s => s.toLowerCase().includes(sun));
    if (sunIndex === -1) sunIndex = 3; // fallback Cancer

    const seed = getClientSeed(dateStr || "1994-06-15");
    const roll = seed % 100;
    let offset = 0;
    if (roll < 50) offset = 0;
    else if (roll < 75) offset = -1;
    else offset = 1;
    return signs[(sunIndex + offset + 12) % 12];
  };

  const getFallbackVenus = (sunSign: string, dateStr: string): string => {
    const signs = ["Aries ♈", "Tauro ♉", "Géminis ♊", "Cáncer ♋", "Leo ♌", "Virgo ♍", "Libra ♎", "Escorpio ♏", "Sagitario ♐", "Capricornio ♑", "Acuario ♒", "Piscis ♓"];
    let sun = sunSign.replace(/[\u2600-\u27BF]/g, "").trim().split(" ")[0].toLowerCase();
    let sunIndex = signs.findIndex(s => s.toLowerCase().includes(sun));
    if (sunIndex === -1) sunIndex = 3;

    const seed = getClientSeed(dateStr || "1994-06-15");
    const roll = seed % 100;
    let offset = 0;
    if (roll < 40) offset = 0;
    else if (roll < 70) offset = (seed % 2 === 0) ? 1 : -1;
    else offset = (seed % 2 === 0) ? 2 : -2;
    return signs[(sunIndex + offset + 12) % 12];
  };

  const getFallbackMars = (dateStr: string): string => {
    if (!dateStr) return "Escorpio ♏";
    const birth = new Date(dateStr + "T00:00:00");
    if (isNaN(birth.getTime())) return "Escorpio ♏";
    
    const signs = ["Aries ♈", "Tauro ♉", "Géminis ♊", "Cáncer ♋", "Leo ♌", "Virgo ♍", "Libra ♎", "Escorpio ♏", "Sagitario ♐", "Capricornio ♑", "Acuario ♒", "Piscis ♓"];
    const diffTime = birth.getTime() - new Date("1970-01-01T00:00:00").getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const marsPeriod = 686.971;
    const signDuration = marsPeriod / 12;
    let marsAgeDays = diffDays % marsPeriod;
    if (marsAgeDays < 0) marsAgeDays += marsPeriod;
    const signIndex = Math.floor(marsAgeDays / signDuration + 7) % 12;
    return signs[signIndex];
  };

  const cleanSignName = (fullName: string = "") => {
    return fullName.replace(/[\u2600-\u27BF]/g, "").trim().split(" ")[0];
  };

  const getFallbackJupiter = (dateStr: string): string => {
    if (!dateStr) return "Sagitario ♐";
    const birth = new Date(dateStr + "T00:00:00");
    if (isNaN(birth.getTime())) return "Sagitario ♐";
    const signs = ["Aries ♈", "Tauro ♉", "Géminis ♊", "Cáncer ♋", "Leo ♌", "Virgo ♍", "Libra ♎", "Escorpio ♏", "Sagitario ♐", "Capricornio ♑", "Acuario ♒", "Piscis ♓"];
    const diffTime = birth.getTime() - new Date("1970-01-01T00:00:00").getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const jupiterPeriod = 4332.59; // roughly 11.86 years
    const signDuration = jupiterPeriod / 12;
    let jupiterAgeDays = diffDays % jupiterPeriod;
    if (jupiterAgeDays < 0) jupiterAgeDays += jupiterPeriod;
    const baseOffset = 7; // Jupiter was around Scorpio in Jan 1970
    const signIndex = Math.floor(jupiterAgeDays / signDuration + baseOffset) % 12;
    return signs[signIndex];
  };

  const getFallbackSaturn = (dateStr: string): string => {
    if (!dateStr) return "Acuario ♒";
    const birth = new Date(dateStr + "T00:00:00");
    if (isNaN(birth.getTime())) return "Acuario ♒";
    const signs = ["Aries ♈", "Tauro ♉", "Géminis ♊", "Cáncer ♋", "Leo ♌", "Virgo ♍", "Libra ♎", "Escorpio ♏", "Sagitario ♐", "Capricornio ♑", "Acuario ♒", "Piscis ♓"];
    const diffTime = birth.getTime() - new Date("1970-01-01T00:00:00").getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const saturnPeriod = 10759.22; // roughly 29.45 years
    const signDuration = saturnPeriod / 12;
    let saturnAgeDays = diffDays % saturnPeriod;
    if (saturnAgeDays < 0) saturnAgeDays += saturnPeriod;
    const baseOffset = 1; // Saturn was in Taurus in Jan 1970
    const signIndex = Math.floor(saturnAgeDays / signDuration + baseOffset) % 12;
    return signs[signIndex];
  };

  const getHouseSign = (risingSignStr: string, houseOffset: number): string => {
    const signs = ["Aries ♈", "Tauro ♉", "Géminis ♊", "Cáncer ♋", "Leo ♌", "Virgo ♍", "Libra ♎", "Escorpio ♏", "Sagitario ♐", "Capricornio ♑", "Acuario ♒", "Piscis ♓"];
    let risingSub = cleanSignName(risingSignStr).toLowerCase();
    let risingIndex = signs.findIndex(s => s.toLowerCase().includes(risingSub));
    if (risingIndex === -1) risingIndex = 4; // fallback Leo
    return signs[(risingIndex + houseOffset) % 12];
  };

  const currentSun = activeUser.zodiacSign || "Cáncer ♋";
  const currentMoon = activeUser.lunarSign || "Acuario ♒";
  const currentRising = activeUser.ascendantSign || "Leo ♌";
  const currentMercury = activeUser.mercurySign || getFallbackMercury(currentSun, activeUser.birthDate);
  const currentVenus = activeUser.venusSign || getFallbackVenus(currentSun, activeUser.birthDate);
  const currentMars = activeUser.marsSign || getFallbackMars(activeUser.birthDate);
  const currentJupiter = getFallbackJupiter(activeUser.birthDate);
  const currentSaturn = getFallbackSaturn(activeUser.birthDate);

  const getJupiterInterpretation = (sig: string) => {
    const s = cleanSignName(sig);
    const map: Record<string, string> = {
      "Aries": "Expande tu liderazgo y coraje innato con fe inquebrantable hoy miau.",
      "Tauro": "Expande tu prosperidad y estabilidad con fe en el trabajo dedicado.",
      "Géminis": "Expande tu curiosidad, risas y puentes constantes de conversación.",
      "Cáncer": "La gran fortuna reside en nutrir, cuidar el nido y cobijar vida miau.",
      "Leo": "Brillas de júbilo con generosidad regia y fe en tu propia expresión mística.",
      "Virgo": "Encuentras tu expansión espiritual y abundancia en el servicio diario y el orden.",
      "Libra": "Expandes tu abundancia mediante la armonía, diplomacia y belleza mutua en pareja.",
      "Escorpio": "Tu expansión reside en la sincronicidad intuitiva, renacimiento y lealtad.",
      "Sagitario": "Vibras con infinita fe, optimismo luminoso y misiones expansivas.",
      "Capricornio": "Tu crecimiento se cultiva paso a paso con madurez, cimientos estables y seriedad.",
      "Acuario": "Atraes abundancia con ideas vanguardistas, libertad comunitaria y hermandad miau.",
      "Piscis": "Sientes bendiciones divinas a través del desapego material, compasión y arte poético."
    };
    return map[s] || "Encuentras expansión y fe profunda compartiendo tu magia única en este nido.";
  };

  const getSaturnInterpretation = (sig: string) => {
    const s = cleanSignName(sig);
    const map: Record<string, string> = {
      "Aries": "Aprender a templar la impaciencia y canalizar la fuerza con madurez doméstica.",
      "Tauro": "Un camino de autodisciplina para construir bases de seguridad reales y firmes.",
      "Géminis": "Aprender a ocupar el intelecto de forma pragmática y dialogar con total honestidad.",
      "Cáncer": "La gran lección de cuidar vuestros propios sentimientos antes de cobijar el nido miau.",
      "Leo": "Estructurar tu amor propio y brillar con genuina humildad afectuosa en el hogar.",
      "Virgo": "Evitar la sobreexigencia analítica para cultivar hábitos sanos en paz y fluidez sagrada.",
      "Libra": "Te comprometes de manera sincera, responsable y equitativa en tu vínculo amoroso.",
      "Escorpio": "Aprender a integrar las tormentas e intimidades con mística madurez protectora.",
      "Sagitario": "Aterrizar tus ideales abstractos en planes realistas y sabias verdades diarias.",
      "Capricornio": "Asumes con templanza y excelencia las responsabilidades más serias del nido.",
      "Acuario": "Aprender a dar estructura realista a tus ideas renovadoras del porvenir del hogar.",
      "Piscis": "Aprender a poner límites sanos a tu inmensa empatía para resguardar tu paz miau."
    };
    return map[s] || "Estructuras tus responsabilidades cotidianas con excelente resiliencia y madurez.";
  };

  const getMoonInterpretation = () => {
    const sign = cleanSignName(currentMoon);
    return MOON_SIGN_DESCRIPTIONS[sign] || {
      title: `Luna en ${currentMoon}`,
      desc: "Tienes una sintonía emocional sensible y única. Buscas refugio y cariño mutuo dentro del nido protegiendo lo sagrado.",
      advice: "Recuerda darte un respiro, dialogar desarmado con tu pareja favorita y estirar las garras en paz."
    };
  };

  const getSolarInterpretation = () => {
    const sign = cleanSignName(currentSun);
    return SOLAR_SIGN_DESCRIPTIONS[sign] || "Tu Sol central nutre la armonía cósmica compartida de tu nido hoy.";
  };

  const getMercuryInterpretation = () => {
    const sign = cleanSignName(currentMercury);
    return MERCURY_SIGN_DESCRIPTIONS[sign] || {
      title: `Mercurio en ${currentMercury}`,
      desc: "Tu manera de procesar ideas y dialogar en casa aporta un sello único y valioso para planear las metas comunes."
    };
  };

  const getVenusInterpretation = () => {
    const sign = cleanSignName(currentVenus);
    return VENUS_SIGN_DESCRIPTIONS[sign] || {
      title: `Venus en ${currentVenus}`,
      desc: "Expresas tu afecto y romanticismo de forma tierna, valorando el nido y las atenciones compartidas."
    };
  };

  const getMarsInterpretation = () => {
    const sign = cleanSignName(currentMars);
    return MARS_SIGN_DESCRIPTIONS[sign] || {
      title: `Marte en ${currentMars}`,
      desc: "Inicias tareas con persistencia y buscas resolver discrepancias de forma constructiva para el nido."
    };
  };

  // Synastry Tab Calculations
  const otherMembers = allUsers.filter(u => u.id !== activeUser.id);
  const compareUser = allUsers.find(u => u.id === compareWithId) || otherMembers[0];

  // Helper variables for comparison (only evaluated if otherUser exists)
  const compareSun = compareUser?.zodiacSign || "Cáncer ♋";
  const compareMoon = compareUser?.lunarSign || "Acuario ♒";
  const compareRising = compareUser?.ascendantSign || "Leo ♌";
  const compareMercury = compareUser?.mercurySign || getFallbackMercury(compareSun, compareUser?.birthDate || "1994-06-15");
  const compareVenus = compareUser?.venusSign || getFallbackVenus(compareSun, compareUser?.birthDate || "1994-06-15");

  const getElement = (sign: string) => {
    const s = cleanSignName(sign).toLowerCase();
    if (["aries", "leo", "sagitario"].some(x => s.includes(x))) return { name: "Fuego 🔥", color: "text-red-700 bg-red-50" };
    if (["tauro", "virgo", "capricornio"].some(x => s.includes(x))) return { name: "Tierra 🪵", color: "text-amber-800 bg-amber-50" };
    if (["géminis", "libra", "acuario"].some(x => s.includes(x))) return { name: "Aire 💨", color: "text-sky-700 bg-sky-50" };
    return { name: "Agua 🌊", color: "text-blue-700 bg-blue-55" };
  };

  const sunA = getElement(currentSun);
  const sunB = getElement(compareSun);
  const moonA = getElement(currentMoon);
  const moonB = getElement(compareMoon);

  // Sol-Sol compatibility calculation
  const getSunSynastryResult = () => {
    if (sunA.name === sunB.name) {
      return { score: 20, desc: "¡Sintonía de Almas Gemelas! Comparten el mismo motor vital y temperamento esencial. Se entienden con sólo mirarse en el nido de amor miau." };
    }
    const elementsStr = sunA.name + sunB.name;
    if (elementsStr.includes("Fuego") && elementsStr.includes("Aire") || elementsStr.includes("Tierra") && elementsStr.includes("Agua")) {
      return { score: 18, desc: "¡Gran Sinergia Alimentada! Vuestra dinámica fluye de manera natural. El aire enciende al fuego, y la tierra da forma estable al agua. Muy asertivo para el nido." };
    }
    return { score: 13, desc: "¡Atracción de Opuestos! Elementos distintos que traen visiones del mundo contrastantes. Exige paciencia sincera, pero les regala un sabio equilibrio cotidiano en su nido de amor." };
  };

  const sunResult = getSunSynastryResult();

  const synastrySum = 40 + (sunResult.score * 3); // Max score 100% based on Solar elements

  const getSynastryStatus = (score: number) => {
    if (score >= 95) return "🔥 Conexión Solar Suprema / Sintonía Vibracional Total";
    if (score >= 85) return "💖 Alianza Cósmica Altamente Armoniosa";
    return "✨ Espejo Sagrado de Aprendizaje Mutuo";
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !birthDate) return;

    setIsSaving(true);
    setMsgSave("");
    try {
      const updated = await updateUserProfile(activeUser.id, {
        name,
        email,
        birthDate,
        birthTime,
        birthPlace,
        emoji
      });
      if (updated) {
        setActiveUser(updated);
      }
      setMsgSave("¡Tu Perfil Astral ha sido recalculado con total precisión cósmica! 🌌🐾");
      onRefreshData();
      setTimeout(() => {
        setActiveTab("natal");
        setMsgSave("");
      }, 1500);
    } catch (err) {
      setMsgSave("Error al actualizar. Por favor revisa los datos.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className={`bg-white rounded-[2.5rem] w-full border-4 border-[#F3EFE6] shadow-2xl flex flex-col overflow-hidden max-h-[92vh] transition-all duration-300 ${
        activeTab === "settings" || activeTab === "synastry" ? "max-w-5xl" : "max-w-3xl"
      }`}>
        
        {/* Header Tab Bar */}
        <div className="bg-[#FAF7F2] p-5 border-b border-[#F3EFE6] space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Avatar emoji={emoji} className="w-11 h-11 animate-pulse" />
              <div>
                <h3 className="font-extrabold text-cute text-base text-[#2C2723]">Cosmología Natal</h3>
                <p className="text-[10px] text-[#8A817C]">Oráculo astral recalculado miau</p>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-[#2C2723] rounded-full p-2 bg-white border border-[#E7E2D5] text-xs font-bold transition-all cursor-pointer"
            >
              Cerrar ✓
            </button>
          </div>

          {/* Member Toggle Switcher */}
          {allUsers.length > 1 && (
            <div className="flex items-center justify-between bg-white border border-[#E7E2D5] p-2 rounded-2xl">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider pl-1.5 flex items-center gap-1">
                <Eye size={12} className="text-amber-500" /> Consultar Perfil De:
              </span>
              <div className="flex gap-1.5">
                {allUsers.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setActiveUser(u)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                      activeUser.id === u.id
                        ? "bg-amber-100 text-amber-850 border border-amber-300"
                        : "bg-gray-100 text-[#625B57] hover:bg-gray-200 border border-transparent"
                    }`}
                  >
                    <Avatar emoji={u.emoji} className="w-5 h-5" />
                    <span>{u.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="bg-white border-b border-[#FAF7F2] flex px-3 pt-1 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab("natal")}
            className={`flex-1 min-w-fit px-3 py-3 text-[11px] font-black text-cute transition-all border-b-4 tracking-wide ${
              activeTab === "natal" 
                ? "border-amber-500 text-amber-600" 
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            🌌 Signo Solar
          </button>
          
          <button
            onClick={() => setActiveTab("synastry")}
            className={`flex-1 min-w-fit px-3 py-3 text-[11px] font-black text-cute transition-all border-b-4 tracking-wide ${
              activeTab === "synastry" 
                ? "border-[#F472B6] text-pink-600" 
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            💑 Compatibilidad
          </button>

          <button
            onClick={() => setActiveTab("edit")}
            className={`flex-1 min-w-fit px-3 py-3 text-[11px] font-black text-cute transition-all border-b-4 tracking-wide ${
              activeTab === "edit" 
                ? "border-amber-500 text-amber-600" 
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            👤 Datos de Perfil
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 min-w-fit px-3 py-3 text-[11px] font-black text-cute transition-all border-b-4 tracking-wide ${
              activeTab === "settings" 
                ? "border-amber-600 text-amber-800 font-extrabold" 
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            ⚙️ Configuraciones
          </button>
        </div>

        {/* Tab Content Scrolling */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 bg-slate-50/20">
          
          {activeTab === "natal" && (
            <div className="space-y-6">
              
              {/* Micro-table with Real Credentials / Birth metadata */}
              <div className="bg-[#FCFAF7] border border-[#EAE5D9] rounded-2.5xl p-4 grid grid-cols-2 gap-2 text-center shadow-xs">
                <div className="space-y-0.5">
                  <div className="flex justify-center text-amber-600"><Calendar size={13} /></div>
                  <p className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400">Nacimiento</p>
                  <p className="text-xs font-bold text-[#2C2723] truncate">{activeUser.birthDate || "No registrada"}</p>
                </div>

                <div className="space-y-0.5 border-l border-[#EAE5D9]">
                  <div className="flex justify-center text-orange-500">☀️</div>
                  <p className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400">Signo Solar</p>
                  <p className="text-xs font-bold text-[#2C2723]">{currentSun}</p>
                </div>
              </div>

              {/* Grid of Celestial Placements (Simplified to SOLAR ONLY) */}
              <div className="space-y-4">
                
                {/* 1. SOLAR SIGN */}
                <div className="rounded-3xl border border-amber-150 bg-gradient-to-br from-amber-50/40 to-orange-50/20 p-5 flex gap-4 items-start shadow-sm">
                  <div className="w-12 h-12 bg-amber-100/80 text-amber-600 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner">
                    ☀️
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-[#2C2723] text-sm uppercase tracking-wider flex items-center gap-1 text-amber-850">
                      Signo Solar Principal: {currentSun}
                    </h4>
                    <p className="text-xs text-[#5C5552] leading-relaxed font-semibold">
                      {getSolarInterpretation()}
                    </p>
                    <p className="text-xs text-gray-500 leading-normal font-medium mt-1">
                      Este es tu núcleo astral, tu motor de vida, energía y voluntad consciente. rige el humor, tu energía vital hoy y cómo aportas luz al nido compartido miau.
                    </p>
                  </div>
                </div>

              </div>
              
              <div className="text-[10px] text-[#8A817C] text-center italic bg-[#FCFAF7] border border-[#FAF7F2] py-2.5 rounded-xl">
                🔮 "La vibración de tu Sol central sostiene la armonía de tu nido." — Milo
              </div>

            </div>
          )}

          {activeTab === "synastry" && (
            <div className="space-y-6">
              {otherMembers.length === 0 ? (
                <div className="bg-gradient-to-br from-amber-50 to-pink-50 rounded-[2rem] p-6 border-2 border-dashed border-pink-200 text-center space-y-3">
                  <span className="text-3xl">💑</span>
                  <h4 className="font-extrabold text-cute text-sm text-[#2C2723]">¿Falta tu otra mitad en el nido celestial?</h4>
                  <p className="text-[11px] text-[#625B57] max-w-sm mx-auto leading-relaxed">
                    Para calcular y visualizar vuestra compatibilidad solar, el nido necesita registrar otro inquilino con su fecha de nacimiento miau.
                  </p>
                </div>
              ) : (
                <div className="space-y-5 animate-fade-in">
                  
                  {/* Select other user if more than 1 option exists */}
                  {otherMembers.length > 1 && (
                    <div className="bg-[#FCFAF7] border border-[#EAE5D9] p-3 rounded-2xl flex items-center justify-between">
                      <span className="text-[10px] uppercase font-black text-gray-450 pl-2">Comparar estrella con:</span>
                      <select 
                        value={compareWithId}
                        onChange={(e) => setCompareWithId(e.target.value)}
                        className="bg-white rounded-xl px-3 py-1.5 text-xs font-bold border border-[#EAE5D9] focus:outline-none focus:ring-1 focus:ring-pink-400"
                      >
                        {otherMembers.map(m => (
                          <option key={m.id} value={m.id}>{m.emoji || "👤"} {m.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Similarity general card */}
                  <div className="bg-[#FFF0F3] border-4 border-[#FFE4E6] rounded-[2rem] p-6 text-center space-y-4 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 text-2xl opacity-15">✨</div>
                    <div className="space-y-1">
                      <h4 className="text-[10px] uppercase tracking-widest font-black text-pink-800">Sintonía Solar Compartida</h4>
                      <p className="text-xs text-[#8A817C]">Cálculo de afinidad básica de temperamento cósmico miau</p>
                    </div>

                    <div className="flex flex-col items-center justify-center py-2 relative">
                      <div className="w-24 h-24 rounded-full border-4 border-dashed border-pink-300 flex items-center justify-center animate-spin-slow absolute opacity-30"></div>
                      <div className="w-20 h-20 rounded-full bg-white border-2 border-pink-500 flex flex-col items-center justify-center shadow-xs animate-pulse">
                        <span className="text-xl font-black text-[#2C2723]">{synastrySum}%</span>
                        <span className="text-[8px] font-bold text-pink-750 uppercase tracking-wider">Afinidad</span>
                      </div>
                    </div>

                    <div className="space-y-1 max-w-sm mx-auto">
                      <h5 className="font-extrabold text-xs text-[#2C2723]">{getSynastryStatus(synastrySum)}</h5>
                      <p className="text-[10.5px] text-[#625B57] leading-relaxed">
                        Vuestra compatibilidad elemental (Soles) revela los ritmos fundamentales de convivencia en vuestro nido miau.
                      </p>
                    </div>
                  </div>

                  {/* List of analyzed planets (SIMPLIFIED TO SUN ONLY) */}
                  <div className="space-y-4">
                    {/* Sun alignment */}
                    <div className="bg-white rounded-2xl p-4 border border-amber-100 flex gap-3.5 items-start shadow-2xs">
                      <span className="text-xl shrink-0 mt-0.5">☀️</span>
                      <div className="space-y-1 flex-1">
                        <div className="flex justify-between items-center border-b border-black/5 pb-1">
                          <h5 className="font-bold text-xs text-[#2C2723]">Esencia Vital y Elementos Solares</h5>
                          <div className="flex gap-1 flex-wrap">
                            <span className={`text-[8.5px] uppercase font-black px-1.5 py-0.5 rounded-full ${sunA.color}`}>{activeUser.name}: {sunA.name}</span>
                            <span className={`text-[8.5px] uppercase font-black px-1.5 py-0.5 rounded-full ${sunB.color}`}>{compareUser.name}: {sunB.name}</span>
                          </div>
                        </div>
                        <p className="text-[10.5px] text-[#625B57] leading-relaxed pt-1">
                          {sunResult.desc}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {activeTab === "edit" && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              
              {/* Emoji Selector inside edit */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#2C2723] uppercase tracking-wider flex items-center justify-between">
                  <span>Tu Avatar Cósmico</span>
                  <span className="text-xs text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                    {CUSTOM_AVATARS.find(a => a.id === emoji)?.name || "Gatito Celestial"}
                  </span>
                </label>
                
                <div className="grid grid-cols-5 gap-2 p-3 bg-[#FAF7F2] rounded-2xl border-2 border-[#E7E2D5] max-h-[190px] overflow-y-auto">
                  {CUSTOM_AVATARS.map(av => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setEmoji(av.id)}
                      title={av.name}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                        emoji === av.id 
                          ? "bg-amber-100 border-2 border-amber-500 scale-105 shadow-xs" 
                          : "bg-white hover:bg-amber-105/50 border border-[#E7E2D5]"
                      }`}
                    >
                      <Avatar emoji={av.id} className="w-10 h-10" />
                      <span className="text-[8px] font-extrabold text-amber-900 mt-1 truncate max-w-full leading-none">
                        {av.name.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#625B57]">Nombre de este integrador:</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#FAF7F2] focus:ring-amber-400 focus:outline-none rounded-xl px-3 py-2.5 border border-[#EAE5D9] text-sm font-medium text-[#2C2723]"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#625B57]">Correo Electrónico:</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#FAF7F2] focus:ring-amber-400 focus:outline-none rounded-xl px-3 py-2.5 border border-[#EAE5D9] text-sm font-medium text-[#2C2723]"
                />
              </div>

              {/* Date of birth */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#625B57]">Fecha Nacimiento:</label>
                 <input 
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-[#FAF7F2] focus:ring-amber-400 focus:outline-none rounded-xl px-3 py-2.5 border border-[#EAE5D9] text-sm font-medium text-[#2C2723]"
                />
              </div>

              {msgSave && (
                <div className="p-3.5 bg-green-50 border border-green-200 text-green-900 rounded-xl text-xs font-semibold leading-relaxed flex items-center gap-2">
                  <span>🐾</span>
                  <span>{msgSave}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#2C2723] hover:bg-black text-white px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer disabled:opacity-50"
                >
                  <Save size={13} /> {isSaving ? "Guardando..." : "Guardar y Recalcular"}
                </button>
              </div>

            </form>
          )}

          {activeTab === "settings" && (
            <div>
              {home ? (
                <SettingsModule 
                  home={home} 
                  users={allUsers} 
                  onRefreshData={onRefreshData} 
                  onOpenInstallModal={onOpenInstallModal}
                  pets={pets}
                  plants={plants}
                  activeUserId={activeUserId || activeUser.id}
                />
              ) : (
                <div className="p-8 text-center text-gray-500 text-xs font-semibold">
                  Cargando configuraciones del hogar miau... 🐾
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
