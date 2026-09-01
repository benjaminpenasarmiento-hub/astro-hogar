import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  ArrowRight, 
  Sun, 
  RefreshCw, 
  CheckCircle, 
  Check, 
  Heart, 
  Plus, 
  Sparkles, 
  Send, 
  Zap, 
  Calendar, 
  DollarSign, 
  Activity, 
  Leaf, 
  Dog, 
  Folder, 
  ShieldAlert,
  Smile,
  Clock,
  Bell,
  CloudRain,
  Sunrise,
  Sunset,
  Moon,
  Droplets,
  Compass,
  MapPin,
  Image as ImageIcon,
  Star,
  User,
  ChevronRight
} from "lucide-react";
import { 
  Home, 
  UserProfile, 
  CalendarItem, 
  Pet, 
  Plant, 
  HomeAlert,
  Memory
} from "../types";
import { Avatar } from "./Avatar";
import { 
  getDailyAiGreeting, 
  updateCalendarItem, 
  updateHomeSettings, 
  getAiMoonInfo,
  fetchSaludHogarData,
  submitFrascoMessage,
  initializeMiloHomeContext,
  MiloHomeContextState
} from "../api";
import { useMiloDailyUpdater } from "../hooks/useMiloDailyUpdater";
import { calculateSolarTimes, getCityCoordinates } from "../utils/solarCalculator";

interface HomeDashboardProps {
  home: Home;
  users: UserProfile[];
  calendarItems: CalendarItem[];
  pets: Pet[];
  plants: Plant[];
  memories?: Memory[];
  onRefreshAll: () => void;
  onChangeTab: (tab: string) => void;
  onOpenInstallModal?: () => void;
  onOpenCreateModal?: (type: string) => void;
  activeUserId?: string;
}

function getMoonPhase(date: Date = new Date(), city: string = "Bogotá") {
  const lp = 2551443; // synodic month in seconds
  const now = date.getTime();
  const new_moon = Date.UTC(1970, 0, 7, 20, 35, 0);
  const phase = ((now - new_moon) / 1000) % lp;
  const age = (phase / lp) * 29.53;
  
  const isSouthern = city.toLowerCase().includes("lima") || 
                     city.toLowerCase().includes("santiago") || 
                     city.toLowerCase().includes("buenos") || 
                     city.toLowerCase().includes("chile") || 
                     city.toLowerCase().includes("peru") || 
                     city.toLowerCase().includes("argentina") || 
                     city.toLowerCase().includes("australia") || 
                     city.toLowerCase().includes("sur");

  let phaseInfo;
  if (age < 1.845) {
    phaseInfo = { name: "Luna Nueva 🌑", description: "Tiempo de nuevos comienzos y siembra de intenciones. 🌱" };
  } else if (age < 5.53) {
    phaseInfo = { name: "Luna Creciente 🌒", description: "Período para actuar y dar energía a tus proyectos. ⚡" };
  } else if (age < 9.22) {
    phaseInfo = { name: "Cuarto Creciente 🌓", description: "Superación de obstáculos e impulsos creativos. 🎨" };
  } else if (age < 12.91) {
    phaseInfo = { name: "Gibosa Creciente 🌔", description: "Refina tus planes y mantente paciente. ✨" };
  } else if (age < 16.60) {
    phaseInfo = { name: "Luna Llena 🌕", description: "Clímax de energía, iluminación y plenitud en el nido. 💞" };
  } else if (age < 20.29) {
    phaseInfo = { name: "Gibosa Menguante 🌖", description: "Siente gratitud y comparte tus aprendizajes. 🍎" };
  } else if (age < 23.98) {
    phaseInfo = { name: "Cuarto Menguante 🌗", description: "Momento de soltar cargas y reflexionar en quietud. 🧘" };
  } else if (age < 27.67) {
    phaseInfo = { name: "Luna Menguante 🌘", description: "Recuperación, descanso y limpieza energética. 🧹" };
  } else {
    phaseInfo = { name: "Luna Nueva 🌑", description: "Tiempo de nuevos comienzos y siembra de intenciones. 🌱" };
  }

  if (isSouthern) {
    phaseInfo.description += " 📍 Hemisferio Sur 🌙✨";
  } else {
    phaseInfo.description += " 📍 Hemisferio Norte 🌙✨";
  }
  return phaseInfo;
}

const INSPIRATIONAL_LOVE_QUOTES = [
  "\"El amor no consiste en mirarse el uno al otro, sino en mirar juntos en la misma dirección.\" — Antoine de Saint-Exupéry 💖",
  "\"Donde hay gran amor, siempre hay milagros.\" — Willa Cather ✨",
  "\"Amar y ser amado es sentir el sol desde ambos lados.\" — David Viscott ☀️",
  "\"El hogar no es un lugar, es un sentimiento de calidez compartida.\" 🏡💞",
  "\"Cada día juntos en este nido es una nueva página de nuestra historia favorita.\" 🌸✨",
  "\"En el mapa del universo, mi lugar favorito siempre es a tu lado.\" 🌌💕"
];

export default function HomeDashboard({
  home,
  users,
  calendarItems,
  pets,
  plants,
  memories = [],
  onRefreshAll,
  onChangeTab,
  onOpenInstallModal,
  onOpenCreateModal,
  activeUserId
}: HomeDashboardProps) {
  const [memoryTab, setMemoryTab] = useState<"mafe" | "benja" | "ambos">("mafe");
  const [isEditingLoc, setIsEditingLoc] = useState(false);
  const [locInput, setLocInput] = useState(home.address || users[0]?.birthPlace || "Bogotá");
  const [locValStatus, setLocValStatus] = useState("");
  const [isSavingLoc, setIsSavingLoc] = useState(false);

  // Frasco de amor states
  const [frascoMessages, setFrascoMessages] = useState<any[]>([]);
  const [newFrascoText, setNewFrascoText] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("💌");
  const [isSendingFrasco, setIsSendingFrasco] = useState(false);
  const [frascoStatusMsg, setFrascoStatusMsg] = useState("");
  const frascoInputRef = useRef<HTMLTextAreaElement>(null);

  const activeUser = users.find(u => u.id === activeUserId) || users[0] || { id: "mafe", name: "Mafe" };

  // Load frasco messages
  const loadFrascoData = async () => {
    try {
      const data = await fetchSaludHogarData();
      if (data && data.frascoMessages) {
        setFrascoMessages(data.frascoMessages);
      }
    } catch (err) {
      console.error("Error loading frasco data:", err);
    }
  };

  useEffect(() => {
    loadFrascoData();
  }, []);

  const handleSendFrascoMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFrascoText.trim()) return;
    setIsSendingFrasco(true);
    setFrascoStatusMsg("");
    try {
      await submitFrascoMessage(activeUser.id as any, newFrascoText.trim(), selectedEmoji);
      setNewFrascoText("");
      setFrascoStatusMsg("¡Nota enviada con amor al Frasco! 💌✨");
      await loadFrascoData();
      setTimeout(() => setFrascoStatusMsg(""), 3000);
    } catch (err) {
      setFrascoStatusMsg("Error al enviar la nota. Intenta de nuevo.");
    } finally {
      setIsSendingFrasco(false);
    }
  };

  const handleValidateLocation = async () => {
    if (!locInput.trim()) {
      setLocValStatus("Por favor ingresa una ubicación válida.");
      return;
    }
    setIsSavingLoc(true);
    setLocValStatus("");
    try {
      await updateHomeSettings({ address: locInput.trim() });
      setLocValStatus("¡Ubicación validada con éxito! 🌍🛰️");
      onRefreshAll();
      setTimeout(() => {
        setIsEditingLoc(false);
        setLocValStatus("");
      }, 2000);
    } catch (err) {
      setLocValStatus("Error al validar la ubicación.");
    } finally {
      setIsSavingLoc(false);
    }
  };

  const getUserName = (id: string) => {
    const user = users.find(u => u.id === id);
    return user ? user.name : id;
  };

  // Memory showcase selector logic - strictly uses real registered memories
  const [memoryIndex, setMemoryIndex] = useState(0);

  const filteredMemories = useMemo(() => {
    if (!memories || memories.length === 0) return [];
    if (memoryTab === "mafe") {
      const mafeMems = memories.filter(m => 
        m.people?.some(p => p.toLowerCase().includes("mafe")) || 
        m.title.toLowerCase().includes("mafe") ||
        m.description?.toLowerCase().includes("mafe")
      );
      return mafeMems.length > 0 ? mafeMems : memories;
    } else if (memoryTab === "benja") {
      const benjaMems = memories.filter(m => 
        m.people?.some(p => p.toLowerCase().includes("benja")) || 
        m.title.toLowerCase().includes("benja") ||
        m.description?.toLowerCase().includes("benja")
      );
      return benjaMems.length > 0 ? benjaMems : memories;
    }
    return memories;
  }, [memories, memoryTab]);

  const activeMemory = filteredMemories.length > 0 
    ? filteredMemories[memoryIndex % filteredMemories.length] 
    : null;

  const activeMemoryShowcase = activeMemory ? {
    id: activeMemory.id,
    title: activeMemory.title,
    date: activeMemory.date,
    location: activeMemory.location || "Nuestro Hogar 🏡",
    image: activeMemory.media?.[0] || "/nido_cozy.jpg",
    description: activeMemory.description || "Un recuerdo inolvidable atesorado en nuestro hogar.",
    owner: memoryTab === "mafe" ? "Para Mafe 💖" : memoryTab === "benja" ? "Para Benja 💙" : "Nuestra Historia 👩‍❤️‍👨"
  } : null;

  // Custom Hook: Auto-checks if climate, moon phases, and events were updated today by Milo
  const miloDailyUpdater = useMiloDailyUpdater();
  const miloContextState = miloDailyUpdater.miloContextState;
  const isMiloLoading = miloDailyUpdater.isChecking || miloDailyUpdater.isUpdating;

  const [dailyGreeting, setDailyGreeting] = useState<string>("¡Cargando mi saludo matutino para el nido con mucho amor...! 🐾🏡");
  const [isGreetingLoading, setIsGreetingLoading] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<"morning" | "afternoon" | "evening">("morning");

  const [moonInfo, setMoonInfo] = useState<{
    phase: string;
    age: number;
    illuminationPct?: number;
    nextNewMoonText?: string;
    meaning: string;
  } | null>(null);
  const [isMoonLoading, setIsMoonLoading] = useState(false);

  // Determine time of day
  useEffect(() => {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 12) setTimeOfDay("morning");
    else if (hr >= 12 && hr < 18) setTimeOfDay("afternoon");
    else setTimeOfDay("evening");
  }, []);

  // Synchronize state when miloDailyUpdater loads or updates context
  useEffect(() => {
    if (miloContextState) {
      if (miloContextState.dailyGreeting) setDailyGreeting(miloContextState.dailyGreeting);
      if (miloContextState.moon) {
        setMoonInfo({
          phase: miloContextState.moon.fullPhaseText,
          age: miloContextState.moon.age,
          illuminationPct: miloContextState.moon.illuminationPct,
          nextNewMoonText: miloContextState.moon.nextNewMoonText,
          meaning: miloContextState.moon.meaning
        });
      }
    }
  }, [miloContextState]);

  // Manual Trigger for Milo Context Synchronization
  const handleInitializeMiloContext = async (forceRefresh = false) => {
    setIsGreetingLoading(true);
    setIsMoonLoading(true);
    try {
      const updated = await miloDailyUpdater.triggerManualUpdate();
      if (updated) {
        if (updated.dailyGreeting) setDailyGreeting(updated.dailyGreeting);
        if (updated.moon) setMoonInfo({
          phase: updated.moon.fullPhaseText,
          age: updated.moon.age,
          illuminationPct: updated.moon.illuminationPct,
          nextNewMoonText: updated.moon.nextNewMoonText,
          meaning: updated.moon.meaning
        });
      }
    } catch (err) {
      console.error("Error sincronizando contexto con Milo:", err);
    } finally {
      setIsGreetingLoading(false);
      setIsMoonLoading(false);
    }
  };

  // Recalculate quick system alerts / recommendations
  const systemAlerts: HomeAlert[] = [];
  
  // Plant alerts
  plants.forEach(p => {
    const lastWater = [...p.careHistory].filter(h => h.type === 'water')[0];
    if (lastWater) {
      const diffTime = Math.abs(new Date().getTime() - new Date(lastWater.date).getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 6) {
        systemAlerts.push({
          id: `alert-p-${p.id}`,
          type: "warning",
          message: `⚠️ Hace ${diffDays} días no se registra riego en la ${p.name} 🪴.`
        });
      }
    } else {
      systemAlerts.push({
        id: `alert-p-init-${p.id}`,
        type: "info",
        message: `🪴 ${p.name} no registra riego inicial.`
      });
    }
  });

  // Pet alerts
  pets.forEach(p => {
    const urgentVax = p.medical.vaccinations.filter(v => {
      if (!v.nextDueDate) return false;
      const days = Math.floor((new Date(v.nextDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 30;
    });
    
    urgentVax.forEach(v => {
      systemAlerts.push({
        id: `alert-vax-${p.id}-${v.name}`,
        type: "warning",
        message: `🐾 ${p.name} tiene vacuna próxima: ${v.name} en los próximos días.`
      });
    });
  });

  // Task volume alert
  const pendingTasks = calendarItems.filter(i => i.type === "task" && i.status === "pending");
  if (pendingTasks.length > 0) {
    systemAlerts.push({
      id: "alert-tasks",
      type: "info",
      message: `📅 Tienen ${pendingTasks.length} tareas pendientes esta semana en el nido.`
    });
  }

  const isItemOnDate = (item: CalendarItem, dateStr: string) => {
    if (dateStr < item.date) return false;
    if (item.date === dateStr) return true;

    const rec = item.recurrence;
    if (rec) {
      const recType = typeof rec === 'string' ? rec : (rec as any).type;
      if (recType && recType !== 'none') {
        const dStart = new Date(item.date + 'T00:00:00');
        const dCheck = new Date(dateStr + 'T00:00:00');
        if (recType === 'daily') return true;
        if (recType === 'weekly') return dStart.getDay() === dCheck.getDay();
        if (recType === 'monthly') return dStart.getDate() === dCheck.getDate();
        if (recType === 'specific' || recType === 'custom') {
          const specDate = (rec as any).specificDate;
          if (specDate && specDate === dateStr) return true;
        }
      }
    }

    if (item.endDate) {
      return dateStr >= item.date && dateStr <= item.endDate;
    }
    return false;
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const itemsToday = calendarItems.filter(item => isItemOnDate(item, todayStr));

  const getDayName = (dateStr: string) => {
    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const d = new Date(dateStr + "T00:00:00");
    return days[d.getDay()];
  };

  const getWeekDaysRange = () => {
    const start = new Date();
    const daysArr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      daysArr.push(d.toISOString().split('T')[0]);
    }
    return daysArr;
  };

  const next7Days = getWeekDaysRange();
  const weeklySummaryItems = calendarItems.filter(item => {
    if (item.endDate) {
      return next7Days.some(day => day !== todayStr && isItemOnDate(item, day));
    }
    return next7Days.includes(item.date) && item.date !== todayStr;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const handleToggleTaskStatus = async (item: CalendarItem) => {
    const targetStatus = item.status === "done" ? "pending" : "done";
    await updateCalendarItem(item.id, { status: targetStatus });
    onRefreshAll();
  };

  const homeCity = home.address || users[0]?.birthPlace || "Bogotá";

  const getWeatherDetails = (city: string) => {
    const cleanCity = city.trim().toLowerCase();
    const now = new Date();
    const hr = now.getHours();
    const day = now.getDate();
    const month = now.getMonth();
    const seed = (day * 3 + month * 7) % 100;
    
    let baseTemp = 19;
    let descList: string[] = [];
    let baseProbRain = 20;
    let baseWind = 10;
    let icon = "🍃";
    let gradient = "from-[#F3EFE6]/70 to-[#FAF7F2]";

    if (cleanCity.includes("bogotá") || cleanCity.includes("bogota")) {
      baseTemp = 14;
      descList = [
        "Llovizna suave y aire fresco de montaña",
        "Cielo nublado con vientos fríos andinos",
        "Clima templado y despejado con sol radiante",
        "Niebla matutina con aroma a café fresco",
        "Atardecer dorado y fresco en los cerros"
      ];
      baseProbRain = 40;
      baseWind = 12;
      icon = "🌧️";
      gradient = "from-slate-100 to-blue-200";
    } else if (cleanCity.includes("medellín") || cleanCity.includes("medellin")) {
      baseTemp = 22;
      descList = [
        "Cielo parcialmente nublado · Eterna primavera",
        "Tarde cálida y brisa fresca del valle de Aburrá",
        "Clima primaveral despejado y soleado",
        "Lluvia suave de verano refrescando las calles",
        "Atardecer rosado y clima sumamente acogedor"
      ];
      baseProbRain = 15;
      baseWind = 8;
      icon = "⛅";
      gradient = "from-amber-50 to-emerald-100";
    } else if (cleanCity.includes("cali")) {
      baseTemp = 28;
      descList = [
        "Tarde soleada de calor radiante y brisa suave",
        "Cielo despejado con calor tropical y viento de loma",
        "Tarde perfecta para un refresco bien frío",
        "Cielo nublado con brisa fresca de la tarde",
        "Clima cálido ideal para relajarse"
      ];
      baseProbRain = 8;
      baseWind = 14;
      icon = "☀️";
      gradient = "from-orange-50 to-amber-200";
    } else {
      baseTemp = 19;
      descList = [
        "Cielo despejado con vientos suaves de valle",
        "Clima templado ideal para caminar y relajarse",
        "Tarde fresca con nubosidad ligera",
        "Mañana fresca de aire limpio y cielo claro",
        "Atardecer pacífico y clima muy acogedor"
      ];
      baseProbRain = 15;
      baseWind = 10;
      icon = "🍃";
      gradient = "from-[#F3EFE6]/70 to-[#FAF7F2]";
    }

    let hourlyDiff = 0;
    if (hr >= 0 && hr < 6) hourlyDiff = -4;
    else if (hr >= 6 && hr < 11) hourlyDiff = -1;
    else if (hr >= 11 && hr < 16) hourlyDiff = +3;
    else if (hr >= 16 && hr < 20) hourlyDiff = +1;
    else hourlyDiff = -2;

    const dayDiff = (seed % 5) - 2;
    const finalTemp = baseTemp + hourlyDiff + dayDiff;
    const rainDiff = ((seed + hr * 7) % 31) - 15;
    const finalProbRain = Math.max(0, Math.min(100, baseProbRain + rainDiff));
    const windDiff = ((seed + hr) % 7) - 3;
    const finalWind = Math.max(2, baseWind + windDiff);
    const descIndex = (seed + hr) % descList.length;
    const finalDesc = descList[descIndex];

    let finalIcon = icon;
    let finalGradient = gradient;
    if (finalProbRain > 55) {
      finalIcon = "🌧️";
      finalGradient = "from-slate-200 to-blue-200";
    } else if (finalProbRain > 30) {
      finalIcon = "☁️";
      finalGradient = "from-zinc-100 to-slate-200";
    }

    return {
      temp: `${finalTemp}°C`,
      desc: finalDesc,
      probRain: `${finalProbRain}%`,
      wind: `${finalWind} km/h`,
      icon: finalIcon,
      gradient: finalGradient
    };
  };

  const weather = getWeatherDetails(homeCity);
  const moonPhase = getMoonPhase(new Date(), homeCity);
  const cityCoords = useMemo(() => getCityCoordinates(homeCity), [homeCity]);
  
  const [currentDate, setCurrentDate] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const solarTimes = useMemo(() => {
    return calculateSolarTimes(
      currentDate,
      cityCoords.latitude,
      cityCoords.longitude,
      cityCoords.timezoneOffsetHours
    );
  }, [currentDate, cityCoords]);

  // Daily quote selection based on today's date
  const todayQuoteIndex = (new Date().getDate() + new Date().getMonth() * 3) % INSPIRATIONAL_LOVE_QUOTES.length;
  const todayLoveQuote = INSPIRATIONAL_LOVE_QUOTES[todayQuoteIndex];

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2 text-[#2C2723]">
      
      {/* 🏡 HERO CARD: SALUDO INICIAL + FOTO DEL NIDO DE AMOR */}
      <div className="bg-white rounded-3xl border-4 border-[#F3EFE6] shadow-sm relative overflow-hidden flex flex-col md:flex-row items-stretch gap-0">
        
        {/* LADO IZQUIERDO: Saludo, Avatares, Frase de Milo */}
        <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative text-3xl sm:text-4xl p-2.5 bg-[#FFE5D9] rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                  <span>🏡</span>
                  {users.map((u, i) => (
                    <div 
                      key={u.id} 
                      className={`absolute w-8 h-8 flex items-center justify-center transition-transform hover:scale-110 ${
                        i === 0 
                          ? "-bottom-1.5 -left-1.5 rotate-[-8deg]" 
                          : "-top-1.5 -right-1.5 rotate-[8deg]"
                      }`}
                    >
                      <Avatar emoji={u.emoji} className="w-full h-full" />
                    </div>
                  ))}
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#2C2723]">
                    Hola {users.length > 0 ? users.map(u => u.name).join(" & ") : "Inquilinos Cósmicos"}
                  </h2>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block mt-0.5">
                    Nido de Amor Activo 🐾✨
                  </span>
                </div>
              </div>

              <button 
                onClick={() => {
                  setTimeOfDay(prev => prev === "morning" ? "afternoon" : prev === "afternoon" ? "evening" : "morning");
                }}
                className="p-2 rounded-full hover:bg-[#FAF7F2] border border-[#F3EFE6] transition-all text-[#8A817C] hover:text-[#2C2723] cursor-pointer"
                title="Cambiar momento del día para el saludo"
              >
                <RefreshCw size={14} className="animate-spin-slow" />
              </button>
            </div>

            {/* Mensaje de Milo AI */}
            <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#E7E2D5] space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8C5D23] flex items-center gap-1">
                  <span>🐾</span> Mensaje & Estado de Milo para el día:
                </span>
                <div className="flex items-center gap-2">
                  {miloContextState?.harmonyScore && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-full">
                      Armonía: {miloContextState.harmonyScore}%
                    </span>
                  )}
                  <button
                    onClick={() => handleInitializeMiloContext(true)}
                    disabled={isGreetingLoading || isMiloLoading}
                    className="text-[#8C5D23] hover:text-[#2C2723] p-1 rounded transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1 text-[10px] font-bold"
                    title="Sincronizar y actualizar estado del día con Milo"
                  >
                    <RefreshCw size={12} className={isGreetingLoading || isMiloLoading ? "animate-spin" : ""} />
                    <span>Sincronizar Milo</span>
                  </button>
                  <span className="text-[10px] font-mono text-gray-400">Hoy</span>
                </div>
              </div>
              {isGreetingLoading || isMiloLoading ? (
                <p className="text-xs text-[#8A817C] animate-pulse">Milo está sincronizando el contexto completo del nido... 🐾</p>
              ) : (
                <p className="text-xs sm:text-sm text-[#5C5552] italic leading-relaxed">
                  "{dailyGreeting}"
                </p>
              )}

              {/* Centralized Briefing Banner from Milo */}
              {miloContextState?.briefing?.summaryText && (
                <div className="pt-2 border-t border-[#E7E2D5] flex items-center justify-between text-[11px] text-[#7A4E1B] font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span>📋</span> {miloContextState.briefing.summaryText}
                  </span>
                  <span className="text-[10px] text-[#8A817C] font-mono">
                    {miloContextState.briefing.pendingTasksCount} pendientes
                  </span>
                </div>
              )}
            </div>
          </div>

            {/* Ubicación del Nido */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#F3EFE6]">
              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200/80 px-3 py-1 rounded-xl text-[11px] font-extrabold">
                <MapPin size={12} className="text-amber-700" />
                <span>Ubicación Nido: {homeCity}</span>
              </div>
              <span className="text-[10.5px] font-mono text-gray-400">Sabana de Bogotá · 2.640 msnm</span>
            </div>
          </div>

        {/* LADO DERECHO: FOTO DEL NIDO DE AMOR */}
        <div className="w-full md:w-80 shrink-0 relative bg-slate-900 border-t md:border-t-0 md:border-l-4 border-[#F3EFE6] min-h-[220px] md:min-h-full overflow-hidden group">
          <img 
            src="/nido_cozy.jpg" 
            alt="Foto de nuestro Nido Cósmico" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 object-center min-h-[220px]"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 text-white flex flex-col justify-end">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
              <span>🏡</span> AstroHogar Oficial
            </span>
            <p className="text-xs font-bold text-white mt-0.5">Mafe & Benja</p>
            <p className="text-[10px] text-gray-200 mt-0.5 leading-snug">Nuestro rincón cálido de paz, amor y ronroneos 🐾✨</p>
          </div>
        </div>

      </div>


      {/* 🌤️ & 🌌 MÓDULO VISUAL: CLIMA BOGOTÁ Y COSMOS / ASTROS EN VIVO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* 🌤️ TARJETA 1: CLIMA & PRONÓSTICO DE HOY EN BOGOTÁ */}
        <div className="lg:col-span-7 bg-gradient-to-br from-sky-50/90 via-blue-50/50 to-indigo-50/30 rounded-3xl p-5 sm:p-6 border-4 border-sky-100/90 shadow-2xs space-y-4 relative overflow-hidden">
          {/* Fondo sutil decorativo sol/nube */}
          <div className="absolute -right-8 -top-8 w-36 h-36 bg-amber-200/30 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-sky-200/70 text-sky-900 rounded-2xl text-lg shrink-0">
                {miloContextState?.weather?.icon || "🌤️"}
              </span>
              <div>
                <h3 className="font-extrabold text-[#2C2723] text-sm uppercase tracking-wider flex items-center gap-1.5">
                  El Clima en Bogotá Hoy
                </h3>
                <p className="text-[10.5px] text-[#8A817C] font-medium">Pronóstico en tiempo real para el nido en la Sabana</p>
              </div>
            </div>
            <span className="text-[10.5px] font-extrabold px-3 py-1 bg-white text-sky-900 border border-sky-200 rounded-full shadow-2xs flex items-center gap-1">
              <MapPin size={11} className="text-sky-600" /> {miloContextState?.weather?.city || "Bogotá, D.C."}
            </span>
          </div>

          {/* Temperatura Principal + Sensación + Condición */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-sky-100 shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="text-4xl animate-bounce-slow">{miloContextState?.weather?.icon || "⛅"}</span>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#2C2723]">{miloContextState?.weather?.temp || "15°C"}</span>
                  <span className="text-xs text-gray-500 font-bold">Sensación {miloContextState?.weather?.feelsLike || "14°C"}</span>
                </div>
                <p className="text-xs font-extrabold text-sky-900">{miloContextState?.weather?.desc || "Parcialmente Nublado · Bogotá"}</p>
              </div>
            </div>

            {/* Widget Probabilidad de Lluvia */}
            <div className="bg-sky-50/80 p-3 rounded-xl border border-sky-200/70 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-extrabold text-sky-900">
                <span className="flex items-center gap-1">
                  <CloudRain size={13} className="text-blue-600" /> Probabilidad de Lluvia:
                </span>
                <span className="text-blue-700 font-black">{miloContextState?.weather?.probRain || "35%"}</span>
              </div>
              
              {/* Progreso lluvia */}
              <div className="w-full bg-sky-200/60 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-sky-400 to-blue-600 h-full rounded-full transition-all duration-1000 h-2.5" 
                  style={{ width: miloContextState?.weather?.probRain || "35%" }}
                />
              </div>
              <p className="text-[10px] text-sky-800 font-semibold leading-tight">
                🐾 {miloContextState?.weather?.miloAdvice || "Clima fresco en la Sabana: ideal para vestir cómodo."}
              </p>
            </div>
          </div>

          {/* Pronóstico en 3 tiempos del día (Mañana, Tarde, Noche) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#8A817C] flex items-center gap-1">
              <Clock size={11} className="text-sky-600" /> Transcurso del Día en Bogotá:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/90 p-2.5 rounded-2xl border border-sky-100 text-center space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-amber-700 block">Mañana</span>
                <span className="text-lg block">{miloContextState?.weather?.forecast?.morning?.icon || "⛅"}</span>
                <span className="text-xs font-black text-[#2C2723] block">{miloContextState?.weather?.forecast?.morning?.temp || "13°C"}</span>
                <span className="text-[9.5px] font-bold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded-md inline-block">
                  💧 {miloContextState?.weather?.forecast?.morning?.rain || "20%"} lluvia
                </span>
              </div>
              <div className="bg-white/90 p-2.5 rounded-2xl border border-blue-200 text-center space-y-1 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase text-blue-800 block">Tarde</span>
                <span className="text-lg block">{miloContextState?.weather?.forecast?.afternoon?.icon || "🌧️"}</span>
                <span className="text-xs font-black text-[#2C2723] block">{miloContextState?.weather?.forecast?.afternoon?.temp || "18°C"}</span>
                <span className="text-[9.5px] font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded-md inline-block">
                  💧 {miloContextState?.weather?.forecast?.afternoon?.rain || "50%"} lluvia
                </span>
              </div>
              <div className="bg-white/90 p-2.5 rounded-2xl border border-indigo-100 text-center space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-indigo-700 block">Noche</span>
                <span className="text-lg block">{miloContextState?.weather?.forecast?.night?.icon || "🌙"}</span>
                <span className="text-xs font-black text-[#2C2723] block">{miloContextState?.weather?.forecast?.night?.temp || "12°C"}</span>
                <span className="text-[9.5px] font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded-md inline-block">
                  💧 {miloContextState?.weather?.forecast?.night?.rain || "15%"} lluvia
                </span>
              </div>
            </div>
          </div>

          {/* Salida y Puesta del Sol (Astro Solar Dinámico en Tiempo Real) */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 p-3.5 rounded-2xl border border-amber-200/80 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-xl shadow-2xs">
                  <Sunrise size={16} />
                </div>
                <div>
                  <span className="text-[9.5px] text-amber-900 font-extrabold uppercase block">Salida del Sol</span>
                  <span className="font-black text-[#2C2723]">{solarTimes.sunrise}</span>
                  <span className="text-[8.5px] text-amber-700/80 font-medium block">Alba: {solarTimes.dawn}</span>
                </div>
              </div>

              <div className="h-8 w-px bg-amber-200/80 hidden sm:block" />

              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange-100 text-orange-800 rounded-xl shadow-2xs">
                  <Sunset size={16} />
                </div>
                <div>
                  <span className="text-[9.5px] text-orange-900 font-extrabold uppercase block">Puesta del Sol</span>
                  <span className="font-black text-[#2C2723]">{solarTimes.sunset}</span>
                  <span className="text-[8.5px] text-orange-700/80 font-medium block">Ocaso: {solarTimes.dusk}</span>
                </div>
              </div>

              <div className="h-8 w-px bg-amber-200/80 hidden sm:block" />

              <div className="text-left sm:text-right">
                <span className="text-[10px] text-amber-900 font-extrabold block">☀️ {solarTimes.sunlightHours} de luz</span>
                <span className="text-[9px] text-gray-600 block">
                  Cenit: {solarTimes.solarNoon} · Día #{solarTimes.dayOfYear}
                </span>
              </div>
            </div>

            {/* Barra de Trayectoria Solar en Vivo */}
            <div className="pt-1 space-y-1">
              <div className="flex items-center justify-between text-[9px] font-bold text-amber-900/80">
                <span className="flex items-center gap-1">
                  <span>{solarTimes.statusText}</span>
                </span>
                <span className="text-amber-800 font-black">
                  {solarTimes.nextTransitionText}
                </span>
              </div>
              <div className="relative w-full h-2 bg-amber-100/90 rounded-full overflow-hidden border border-amber-200">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(4, solarTimes.sunProgressPct)}%` }}
                />
              </div>
            </div>
          </div>
        </div>


        {/* 🌌 TARJETA 2: LUNA, CICLO Y ASTROS EN BOGOTÁ */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#1A162B] via-[#231C38] to-[#120E20] text-white rounded-3xl p-5 sm:p-6 border-4 border-purple-900/40 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between">
          
          {/* Brillo cósmico de fondo */}
          <div className="absolute right-0 top-0 w-40 h-40 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-purple-800/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-purple-900/60 text-purple-200 rounded-2xl text-lg border border-purple-700/50">🌌</span>
                <div>
                  <h3 className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-1.5">
                    Cosmos & Luna en Bogotá
                  </h3>
                  <p className="text-[10.5px] text-purple-200/80 font-medium">Ciclo lunar y astros visibles en el hogar</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-purple-950 text-purple-200 border border-purple-700/60 rounded-full">
                Hemisferio Norte 📍
              </span>
            </div>

            {/* Fase Lunar Actual */}
            <div className="bg-purple-950/70 p-3.5 rounded-2xl border border-purple-800/60 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-purple-300 block">Fase Lunar Hoy</span>
                <p className="text-base font-black text-amber-200 flex items-center gap-1.5">
                  <span>{moonInfo ? moonInfo.phase : moonPhase.name}</span>
                </p>
                <p className="text-[10.5px] text-purple-200/90 leading-tight">
                  {moonInfo ? moonInfo.meaning : moonPhase.description}
                </p>
              </div>

              <div className="text-right shrink-0 bg-purple-900/40 p-2.5 rounded-xl border border-purple-700/40">
                <span className="text-xs font-mono font-black text-purple-200 block">
                  {miloContextState?.moon?.illuminationPct ?? moonInfo?.illuminationPct ?? 48}% Iluminada
                </span>
                <span className="text-[9.5px] text-purple-300 block">
                  {miloContextState?.moon?.age ?? moonInfo?.age ?? 21.4} días de edad
                </span>
              </div>
            </div>

            {/* Signo/Constelación Lunar */}
            <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/60 p-3 rounded-2xl border border-indigo-800/50 space-y-1">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                <Sparkles size={12} className="text-amber-300" /> Tránsito Astro del Día:
              </span>
              <p className="text-xs font-extrabold text-white">
                ♓ Luna en Piscis · Energía Intuitiva & Romántica
              </p>
              <p className="text-[10.5px] text-purple-200/80 italic">
                Cielos propicios para descansar, escuchar música suave y disfrutar del abrigo en el nido miau. 🐾
              </p>
            </div>
          </div>

          {/* Próximos Hitos Celestiales & Astros Visibles */}
          <div className="pt-2 border-t border-purple-800/50 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-extrabold text-purple-200">
              <span className="flex items-center gap-1"><Moon size={12} className="text-purple-300" /> Próxima Luna Nueva:</span>
              <span className="text-amber-200 font-mono">
                {miloContextState?.moon?.nextNewMoonText || moonInfo?.nextNewMoonText || "En 8 días 🌑"}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-extrabold text-purple-200">
              <span className="flex items-center gap-1"><Star size={12} className="text-amber-300" /> Astros en Bogotá:</span>
              <span className="text-purple-100 font-medium">Venus & Júpiter al Oeste 🌟</span>
            </div>
          </div>

        </div>

      </div>


      {/* ⚡ PÁGINA RÁPIDA DE ATAJOS (SHORTCUTS DASHBOARD) */}
      <div className="bg-[#FAF9F5] p-5 sm:p-6 rounded-3xl border-4 border-[#F3EFE6] space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-[#2C2723] text-sm uppercase tracking-wider flex items-center gap-2">
              <span className="p-1.5 bg-amber-200 text-amber-900 rounded-xl"><Zap size={16} /></span> Atajos Rápidos del Hogar
            </h3>
            <p className="text-xs text-[#8A817C] mt-0.5">Acciones inmediatas a un toque para gestionar su día juntos:</p>
          </div>
          <span className="text-[10px] font-black px-2.5 py-1 bg-white border border-[#E7E2D5] rounded-full text-[#8A817C]">
            Nido Express ⚡
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          
          {/* 1. Registrar Movimiento */}
          <button
            onClick={() => onChangeTab("presupuesto")}
            className="p-3.5 bg-white rounded-2xl border-2 border-emerald-150 hover:border-emerald-400 hover:shadow-md transition-all text-left group cursor-pointer flex flex-col justify-between space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <DollarSign size={18} />
            </div>
            <div>
              <p className="text-xs font-black text-[#2C2723] group-hover:text-emerald-700">Registrar Gastos</p>
              <p className="text-[10px] text-gray-500 font-medium leading-tight">Presupuesto y compras</p>
            </div>
          </button>

          {/* 2. Agendar Evento */}
          <button
            onClick={() => {
              if (onOpenCreateModal) onOpenCreateModal("event");
              else onChangeTab("calendario");
            }}
            className="p-3.5 bg-white rounded-2xl border-2 border-blue-150 hover:border-blue-400 hover:shadow-md transition-all text-left group cursor-pointer flex flex-col justify-between space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-xs font-black text-[#2C2723] group-hover:text-blue-700">Agendar Evento</p>
              <p className="text-[10px] text-gray-500 font-medium leading-tight">Citas y salidas</p>
            </div>
          </button>

          {/* 3. Tarea del Nido */}
          <button
            onClick={() => {
              if (onOpenCreateModal) onOpenCreateModal("task");
              else onChangeTab("calendario");
            }}
            className="p-3.5 bg-white rounded-2xl border-2 border-amber-150 hover:border-amber-400 hover:shadow-md transition-all text-left group cursor-pointer flex flex-col justify-between space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <CheckCircle size={18} />
            </div>
            <div>
              <p className="text-xs font-black text-[#2C2723] group-hover:text-amber-800">Nueva Tarea</p>
              <p className="text-[10px] text-gray-500 font-medium leading-tight">Pendientes del nido</p>
            </div>
          </button>

          {/* 4. Nota al Frasco de Amor */}
          <button
            onClick={() => {
              if (frascoInputRef.current) {
                frascoInputRef.current.scrollIntoView({ behavior: 'smooth' });
                frascoInputRef.current.focus();
              }
            }}
            className="p-3.5 bg-white rounded-2xl border-2 border-rose-150 hover:border-rose-400 hover:shadow-md transition-all text-left group cursor-pointer flex flex-col justify-between space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Heart size={18} />
            </div>
            <div>
              <p className="text-xs font-black text-[#2C2723] group-hover:text-rose-700">Nota de Amor</p>
              <p className="text-[10px] text-gray-500 font-medium leading-tight">Escribir al Frasco 💌</p>
            </div>
          </button>

          {/* 5. Registrar Ejercicio */}
          <button
            onClick={() => onChangeTab("ejercicio")}
            className="p-3.5 bg-white rounded-2xl border-2 border-purple-150 hover:border-purple-400 hover:shadow-md transition-all text-left group cursor-pointer flex flex-col justify-between space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Activity size={18} />
            </div>
            <div>
              <p className="text-xs font-black text-[#2C2723] group-hover:text-purple-700">Deporte & Rutina</p>
              <p className="text-[10px] text-gray-500 font-medium leading-tight">Registrar entreno</p>
            </div>
          </button>

          {/* 6. Regar Plantas */}
          <button
            onClick={() => onChangeTab("plantas")}
            className="p-3.5 bg-white rounded-2xl border-2 border-teal-150 hover:border-teal-400 hover:shadow-md transition-all text-left group cursor-pointer flex flex-col justify-between space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Leaf size={18} />
            </div>
            <div>
              <p className="text-xs font-black text-[#2C2723] group-hover:text-teal-700">Nuestras Plantas</p>
              <p className="text-[10px] text-gray-500 font-medium leading-tight">Riego y cuidados</p>
            </div>
          </button>

          {/* 7. Mascotas / Milo */}
          <button
            onClick={() => onChangeTab("mascotas")}
            className="p-3.5 bg-white rounded-2xl border-2 border-orange-150 hover:border-orange-400 hover:shadow-md transition-all text-left group cursor-pointer flex flex-col justify-between space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Dog size={18} />
            </div>
            <div>
              <p className="text-xs font-black text-[#2C2723] group-hover:text-orange-800">Mascotas / Milo</p>
              <p className="text-[10px] text-gray-500 font-medium leading-tight">Vacunas y comida</p>
            </div>
          </button>

          {/* 8. Salud & Ciclo */}
          <button
            onClick={() => onChangeTab("salud")}
            className="p-3.5 bg-white rounded-2xl border-2 border-pink-150 hover:border-pink-400 hover:shadow-md transition-all text-left group cursor-pointer flex flex-col justify-between space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-xs font-black text-[#2C2723] group-hover:text-pink-700">Salud y Ciclo</p>
              <p className="text-[10px] text-gray-500 font-medium leading-tight">Bienestar diario</p>
            </div>
          </button>

        </div>
      </div>


      {/* CONTENIDO PRINCIPAL EN 2 COLUMNAS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* COLUMNA IZQUIERDA: Frasco de Amor + Consejos & Recordatorios */}
        <div className="md:col-span-6 space-y-6">

          {/* 📸 CÁPSULA DE RECUERDOS ATESORADOS (ÚNICO PARA MAFE & BENJA) */}
          <div className="bg-gradient-to-br from-[#FFF9F5] via-white to-[#FDF4F5] rounded-3xl p-5 sm:p-6 border-4 border-[#F3E2D8] shadow-sm space-y-4 relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8D4C8] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl p-2 bg-amber-100/80 rounded-2xl">📸</span>
                <div>
                  <h3 className="font-extrabold text-[#2C2723] text-sm uppercase tracking-wider flex items-center gap-1.5">
                    Recuerdo Atesorado del Nido
                  </h3>
                  <p className="text-[10.5px] text-[#8A817C]">Un momento especial y único dedicado a ustedes</p>
                </div>
              </div>

              {/* Botones pestañas únicas para cada uno */}
              <div className="flex items-center gap-1 bg-[#FAF4EF] p-1 rounded-2xl border border-[#E8D4C8]">
                <button
                  type="button"
                  onClick={() => setMemoryTab("mafe")}
                  className={`text-xs font-black px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                    memoryTab === "mafe" ? "bg-rose-500 text-white shadow-xs" : "text-[#7C716A] hover:bg-white/60"
                  }`}
                >
                  Para Mafe 💖
                </button>
                <button
                  type="button"
                  onClick={() => setMemoryTab("benja")}
                  className={`text-xs font-black px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                    memoryTab === "benja" ? "bg-blue-600 text-white shadow-xs" : "text-[#7C716A] hover:bg-white/60"
                  }`}
                >
                  Para Benja 💙
                </button>
                <button
                  type="button"
                  onClick={() => setMemoryTab("ambos")}
                  className={`text-xs font-black px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                    memoryTab === "ambos" ? "bg-purple-600 text-white shadow-xs" : "text-[#7C716A] hover:bg-white/60"
                  }`}
                >
                  Los Dos 👩‍❤️‍👨
                </button>
              </div>
            </div>

            {/* Tarjeta Visual del Recuerdo o Estado Vacío */}
            {activeMemoryShowcase ? (
              <div className="bg-white rounded-2xl overflow-hidden border border-[#E8D4C8] shadow-2xs group flex flex-col sm:flex-row">
                <div className="sm:w-2/5 relative h-40 sm:h-auto overflow-hidden bg-slate-900 shrink-0">
                  <img 
                    src={activeMemoryShowcase.image} 
                    alt={activeMemoryShowcase.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 min-h-[120px]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {activeMemoryShowcase.owner}
                  </div>
                </div>

                <div className="p-4 sm:w-3/5 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] text-amber-800 font-extrabold uppercase">
                      <span>📅 {activeMemoryShowcase.date}</span>
                      <span>·</span>
                      <span>📍 {activeMemoryShowcase.location}</span>
                    </div>
                    <h4 className="text-sm font-black text-[#2C2723] mt-1 leading-snug">
                      {activeMemoryShowcase.title}
                    </h4>
                    <p className="text-xs text-[#5C5552] mt-1.5 leading-relaxed italic">
                      "{activeMemoryShowcase.description}"
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#F3E2D8] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#8A817C] font-semibold">
                        Recuerdo {(memoryIndex % filteredMemories.length) + 1} de {filteredMemories.length}
                      </span>
                      {filteredMemories.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setMemoryIndex(prev => prev + 1)}
                          className="text-[10px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 transition-colors cursor-pointer flex items-center gap-1"
                          title="Siguiente recuerdo registrado"
                        >
                          <span>Cambiar</span>
                          <RefreshCw size={10} />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => onChangeTab("recuerdos")}
                      className="text-xs font-extrabold text-amber-900 hover:text-amber-700 flex items-center gap-1 group cursor-pointer"
                    >
                      <span>Ver Álbum</span>
                      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 border border-[#E8D4C8] text-center space-y-3">
                <div className="w-10 h-10 mx-auto bg-amber-50 text-amber-800 rounded-2xl flex items-center justify-center text-xl font-black">
                  📸
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#2C2723]">Aún no hay recuerdos registrados</h4>
                  <p className="text-xs text-[#8A817C] mt-1 max-w-xs mx-auto">
                    Aún no han subido recuerdos al álbum del nido. Agreguen su primer momento especial para atesorarlo aquí.
                  </p>
                </div>
                <button
                  onClick={() => onChangeTab("recuerdos")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-900 hover:to-amber-950 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Registrar Primer Recuerdo</span>
                </button>
              </div>
            )}
          </div>

          {/* 💌 FRASES Y MENSAJES DE AMOR (EL FRASCO DE AMOR) */}
          <div className="bg-gradient-to-br from-[#FFF5F5] via-white to-[#FAF4EF] rounded-3xl p-5 sm:p-6 border-4 border-[#F7E1D7] shadow-sm space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#F2D0C1] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl p-2 bg-rose-100 rounded-2xl">💌</span>
                <div>
                  <h3 className="font-extrabold text-[#2C2723] text-sm uppercase tracking-wider flex items-center gap-1.5">
                    Mensajitos & Frases de Amor
                  </h3>
                  <p className="text-[10.5px] text-[#8A817C]">Déjense un detalle o pensamiento especial para hoy</p>
                </div>
              </div>
              <span className="text-xs font-extrabold bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full border border-rose-200">
                {frascoMessages.length} {frascoMessages.length === 1 ? 'papelito' : 'papelitos'}
              </span>
            </div>

            {/* Frase inspiradora destacada del día */}
            <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-3.5 border border-rose-200/60 shadow-2xs space-y-1">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-rose-700 flex items-center gap-1">
                <span>✨</span> Frase de Amor para Hoy:
              </span>
              <p className="text-xs text-[#5C5552] font-medium italic leading-relaxed">
                {todayLoveQuote}
              </p>
            </div>

            {/* Formulario para escribir una nota */}
            <form onSubmit={handleSendFrascoMessage} className="space-y-3 bg-white p-4 rounded-2xl border border-[#F2D0C1]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#8A817C] flex items-center gap-1">
                  <span>✍️</span> Escribir nota de {activeUser.name}:
                </label>
                <div className="flex items-center gap-1 flex-wrap">
                  {["💌", "❤️", "✨", "🌸", "🐾", "🌙", "☀️", "🥑", "🌈", "☕", "👑", "🧸", "🕊️", "💎", "🍀"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`text-xs p-1 rounded-lg transition-all cursor-pointer ${
                        selectedEmoji === emoji ? "bg-rose-100 scale-120 border border-rose-300 font-bold" : "hover:bg-gray-100 opacity-75 hover:opacity-100"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded-lg border border-rose-200 shrink-0">
                    <span className="text-[9px] font-extrabold text-rose-800">Emoji:</span>
                    <input
                      type="text"
                      value={selectedEmoji}
                      onChange={(e) => setSelectedEmoji(e.target.value)}
                      placeholder="emoji"
                      maxLength={4}
                      className="w-8 text-center text-xs font-extrabold bg-white border border-rose-300 rounded focus:outline-none focus:ring-1 focus:ring-rose-400 text-rose-900"
                    />
                  </div>
                </div>
              </div>

              <textarea
                ref={frascoInputRef}
                value={newFrascoText}
                onChange={(e) => setNewFrascoText(e.target.value)}
                placeholder={`Dejar un lindo mensaje para ${users.find(u => u.id !== activeUser.id)?.name || "tu pareja"} hoy...`}
                rows={2}
                className="w-full text-xs font-medium p-3 rounded-xl bg-[#FAF7F2] border border-[#E7E2D5] focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none text-[#2C2723]"
              />

              <div className="flex items-center justify-between">
                {frascoStatusMsg && (
                  <span className="text-[10.5px] font-extrabold text-emerald-700 animate-fade-in">
                    {frascoStatusMsg}
                  </span>
                )}
                <button
                  type="submit"
                  disabled={isSendingFrasco || !newFrascoText.trim()}
                  className="ml-auto bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Send size={12} />
                  <span>{isSendingFrasco ? "Guardando..." : "Enviar al Frasco"}</span>
                </button>
              </div>
            </form>

            {/* Lista de notas guardadas en el Frasco */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              <p className="text-[10px] font-extrabold text-[#8A817C] uppercase tracking-wider">
                Papelitos Atesorados en el Nido:
              </p>
              {frascoMessages.length === 0 ? (
                <div className="text-center py-6 bg-white/60 rounded-2xl border border-dashed border-rose-200">
                  <p className="text-xs text-rose-800 font-semibold">¡Aún no hay papelitos en el frasco!</p>
                  <p className="text-[10px] text-[#8A817C] mt-0.5">Escribe la primera nota para llenar el frasco de amor hoy. 💖</p>
                </div>
              ) : (
                [...frascoMessages].reverse().slice(0, 5).map((msg, idx) => {
                  const senderName = getUserName(msg.senderId);
                  return (
                    <div key={idx} className="bg-white p-3 rounded-2xl border border-[#F2D0C1] shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-extrabold text-rose-800 flex items-center gap-1">
                          <span>{msg.emoji || "💌"}</span> {senderName}:
                        </span>
                        <span className="text-gray-400 font-mono">
                          {msg.date ? new Date(msg.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "Hoy"}
                        </span>
                      </div>
                      <p className="text-xs text-[#2C2723] font-medium leading-relaxed">
                        "{msg.text}"
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>


        {/* COLUMNA DERECHA: Calendario de Hoy + Consejos del Nido + Esta Semana */}
        <div className="md:col-span-6 space-y-6">
          
          {/* 📅 CALENDARIO DE HOY */}
          <div className="bg-[#FAFDFB] rounded-3xl p-5 sm:p-6 border-4 border-green-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-green-800 text-sm tracking-wider uppercase flex items-center gap-2">
                📅 Eventos y Actividades de Hoy
              </h3>
              <span className="text-xs font-mono font-bold text-green-700 bg-white px-2.5 py-0.5 rounded-full border border-green-200">
                {new Date().toLocaleDateString("es-ES", { day: 'numeric', month: 'short' })}
              </span>
            </div>

            {itemsToday.length === 0 ? (
              <div className="text-center py-10 bg-white/80 rounded-2xl border-2 border-dashed border-green-200">
                <span className="text-4xl inline-block animate-bounce mb-2">🎉</span>
                <p className="text-sm font-black text-green-800">¡Sin pendientes agendados para hoy!</p>
                <p className="text-xs text-[#8A817C] mt-0.5 px-4">El nidito descansa y disfruta de un día tranquilo juntos. 🍃</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {itemsToday.map((item) => (
                  <div 
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition-all ${
                      item.status === 'done' 
                        ? "bg-gray-50 border-gray-150 opacity-65 text-gray-500" 
                        : item.type === 'event' 
                        ? "bg-blue-50/50 border-blue-200" 
                        : item.type === 'reminder' 
                        ? "bg-purple-50/50 border-purple-200" 
                        : "bg-green-50/50 border-green-200"
                    }`}
                  >
                    {item.type === "task" ? (
                      <button 
                        onClick={() => handleToggleTaskStatus(item)}
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 transition-all shrink-0 flex items-center justify-center cursor-pointer ${
                          item.status === 'done' 
                            ? "bg-green-500 border-green-500 text-white" 
                            : "border-gray-400 hover:border-green-500 bg-white"
                        }`}
                      >
                        {item.status === 'done' && <CheckCircle size={14} />}
                      </button>
                    ) : (
                      <span className="mt-1 text-sm shrink-0">
                        {item.type === 'event' ? (item.emoji || "📍") : "🐾"}
                      </span>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-extrabold leading-tight ${item.status === 'done' ? 'line-through text-gray-400' : 'text-[#2C2723]'}`}>
                        {item.title}
                      </p>
                      {item.description && (
                        <p className={`text-[10px] mt-0.5 truncate ${item.status === 'done' ? 'text-gray-400' : 'text-[#625B57]'}`}>
                          {item.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                        {item.endDate ? (
                          <span className="text-[9px] font-mono font-bold bg-amber-50 text-[#8C5D23] px-1.5 py-0.5 rounded border border-amber-100 flex items-center gap-0.5">
                            📅 {item.date} {item.time && `(${item.time})`} ➔ {item.endDate} {item.endTime && `(${item.endTime})`}
                          </span>
                        ) : (
                          item.time && (
                            <span className="text-[9px] font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-gray-100 text-[#625B57]">
                              {item.time}
                            </span>
                          )
                        )}
                        <span className="text-[9px] font-semibold opacity-65 font-sans">
                          {item.assignedTo === 'home' ? '🏠 Hogar' : `👤 ${getUserName(item.assignedTo)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🏡 CONSEJOS Y RECORDATORIOS DEL HOGAR (DEBAJO DEL CALENDARIO) */}
          <div className="bg-[#FAF9F5] p-5 sm:p-6 rounded-3xl border-4 border-[#F3EFE6] relative overflow-hidden space-y-3 shadow-2xs">
            <div>
              <h4 className="font-extrabold text-[#2C2723] text-xs uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <Bell size={14} /> Consejos y Recordatorios del Hogar
              </h4>
              <p className="text-[10px] text-gray-500 mt-0.5">Alertas urgentes y sugerencias del asistente Milo:</p>
            </div>
            
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {systemAlerts.length === 0 ? (
                <div className="text-xs text-emerald-800 italic font-medium flex items-center gap-2 bg-white p-3 rounded-2xl border border-emerald-100">
                  <span>🌸</span>
                  <span>¡Todo está en perfecto orden miau! Ningún pendiente urgente para hoy.</span>
                </div>
              ) : (
                systemAlerts.map((alert) => (
                  <div key={alert.id} className="flex gap-2.5 bg-white p-3 rounded-2xl border border-[#FAEDE2] text-xs text-[#5C5552] items-center shadow-2xs">
                    <span className="shrink-0 text-base">{alert.message.startsWith("⚠️") ? "⚠️" : alert.message.startsWith("🐾") ? "🐾" : "📅"}</span>
                    <span className="font-bold leading-normal">{alert.message.replace(/^⚠️ |^🐾 |^📅 /, "")}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 📆 ESTA SEMANA EN EL NIDO */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border-4 border-[#F3EFE6] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-[#625B57] text-sm tracking-wider uppercase flex items-center gap-2">
                📆 Esta Semana en el Nido
              </h3>
              <button 
                onClick={() => onChangeTab("calendario")}
                className="text-xs font-extrabold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-sans"
              >
                Ver completo <ArrowRight size={12} />
              </button>
            </div>

            {weeklySummaryItems.length === 0 ? (
              <p className="text-xs text-[#8A817C] italic py-4 text-center bg-[#FAF7F2] rounded-2xl border border-[#F3EFE6]">
                No hay más actividades programadas para el resto de la semana. 🌻
              </p>
            ) : (
              <div className="space-y-2">
                {weeklySummaryItems.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-2.5 bg-[#FAF7F2] rounded-xl border border-[#FAF7F2] hover:border-[#E7E2D5] text-xs font-sans"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-11 py-1 text-center font-bold bg-[#EAE5D9] text-[#2C2723] rounded-lg leading-tight shrink-0 font-mono">
                        <div className="text-[9px] uppercase tracking-wider opacity-65">{getDayName(item.date)}</div>
                        <div className="text-xs font-extrabold">{new Date(item.date + "T00:00:00").getDate()}</div>
                      </div>
                      
                      <div className="truncate min-w-0">
                        <p className="font-extrabold text-[#2C2723] truncate">{item.title}</p>
                        <p className="text-[10.5px] text-[#625B57] truncate mt-0.5">
                          {item.type === 'event' ? '📍 Evento' : item.type === 'task' ? '✅ Tarea' : '🐾 Recordatorio'}
                        </p>
                      </div>
                    </div>
                    
                    <span className="text-[10px] text-amber-700 font-bold shrink-0 font-mono italic ml-2">
                      {item.endDate ? `hasta ${item.endDate.split('-').slice(1).join('-')}` : (item.time || "todo el día")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
