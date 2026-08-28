import React, { useState, useEffect } from "react";
import { 
  Heart, 
  Calendar, 
  Plus, 
  Trash2, 
  Search, 
  Check, 
  AlertCircle, 
  FileText, 
  ChevronRight, 
  Activity, 
  Settings, 
  Clipboard, 
  File, 
  Download, 
  Eye, 
  Thermometer, 
  Sparkles, 
  Smile, 
  Dna,
  CheckCircle,
  Clock,
  User,
  Info,
  Flag,
  Play,
  Brain,
  Zap,
  TrendingUp,
  RefreshCw,
  MessageSquare
} from "lucide-react";
import { UserProfile } from "../types";
import { fetchCycleAnalysisApi } from "../api";

interface SaludModuleProps {
  users: UserProfile[];
  onRefreshData?: () => void;
  activeUserId?: string;
}

// Interfaces for Health Data
interface MenstrualSetting {
  periodDays: number;
  cycleDays: number;
  lastPeriodStart: string; // YYYY-MM-DD
  lastPeriodEnd?: string; // YYYY-MM-DD
  customSymptoms?: string[];
}

interface CycleRecord {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  periodDuration?: number; // days
  cycleLength?: number; // days
  notes?: string;
  createdAt: string;
}

interface CycleAnalysisData {
  regularityDiagnosis: string;
  recurringSymptoms: string[];
  symptomInsights: string;
  nutritionAdvice: string;
  exerciseAdvice: string;
  emotionalAdvice: string;
  partnerGuidance: string;
  miloSummary: string;
}

interface MenstrualLog {
  date: string; // YYYY-MM-DD
  symptoms: string[];
  notes?: string;
  intensity: "low" | "medium" | "high";
  phaseCode?: "menstruation" | "follicular" | "ovulation" | "luteal";
  phaseName?: string;
  phaseEmoji?: string;
  phaseColor?: string;
  phaseDesc?: string;
  recommendations?: {
    nutrition: string;
    exercise: string;
    wellness: string;
  };
}

interface Appointment {
  id: string;
  title: string;
  doctor: string;
  specialty: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location: string;
  patientId: string; // "mafe" | "benja" | "mascota"
  notes?: string;
  completed: boolean;
}

interface MedicalPaper {
  id: string;
  title: string;
  issuer: string;
  date: string; // YYYY-MM-DD
  type: "receta" | "examen" | "historia" | "otro";
  patientId: string;
  notes?: string;
  fileUrl?: string;
}

export default function SaludModule({ users = [], onRefreshData, activeUserId }: SaludModuleProps) {
  const getUserName = (id: string) => {
    const u = users.find(usr => usr.id === id);
    return u ? u.name : id === "mascota" ? "Mascota 🐾" : id === "home" ? "Familiar 🏠" : id;
  };
  const defaultPatient = activeUserId || users[0]?.id || "usuario-1";

  const [activeTab, setActiveTab] = useState<"ciclo" | "citas" | "papeles">("ciclo");

  // ==========================================
  // STATE DEFINITIONS
  // ==========================================
  
  // 1. Menstrual Tracker State
  const [cycleConfig, setCycleConfig] = useState<MenstrualSetting | null>(null);
  const [selectedSymptomDate, setSelectedSymptomDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const [symptomLogs, setSymptomLogs] = useState<MenstrualLog[]>([]);
  const [cycleHistory, setCycleHistory] = useState<CycleRecord[]>([]);
  const [customSymptoms, setCustomSymptoms] = useState<string[]>([]);
  const [newCustomSymptomText, setNewCustomSymptomText] = useState("");
  const [showAddCustomSymptom, setShowAddCustomSymptom] = useState(false);

  const [aiAnalysis, setAiAnalysis] = useState<CycleAnalysisData | null>(null);
  const [isAnalyzingCycle, setIsAnalyzingCycle] = useState(false);
  const [userAnalysisNotes, setUserAnalysisNotes] = useState("");

  // Modals for manual marking
  const [showStartCycleModal, setShowStartCycleModal] = useState(false);
  const [manualStartInput, setManualStartInput] = useState(new Date().toISOString().split("T")[0]);
  const [showEndCycleModal, setShowEndCycleModal] = useState(false);
  const [manualEndInput, setManualEndInput] = useState(new Date().toISOString().split("T")[0]);

  const [currentIntensity, setCurrentIntensity] = useState<"low" | "medium" | "high">("medium");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [symptomNotes, setSymptomNotes] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [expandedRecs, setExpandedRecs] = useState<Record<string, boolean>>({});
  const [wantsDelete, setWantsDelete] = useState(false);

  // 2. Appointments State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showApptForm, setShowApptForm] = useState(false);
  const [newAppt, setNewAppt] = useState({
    title: "",
    doctor: "",
    specialty: "Odontología",
    date: "",
    time: "",
    location: "",
    patientId: defaultPatient,
    notes: ""
  });

  // 3. Medical Papers State
  const [papers, setPapers] = useState<MedicalPaper[]>([]);
  const [showPaperForm, setShowPaperForm] = useState(false);
  const [paperSearch, setPaperSearch] = useState("");
  const [newPaper, setNewPaper] = useState({
    title: "",
    issuer: "",
    date: "",
    type: "receta" as "receta" | "examen" | "historia" | "otro",
    patientId: defaultPatient,
    notes: ""
  });

  useEffect(() => {
    const pid = activeUserId || users[0]?.id;
    if (pid) {
      setNewAppt(prev => ({ ...prev, patientId: pid }));
      setNewPaper(prev => ({ ...prev, patientId: pid }));
    }
  }, [users, activeUserId]);

  const [activeViewerPaper, setActiveViewerPaper] = useState<MedicalPaper | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState("");

  // ==========================================
  // LOCAL STORAGE PERSISTENCE
  // ==========================================
  useEffect(() => {
    // Load config
    const savedConfig = localStorage.getItem("salud_cycle_config");
    if (savedConfig) setCycleConfig(JSON.parse(savedConfig));

    // Load logs
    const savedLogs = localStorage.getItem("salud_cycle_logs");
    if (savedLogs) setSymptomLogs(JSON.parse(savedLogs));

    // Load cycle history
    const savedHistory = localStorage.getItem("salud_cycle_history");
    if (savedHistory) setCycleHistory(JSON.parse(savedHistory));

    // Load custom symptoms
    const savedCustomSym = localStorage.getItem("salud_custom_symptoms");
    if (savedCustomSym) setCustomSymptoms(JSON.parse(savedCustomSym));

    // Load AI analysis
    const savedAiAnalysis = localStorage.getItem("salud_ai_cycle_analysis");
    if (savedAiAnalysis) setAiAnalysis(JSON.parse(savedAiAnalysis));

    // Load appointments
    const savedAppts = localStorage.getItem("salud_appointments");
    if (savedAppts) {
      setAppointments(JSON.parse(savedAppts));
    } else {
      const initialAppts: Appointment[] = [];
      setAppointments(initialAppts);
      localStorage.setItem("salud_appointments", JSON.stringify(initialAppts));
    }

    // Load papers
    const savedPapers = localStorage.getItem("salud_papers");
    if (savedPapers) {
      setPapers(JSON.parse(savedPapers));
    } else {
      const initialPapers: MedicalPaper[] = [];
      setPapers(initialPapers);
      localStorage.setItem("salud_papers", JSON.stringify(initialPapers));
    }
  }, []);

  const saveCycleConfig = (newCfg: MenstrualSetting | null) => {
    setCycleConfig(newCfg);
    if (newCfg) {
      localStorage.setItem("salud_cycle_config", JSON.stringify(newCfg));
    } else {
      localStorage.removeItem("salud_cycle_config");
    }
  };

  const saveSymptomLogs = (newLogs: MenstrualLog[]) => {
    setSymptomLogs(newLogs);
    localStorage.setItem("salud_cycle_logs", JSON.stringify(newLogs));
  };

  const saveAppointments = (newAppts: Appointment[]) => {
    setAppointments(newAppts);
    localStorage.setItem("salud_appointments", JSON.stringify(newAppts));
    if (onRefreshData) onRefreshData();
  };

  const savePapers = (newPapers: MedicalPaper[]) => {
    setPapers(newPapers);
    localStorage.setItem("salud_papers", JSON.stringify(newPapers));
  };

  // ==========================================
  // HANDLERS FOR CYCLE START & END MARKING
  // ==========================================
  const handleMarkStartCycle = (startDateStr: string) => {
    const cfg = cycleConfig || { periodDays: 5, cycleDays: 28, lastPeriodStart: startDateStr };
    
    // Calculate cycleLength of previous cycle if applicable
    let prevCycleLength: number | undefined = undefined;
    if (cfg.lastPeriodStart && cfg.lastPeriodStart !== startDateStr) {
      const prevStart = new Date(cfg.lastPeriodStart + "T00:00:00").getTime();
      const curStart = new Date(startDateStr + "T00:00:00").getTime();
      const diff = Math.round((curStart - prevStart) / (1000 * 60 * 60 * 24));
      if (diff > 15 && diff < 60) {
        prevCycleLength = diff;
      }
    }

    const newConfig: MenstrualSetting = {
      ...cfg,
      lastPeriodStart: startDateStr,
      lastPeriodEnd: undefined,
      cycleDays: prevCycleLength || cfg.cycleDays
    };

    saveCycleConfig(newConfig);

    // Add record to cycle history
    const newRecord: CycleRecord = {
      id: "cycle-" + Date.now(),
      startDate: startDateStr,
      createdAt: new Date().toISOString()
    };

    const updatedHistory = [newRecord, ...cycleHistory.filter(c => c.startDate !== startDateStr)].sort((a,b) => b.startDate.localeCompare(a.startDate));
    setCycleHistory(updatedHistory);
    localStorage.setItem("salud_cycle_history", JSON.stringify(updatedHistory));

    setShowStartCycleModal(false);
    alert(`🌸 ¡Inicio de ciclo registrado para el ${startDateStr}! Milo ha reiniciado el contador al Día 1 y actualizado tus predicciones.`);
  };

  const handleMarkEndCycle = (endDateStr: string) => {
    if (!cycleConfig?.lastPeriodStart) {
      alert("Primero debes registrar la fecha de inicio de tu ciclo miau.");
      return;
    }

    const startDate = new Date(cycleConfig.lastPeriodStart + "T00:00:00");
    const endDate = new Date(endDateStr + "T00:00:00");
    const diffTime = endDate.getTime() - startDate.getTime();
    const periodDuration = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);

    const newConfig: MenstrualSetting = {
      ...cycleConfig,
      lastPeriodEnd: endDateStr,
      periodDays: periodDuration
    };

    saveCycleConfig(newConfig);

    // Update history record
    const updatedHistory = cycleHistory.map(rec => {
      if (rec.startDate === cycleConfig.lastPeriodStart) {
        return { ...rec, endDate: endDateStr, periodDuration };
      }
      return rec;
    });

    if (!updatedHistory.some(rec => rec.startDate === cycleConfig.lastPeriodStart)) {
      updatedHistory.unshift({
        id: "cycle-" + Date.now(),
        startDate: cycleConfig.lastPeriodStart,
        endDate: endDateStr,
        periodDuration,
        createdAt: new Date().toISOString()
      });
    }

    setCycleHistory(updatedHistory);
    localStorage.setItem("salud_cycle_history", JSON.stringify(updatedHistory));

    setShowEndCycleModal(false);
    alert(`🏁 ¡Fin de periodo registrado para el ${endDateStr}! Duración real del sangrado: ${periodDuration} días. Milo lo ha guardado en tu bitácora miau.`);
  };

  const handleAddCustomSymptom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCustomSymptomText.trim();
    if (!trimmed) return;

    if (!customSymptoms.includes(trimmed)) {
      const updated = [...customSymptoms, trimmed];
      setCustomSymptoms(updated);
      localStorage.setItem("salud_custom_symptoms", JSON.stringify(updated));
    }

    if (!selectedSymptoms.includes(trimmed)) {
      setSelectedSymptoms(prev => [...prev, trimmed]);
    }

    setNewCustomSymptomText("");
    setShowAddCustomSymptom(false);
  };

  const handleRequestAiAnalysis = async () => {
    setIsAnalyzingCycle(true);
    try {
      const res = await fetchCycleAnalysisApi({
        cycleConfig,
        cycleHistory,
        symptomLogs,
        userNotes: userAnalysisNotes.trim()
      });

      if (res.success && res.analysis) {
        setAiAnalysis(res.analysis);
        localStorage.setItem("salud_ai_cycle_analysis", JSON.stringify(res.analysis));
        setUserAnalysisNotes("");
      }
    } catch (err: any) {
      console.error("Error generating cycle analysis:", err);
      alert("Hubo un detalle al conectar con Milo IA, pero se ha generado un reporte de respaldo para ti miau.");
    } finally {
      setIsAnalyzingCycle(false);
    }
  };

  // ==========================================
  // 1. CYCLE CALCULATIONS
  // ==========================================
  
  // Compute cycle stats
  const getCycleStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!cycleConfig) {
      return {
        currentDayInCycle: 0,
        phaseCode: "none" as any,
        phaseName: "Sin Ciclo Registrado miau",
        phaseEmoji: "🌸",
        phaseColor: "text-[#8A817C] border-[#EAD0D7] bg-[#FFF5F7]",
        phaseDesc: "Configura tus parámetros del ciclo para comenzar 🧸.",
        catAdvice: "Milo está esperando con amor... ✨.",
        fertilityStatus: "No calculado miau",
        daysUntilNext: 0,
        nextPeriodStr: "--/--",
        fertileWindowStr: "--/--"
      };
    }

    const parts = cycleConfig.lastPeriodStart.split("-");
    const start = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    start.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Current day in the cycle (1-indexed, remainder of length)
    let currentDayInCycle = (diffDays % cycleConfig.cycleDays) + 1;
    if (currentDayInCycle <= 0) {
      currentDayInCycle = cycleConfig.cycleDays + currentDayInCycle;
    }

    // Phase determination
    // 1-5: Menstruation, 6-11: Follicular, 12-16: Ovulation, 17-28: Luteal
    let phaseCode: "menstruation" | "follicular" | "ovulation" | "luteal" = "luteal";
    let phaseName = "Fase Lútea";
    let phaseEmoji = "🕯️";
    let phaseColor = "text-[#A78BFA] border-[#D8B4FE] bg-[#F5F3FF]";
    let phaseDesc = "Días de introspección, autocuidado, amor tierno y paciencia 🧸.";
    let catAdvice = "Milo ronronea bajito cerca de la pancita para calmar cualquier molestia miau ✨.";
    let fertilityStatus = "Baja posibilidad";
    let hormones = "Dominio de Progesterona (calmante y desaceleradora)";
    let energyLevel = "60% • Introspectiva y reflexiva";
    let partnerAdvice = "Sé paciente y super comprensivo. Ayúdale espontáneamente con tareas del hogar y regálale masajes relajantes 💆‍♀️💕.";

    if (currentDayInCycle <= cycleConfig.periodDays) {
      phaseCode = "menstruation";
      phaseName = "Menstruación";
      phaseEmoji = "🩸";
      phaseColor = "text-[#EF4444] border-[#FCA5A5] bg-[#FEF2F2]";
      phaseDesc = "Días de merecido descanso, agüita tibia, chocolates y muchos mimitos miau.";
      catAdvice = "Trae un tecito caliente e invita a ver una película juntos tapaditos ☕🍫🐾.";
      fertilityStatus = "Casi nula";
      hormones = "Estrógenos y Progesterona en sus niveles más bajos";
      energyLevel = "35% • Necesidad de descanso y calor";
      partnerAdvice = "Consiéntela con su bebida caliente favorita, cobijita, almohadilla térmica y prepárale una comida reconfortante sin presiones 🍵🧸.";
    } else if (currentDayInCycle <= 11) {
      phaseCode = "follicular";
      phaseName = "Fase Folicular";
      phaseEmoji = "🌱";
      phaseColor = "text-[#10B981] border-[#6EE7B7] bg-[#ECFDF5]";
      phaseDesc = "La energía creativa y física va subiendo con fuerza cósmica.";
      catAdvice = "Excelente momento para emprender, hacer ejercicio inteligente o planear planes locos 🚀.";
      fertilityStatus = "Media / En ascenso";
      hormones = "Estrógenos en aumento progresivo (FSH activo)";
      energyLevel = "85% • Alta motivación y creatividad";
      partnerAdvice = "Apoya sus nuevas ideas, propón proyectos juntos o planea una salida activa al aire libre 🚀🌿.";
    } else if (currentDayInCycle <= 16) {
      phaseCode = "ovulation";
      phaseName = "Ovulación (Ventana Fértil)";
      phaseEmoji = "🔥";
      phaseColor = "text-[#EC4899] border-[#FBCFE8] bg-[#FDF2F8]";
      phaseDesc = "Brillo y carisma cósmico en su punto álgido. Conexión de pareja íntima mágica.";
      catAdvice = "¡Alineación total de estrellas! El amor flota en el aire de forma magnética miau ❤️🌿.";
      fertilityStatus = "Alta (Pico Fértil)";
      hormones = "Pico máximo de Estrógenos y Hormona Luteinizante (LH)";
      energyLevel = "100% • Máximo rendimiento, brillo y carisma";
      partnerAdvice = "Planifica una cita romántica especial, exprésale tu admiración y disfruten de momentos de profunda intimidad y risas 💞🥂.";
    }

    // Days until next period
    const daysUntilNext = cycleConfig.cycleDays - currentDayInCycle + 1;
    const nextPeriodDate = new Date(start.getTime() + cycleConfig.cycleDays * 24 * 60 * 60 * 1000);
    // If it's already past today, advance by cycleCount
    while (nextPeriodDate.getTime() < today.getTime()) {
      nextPeriodDate.setDate(nextPeriodDate.getDate() + cycleConfig.cycleDays);
    }

    // Exact Ovulation Day (day 14 of current cycle)
    const ovulationDate = new Date(start.getTime() + 13 * 24 * 60 * 60 * 1000);

    return {
      currentDayInCycle,
      phaseCode,
      phaseName,
      phaseEmoji,
      phaseColor,
      phaseDesc,
      catAdvice,
      fertilityStatus,
      hormones,
      energyLevel,
      partnerAdvice,
      daysUntilNext,
      nextPeriodStr: nextPeriodDate.toLocaleDateString("es-ES", { day: 'numeric', month: 'short' }),
      ovulationDayStr: ovulationDate.toLocaleDateString("es-ES", { day: 'numeric', month: 'short' }),
      fertileWindowStr: `${new Date(start.getTime() + 11 * 24 * 60 * 60 * 1000).toLocaleDateString("es-ES", { day: 'numeric' })} al ${new Date(start.getTime() + 16 * 24 * 60 * 60 * 1000).toLocaleDateString("es-ES", { day: 'numeric', month: 'short' })}`
    };
  };

  const getCycleStatsForDate = (dateStr: string) => {
    if (!cycleConfig) return null;
    const today = new Date(dateStr + "T00:00:00");
    
    const parts = cycleConfig.lastPeriodStart.split("-");
    const start = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    start.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Current day in the cycle (1-indexed, remainder of length)
    let currentDayInCycle = (diffDays % cycleConfig.cycleDays) + 1;
    if (currentDayInCycle <= 0) {
      currentDayInCycle = cycleConfig.cycleDays + currentDayInCycle;
    }

    let phaseCode: "menstruation" | "follicular" | "ovulation" | "luteal" = "luteal";
    let phaseName = "Fase Lútea";
    let phaseEmoji = "🕯️";
    let phaseColor = "text-[#A78BFA] border-[#D8B4FE] bg-[#F5F3FF]";
    let phaseDesc = "Días de introspección, autocuidado, amor tierno y paciencia 🧸.";
    let nutrition = "Alimentos ricos en magnesio (cacao puro, plátano), grasas saludables de combustión lenta para mantener la saciedad y evitar antojos de azúcar refinado.";
    let exercise = "Pilates, yoga dinámico, natación o fuerza con cargas moderadas. Escucha a tu cuerpo y baja el ritmo o el impacto si sientes pesadez o inflamación.";
    let wellness = "Días hermosos para ordenar tus espacios físicos o digitales, dormir más horas, meditar y practicar la compasión miau🐾.";

    if (currentDayInCycle <= cycleConfig.periodDays) {
      phaseCode = "menstruation";
      phaseName = "Menstruación";
      phaseEmoji = "🩸";
      phaseColor = "text-[#EF4444] border-[#FCA5A5] bg-[#FEF2F2]";
      phaseDesc = "Días de descanso, agüita tibia, té de manzanilla, chocolates y muchos mimitos miau.";
      nutrition = "Alimentos ricos en hierro (espinacas, lentejas), grasas saludables (aguacate) e infusiones calentitas de jengibre o manzanilla miau. Evita el exceso de cafeína y sal.";
      exercise = "Yoga restaurativo, estiramientos de cadera y caminatas tranquilas. Milo aconseja no forzar tu cuerpo, priorizar el descanso y recuperar fuerzas miau.";
      wellness = "Días idóneos para conectar contigo misma, escribir tus sueños, tomar baños calentitos y permitir que tu pareja te mime y cuide con amor.";
    } else if (currentDayInCycle <= 11) {
      phaseCode = "follicular";
      phaseName = "Fase Folicular";
      phaseEmoji = "🌱";
      phaseColor = "text-[#10B981] border-[#6EE7B7] bg-[#ECFDF5]";
      phaseDesc = "La energía creativa y física va subiendo con fuerza cósmica.";
      nutrition = "Alimentos frescos, ligeros y ricos en fibra como brócoli, calabacín, legumbres y proteínas magras. Tu metabolismo está más eficiente hoy.";
      exercise = "¡Momento estelar para entrenamientos de fuerza progresiva, baile o cardio de alta intensidad! Tu resistencia física está en pleno ascenso cósmico.";
      wellness = "Fase perfecta para planificar tus metas, emprender proyectos creativos, organizar ideas y socializar con tus amigos con tu carisma renovado.";
    } else if (currentDayInCycle <= 16) {
      phaseCode = "ovulation";
      phaseName = "Ovulación (Ventana Fértil)";
      phaseEmoji = "🔥";
      phaseColor = "text-[#EC4899] border-[#FBCFE8] bg-[#FDF2F8]";
      phaseDesc = "Brillo y carisma cósmico en su punto álgido. Conexión de pareja íntima mágica.";
      nutrition = "Arándanos, fresas, aguacates, semillas de chía y sésamo. Mantente súper hidratada para apoyar la liberación de toxinas y el brillo natural de tu piel miau🐾.";
      exercise = "Entrenamientos de fuerza máxima, levantamiento de pesas o sesiones de HIIT desafiantes. Tu cuerpo tiene el pico más alto de fuerza y rendimiento de todo el mes.";
      wellness = "¡Tu magnetismo brilla con fuerza! Excelente etapa para cenas románticas en pareja, conversaciones sinceras o liderar presentaciones públicas.";
    }

    return {
      currentDayInCycle,
      phaseCode,
      phaseName,
      phaseEmoji,
      phaseColor,
      phaseDesc,
      nutrition,
      exercise,
      wellness
    };
  };

  const stats = getCycleStats();

  const handleResetCycle = () => {
    if (!wantsDelete) {
      setWantsDelete(true);
      return;
    }
    setCycleConfig(null);
    localStorage.removeItem("salud_cycle_config");
    setSymptomLogs([]);
    localStorage.removeItem("salud_cycle_logs");
    setIsConfigOpen(false);
    setWantsDelete(false);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleConfig) {
      // safe guard default init
      const defaultCfg: MenstrualSetting = {
        periodDays: 5,
        cycleDays: 28,
        lastPeriodStart: new Date().toISOString().split("T")[0]
      };
      saveCycleConfig(defaultCfg);
    } else {
      saveCycleConfig(cycleConfig);
    }
    setIsConfigOpen(false);
  };

  const handleSymptomToggle = (symptom: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  const handleAddSymptomLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSymptoms.length === 0 && !symptomNotes.trim()) return;

    const dateStr = selectedSymptomDate || new Date().toISOString().split("T")[0];
    const computedStats = getCycleStatsForDate(dateStr);

    const newLog: MenstrualLog = {
      date: dateStr,
      symptoms: selectedSymptoms,
      notes: symptomNotes.trim() || undefined,
      intensity: currentIntensity,
      phaseCode: computedStats?.phaseCode,
      phaseName: computedStats?.phaseName,
      phaseEmoji: computedStats?.phaseEmoji,
      phaseColor: computedStats?.phaseColor,
      phaseDesc: computedStats?.phaseDesc,
      recommendations: computedStats ? {
        nutrition: computedStats.nutrition,
        exercise: computedStats.exercise,
        wellness: computedStats.wellness
      } : undefined
    };

    // Filter out previous log for the selected date, then sort by date desc
    const filtered = symptomLogs.filter(l => l.date !== newLog.date);
    const updatedLogs = [newLog, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
    saveSymptomLogs(updatedLogs);

    setSelectedSymptoms([]);
    setSymptomNotes("");
    alert(`¡Registro para el ${dateStr} guardado con éxito! Milo lo tiene anotado en su diario cósmico 🐾🌸`);
  };

  const handleRemoveLog = (date: string) => {
    const updated = symptomLogs.filter(l => l.date !== date);
    saveSymptomLogs(updated);
  };

  // ==========================================
  // 2. APPOINTMENT HANDLERS
  // ==========================================
  const handleAddAppt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppt.title.trim() || !newAppt.date || !newAppt.time) return;

    const added: Appointment = {
      id: "appt-manual-" + Date.now(),
      title: newAppt.title.trim(),
      doctor: newAppt.doctor.trim() || "Especialista Clínico",
      specialty: newAppt.specialty,
      date: newAppt.date,
      time: newAppt.time,
      location: newAppt.location.trim() || "Consultorio Regular",
      patientId: newAppt.patientId,
      notes: newAppt.notes.trim() || undefined,
      completed: false
    };

    saveAppointments([added, ...appointments]);
    setShowApptForm(false);
    setNewAppt({
      title: "",
      doctor: "",
      specialty: "Odontología",
      date: "",
      time: "",
      location: "",
      patientId: "mafe",
      notes: ""
    });
  };

  const handleToggleApptDone = (id: string) => {
    const updated = appointments.map(a => 
      a.id === id ? { ...a, completed: !a.completed } : a
    );
    saveAppointments(updated);
  };

  const handleDeleteAppt = (id: string) => {
    const updated = appointments.filter(a => a.id !== id);
    saveAppointments(updated);
  };

  // ==========================================
  // 3. PAPER HANDLERS
  // ==========================================
  const handleAddPaper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaper.title.trim() || !newPaper.date) return;

    const added: MedicalPaper = {
      id: "paper-manual-" + Date.now(),
      title: newPaper.title.trim(),
      issuer: newPaper.issuer.trim() || "Centro Médico de Bienestar",
      date: newPaper.date,
      type: newPaper.type,
      patientId: newPaper.patientId,
      notes: newPaper.notes.trim() || undefined,
      fileUrl: uploadedFileUrl || undefined
    };

    savePapers([added, ...papers]);
    setUploadedFileUrl("");
    setShowPaperForm(false);
    setNewPaper({
      title: "",
      issuer: "",
      date: "",
      type: "receta",
      patientId: "mafe",
      notes: ""
    });
  };

  const handleDeletePaper = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = papers.filter(p => p.id !== id);
    savePapers(updated);
    if (activeViewerPaper?.id === id) {
      setActiveViewerPaper(null);
    }
  };

  // Filtered papers list
  const filteredPapers = papers.filter(p => {
    const term = paperSearch.toLowerCase();
    return (
      p.title.toLowerCase().includes(term) ||
      p.issuer.toLowerCase().includes(term) ||
      (p.notes || "").toLowerCase().includes(term) ||
      p.type.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Upper Module header */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border-4 border-[#F3EFE6] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4.5">
          <div className="text-4xl p-3 bg-red-150 text-rose-600 rounded-2.5xl shadow-inner animate-pulse shrink-0">
            🌸
          </div>
          <div className="space-y-0.5">
            <h2 className="text-xl sm:text-2xl font-black text-[#2C2723] text-cute">
              Central de Salud Familiar y Citas
            </h2>
            <p className="text-xs sm:text-sm text-[#8A817C] font-semibold leading-relaxed">
              Ciclo menstrual, citas médicas compartidas y archivo de recetas familiares 🏥🐾
            </p>
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex bg-[#FAF7F2] p-1.5 rounded-2xl border border-[#E7E2D5] w-full md:w-auto shrink-0 justify-stretch gap-1">
          <button
            onClick={() => setActiveTab("ciclo")}
            className={`flex-1 md:flex-none text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "ciclo"
                ? "bg-rose-500 text-white shadow-sm"
                : "text-[#625B57] hover:bg-[#FAF7F2] hover:text-[#2C2723]"
            }`}
          >
            <span>🌸</span> <span className="hidden sm:inline">Ciclo</span>
          </button>
          
          <button
            onClick={() => setActiveTab("citas")}
            className={`flex-1 md:flex-none text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "citas"
                ? "bg-rose-500 text-white shadow-sm"
                : "text-[#625B57] hover:bg-[#FAF7F2] hover:text-[#2C2723]"
            }`}
          >
            <span>🏥</span> <span className="hidden sm:inline">Citas Médicas</span>
          </button>

          <button
            onClick={() => setActiveTab("papeles")}
            className={`flex-1 md:flex-none text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "papeles"
                ? "bg-rose-500 text-white shadow-sm"
                : "text-[#625B57] hover:bg-[#FAF7F2] hover:text-[#2C2723]"
            }`}
          >
            <span>📄</span> <span className="hidden sm:inline">Recetas y Papeles</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. MENSTRUAL CYCLE TRACKER */}
      {/* ======================================================== */}
      {activeTab === "ciclo" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          
          {/* Main Visual Indicator Panel */}
          <div className="lg:col-span-8 space-y-6">

            {/* QUICK ACTIONS BAR FOR EXPLICIT CYCLE START / END MARKING */}
            <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 p-4 sm:p-5 rounded-3xl text-white shadow-md space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl p-2 bg-white/20 rounded-2xl backdrop-blur-xs">🌸</span>
                  <div>
                    <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-cute">
                      Control Manual de Tu Ciclo
                    </h3>
                    <p className="text-[11px] text-rose-100 font-medium">
                      Marca exactamente cuando inicia o termina tu periodo sin cálculos automáticos miau 🐾
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleMarkStartCycle(new Date().toISOString().split("T")[0])}
                    className="flex-1 sm:flex-none bg-white text-rose-700 hover:bg-rose-50 text-xs font-black px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Play size={14} className="fill-current" />
                    <span>¡Inició mi ciclo hoy! 🩸</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkEndCycle(new Date().toISOString().split("T")[0])}
                    className="flex-1 sm:flex-none bg-rose-950/40 hover:bg-rose-950/60 border border-white/30 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Flag size={14} />
                    <span>¡Fin de sangrado hoy! 🏁</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowStartCycleModal(true)}
                    className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-2 rounded-xl border border-white/20 transition-all cursor-pointer flex items-center justify-center gap-1"
                    title="Elegir fecha de inicio en calendario"
                  >
                    <Calendar size={14} />
                    <span className="hidden md:inline">Elegir fecha</span>
                  </button>
                </div>
              </div>

              {/* Status summary pill */}
              {cycleConfig && (
                <div className="flex flex-wrap items-center justify-between text-[11px] bg-black/15 px-3.5 py-2 rounded-2xl border border-white/10 gap-2">
                  <div>
                    <span className="opacity-80">Último inicio guardado: </span>
                    <strong className="font-mono text-white">
                      {new Date(cycleConfig.lastPeriodStart + "T00:00:00").toLocaleDateString("es-ES", { day: 'numeric', month: 'long', year: 'numeric' })}
                    </strong>
                  </div>
                  {cycleConfig.lastPeriodEnd && (
                    <div>
                      <span className="opacity-80">Fin de sangrado: </span>
                      <strong className="font-mono text-emerald-200">
                        {new Date(cycleConfig.lastPeriodEnd + "T00:00:00").toLocaleDateString("es-ES", { day: 'numeric', month: 'long' })} ({cycleConfig.periodDays} días)
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MODAL FOR MANUAL START DATE */}
            {showStartCycleModal && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-3xl p-6 max-w-md w-full border-4 border-rose-200 shadow-2xl space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="text-base font-black text-[#2C2723] flex items-center gap-2">
                      <Play className="text-rose-600 fill-current" size={18} />
                      Marcar Fecha de Inicio de Ciclo
                    </h3>
                    <button onClick={() => setShowStartCycleModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                  </div>
                  <p className="text-xs text-gray-600">
                    Selecciona el día en que comenzó tu sangrado o periodo. Milo actualizará tu mapa del ciclo al <strong>Día 1</strong>.
                  </p>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 block">Fecha de inicio:</label>
                    <input
                      type="date"
                      value={manualStartInput}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setManualStartInput(e.target.value)}
                      className="w-full text-xs font-mono font-bold bg-[#FAF7F2] p-2.5 rounded-xl border border-gray-300"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleMarkStartCycle(manualStartInput)}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-xs"
                    >
                       Confirmar Inicio de Ciclo
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowStartCycleModal(false)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs px-4 py-2.5 rounded-xl"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL FOR MANUAL END DATE */}
            {showEndCycleModal && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-3xl p-6 max-w-md w-full border-4 border-purple-200 shadow-2xl space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="text-base font-black text-[#2C2723] flex items-center gap-2">
                      <Flag className="text-purple-600" size={18} />
                      Marcar Fecha de Fin de Sangrado
                    </h3>
                    <button onClick={() => setShowEndCycleModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                  </div>
                  <p className="text-xs text-gray-600">
                    Selecciona la fecha en que terminó tu sangrado o periodo para calcular la duración real de tus días menstruales.
                  </p>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 block">Fecha de fin de sangrado:</label>
                    <input
                      type="date"
                      value={manualEndInput}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setManualEndInput(e.target.value)}
                      className="w-full text-xs font-mono font-bold bg-[#FAF7F2] p-2.5 rounded-xl border border-gray-300"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleMarkEndCycle(manualEndInput)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-xs"
                    >
                       Confirmar Fin de Sangrado
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEndCycleModal(false)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs px-4 py-2.5 rounded-xl"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {!cycleConfig ? (
              <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border-3 border-dashed border-rose-200 shadow-sm text-center flex flex-col items-center justify-center space-y-4 py-16">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-4xl animate-bounce">
                  🌸
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <h3 className="text-lg font-black text-[#2C2723] text-cute">Sin Ciclo Registrado</h3>
                  <p className="text-xs text-[#625B57] leading-relaxed">
                    Sintoniza tu calendario menstrual y tu nido de amor miau. Registra los días y última fecha a la derecha o pulsa 'Inició mi ciclo hoy'.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleMarkStartCycle(new Date().toISOString().split("T")[0])}
                  className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  ➕ Iniciar Mi Ciclo Hoy
                </button>
              </div>
            ) : (
              <>
                {/* Cycle Gauge Badge */}
                <div className={`p-6 sm:p-8 rounded-[2.5rem] border-4 transition-all shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 ${stats.phaseColor}`}>
                  <div className="absolute top-2 right-2 text-rose-200 text-7xl select-none opacity-20 transform rotate-12 font-black font-sans leading-none">
                    {stats.phaseEmoji}
                  </div>

                  <div className="space-y-3.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl animate-bounce">{stats.phaseEmoji}</span>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-white/70 px-2 py-0.5 rounded-full border border-pink-200">
                          Fase Actual:
                        </span>
                        <h3 className="text-lg font-black text-[#2C2723] mt-0.5">{stats.phaseName}</h3>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-[#2C2723] leading-relaxed">
                      "{stats.phaseDesc}"
                    </p>

                    <div className="bg-white/80 border border-white rounded-2.5xl p-4 text-xs text-gray-800 italic flex items-start gap-2.5 relative shadow-inner">
                      <span className="text-base shrink-0">🐾🐱</span>
                      <div className="space-y-1">
                        <p className="font-extrabold not-italic text-[10px] text-amber-800 uppercase tracking-wider">Milo aconseja para hoy:</p>
                        <p className="leading-relaxed leading-normal">{stats.catAdvice}</p>
                      </div>
                    </div>
                  </div>

                  {/* Day Circle Wheel indicator */}
                  <div className="shrink-0 w-36 h-36 rounded-full bg-white border-4 border-white shadow-md flex flex-col items-center justify-center relative select-none">
                    <span className="text-[10px] font-black text-[#8A817C] uppercase tracking-wide">Día del Ciclo</span>
                    <span className="text-4xl font-extrabold text-[#2C2723] text-cute font-mono my-0.5">{stats.currentDayInCycle}</span>
                    <span className="text-[9px] font-bold text-gray-500">de {cycleConfig?.cycleDays ?? 28} días</span>
                    
                    {/* Visual mini-border progress */}
                    <div className="absolute inset-0 rounded-full border-4 border-dashed border-rose-300 opacity-40 animate-spin-slow"></div>
                  </div>
                </div>

                {/* Visual Segmented Progress Map of the Cycle */}
                <div className="bg-white p-5 rounded-3xl border-3 border-[#F3EFE6] shadow-xs space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-black text-[#2C2723]">
                    <span className="uppercase tracking-wider flex items-center gap-1.5">
                      🗺️ Mapa del Ciclo ({cycleConfig?.cycleDays ?? 28} Días Totales)
                    </span>
                    <span className="text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 text-[11px] self-start sm:self-auto font-mono">
                      Día {stats.currentDayInCycle} de {cycleConfig?.cycleDays ?? 28}
                    </span>
                  </div>

                  {/* Progress track */}
                  <div className="relative pt-6 pb-1">
                    {/* Segmented bar */}
                    <div className="h-4.5 w-full rounded-full overflow-hidden flex shadow-inner bg-gray-100 p-0.5 border border-gray-200">
                      {/* Menstruacion */}
                      <div 
                        style={{ width: `${((cycleConfig?.periodDays || 5) / (cycleConfig?.cycleDays || 28)) * 100}%` }} 
                        className="bg-rose-500 h-full rounded-l-full relative group cursor-pointer"
                        title={`Menstruación (Días 1 - ${cycleConfig?.periodDays || 5})`}
                      />
                      {/* Folicular */}
                      <div 
                        style={{ width: `${((11 - (cycleConfig?.periodDays || 5)) / (cycleConfig?.cycleDays || 28)) * 100}%` }} 
                        className="bg-emerald-500 h-full relative group cursor-pointer"
                        title={`Fase Folicular (Días ${(cycleConfig?.periodDays || 5) + 1} - 11)`}
                      />
                      {/* Ovulacion */}
                      <div 
                        style={{ width: `${(5 / (cycleConfig?.cycleDays || 28)) * 100}%` }} 
                        className="bg-pink-500 h-full relative group cursor-pointer animate-pulse"
                        title="Ovulación / Ventana Fértil (Días 12 - 16)"
                      />
                      {/* Lutea */}
                      <div 
                        style={{ width: `${(((cycleConfig?.cycleDays || 28) - 16) / (cycleConfig?.cycleDays || 28)) * 100}%` }} 
                        className="bg-purple-500 h-full rounded-r-full relative group cursor-pointer"
                        title={`Fase Lútea (Días 17 - ${cycleConfig?.cycleDays || 28})`}
                      />
                    </div>

                    {/* Current Pin Cursor */}
                    <div 
                      className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center transition-all duration-500 z-10"
                      style={{ left: `${Math.min(98, Math.max(2, ((stats.currentDayInCycle - 0.5) / (cycleConfig?.cycleDays || 28)) * 100))}%` }}
                    >
                      <span className="bg-[#2C2723] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md whitespace-nowrap animate-bounce">
                        📍 HOY (Día {stats.currentDayInCycle})
                      </span>
                      <div className="w-0.5 h-2.5 bg-[#2C2723]"></div>
                    </div>
                  </div>

                  {/* Legend labels */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-bold text-gray-700 pt-0.5">
                    <div className="flex items-center gap-1.5 bg-rose-50/70 p-1.5 rounded-xl border border-rose-100">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                      <span>🩸 Sangrado (1-{cycleConfig?.periodDays || 5}d)</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-50/70 p-1.5 rounded-xl border border-emerald-100">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span>🌱 Folicular ({(cycleConfig?.periodDays || 5) + 1}-11d)</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-pink-50/70 p-1.5 rounded-xl border border-pink-100">
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0"></span>
                      <span>🔥 Ovulación (12-16d)</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-purple-50/70 p-1.5 rounded-xl border border-purple-100">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"></span>
                      <span>🕯️ Lútea (17-{cycleConfig?.cycleDays || 28}d)</span>
                    </div>
                  </div>
                </div>

                {/* Prediction details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  
                  <div className="bg-white p-4.5 rounded-2.5xl border-3 border-[#F3EFE6] shadow-xs space-y-1">
                    <span className="text-xl">📅</span>
                    <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#8A817C]">Próximo periodo:</p>
                    <p className="text-base font-black text-[#2C2723]">{stats.nextPeriodStr}</p>
                    <p className="text-[10px] text-[#BE7A1F] font-bold">Faltan {stats.daysUntilNext} días miau</p>
                  </div>

                  <div className="bg-white p-4.5 rounded-2.5xl border-3 border-[#F3EFE6] shadow-xs space-y-1">
                    <span className="text-xl">🔥</span>
                    <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#8A817C]">Ventana Fértil / Ovulación:</p>
                    <p className="text-base font-black text-[#2C2723]">{stats.fertileWindowStr}</p>
                    <p className="text-[10px] text-pink-600 font-bold">Pico de fertilidad: {stats.ovulationDayStr}</p>
                  </div>

                  <div className="bg-white p-4.5 rounded-2.5xl border-3 border-[#F3EFE6] shadow-xs space-y-1">
                    <span className="text-xl">🧪</span>
                    <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#8A817C]">Estado Hormonal:</p>
                    <p className="text-xs font-black text-[#2C2723] leading-snug">{stats.hormones}</p>
                    <p className="text-[10px] text-purple-600 font-bold">Fertilidad: {stats.fertilityStatus}</p>
                  </div>

                  <div className="bg-white p-4.5 rounded-2.5xl border-3 border-[#F3EFE6] shadow-xs space-y-1">
                    <span className="text-xl">⚡</span>
                    <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#8A817C]">Energía Estimada:</p>
                    <p className="text-xs font-black text-[#2C2723] leading-snug">{stats.energyLevel}</p>
                    <p className="text-[10px] text-emerald-600 font-bold">Ritmo cósmico diario</p>
                  </div>

                </div>

                {/* MILO IA CYCLE INTELLIGENCE PANEL */}
                <div className="bg-gradient-to-br from-purple-50 via-pink-50/50 to-white p-6 rounded-3xl border-3 border-purple-200/80 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-purple-600 text-white rounded-2xl shadow-xs">
                        <Brain size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-[#2C2723] uppercase tracking-wider text-cute flex items-center gap-1.5">
                          Milo IA: Análisis Inteligente de Ciclos y Salud
                        </h4>
                        <p className="text-[11px] text-purple-900 font-semibold">
                          Milo aprende de tus inicios de ciclo, duración de sangrado y patrones de síntomas 🐾
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRequestAiAnalysis}
                      disabled={isAnalyzingCycle}
                      className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-black px-4 py-2.5 rounded-2xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 self-start sm:self-auto"
                    >
                      {isAnalyzingCycle ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Analizando con Milo IA...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} className="text-yellow-300 animate-pulse" />
                          <span>{aiAnalysis ? "Actualizar Análisis con IA" : "Generar Análisis con Milo IA"}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Question / Note input for Milo */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Escribe alguna pregunta o síntoma particular para Milo (ej: Me ha dolido la cabeza en fase lútea)..."
                      value={userAnalysisNotes}
                      onChange={(e) => setUserAnalysisNotes(e.target.value)}
                      className="flex-1 text-xs bg-white border border-purple-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                    <button
                      type="button"
                      onClick={handleRequestAiAnalysis}
                      disabled={isAnalyzingCycle}
                      className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0"
                    >
                      <MessageSquare size={13} /> Preguntar a Milo
                    </button>
                  </div>

                  {/* AI Analysis Output */}
                  {aiAnalysis && (
                    <div className="space-y-4 pt-1 animate-fade-in">
                      {/* Regularity Diagnostic */}
                      <div className="bg-white p-4 rounded-2.5xl border border-purple-100 shadow-3xs space-y-1.5">
                        <div className="flex items-center gap-2">
                          <TrendingUp size={15} className="text-purple-600" />
                          <h5 className="font-extrabold text-[#2C2723] text-xs uppercase tracking-wider">
                            Diagnóstico de Regularidad y Tendencias
                          </h5>
                        </div>
                        <p className="text-xs text-gray-700 font-medium leading-relaxed">
                          {aiAnalysis.regularityDiagnosis}
                        </p>
                      </div>

                      {/* Recurring symptoms badges */}
                      {aiAnalysis.recurringSymptoms && aiAnalysis.recurringSymptoms.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-purple-900 tracking-wider">
                            Patrón de Síntomas Detectado por Milo:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {aiAnalysis.recurringSymptoms.map((sym, idx) => (
                              <span key={idx} className="bg-purple-100 border border-purple-200 text-purple-900 text-[10.5px] font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1">
                                <span>🐾</span> {sym}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 2-column detailed insights */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                        <div className="p-3.5 rounded-2xl bg-white border border-purple-100 space-y-1">
                          <span className="text-lg">🍲</span>
                          <h6 className="font-black text-[#2C2723] uppercase text-[10px]">Nutrición & Recomendaciones Fisiológicas</h6>
                          <p className="text-gray-600 leading-relaxed font-medium">{aiAnalysis.nutritionAdvice}</p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white border border-purple-100 space-y-1">
                          <span className="text-lg">🏃‍♀️</span>
                          <h6 className="font-black text-[#2C2723] uppercase text-[10px]">Ajustes de Ejercicio y Movimiento</h6>
                          <p className="text-gray-600 leading-relaxed font-medium">{aiAnalysis.exerciseAdvice}</p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white border border-purple-100 space-y-1">
                          <span className="text-lg">🧸</span>
                          <h6 className="font-black text-[#2C2723] uppercase text-[10px]">Salud Emocional & Mente</h6>
                          <p className="text-gray-600 leading-relaxed font-medium">{aiAnalysis.emotionalAdvice}</p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-pink-50 border border-pink-200 space-y-1">
                          <span className="text-lg">💑</span>
                          <h6 className="font-black text-pink-950 uppercase text-[10px]">Guía Especial para Benja</h6>
                          <p className="text-pink-900 leading-relaxed font-medium">{aiAnalysis.partnerGuidance}</p>
                        </div>
                      </div>

                      {/* Milo summary statement */}
                      <div className="p-3.5 rounded-2.5xl bg-purple-900 text-purple-100 text-xs font-semibold flex items-center gap-3">
                        <span className="text-2xl">🐱🐾</span>
                        <p className="leading-relaxed italic">{aiAnalysis.miloSummary}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* DAILY SYMPTOM LOGGER FORM WITH EXPANDED SYMPTOMS & CUSTOM SYMPTOM CREATOR */}
            <div className="bg-[#FFF9FB] p-6 rounded-3xl border-4 border-[#FFF0F4] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Thermometer size={16} className="text-pink-600 animate-pulse" />
                  <h4 className="text-sm font-black text-[#2C2723] uppercase tracking-wider text-cute">
                    Anotar Síntomas y Estados de Ánimo
                  </h4>
                </div>
                {/* Date selector for retroactive logging */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider">Fecha:</span>
                  <input
                    type="date"
                    value={selectedSymptomDate}
                    onChange={(e) => setSelectedSymptomDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="text-xs bg-white border border-[#FFF0F4] hover:border-pink-300 rounded-xl px-2.5 py-1.5 font-bold font-mono focus:outline-none focus:ring-1 focus:ring-pink-300 shadow-3xs"
                  />
                </div>
              </div>

              <form onSubmit={handleAddSymptomLog} className="space-y-4">
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-gray-700">Selecciona lo que sientes hoy (puedes marcar varios):</p>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomSymptom(!showAddCustomSymptom)}
                      className="text-[10.5px] text-pink-600 hover:text-pink-800 font-extrabold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} />
                      {showAddCustomSymptom ? "Cerrar" : "Añadir síntoma personalizado"}
                    </button>
                  </div>

                  {/* Inline custom symptom adder */}
                  {showAddCustomSymptom && (
                    <div className="p-3 bg-pink-100/60 rounded-2xl border border-pink-200 flex items-center gap-2 animate-fade-in">
                      <input
                        type="text"
                        placeholder="ej: Migraña nocturna, Dolor de piernas, Mareos..."
                        value={newCustomSymptomText}
                        onChange={(e) => setNewCustomSymptomText(e.target.value)}
                        className="flex-1 text-xs bg-white rounded-xl px-3 py-1.5 border border-pink-300 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomSymptom}
                        className="bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl cursor-pointer"
                      >
                        Añadir
                      </button>
                    </div>
                  )}
                  
                  {/* Categorized Grid of buttons symptoms */}
                  <div className="space-y-2">
                    {/* Físicos */}
                    <div className="space-y-1">
                      <span className="text-[9.5px] uppercase font-black tracking-wider text-rose-700">Físicos:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: "cólicos", label: "Cólicos 🩸" },
                          { id: "dolor_cabeza", label: "Dolor de Cabeza 🤕" },
                          { id: "cansancio", label: "Fatiga / Cansancio 💤" },
                          { id: "sensibilidad_mamaria", label: "Sensibilidad Mamaria 🍈" },
                          { id: "dolor_lumbar", label: "Dolor Lumbar 🧘‍♀️" },
                          { id: "hinchazon", label: "Hinchazón / Retención 🧪" },
                          { id: "acne", label: "Acné / Piel Grasa ✨" },
                          { id: "nauseas", label: "Náuseas 🤢" },
                          { id: "calambres", label: "Calambres ⚡" },
                          { id: "sofocos", label: "Sofocos 🌡️" }
                        ].map(sym => {
                          const isSel = selectedSymptoms.includes(sym.id);
                          return (
                            <button
                              key={sym.id}
                              type="button"
                              onClick={() => handleSymptomToggle(sym.id)}
                              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                isSel
                                  ? "bg-pink-600 text-white border-pink-600 shadow-xs"
                                  : "bg-white text-gray-700 border-gray-200 hover:bg-rose-50"
                              }`}
                            >
                              {sym.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Emocionales & Antojos */}
                    <div className="space-y-1">
                      <span className="text-[9.5px] uppercase font-black tracking-wider text-purple-700">Emocionales & Ánimo:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: "sensible", label: "Sensible 🥺" },
                          { id: "irritabilidad", label: "Irritabilidad ⚡" },
                          { id: "ansiedad", label: "Ansiedad ☁️" },
                          { id: "energetica", label: "Súper Enérgica ⚡" },
                          { id: "cambios_humor", label: "Cambios de Humor 🎢" },
                          { id: "niebla_mental", label: "Niebla Mental 🌫️" },
                          { id: "antojo_dulce", label: "Antojo de Dulces 🍫" },
                          { id: "antojo_salado", label: "Antojo de Salado 🥨" },
                          { id: "insomnio", label: "Dificultad para Dormir 🛌" }
                        ].map(sym => {
                          const isSel = selectedSymptoms.includes(sym.id);
                          return (
                            <button
                              key={sym.id}
                              type="button"
                              onClick={() => handleSymptomToggle(sym.id)}
                              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                isSel
                                  ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                                  : "bg-white text-gray-700 border-gray-200 hover:bg-purple-50"
                              }`}
                            >
                              {sym.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom user symptoms */}
                    {customSymptoms.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9.5px] uppercase font-black tracking-wider text-amber-800">Tus Síntomas Personalizados:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {customSymptoms.map(sym => {
                            const isSel = selectedSymptoms.includes(sym);
                            return (
                              <button
                                key={sym}
                                type="button"
                                onClick={() => handleSymptomToggle(sym)}
                                className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                  isSel
                                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                                    : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
                                }`}
                              >
                                {sym} 🏷️
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Intensity of cramps/symptoms */}
                  <div className="space-y-1 flex flex-col justify-center">
                    <label className="text-[11px] font-bold text-gray-700 mb-1">Nivel general de malestares:</label>
                    <div className="flex gap-2">
                      {["low", "medium", "high"].map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setCurrentIntensity(lvl as any)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            currentIntensity === lvl
                              ? "bg-[#2C2723] text-white border-[#2C2723] font-black"
                              : "bg-white text-gray-600 border-gray-200 hover:bg-[#FAF7F2]"
                          }`}
                        >
                          {lvl === "low" ? "Bajo 💤" : lvl === "medium" ? "Medio 📈" : "Fuerte ⚡"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes inputs */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Notas de cómo te sientes hoy:</label>
                    <input
                      type="text"
                      placeholder="ej: Me molestó un poco la espalda / antojo de chocoflan..."
                      value={symptomNotes}
                      onChange={(e) => setSymptomNotes(e.target.value)}
                      className="w-full text-xs bg-white rounded-xl px-2.5 py-2 border border-gray-250 focus:outline-none focus:ring-1 focus:ring-pink-300"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs px-4 py-2.5 rounded-2xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Smile size={14} /> Registrar Síntomas
                  </button>
                </div>
              </form>
            </div>

            {/* LÍNEA DE TIEMPO DE FASES Y RECOMENDACIONES CÓSMICAS */}
            <div className="bg-white p-6 rounded-[2rem] border-3 border-[#F3EFE6] shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#FAF7F2] pb-3.5">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black text-[#2C2723] uppercase tracking-wider text-cute flex items-center gap-1.5">
                    <Activity size={14} className="text-rose-500 animate-pulse" />
                    Línea de Tiempo Cósmica del Ciclo
                  </h4>
                  <p className="text-[10px] text-[#8A817C] font-semibold">
                    Historial de fases reportadas y recomendaciones personalizadas recibidas en cada fecha miau 🐾
                  </p>
                </div>
                
                {symptomLogs.length > 0 && (
                  <button
                    onClick={() => {
                      const allExpanded = Object.keys(expandedRecs).length === symptomLogs.length;
                      if (allExpanded) {
                        setExpandedRecs({});
                      } else {
                        const next: Record<string, boolean> = {};
                        symptomLogs.forEach(l => next[l.date] = true);
                        setExpandedRecs(next);
                      }
                    }}
                    className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold px-3 py-1.5 rounded-xl border border-rose-200 transition-all cursor-pointer select-none"
                  >
                    {Object.keys(expandedRecs).length === symptomLogs.length ? "Contraer Todo ✕" : "Expandir Recomendaciones ✨"}
                  </button>
                )}
              </div>

              {symptomLogs.length === 0 ? (
                <div className="text-center py-10 space-y-2 text-cute">
                  <span className="text-3xl block animate-bounce">🌸</span>
                  <p className="text-xs text-[#8A817C] italic font-medium">No hay registros en tu línea de tiempo aún.</p>
                  <p className="text-[10px] text-gray-400 max-w-xs mx-auto font-medium">
                    Anota tus síntomas arriba y Milo calculará automáticamente tu fase y recomendaciones personalizadas para ese día🐾.
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 border-l-2 border-[#FAF7F2] space-y-6 pt-1.5">
                  {symptomLogs.map((log) => {
                    const statsForDate = getCycleStatsForDate(log.date);
                    const phaseCode = log.phaseCode || statsForDate?.phaseCode || "luteal";
                    const phaseName = log.phaseName || statsForDate?.phaseName || "Fase Lútea";
                    const phaseEmoji = log.phaseEmoji || statsForDate?.phaseEmoji || "🕯️";
                    const phaseColor = log.phaseColor || statsForDate?.phaseColor || "text-[#A78BFA] border-[#D8B4FE] bg-[#F5F3FF]";
                    const phaseDesc = log.phaseDesc || statsForDate?.phaseDesc || "Días de introspección.";
                    const recs = log.recommendations || {
                      nutrition: statsForDate?.nutrition || "Alimentos ricos en magnesio.",
                      exercise: statsForDate?.exercise || "Pilates y yoga dinámico.",
                      wellness: statsForDate?.wellness || "Dormir más horas."
                    };

                    const isExpanded = !!expandedRecs[log.date];

                    return (
                      <div key={log.date} className="relative group animate-fade-in">
                        {/* Timeline Bullet Dot */}
                        <div className={`absolute -left-[37px] top-1 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center text-xs shadow-xs transition-transform group-hover:scale-110 ${
                          phaseCode === "menstruation" ? "border-rose-300" :
                          phaseCode === "follicular" ? "border-emerald-300" :
                          phaseCode === "ovulation" ? "border-pink-300" :
                          "border-purple-300"
                        }`}>
                          {phaseEmoji}
                        </div>

                        {/* Content Card */}
                        <div className="bg-[#FCFAF7] p-4 rounded-2.5xl border border-[#E7E2D5]/70 hover:border-pink-300/60 hover:bg-white transition-all space-y-3.5 shadow-2xs">
                          {/* Header of Item */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-extrabold text-[#2C2723] text-xs font-mono bg-white px-2 py-0.5 rounded-lg border border-[#FAF7F2] shadow-3xs">
                                {new Date(log.date + "T00:00:00").toLocaleDateString("es-ES", { day: 'numeric', month: 'long', year: 'numeric' })}
                              </span>
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${phaseColor}`}>
                                {phaseName}
                              </span>
                            </div>

                            <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-black uppercase self-start sm:self-auto ${
                              log.intensity === "high" 
                                ? "bg-red-50 text-red-700 border border-red-100" 
                                : log.intensity === "medium" 
                                ? "bg-amber-50 text-amber-700 border border-amber-100"
                                : "bg-gray-50 text-gray-600 border border-gray-100"
                            }`}>
                              Malestar: {log.intensity === "high" ? "Alto ⚡" : log.intensity === "medium" ? "Medio 📈" : "Bajo 💤"}
                            </span>
                          </div>

                          {/* Symptoms list */}
                          {log.symptoms.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {log.symptoms.map(s => (
                                <span key={s} className="bg-white border border-[#EAE5D9]/70 text-[9px] px-2 py-0.5 rounded-lg font-bold text-gray-700">
                                  {s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Notes */}
                          {log.notes && (
                            <p className="text-[11px] text-[#625B57] font-semibold italic bg-white/70 p-2.5 rounded-xl border border-white/50 leading-normal">
                              "{log.notes}"
                            </p>
                          )}

                          {/* Recommendations Section */}
                          <div className="border-t border-[#EAE5D9]/40 pt-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedRecs(prev => ({
                                  ...prev,
                                  [log.date]: !prev[log.date]
                                }));
                              }}
                              className="w-full flex items-center justify-between text-[10px] font-extrabold text-[#8A817C] hover:text-rose-600 transition-colors cursor-pointer select-none"
                            >
                              <span className="flex items-center gap-1.5">
                                <Sparkles size={11} className="text-pink-500 animate-pulse" />
                                {isExpanded ? "Ocultar Recomendaciones Cósmicas" : "Ver Recomendaciones que se dieron miau ✨"}
                              </span>
                              <ChevronRight 
                                size={12} 
                                className={`transform transition-transform ${isExpanded ? "rotate-90 text-rose-500" : "text-gray-400"}`} 
                              />
                            </button>

                            {isExpanded && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-[#EAE5D9]/40 text-[10.5px] leading-relaxed text-[#625B57] font-semibold animate-slide-down">
                                <div className="p-3 rounded-xl bg-white border border-[#E7E2D5]/30 space-y-1">
                                  <span className="text-base block">🍲</span>
                                  <h5 className="font-extrabold text-[#2C2723] text-[9.5px] uppercase tracking-wider">Alimentación</h5>
                                  <p>{recs.nutrition}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white border border-[#E7E2D5]/30 space-y-1">
                                  <span className="text-base block">🏃‍♀️</span>
                                  <h5 className="font-extrabold text-[#2C2723] text-[9.5px] uppercase tracking-wider">Ejercicio</h5>
                                  <p>{recs.exercise}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white border border-[#E7E2D5]/30 space-y-1">
                                  <span className="text-base block">🧸</span>
                                  <h5 className="font-extrabold text-[#2C2723] text-[9.5px] uppercase tracking-wider">Autocuidado</h5>
                                  <p>{recs.wellness}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Log History & Config */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick config toggle */}
            <div className="bg-white p-5 rounded-3xl border-3 border-[#F3EFE6] shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-[#2C2723] uppercase tracking-wider flex items-center gap-1">
                  <Settings size={14} /> Ajustes del Ciclo
                </h4>
                <button
                  onClick={() => {
                    setIsConfigOpen(!isConfigOpen);
                    setWantsDelete(false);
                  }}
                  className="text-xs text-rose-500 font-bold hover:underline cursor-pointer"
                >
                  {isConfigOpen ? "Cerrar ✕" : "Modificar Parámetros ✏️"}
                </button>
              </div>

              {isConfigOpen ? (
                <form onSubmit={handleSaveConfig} className="space-y-3 pt-2 text-xs border-t border-gray-100">
                  <div className="space-y-1">
                    <label className="block font-bold text-gray-700">Duración del ciclo (Promedio):</label>
                    <input
                      type="number"
                      min={21}
                      max={45}
                      required
                      value={cycleConfig?.cycleDays ?? 28}
                      onChange={(e) => setCycleConfig({
                        periodDays: cycleConfig?.periodDays ?? 5,
                        cycleDays: parseInt(e.target.value) || 28,
                        lastPeriodStart: cycleConfig?.lastPeriodStart ?? new Date().toISOString().split("T")[0]
                      })}
                      className="w-full bg-[#FAF7F2] p-2 rounded-xl border border-gray-200 text-xs"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block font-bold text-gray-700">Duración del sangrado (Días):</label>
                    <input
                      type="number"
                      min={2}
                      max={12}
                      required
                      value={cycleConfig?.periodDays ?? 5}
                      onChange={(e) => setCycleConfig({
                        periodDays: parseInt(e.target.value) || 5,
                        cycleDays: cycleConfig?.cycleDays ?? 28,
                        lastPeriodStart: cycleConfig?.lastPeriodStart ?? new Date().toISOString().split("T")[0]
                      })}
                      className="w-full bg-[#FAF7F2] p-2 rounded-xl border border-gray-200 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-gray-700">Último periodo (Fecha de inicio):</label>
                    <input
                      type="date"
                      required
                      max={new Date().toISOString().split("T")[0]}
                      value={cycleConfig?.lastPeriodStart ?? new Date().toISOString().split("T")[0]}
                      onChange={(e) => setCycleConfig({
                        periodDays: cycleConfig?.periodDays ?? 5,
                        cycleDays: cycleConfig?.cycleDays ?? 28,
                        lastPeriodStart: e.target.value
                      })}
                      className="w-full bg-[#FAF7F2] p-2 rounded-xl border border-gray-200 text-xs text-gray-600"
                    />
                  </div>

                  <div className="space-y-2 pt-1">
                    <button
                      type="submit"
                      className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      Guardar Parámetros
                    </button>

                    {cycleConfig && (
                      <button
                        type="button"
                        onClick={handleResetCycle}
                        className={`w-full font-extrabold py-2 rounded-xl text-xs transition-colors cursor-pointer ${wantsDelete ? "bg-red-600 hover:bg-red-700 text-white animate-pulse" : "bg-red-50 hover:bg-red-100 text-red-600"}`}
                      >
                        {wantsDelete ? "⚠️ CONFIRMAR BORRAR miau!" : "🗑️ Eliminar e Ir a Blanco"}
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <div className="text-[11px] text-[#625B57] space-y-1 px-1 bg-[#FCFAF7] p-2.5 rounded-xl border border-[#FAF7F2]">
                  {cycleConfig ? (
                    <>
                      <div>· Periodo promedio: <span className="font-extrabold text-[#2C2723]">{cycleConfig.periodDays} días</span></div>
                      <div>· Ciclo promedio: <span className="font-extrabold text-[#2C2723]">{cycleConfig.cycleDays} días</span></div>
                      <div>· Último periodo: <span className="font-extrabold text-[#2C2723]">{new Date(cycleConfig.lastPeriodStart + "T00:00:00").toLocaleDateString("es-ES", { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                      
                      <button
                        type="button"
                        onClick={handleResetCycle}
                        className={`mt-2 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${wantsDelete ? "text-red-600 underline font-black animate-pulse bg-red-50 px-2 py-1 rounded-lg" : "text-red-500 hover:text-red-700"}`}
                      >
                        {wantsDelete ? "⚠️ ¿Confirmar Borrado? (Presiona aquí miau)" : "🗑️ Eliminar datos del ciclo"}
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-2 text-gray-400 italic">
                      Sin parámetros de ciclo configurados miau.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Daily logs list */}
            <div className="bg-white p-5 rounded-3xl border-3 border-[#F3EFE6] shadow-xs space-y-4">
              <h4 className="text-xs font-black text-[#2C2723] uppercase tracking-wider flex items-center gap-1">
                <Clipboard size={14} /> Histórico de Síntomas
              </h4>

              {symptomLogs.length === 0 ? (
                <p className="text-xs text-[#8A817C] text-center italic py-4">No hay síntomas registrados recientemente.</p>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {symptomLogs.map((log) => (
                    <div key={log.date} className="p-3 bg-[#FAF7F2] rounded-xl border border-[#EAE5D9] text-xs space-y-1.5 relative group">
                      
                      <button
                        onClick={() => handleRemoveLog(log.date)}
                        className="absolute right-2 top-2 text-[#8A817C] hover:text-red-500 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Borrar registro"
                      >
                        <Trash2 size={12} />
                      </button>

                      <div className="flex justify-between items-center pr-4">
                        <span className="font-bold text-[#2C2723] font-mono">
                          {new Date(log.date + "T00:00:00").toLocaleDateString("es-ES", { day: 'numeric', month: 'short' })}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                          log.intensity === "high" 
                            ? "bg-red-100 text-red-800" 
                            : log.intensity === "medium" 
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          Intensidad: {log.intensity}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {log.symptoms.map(s => (
                          <span key={s} className="bg-white border border-[#EAE5D9] text-[9.5px] px-1.5 py-0.5 rounded-md font-medium text-gray-700">
                            {s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
                          </span>
                        ))}
                      </div>

                      {log.notes && (
                        <p className="text-[10.5px] text-[#625B57] italic bg-white/60 p-1.5 rounded-lg border border-white/50 leading-normal">
                          "{log.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MEDICAL APPOINTMENTS */}
      {/* ======================================================== */}
      {activeTab === "citas" && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-[#2C2723] text-sm uppercase tracking-wider text-cute flex items-center gap-1">
                📅 Agenda Médica Familiar
              </h3>
              <p className="text-xs text-gray-500">Citas programadas para los miembros del hogar y mascotas</p>
            </div>

            <button
              onClick={() => setShowApptForm(!showApptForm)}
              className="bg-[#2C2723] hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-2xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer self-start"
            >
              {showApptForm ? "Ocultar Formulario ✕" : "Agendar Nueva Cita 🏥"}
            </button>
          </div>

          {/* Appointment Creation Form */}
          {showApptForm && (
            <form onSubmit={handleAddAppt} className="bg-[#FCFAF7] p-6 rounded-3xl border-3 border-[#E7E2D5] grid grid-cols-1 md:grid-cols-12 gap-4 animate-slide-down">
              
              <div className="md:col-span-4 space-y-1">
                <label className="block text-xs font-bold text-gray-700">Cita o Especialidad / Examen:</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Control de Ortodoncia 🦷"
                  value={newAppt.title}
                  onChange={(e) => setNewAppt({...newAppt, title: e.target.value})}
                  className="w-full bg-white rounded-xl px-3 py-2 border border-[#EAE5D9] text-xs focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="block text-xs font-bold text-gray-700">Médico u Odontólogo:</label>
                <input
                  type="text"
                  placeholder="ej: Dr. Carlos Pérez"
                  value={newAppt.doctor}
                  onChange={(e) => setNewAppt({...newAppt, doctor: e.target.value})}
                  className="w-full bg-white rounded-xl px-3 py-2 border border-[#EAE5D9] text-xs focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="block text-xs font-bold text-gray-700">Especialidad de la Cita:</label>
                <select
                  value={newAppt.specialty}
                  onChange={(e) => setNewAppt({...newAppt, specialty: e.target.value})}
                  className="w-full bg-white rounded-xl px-3 py-2 border border-[#EAE5D9] text-xs focus:ring-1 focus:ring-rose-500"
                >
                  <option value="Odontología">Odontología 🦷</option>
                  <option value="Ginecología">Ginecología 🌸</option>
                  <option value="Medicina General">Medicina General 🩺</option>
                  <option value="Oftalmología">Oftalmología 👓</option>
                  <option value="Veterinario">Veterinario 🐾</option>
                  <option value="Examen de Laboratorio">Lab / Análisis de Angre 🧪</option>
                  <option value="Otro">Otro especialista 🏥</option>
                </select>
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="block text-xs font-bold text-gray-700">Fecha:</label>
                <input
                  type="date"
                  required
                  value={newAppt.date}
                  onChange={(e) => setNewAppt({...newAppt, date: e.target.value})}
                  className="w-full bg-white rounded-xl px-3 py-2 border border-[#EAE5D9] text-xs focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-gray-700">Hora:</label>
                <input
                  type="time"
                  required
                  value={newAppt.time}
                  onChange={(e) => setNewAppt({...newAppt, time: e.target.value})}
                  className="w-full bg-white rounded-xl px-3 py-2 border border-[#EAE5D9] text-xs focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="block text-xs font-bold text-gray-700">Lugar / Consultorio:</label>
                <input
                  type="text"
                  placeholder="ej: Clínica del Bosque, Bogotá"
                  value={newAppt.location}
                  onChange={(e) => setNewAppt({...newAppt, location: e.target.value})}
                  className="w-full bg-white rounded-xl px-3 py-2 border border-[#EAE5D9] text-xs focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="block text-xs font-bold text-gray-700">Paciente:</label>
                <select
                  value={newAppt.patientId}
                  onChange={(e) => setNewAppt({...newAppt, patientId: e.target.value})}
                  className="w-full bg-white rounded-xl px-3 py-2 border border-[#EAE5D9] text-xs focus:ring-1 focus:ring-rose-500"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} 🙋‍♀️</option>
                  ))}
                  <option value="mascota">Mascota 🐾</option>
                  <option value="home">Ambos / Familiar 🏠</option>
                </select>
              </div>

              <div className="md:col-span-9 space-y-1">
                <label className="block text-xs font-bold text-gray-700">Indicaciones o preparación previa:</label>
                <input
                  type="text"
                  placeholder="ej: Ir en ayunas de 8 horas, llevar fómulas antiguas..."
                  value={newAppt.notes}
                  onChange={(e) => setNewAppt({...newAppt, notes: e.target.value})}
                  className="w-full bg-white rounded-xl px-3 py-2 border border-[#EAE5D9] text-xs focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="md:col-span-3 flex items-end">
                <button
                  type="submit"
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                >
                  Confirmar y Guardar Cita
                </button>
              </div>
            </form>
          )}

          {/* List of active appointments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Pending Appointments column */}
            <div className="bg-white rounded-3xl p-5 border-4 border-[#F3EFE6] space-y-3 shadow-xs">
              <h4 className="text-xs font-black text-rose-700 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-150">
                <Clock size={14} className="animate-spin-slow" /> Citas Médicas Próximas
              </h4>

              {appointments.filter(a => !a.completed).length === 0 ? (
                <div className="text-center py-10 text-gray-500 italic text-xs">
                  No hay citas médicas pendientes en la agenda. ¡Salud perfecta! miau 🐾
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.filter(a => !a.completed).map((appt) => (
                    <div key={appt.id} className="p-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-start gap-3 relative group">
                      <button
                        onClick={() => handleToggleApptDone(appt.id)}
                        className="mt-1 w-5 h-5 rounded-full border-2 border-slate-300 hover:border-emerald-500 bg-white flex items-center justify-center cursor-pointer text-white hover:bg-emerald-50 max-h-max"
                        title="Marcar como cumplida"
                      >
                        <Check size={12} className="text-emerald-500 hover:scale-110" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-xs font-black text-[#2C2723] leading-tight truncate">{appt.title}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            appt.patientId === "mascota" 
                              ? "bg-purple-100 text-purple-800" 
                              : appt.patientId === "home"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {getUserName(appt.patientId)}
                          </span>
                        </div>

                        <p className="text-[10px] text-rose-700 font-bold mt-1 inline-flex items-center gap-1">
                          <span>📅</span> {new Date(appt.date + "T00:00:00").toLocaleDateString("es-ES", { weekday: 'short', day: 'numeric', month: 'short' })} — a las {appt.time} h
                        </p>

                        <p className="text-[10.5px] text-[#625B57] mt-1">🩺 {appt.doctor} ({appt.specialty})</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">📍 {appt.location}</p>

                        {appt.notes && (
                          <div className="mt-2 bg-white/60 p-2 rounded-xl text-[10px] italic border text-gray-700 border-white/80 leading-normal">
                            "{appt.notes}"
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteAppt(appt.id)}
                        className="absolute right-2 bottom-2 text-slate-300 hover:text-red-500 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Eliminar cita"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Completed Appointments column */}
            <div className="bg-white rounded-3xl p-5 border-4 border-[#F3EFE6] space-y-3 shadow-xs opacity-75">
              <h4 className="text-xs font-black text-gray-600 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-150">
                <CheckCircle size={14} /> Historial de Citas Realizadas
              </h4>

              {appointments.filter(a => a.completed).length === 0 ? (
                <div className="text-center py-10 text-gray-400 italic text-xs">
                  No hay registro de citas anteriores finalizadas.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {appointments.filter(a => a.completed).map((appt) => (
                    <div key={appt.id} className="p-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/70 text-xs flex items-start gap-2 relative group">
                      
                      <button
                        onClick={() => handleToggleApptDone(appt.id)}
                        className="mt-0.5 w-4 h-4 rounded-full bg-emerald-500 border border-emerald-500 flex items-center justify-center cursor-pointer text-white text-[9px]"
                        title="Revertir a pendiente"
                      >
                        ✓
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#625B57] line-through truncate leading-tight">{appt.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Realizada el {new Date(appt.date + "T00:00:00").toLocaleDateString("es-ES", { day: 'numeric', month: 'short' })} — {appt.doctor}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeleteAppt(appt.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Eliminar registro"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 3. PAPERS AND MEDICAL RECORDS */}
      {/* ======================================================== */}
      {activeTab === "papeles" && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-[#2C2723] text-sm uppercase tracking-wider text-cute flex items-center gap-1">
                📂 Carpeta de Recetas y Papeles Médicos
              </h3>
              <p className="text-xs text-gray-500">Archivo digital simulado de actas de salud, fórmulas médicas e informes clínicos</p>
            </div>

            <button
              onClick={() => setShowPaperForm(!showPaperForm)}
              className="bg-[#2C2723] hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-2xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer self-start"
            >
              {showPaperForm ? "Ocultar Formulario ✕" : "Digitalizar Receta / Papel 📄"}
            </button>
          </div>

          {/* Paper digitalization form */}
          {showPaperForm && (
            <form onSubmit={handleAddPaper} className="bg-[#FCFAF7] p-6 rounded-3xl border-3 border-[#E7E2D5] grid grid-cols-1 md:grid-cols-12 gap-4 animate-slide-down">
              
              <div className="md:col-span-5 space-y-1">
                <label className="block text-xs font-bold text-gray-700">Título del Documento:</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Fórmula Médica General IPS"
                  value={newPaper.title}
                  onChange={(e) => setNewPaper({...newPaper, title: e.target.value})}
                  className="w-full bg-white rounded-xl px-3 py-2 border border-[#EAE5D9] text-xs focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="block text-xs font-bold text-gray-700">Institucional o Especialista Remitente:</label>
                <input
                  type="text"
                  placeholder="ej: Laboratorio Colcan S.A."
                  value={newPaper.issuer}
                  onChange={(e) => setNewPaper({...newPaper, issuer: e.target.value})}
                  className="w-full bg-white rounded-xl px-3 py-2 border border-[#EAE5D9] text-xs focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="block text-xs font-bold text-gray-700">Tipo de Documento:</label>
                <select
                  value={newPaper.type}
                  onChange={(e) => setNewPaper({...newPaper, type: e.target.value as any})}
                  className="w-full bg-white rounded-xl px-3 py-2 border border-[#EAE5D9] text-xs focus:ring-1 focus:ring-rose-500"
                >
                  <option value="receta">Receta Médica / Fórmula 💊</option>
                  <option value="examen">Informe de Laboratorio/Examen 🧪</option>
                  <option value="historia">Historia Clínica / Epicrisis 📂</option>
                  <option value="otro">Otro papel médico 📄</option>
                </select>
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="block text-xs font-bold text-gray-700">Fecha del Documento:</label>
                <input
                  type="date"
                  required
                  value={newPaper.date}
                  onChange={(e) => setNewPaper({...newPaper, date: e.target.value})}
                  className="w-full bg-white rounded-xl px-3 py-2 border border-[#EAE5D9] text-xs focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="block text-xs font-bold text-gray-700">Paciente:</label>
                <select
                  value={newPaper.patientId}
                  onChange={(e) => setNewPaper({...newPaper, patientId: e.target.value})}
                  className="w-full bg-white rounded-xl px-3 py-2 border border-[#EAE5D9] text-xs focus:ring-1 focus:ring-rose-500"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} 🙋‍♀️</option>
                  ))}
                  <option value="mascota">Mascota 🐾</option>
                  <option value="home">Familiar / Ambos 🏠</option>
                </select>
              </div>

              <div className="md:col-span-6 space-y-1">
                <label className="block text-xs font-bold text-gray-700">Prescripciones / Dosis o Resumen de notas:</label>
                <input
                  type="text"
                  placeholder="ej: Tomar ibuprofeno 400mg cada 8 horas por 3 días tras comida..."
                  value={newPaper.notes}
                  onChange={(e) => setNewPaper({...newPaper, notes: e.target.value})}
                  className="w-full bg-white rounded-xl px-3 py-2 border border-[#EAE5D9] text-xs focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {/* 📸 ADJUNTAR ARCHIVO / IMAGEN AL PAPEL MÉDICO */}
              <div className="md:col-span-12 p-3 bg-rose-50/40 rounded-2xl border border-rose-100/50 space-y-2">
                <label className="block text-[11px] font-black text-rose-950 uppercase tracking-wider">
                  📸 ADJUNTAR COPIA / EXAMEN / FORMULARIO:
                </label>
                
                {uploadedFileUrl ? (
                  <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-rose-200">
                    <img 
                      src={uploadedFileUrl} 
                      alt="Papel médico adjuntado" 
                      className="w-12 h-12 object-cover rounded-lg border shadow-2xs" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-emerald-800 font-bold leading-none">✓ ¡Documento adjuntado con éxito!</p>
                      <p className="text-[9px] text-gray-400 mt-0.5 truncate uppercase">Formato base64 guardado</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setUploadedFileUrl("")}
                      className="text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline px-2.5 py-1 bg-rose-50 rounded-lg cursor-pointer"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <label className="flex-1 w-full flex flex-col items-center justify-center p-3 border-2 border-dashed border-rose-200 hover:border-rose-400 bg-white rounded-xl cursor-pointer transition-all hover:bg-rose-50/30">
                      <span className="text-base select-none">📁</span>
                      <span className="text-[10px] font-black text-rose-950">Subir Receta o Foto de Examen</span>
                      <span className="text-[9px] text-gray-400 mt-0.5">Drag & Drop o Explorar</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setUploadedFileUrl(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <span className="text-[10px] text-gray-400 font-bold uppercase shrink-0">Ó</span>
                    <div className="flex-1 w-full space-y-1">
                      <span className="text-[9.5px] font-bold text-gray-500 block">Enlace directo a archivo (URL):</span>
                      <input 
                        type="text" 
                        placeholder="https://..." 
                        value={uploadedFileUrl}
                        onChange={(e) => setUploadedFileUrl(e.target.value)}
                        className="w-full bg-white focus:outline-none rounded-xl px-2.5 py-2 border border-[#EAE5D9] text-xs font-semibold"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="col-span-12 flex justify-end pt-2">
                <button
                  type="submit"
                  className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Subir y Archivar Digitalmente
                </button>
              </div>
            </form>
          )}

          {/* Search bar & Grid */}
          <div className="space-y-4">
            
            <div className="relative">
              <span className="absolute left-3 top-3.5 text-gray-400">
                <Search size={15} />
              </span>
              <input
                type="text"
                placeholder="Buscar papel por título, especialista, notas o tipo..."
                value={paperSearch}
                onChange={(e) => setPaperSearch(e.target.value)}
                className="w-full text-xs bg-white rounded-2xl pl-10 pr-4 py-3.5 border border-[#EAE5D9] focus:outline-none focus:ring-1 focus:ring-[#BE7A1F]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Document List Column */}
              <div className="md:col-span-2 space-y-2.5">
                {filteredPapers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-12 italic bg-white rounded-2xl border-2 border-dashed border-gray-150">
                    No se encontraron recetas ni papeles médicos coincidentes.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredPapers.map((paper) => {
                      const typeLabel = paper.type === "receta" ? "Receta Médica" : paper.type === "examen" ? "Resultado Examen" : paper.type === "historia" ? "Historia Clínica" : "Otro Papel";
                      const typeColor = paper.type === "receta" ? "border-rose-100 bg-rose-50/30 text-rose-800" : paper.type === "examen" ? "border-emerald-100 bg-emerald-50/30 text-emerald-800" : "border-indigo-100 bg-indigo-50/30 text-indigo-800";
                      
                      return (
                        <div 
                          key={paper.id}
                          onClick={() => setActiveViewerPaper(paper)}
                          className={`p-4 rounded-2.5xl border hover:border-amber-400 transition-all cursor-pointer text-xs relative group flex flex-col justify-between h-40 shadow-xs ${
                            activeViewerPaper?.id === paper.id
                              ? "bg-amber-50/40 border-amber-400"
                              : "bg-white border-slate-100"
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${typeColor}`}>
                                {typeLabel}
                              </span>
                              
                              <button
                                onClick={(e) => handleDeletePaper(paper.id, e)}
                                className="text-slate-300 hover:text-red-500 transition-colors pointer-events-auto opacity-0 group-hover:opacity-100 p-0.5"
                                title="Borrar archivo"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>

                            <h4 className="font-extrabold text-[#2C2723] leading-tight text- cute line-clamp-2 mt-1 px-0.5">
                              {paper.title}
                            </h4>
                            <p className="text-[10px] text-gray-500 px-0.5">🏢 Emisor: {paper.issuer}</p>
                          </div>

                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-gray-500 text-[10px] italic">
                            <span>📅 {new Date(paper.date + "T00:00:00").toLocaleDateString("es-ES", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span className="font-bold underline text-rose-600 flex items-center gap-0.5">
                              Ver Ficha <ChevronRight size={10} />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Document Interactive Viewer Column */}
              <div className="bg-white rounded-3xl p-6 border-4 border-[#F3EFE6] space-y-4 shadow-xs self-start">
                <h4 className="text-xs font-black text-[#2C2723] uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-150">
                  <FileText size={15} /> Ficha de Archivo Clínico
                </h4>

                {activeViewerPaper ? (
                  <div className="space-y-4 text-xs animate-fade-in">
                    
                    <div className="p-3.5 bg-[#FCFAF7] border border-[#EAE5D9] rounded-2xl text-center space-y-1 select-none">
                      <span className="text-3xl">📄</span>
                      <p className="font-extrabold text-[#2C2723] text-sm leading-tight">{activeViewerPaper.title}</p>
                      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">{activeViewerPaper.type.toUpperCase() || "REPORTE"}</span>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <span className="text-[10px] text-[#8A817C] uppercase tracking-wider font-extrabold block">Paciente:</span>
                        <p className="font-bold text-gray-800 flex items-center gap-1">
                          👤 {getUserName(activeViewerPaper.patientId)}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#8A817C] uppercase tracking-wider font-extrabold block">Emitido Por:</span>
                        <p className="font-bold text-gray-800">🩺 {activeViewerPaper.issuer}</p>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#8A817C] uppercase tracking-wider font-extrabold block">Fecha del Documento:</span>
                        <p className="font-bold text-gray-800">📅 {new Date(activeViewerPaper.date + "T00:00:00").toLocaleDateString("es-ES", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>

                      {activeViewerPaper.notes && (
                        <div>
                          <span className="text-[10px] text-[#8A817C] uppercase tracking-wider font-extrabold block">Prescripciones / Notas:</span>
                          <div className="bg-[#FFF9FB] p-3 rounded-xl border border-pink-100 text-[#2C2723] italic leading-relaxed text-[11px] leading-normal font-medium mt-1">
                            "{activeViewerPaper.notes}"
                          </div>
                        </div>
                      )}

                      {activeViewerPaper.fileUrl && (
                        <div>
                          <span className="text-[10px] text-[#8A817C] uppercase tracking-wider font-extrabold block">Vista Previa / Documento Escaneado:</span>
                          <div className="mt-1.5 border border-[#EAE5D9] rounded-2xl overflow-hidden shadow-xs hover:scale-[1.02] transition-transform">
                            <img 
                              src={activeViewerPaper.fileUrl} 
                              alt="Archivo Digitalizado" 
                              className="w-full max-h-52 object-contain bg-slate-50 p-1" 
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-150 flex gap-2">
                      <a
                        href={activeViewerPaper.fileUrl || "#"}
                        download={activeViewerPaper.fileUrl?.startsWith("data:") ? `documento_salud_${activeViewerPaper.title.replace(/\s+/g, "_")}.png` : undefined}
                        onClick={(e) => {
                          if (!activeViewerPaper.fileUrl) {
                            e.preventDefault();
                            alert("¡Descargando archivo digital en formato original de forma simulada! 📁✓");
                          }
                        }}
                        className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
                      >
                        <Download size={13} /> Guardar Copia o Imagen
                      </a>
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-400 italic">
                    <span className="text-3xl block filter grayscale opacity-45 mb-2.5">📂</span>
                    Selecciona cualquier papel de la carpeta de salud de la izquierda para ver su detalle clínico completo miau.
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
