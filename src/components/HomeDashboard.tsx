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

  let activeUser = users[0] || { id: "mafe", name: "Mafe" };
  if (activeUserId) {
    for (const candidate of users) {
      if (candidate?.id === activeUserId) {
        activeUser = candidate;
        break;
      }
    }
  }

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
    for (const user of users) {
      if (user?.id === id) return user.name;
    }
    return id;
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
...