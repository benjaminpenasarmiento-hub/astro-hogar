import { MovementPattern, Exercise, Routine } from "../types/workout";

export const DEFAULT_MOVEMENT_PATTERNS: MovementPattern[] = [
  {
    id: "empuje_horizontal",
    name: "Empuje Horizontal",
    category: "Upper",
    targetMuscles: ["Pectoral Mayor", "Tríceps", "Deltoides Anterior"],
    icon: "🏋️‍♂️",
    description: "Movimientos de empuje en plano horizontal para pectoral medio/inferior.",
    defaultExerciseId: "press_banca_plano_barra"
  },
  {
    id: "empuje_inclinado",
    name: "Empuje Inclinado",
    category: "Upper",
    targetMuscles: ["Pectoral Superior", "Deltoides Anterior", "Tríceps"],
    icon: "📐",
    description: "Movimientos en ángulo inclinado (30-45°) enfocados en la porción clavicular del pecho.",
    defaultExerciseId: "press_inclinado_mancuernas"
  },
  {
    id: "empuje_vertical",
    name: "Empuje Vertical",
    category: "Upper",
    targetMuscles: ["Deltoides Anterior", "Deltoides Lateral", "Tríceps"],
    icon: "👑",
    description: "Presses por encima de la cabeza para hombros y fuerza vertical.",
    defaultExerciseId: "press_militar_mancuernas"
  },
  {
    id: "traccion_horizontal",
    name: "Tracción Horizontal",
    category: "Upper",
    targetMuscles: ["Dorsal Ancho", "Trapecio Medio/Inferior", "Romboides", "Bíceps"],
    icon: "🚣‍♂️",
    description: "Remos para densidad de espalda y salud de la cintura escapular.",
    defaultExerciseId: "remo_maquina_hammer"
  },
  {
    id: "traccion_vertical",
    name: "Tracción Vertical",
    category: "Upper",
    targetMuscles: ["Dorsal Ancho", "Redondo Mayor", "Bíceps"],
    icon: "🧗‍♂️",
    description: "Jalones y dominadas para amplitud y anchura de la espalda.",
    defaultExerciseId: "jalon_polea_agarre_neutro"
  },
  {
    id: "dominante_rodilla",
    name: "Dominante de Rodilla",
    category: "Lower",
    targetMuscles: ["Cuádriceps", "Glúteos"],
    icon: "🦵",
    description: "Sentadillas y prensas centradas en flexión de rodilla y cuádriceps.",
    defaultExerciseId: "prensa_piernas_45"
  },
  {
    id: "aislamiento_cuadriceps",
    name: "Aislamiento Cuádriceps",
    category: "Lower",
    targetMuscles: ["Cuádriceps (Recto Femoral)"],
    icon: "🔥",
    description: "Extensiones analíticas para cuádriceps.",
    defaultExerciseId: "extension_piernas_maquina"
  },
  {
    id: "dominante_cadera",
    name: "Dominante de Cadera",
    category: "Lower",
    targetMuscles: ["Isquiotibiales", "Glúteo Mayor", "Erectores Espinales"],
    icon: "🍑",
    description: "Hip Thrusts, Pesos Muertos Rumanos y Curls de Isquiotibiales.",
    defaultExerciseId: "peso_muerto_rumano_mancuernas"
  },
  {
    id: "deltoides_lateral",
    name: "Deltoides Lateral",
    category: "Upper",
    targetMuscles: ["Deltoides Lateral"],
    icon: "🦅",
    description: "Elevaciones para dar anchura en 'V' a los hombros.",
    defaultExerciseId: "elevaciones_laterales_polea"
  },
  {
    id: "deltoides_posterior",
    name: "Deltoides Posterior",
    category: "Upper",
    targetMuscles: ["Deltoides Posterior", "Trapecio"],
    icon: "🎯",
    description: "Pájaros y Face Pulls para salud del hombro posterior.",
    defaultExerciseId: "face_pulls_polea"
  },
  {
    id: "aislamiento_biceps",
    name: "Aislamiento Bíceps",
    category: "Arms",
    targetMuscles: ["Bíceps Braquial", "Braquial Anterior"],
    icon: "💪",
    description: "Curls en polea, mancuerna o barra para brazos.",
    defaultExerciseId: "curl_biceps_polea_baja"
  },
  {
    id: "aislamiento_triceps",
    name: "Aislamiento Tríceps",
    category: "Arms",
    targetMuscles: ["Tríceps Braquial (Cabeza Larga, Lateral, Medial)"],
    icon: "⚡",
    description: "Extensiones en polea y Katana para tríceps.",
    defaultExerciseId: "extension_triceps_polea_cuerda"
  },
  {
    id: "pantorrilla",
    name: "Pantorrilla / Gemelos",
    category: "Lower",
    targetMuscles: ["Gastrocnemio", "Sóleo"],
    icon: "🦶",
    description: "Elevaciones de gemelos de pie o sentado.",
    defaultExerciseId: "elevacion_gemelos_de_pie"
  },
  {
    id: "core_abs",
    name: "Core / Abdominales",
    category: "Core",
    targetMuscles: ["Recto Abdominal", "Oblicuos"],
    icon: "🛡️",
    description: "Crunches en polea y elevaciones de piernas.",
    defaultExerciseId: "crunch_polea_alta"
  },
  {
    id: "cardio_ciclismo",
    name: "Cardio & Ciclismo",
    category: "Cardio",
    targetMuscles: ["Sistema Cardiovascular", "Cuádriceps", "Isquiotibiales"],
    icon: "🚴‍♂️",
    description: "Sesiones de ciclismo al aire libre o en bici estática para resistencia y recuperación activa.",
    defaultExerciseId: "ciclismo_bici_ruta_estatica"
  }
];

export const DEFAULT_EXERCISES: Exercise[] = [
  // --- Cardio / Ciclismo ---
  {
    id: "ciclismo_bici_ruta_estatica",
    movementPatternId: "cardio_ciclismo",
    name: "Ciclismo / Bici de Ruta o Estática",
    equipment: "Otro",
    defaultTargetReps: "30-45 min",
    defaultTargetSets: 1,
    incrementKg: 0,
    description: "Pedaleo a cadencia constante para recuperación activa y salud cardiovascular."
  },
  {
    id: "ciclismo_spining_intervalos",
    movementPatternId: "cardio_ciclismo",
    name: "Ciclismo Spinning / Intervalos",
    equipment: "Otro",
    defaultTargetReps: "20-30 min",
    defaultTargetSets: 1,
    incrementKg: 0,
    description: "Intervalos de alta intensidad alternados con pedaleo suave."
  },
  // --- Empuje Horizontal ---
  {
    id: "press_banca_plano_barra",
    movementPatternId: "empuje_horizontal",
    name: "Press Banca con Barra",
    equipment: "Barra",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 2.5,
    description: "Banca plana clásica con barra guiada o libre."
  },
  {
    id: "press_pecho_maquina_hammer",
    movementPatternId: "empuje_horizontal",
    name: "Press Pecho Máquina Hammer",
    equipment: "Máquina Hammer",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 2.5,
    description: "Excelente estabilidad para hipertrofia de pecho sin sobrecargar hombros."
  },
  {
    id: "press_mancuernas_plano",
    movementPatternId: "empuje_horizontal",
    name: "Press con Mancuernas en Banco Plano",
    equipment: "Mancuernas",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 2,
    description: "Mayor rango de movimiento e independencia muscular."
  },
  {
    id: "press_smith_plano",
    movementPatternId: "empuje_horizontal",
    name: "Press Pecho en Smith Plano",
    equipment: "Máquina Smith",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 2.5,
    description: "Guiado y seguro para empujar al fallo con máxima tensión."
  },
  {
    id: "press_convergente_maquina",
    movementPatternId: "empuje_horizontal",
    name: "Press Pecho Convergente en Máquina",
    equipment: "Máquina Guiada / Selector",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 5,
    description: "Máquina de placas con recorrido que se cierra al centro."
  },
  {
    id: "fondos_paralelas",
    movementPatternId: "empuje_horizontal",
    name: "Fondos en Paralelas (Dips)",
    equipment: "Peso Corporal",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 2.5,
    description: "Torso inclinado hacia adelante enfocando pecho e tríceps."
  },

  // --- Empuje Inclinado ---
  {
    id: "press_inclinado_mancuernas",
    movementPatternId: "empuje_inclinado",
    name: "Press Inclinado con Mancuernas",
    equipment: "Mancuernas",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 2,
    description: "Banco inclinado a 30-45° para la porción superior del pectoral."
  },
  {
    id: "press_inclinado_maquina_hammer",
    movementPatternId: "empuje_inclinado",
    name: "Press Inclinado Máquina Hammer",
    equipment: "Máquina Hammer",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 2.5,
    description: "Aislado y masivo en la parte superior del pecho."
  },
  {
    id: "press_inclinado_smith",
    movementPatternId: "empuje_inclinado",
    name: "Press Inclinado en Smith",
    equipment: "Máquina Smith",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 2.5,
    description: "Barra guiada inclinada para aislar pectoral superior."
  },
  {
    id: "press_inclinado_polea",
    movementPatternId: "empuje_inclinado",
    name: "Press Inclinado en Polea Baja",
    equipment: "Polea",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 2.5,
    description: "Tensión constante en todo el recorrido."
  },

  // --- Empuje Vertical ---
  {
    id: "press_militar_mancuernas",
    movementPatternId: "empuje_vertical",
    name: "Press Militar con Mancuernas (Sentado)",
    equipment: "Mancuernas",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 2,
    description: "Banco a 80-85°, empuje vertical para deltoides anterior."
  },
  {
    id: "press_hombro_maquina_hammer",
    movementPatternId: "empuje_vertical",
    name: "Press Hombro en Máquina Hammer",
    equipment: "Máquina Hammer",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 2.5,
    description: "Súper cómodo y seguro para aplicar máxima fuerza."
  },
  {
    id: "press_militar_smith",
    movementPatternId: "empuje_vertical",
    name: "Press Militar en Smith",
    equipment: "Máquina Smith",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 2.5,
    description: "Barra guiada por delante de la cabeza."
  },

  // --- Tracción Horizontal ---
  {
    id: "remo_maquina_hammer",
    movementPatternId: "traccion_horizontal",
    name: "Remo en Máquina Hammer (Unilateral/Bilateral)",
    equipment: "Máquina Hammer",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 2.5,
    description: "Pecho apoyado para eliminar fatiga lumbar."
  },
  {
    id: "remo_polea_baja_agarre_neutro",
    movementPatternId: "traccion_horizontal",
    name: "Remo Sentado en Polea Baja (Agarre Giratorio/Neutro)",
    equipment: "Polea",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 5,
    description: "Llevar agarre a la cadera contrayendo dorsal y espalda media."
  },
  {
    id: "remo_mancuerna_unilateral",
    movementPatternId: "traccion_horizontal",
    name: "Remo Unilateral con Mancuerna (Apoyado)",
    equipment: "Mancuernas",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 2,
    description: "Unilateral en banco plano con gran estiramiento."
  },
  {
    id: "remo_barra_pendlay",
    movementPatternId: "traccion_horizontal",
    name: "Remo con Barra a 45°",
    equipment: "Barra",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 2.5,
    description: "Remo libre con barra enfocado en densidad."
  },

  // --- Tracción Vertical ---
  {
    id: "jalon_polea_agarre_neutro",
    movementPatternId: "traccion_vertical",
    name: "Jalón al Pecho Agarre Neutro/Ancho en Polea",
    equipment: "Polea",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 5,
    description: "Jalón vertical llevando la barra/agarre hacia el pectoral superior."
  },
  {
    id: "jalon_maquina_hammer",
    movementPatternId: "traccion_vertical",
    name: "Jalón Dorsal en Máquina Hammer",
    equipment: "Máquina Hammer",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 2.5,
    description: "Arco convergente ideal para aislamiento de dorsales."
  },
  {
    id: "dominadas_asistidas",
    movementPatternId: "traccion_vertical",
    name: "Dominadas Asistidas en Máquina",
    equipment: "Máquina Guiada / Selector",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 5,
    description: "Permite progresar en dominadas con contrapeso regulable."
  },

  // --- Dominante de Rodilla ---
  {
    id: "prensa_piernas_45",
    movementPatternId: "dominante_rodilla",
    name: "Prensa de Piernas 45°",
    equipment: "Máquina Guiada / Selector",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 10,
    description: "Inclinación a 45° con excelente rango de flexión de rodilla."
  },
  {
    id: "hack_squat_maquina",
    movementPatternId: "dominante_rodilla",
    name: "Sentadilla Hack (Hack Squat)",
    equipment: "Máquina Hammer",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 5,
    description: "El 'rey' de los ejercicios de cuádriceps sin fatiga en espalda baja."
  },
  {
    id: "sentadilla_smith",
    movementPatternId: "dominante_rodilla",
    name: "Sentadilla en Máquina Smith",
    equipment: "Máquina Smith",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 5,
    description: "Pies ligeramente adelantados para enfatizar cuádriceps."
  },
  {
    id: "zancadas_bulgaras_mancuernas",
    movementPatternId: "dominante_rodilla",
    name: "Sentadilla Búlgaras con Mancuernas",
    equipment: "Mancuernas",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 2,
    description: "Unilateral exigente para cuádriceps y glúteos."
  },

  // --- Aislamiento Cuádriceps ---
  {
    id: "extension_piernas_maquina",
    movementPatternId: "aislamiento_cuadriceps",
    name: "Extensión de Piernas en Máquina (Leg Extension)",
    equipment: "Máquina Guiada / Selector",
    defaultTargetReps: "8-10",
    defaultTargetSets: 3,
    incrementKg: 5,
    description: "Aislamiento directo para el recto femoral en la parte alta."
  },

  // --- Dominante de Cadera ---
  {
    id: "peso_muerto_rumano_mancuernas",
    movementPatternId: "dominante_cadera",
    name: "Peso Muerto Rumano con Mancuernas (RDL)",
    equipment: "Mancuernas",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 4,
    description: "Bisagra de cadera sintiendo estiramiento profundo en isquios."
  },
  {
    id: "hip_thrust_barra_maquina",
    movementPatternId: "dominante_cadera",
    name: "Hip Thrust en Máquina o Barra",
    equipment: "Barra",
    defaultTargetReps: "6-8",
    defaultTargetSets: 3,
    incrementKg: 5,
    description: "Máxima activación del glúteo mayor."
  },
  {
    id: "curl_isquiotibiales_sentado",
    movementPatternId: "dominante_cadera",
    name: "Curl de Isquiotibiales Sentado en Máquina",
    equipment: "Máquina Guiada / Selector",
    defaultTargetReps: "8-10",
    defaultTargetSets: 3,
    incrementKg: 5,
    description: "Estiramiento acentuado en posición sentada."
  },
  {
    id: "curl_isquiotibiales_acostado",
    movementPatternId: "dominante_cadera",
    name: "Curl de Isquiotibiales Acostado (Lying Leg Curl)",
    equipment: "Máquina Guiada / Selector",
    defaultTargetReps: "8-10",
    defaultTargetSets: 3,
    incrementKg: 5,
    description: "Flexión de rodilla acostado boca abajo."
  },

  // --- Deltoides Lateral ---
  {
    id: "elevaciones_laterales_polea",
    movementPatternId: "deltoides_lateral",
    name: "Elevaciones Laterales en Polea (Baja / Media)",
    equipment: "Polea",
    defaultTargetReps: "8-10",
    defaultTargetSets: 3,
    incrementKg: 1.25,
    description: "Tensión uniforme en la cabeza lateral del deltoides."
  },
  {
    id: "elevaciones_laterales_mancuernas",
    movementPatternId: "deltoides_lateral",
    name: "Elevaciones Laterales con Mancuernas",
    equipment: "Mancuernas",
    defaultTargetReps: "8-10",
    defaultTargetSets: 3,
    incrementKg: 1,
    description: "Controlando el descenso sin balanceos."
  },

  // --- Deltoides Posterior ---
  {
    id: "face_pulls_polea",
    movementPatternId: "deltoides_posterior",
    name: "Face Pulls en Polea Alta con Cuerda",
    equipment: "Polea",
    defaultTargetReps: "8-10",
    defaultTargetSets: 3,
    incrementKg: 2.5,
    description: "Salud articular de hombro y deltoides posterior."
  },
  {
    id: "pajaros_pec_deck",
    movementPatternId: "deltoides_posterior",
    name: "Pájaros / Reverse Flyes en Máquina Pec Deck",
    equipment: "Máquina Guiada / Selector",
    defaultTargetReps: "8-10",
    defaultTargetSets: 3,
    incrementKg: 2.5,
    description: "Aislamiento constante de deltoides posterior."
  },

  // --- Aislamiento Bíceps ---
  {
    id: "curl_biceps_polea_baja",
    movementPatternId: "aislamiento_biceps",
    name: "Curl de Bíceps en Polea Baja con Barra/Cuerda",
    equipment: "Polea",
    defaultTargetReps: "8-10",
    defaultTargetSets: 3,
    incrementKg: 2.5,
    description: "Tensión constante desde la posición estirada."
  },
  {
    id: "curl_biceps_mancuernas_inclinado",
    movementPatternId: "aislamiento_biceps",
    name: "Curl de Bíceps en Banco Inclinado con Mancuernas",
    equipment: "Mancuernas",
    defaultTargetReps: "8-10",
    defaultTargetSets: 3,
    incrementKg: 1,
    description: "Gran estiramiento en la cabeza larga del bíceps."
  },
  {
    id: "curl_martillo_mancuernas",
    movementPatternId: "aislamiento_biceps",
    name: "Curl Martillo con Mancuernas (Braquial)",
    equipment: "Mancuernas",
    defaultTargetReps: "8-10",
    defaultTargetSets: 3,
    incrementKg: 1,
    description: "Agarre neutro para grosor de brazo y antebrazo."
  },

  // --- Aislamiento Tríceps ---
  {
    id: "extension_triceps_polea_cuerda",
    movementPatternId: "aislamiento_triceps",
    name: "Extensión de Tríceps en Polea Alta con Cuerda",
    equipment: "Polea",
    defaultTargetReps: "8-10",
    defaultTargetSets: 3,
    incrementKg: 2.5,
    description: "Abriendo la cuerda al final de la flexión."
  },
  {
    id: "extension_katana_polea",
    movementPatternId: "aislamiento_triceps",
    name: "Extensión Katana Overhead en Polea",
    equipment: "Polea",
    defaultTargetReps: "8-10",
    defaultTargetSets: 3,
    incrementKg: 2.5,
    description: "Por encima de la cabeza enfocando la cabeza larga del tríceps."
  },
  {
    id: "press_frances_barra_z",
    movementPatternId: "aislamiento_triceps",
    name: "Press Francés con Barra Z en Banco Plano",
    equipment: "Barra",
    defaultTargetReps: "8-10",
    defaultTargetSets: 3,
    incrementKg: 2,
    description: "Llevando la barra hacia la frente o coronilla."
  },

  // --- Pantorrilla ---
  {
    id: "elevacion_gemelos_de_pie",
    movementPatternId: "pantorrilla",
    name: "Elevación de Gemelos de Pie en Máquina / Smith",
    equipment: "Máquina Smith",
    defaultTargetReps: "10-12",
    defaultTargetSets: 3,
    incrementKg: 5,
    description: "Pausa abajo en estiramiento y contracción arriba."
  },

  // --- Core / Abdominales ---
  {
    id: "crunch_polea_alta",
    movementPatternId: "core_abs",
    name: "Crunch en Polea Alta con Cuerda",
    equipment: "Polea",
    defaultTargetReps: "10-12",
    defaultTargetSets: 3,
    incrementKg: 5,
    description: "Flexión de columna con carga progresiva para abdominales gruesos."
  },
  {
    id: "elevacion_piernas_silla_romana",
    movementPatternId: "core_abs",
    name: "Elevación de Piernas Colgado / Silla Romana",
    equipment: "Peso Corporal",
    defaultTargetReps: "10-12",
    defaultTargetSets: 3,
    incrementKg: 0,
    description: "Llevando rodillas o pies hacia arriba retrovirtiendo la pelvis."
  },

  // --- EJERCICIOS EN CASA (MAFE / ENTRENAMIENTO CASERO) ---
  {
    id: "hip_thrust_casa_banda",
    movementPatternId: "dominante_cadera",
    name: "Glute Bridge / Hip Thrust en Casa con Banda",
    equipment: "Banda de Resistencia",
    defaultTargetReps: "12-15",
    defaultTargetSets: 3,
    incrementKg: 1,
    description: "Espalda apoyada en sofá o suelo con banda elástica sobre rodillas. Enfoque directo en glúteo."
  },
  {
    id: "patada_gluteo_banda",
    movementPatternId: "dominante_cadera",
    name: "Patada de Glúteo en Cuadrupedia con Banda",
    equipment: "Banda de Resistencia",
    defaultTargetReps: "15-20",
    defaultTargetSets: 3,
    incrementKg: 0.5,
    description: "Extensión de cadera en esterilla manteniendo tensión continua en el glúteo mayor."
  },
  {
    id: "abduccion_cadera_banda",
    movementPatternId: "dominante_cadera",
    name: "Abducción de Cadera Sentada con Banda",
    equipment: "Banda de Resistencia",
    defaultTargetReps: "15-20",
    defaultTargetSets: 3,
    incrementKg: 0,
    description: "Apertura de rodillas con mini-band elástica para glúteo medio y tonificación lateral."
  },
  {
    id: "sentadilla_goblet_mancuerna",
    movementPatternId: "dominante_rodilla",
    name: "Sentadilla Goblet con Mancuerna en Casa",
    equipment: "Mancuernas",
    defaultTargetReps: "10-12",
    defaultTargetSets: 3,
    incrementKg: 1,
    description: "Mancuerna pegada al pecho, bajando controlado sin impacto articular."
  },
  {
    id: "zancadas_reversa_casa",
    movementPatternId: "dominante_rodilla",
    name: "Zancadas Reversa en Casa (Paso Atrás)",
    equipment: "Mancuernas",
    defaultTargetReps: "10-12",
    defaultTargetSets: 3,
    incrementKg: 1,
    description: "Paso controlado hacia atrás para proteger rodillas y activar glúteo/cuádriceps."
  },
  {
    id: "peso_muerto_unilateral_mancuerna",
    movementPatternId: "dominante_cadera",
    name: "Peso Muerto Rumano Unilateral con Mancuerna",
    equipment: "Mancuernas",
    defaultTargetReps: "10-12",
    defaultTargetSets: 3,
    incrementKg: 1,
    description: "Bisagra de cadera a una pierna apoyando la otra. Trabajo de estabilidad e isquios/glúteo."
  },
  {
    id: "remo_unilateral_mancuerna_casa",
    movementPatternId: "traccion_horizontal",
    name: "Remo Unilateral con Mancuerna (Apoyo en Silla)",
    equipment: "Mancuernas",
    defaultTargetReps: "10-12",
    defaultTargetSets: 3,
    incrementKg: 1,
    description: "Tracciónd e espalda cómoda en casa cuidando la postura lumbar."
  },
  {
    id: "press_militar_mancuernas_casa",
    movementPatternId: "empuje_vertical",
    name: "Press de Hombros Sentada con Mancuernas",
    equipment: "Mancuernas",
    defaultTargetReps: "10-12",
    defaultTargetSets: 3,
    incrementKg: 1,
    description: "Empuje vertical con mancuernas ligeras para postura y tono de hombros."
  },
  {
    id: "flexiones_rodillas_casa",
    movementPatternId: "empuje_horizontal",
    name: "Flexiones Modificadas sobre Rodillas o Pared",
    equipment: "Peso Corporal",
    defaultTargetReps: "8-12",
    defaultTargetSets: 3,
    incrementKg: 0,
    description: "Empuje horizontal de bajo impacto fortaleciendo pecho, brazos y core."
  },
  {
    id: "plancha_abdominal_suelo_pelvico",
    movementPatternId: "core_abs",
    name: "Plancha Isométrica & Suelo Pélvico en Casa",
    equipment: "Peso Corporal",
    defaultTargetReps: "30-45 seg",
    defaultTargetSets: 3,
    incrementKg: 0,
    description: "Activación profunda de faja abdominal y suelo pélvico."
  },
  {
    id: "dead_bug_pilates_casa",
    movementPatternId: "core_abs",
    name: "Dead Bug & Control Abdominal Pilates",
    equipment: "Peso Corporal",
    defaultTargetReps: "12-15",
    defaultTargetSets: 3,
    incrementKg: 0,
    description: "Bajo impacto, excelente para estabilidad de zona lumbar y core."
  },
  {
    id: "movilidad_articular_cadera_columna",
    movementPatternId: "cardio_ciclismo",
    name: "Secuencia de Movilidad Articular, Cadera & Columna",
    equipment: "Peso Corporal",
    defaultTargetReps: "15-20 min",
    defaultTargetSets: 1,
    incrementKg: 0,
    description: "Estiramientos dinámicos, cat-cow y apertura de cadera para bienestar diario."
  }
];

export const DEFAULT_ROUTINES: Routine[] = [
  // --- RUTINAS DE CASA MAFE 🌸 ---
  {
    id: "rutina_mafe_casa_gluteo_pierna",
    name: "Rutina Mafe 🏡 Día 1: Glúteo & Pierna Firme (Bandas & Casa)",
    description: "Rutina enfocada en glúteo, cadera y piernas usando bandas de resistencia y mancuernas ligeras en casa.",
    color: "#EC4899", // Pink
    createdBy: "Mafe",
    createdAt: new Date().toISOString(),
    patterns: [
      {
        movementPatternId: "dominante_cadera",
        preferredExerciseId: "hip_thrust_casa_banda",
        targetSets: 3,
        targetRepsRange: "12-15"
      },
      {
        movementPatternId: "dominante_rodilla",
        preferredExerciseId: "sentadilla_goblet_mancuerna",
        targetSets: 3,
        targetRepsRange: "10-12"
      },
      {
        movementPatternId: "dominante_cadera",
        preferredExerciseId: "patada_gluteo_banda",
        targetSets: 3,
        targetRepsRange: "15-20"
      },
      {
        movementPatternId: "dominante_cadera",
        preferredExerciseId: "abduccion_cadera_banda",
        targetSets: 3,
        targetRepsRange: "15-20"
      }
    ]
  },
  {
    id: "rutina_mafe_casa_torso_postura",
    name: "Rutina Mafe 🏡 Día 2: Torso, Hombros & Postura (Mancuernas)",
    description: "Fortalecimiento de espalda, hombros, brazos y postura con mancuernas ligeras y bajo impacto.",
    color: "#F59E0B", // Amber
    createdBy: "Mafe",
    createdAt: new Date().toISOString(),
    patterns: [
      {
        movementPatternId: "traccion_horizontal",
        preferredExerciseId: "remo_unilateral_mancuerna_casa",
        targetSets: 3,
        targetRepsRange: "10-12"
      },
      {
        movementPatternId: "empuje_vertical",
        preferredExerciseId: "press_militar_mancuernas_casa",
        targetSets: 3,
        targetRepsRange: "10-12"
      },
      {
        movementPatternId: "empuje_horizontal",
        preferredExerciseId: "flexiones_rodillas_casa",
        targetSets: 3,
        targetRepsRange: "8-12"
      },
      {
        movementPatternId: "deltoides_lateral",
        preferredExerciseId: "elevaciones_laterales_mancuernas",
        targetSets: 3,
        targetRepsRange: "12-15"
      }
    ]
  },
  {
    id: "rutina_mafe_casa_core_movilidad",
    name: "Rutina Mafe 🏡 Día 3: Core, Suelo Pélvico & Movilidad",
    description: "Cero impacto articular. Trabajo de estabilidad abdominal, suelo pélvico y flexibilidad.",
    color: "#10B981", // Emerald
    createdBy: "Mafe",
    createdAt: new Date().toISOString(),
    patterns: [
      {
        movementPatternId: "core_abs",
        preferredExerciseId: "plancha_abdominal_suelo_pelvico",
        targetSets: 3,
        targetRepsRange: "30-45 seg"
      },
      {
        movementPatternId: "core_abs",
        preferredExerciseId: "dead_bug_pilates_casa",
        targetSets: 3,
        targetRepsRange: "12-15"
      },
      {
        movementPatternId: "cardio_ciclismo",
        preferredExerciseId: "movilidad_articular_cadera_columna",
        targetSets: 1,
        targetRepsRange: "15-20 min"
      }
    ]
  },
  {
    id: "rutina_mafe_casa_fullbody_tono",
    name: "Rutina Mafe 🏡 Día 4: Full Body Tono & Escultura en Casa",
    description: "Combinación dinámica para tonificar todo el cuerpo en casa con bandas y mancuernas.",
    color: "#8B5CF6", // Purple
    createdBy: "Mafe",
    createdAt: new Date().toISOString(),
    patterns: [
      {
        movementPatternId: "dominante_rodilla",
        preferredExerciseId: "zancadas_reversa_casa",
        targetSets: 3,
        targetRepsRange: "10-12"
      },
      {
        movementPatternId: "dominante_cadera",
        preferredExerciseId: "peso_muerto_unilateral_mancuerna",
        targetSets: 3,
        targetRepsRange: "10-12"
      },
      {
        movementPatternId: "traccion_horizontal",
        preferredExerciseId: "remo_unilateral_mancuerna_casa",
        targetSets: 3,
        targetRepsRange: "10-12"
      },
      {
        movementPatternId: "dominante_cadera",
        preferredExerciseId: "hip_thrust_casa_banda",
        targetSets: 3,
        targetRepsRange: "12-15"
      }
    ]
  },

  // --- RUTINAS DE GIMNASIO BENJA 🏋️‍♂️ ---
  {
    id: "rutina_push_empuje",
    name: "Día 1: Empuje (Pecho, Hombro, Tríceps)",
    description: "Enfoque hipertrofia de empujes. Pectoral, deltoides anterior/lateral y tríceps.",
    color: "#10B981", // Emerald
    createdBy: "Benja",
    createdAt: new Date().toISOString(),
    patterns: [
      {
        movementPatternId: "empuje_horizontal",
        preferredExerciseId: "press_pecho_maquina_hammer",
        targetSets: 3,
        targetRepsRange: "6-8"
      },
      {
        movementPatternId: "empuje_inclinado",
        preferredExerciseId: "press_inclinado_mancuernas",
        targetSets: 3,
        targetRepsRange: "6-8"
      },
      {
        movementPatternId: "empuje_vertical",
        preferredExerciseId: "press_militar_mancuernas",
        targetSets: 3,
        targetRepsRange: "6-8"
      },
      {
        movementPatternId: "deltoides_lateral",
        preferredExerciseId: "elevaciones_laterales_polea",
        targetSets: 3,
        targetRepsRange: "8-10"
      },
      {
        movementPatternId: "aislamiento_triceps",
        preferredExerciseId: "extension_triceps_polea_cuerda",
        targetSets: 3,
        targetRepsRange: "8-10"
      }
    ]
  },
  {
    id: "rutina_pull_traccion",
    name: "Día 2: Tracción (Espalda & Bíceps)",
    description: "Amplitud y densidad de espalda con bíceps y deltoides posterior.",
    color: "#06B6D4", // Cyan
    createdBy: "Benja",
    createdAt: new Date().toISOString(),
    patterns: [
      {
        movementPatternId: "traccion_vertical",
        preferredExerciseId: "jalon_polea_agarre_neutro",
        targetSets: 3,
        targetRepsRange: "6-8"
      },
      {
        movementPatternId: "traccion_horizontal",
        preferredExerciseId: "remo_maquina_hammer",
        targetSets: 3,
        targetRepsRange: "6-8"
      },
      {
        movementPatternId: "deltoides_posterior",
        preferredExerciseId: "face_pulls_polea",
        targetSets: 3,
        targetRepsRange: "8-10"
      },
      {
        movementPatternId: "aislamiento_biceps",
        preferredExerciseId: "curl_biceps_polea_baja",
        targetSets: 3,
        targetRepsRange: "8-10"
      }
    ]
  },
  {
    id: "rutina_legs_cuadriceps",
    name: "Día 3: Pierna Foco Cuádriceps & Core",
    description: "Dominantes de rodilla, extensiones de cuádriceps y abdomen.",
    color: "#8B5CF6", // Violet
    createdBy: "Benja",
    createdAt: new Date().toISOString(),
    patterns: [
      {
        movementPatternId: "dominante_rodilla",
        preferredExerciseId: "prensa_piernas_45",
        targetSets: 3,
        targetRepsRange: "6-8"
      },
      {
        movementPatternId: "aislamiento_cuadriceps",
        preferredExerciseId: "extension_piernas_maquina",
        targetSets: 3,
        targetRepsRange: "8-10"
      },
      {
        movementPatternId: "pantorrilla",
        preferredExerciseId: "elevacion_gemelos_de_pie",
        targetSets: 3,
        targetRepsRange: "10-12"
      },
      {
        movementPatternId: "core_abs",
        preferredExerciseId: "crunch_polea_alta",
        targetSets: 3,
        targetRepsRange: "10-12"
      }
    ]
  },
  {
    id: "rutina_torso_brazos",
    name: "Día 4: Torso Completo & Brazos",
    description: "Trabajo complementario de hombros, pecho, espalda y super-series de brazos.",
    color: "#F59E0B", // Amber
    createdBy: "Benja",
    createdAt: new Date().toISOString(),
    patterns: [
      {
        movementPatternId: "empuje_inclinado",
        preferredExerciseId: "press_inclinado_mancuernas",
        targetSets: 3,
        targetRepsRange: "6-8"
      },
      {
        movementPatternId: "traccion_horizontal",
        preferredExerciseId: "remo_maquina_hammer",
        targetSets: 3,
        targetRepsRange: "6-8"
      },
      {
        movementPatternId: "deltoides_lateral",
        preferredExerciseId: "elevaciones_laterales_mancuernas",
        targetSets: 3,
        targetRepsRange: "8-10"
      },
      {
        movementPatternId: "aislamiento_biceps",
        preferredExerciseId: "curl_biceps_mancuernas_inclinado",
        targetSets: 3,
        targetRepsRange: "8-10"
      },
      {
        movementPatternId: "aislamiento_triceps",
        preferredExerciseId: "extension_katana_polea",
        targetSets: 3,
        targetRepsRange: "8-10"
      }
    ]
  },
  {
    id: "rutina_legs_isquios_gluteo",
    name: "Día 5: Pierna Foco Isquios & Glúteo",
    description: "Bisagra de cadera, Hip Thrust y curls analíticos de isquiotibiales.",
    color: "#EC4899", // Pink
    createdBy: "Benja",
    createdAt: new Date().toISOString(),
    patterns: [
      {
        movementPatternId: "dominante_cadera",
        preferredExerciseId: "peso_muerto_rumano_mancuernas",
        targetSets: 3,
        targetRepsRange: "6-8"
      },
      {
        movementPatternId: "dominante_cadera",
        preferredExerciseId: "hip_thrust_barra_maquina",
        targetSets: 3,
        targetRepsRange: "6-8"
      },
      {
        movementPatternId: "dominante_cadera",
        preferredExerciseId: "curl_isquiotibiales_sentado",
        targetSets: 3,
        targetRepsRange: "8-10"
      },
      {
        movementPatternId: "pantorrilla",
        preferredExerciseId: "elevacion_gemelos_de_pie",
        targetSets: 3,
        targetRepsRange: "10-12"
      }
    ]
  },
  {
    id: "rutina_descanso_ciclismo",
    name: "Día 6 / Descanso Activo: Ciclismo & Movilidad 🚴‍♂️",
    description: "Rodada en bici de ruta o estática. Selecciona el tiempo en minutos.",
    color: "#10B981", // Emerald / Green
    createdBy: "Benja",
    createdAt: new Date().toISOString(),
    patterns: [
      {
        movementPatternId: "cardio_ciclismo",
        preferredExerciseId: "ciclismo_bici_ruta_estatica",
        targetSets: 1,
        targetRepsRange: "30-45 min"
      }
    ]
  }
];
