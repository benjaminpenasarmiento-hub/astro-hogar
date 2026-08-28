import { 
  CalendarItem, 
  Pet, 
  Plant, 
  Wish, 
  Memory, 
  HomeDocument, 
  Home, 
  UserProfile, 
  ChatMessage,
  PlantDiagnosis,
  UserId,
  DailyEmotionalCheckin,
  AstroProfile,
  HomePersonalityState,
  BudgetItem,
  BudgetEstimate,
  BudgetTemplate,
  BudgetAccount,
  HomeNotification,
  EmotionCheckin,
  CustomEmotion,
  ClosetGarment,
  ClosetCategory,
  SavedOutfit,
  WornOutfitLog
} from "./types";
import { calculateSolarTimes } from "./utils/solarCalculator";

const BASE_URL = "/api";

// Transparent wrapper to inject active home's access code and user context headers without modifying the global window.fetch
async function customFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const code = typeof window !== "undefined" ? (localStorage.getItem("astro_home_code") || "") : "";
  const uid = typeof window !== "undefined" ? (localStorage.getItem("astro_user_id") || "") : "";
  
  const newInit: RequestInit = init ? { ...init } : {};
  
  if (code) {
    let headers: Record<string, string> = {};
    if (newInit.headers) {
      if (newInit.headers instanceof Headers) {
        newInit.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(newInit.headers)) {
        newInit.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        headers = { ...(newInit.headers as Record<string, string>) };
      }
    }
    headers["x-home-code"] = code;
    if (uid) {
      headers["x-user-id"] = uid;
    }
    newInit.headers = headers;
  }
  
  const originalFetch = window.fetch;
  return originalFetch(input, newInit);
}

// Shadow standard fetch with our custom wrapper containing session telemetry
const fetch = customFetch;

export async function fetchHomeData(): Promise<{
  home: Home;
  users: UserProfile[];
  calendarItems: CalendarItem[];
  pets: Pet[];
  plants: Plant[];
  wishes: Wish[];
  memories: Memory[];
  documents: HomeDocument[];
  notifications?: HomeNotification[];
}> {
  const res = await fetch(`${BASE_URL}/home-data`);
  if (!res.ok) throw new Error("Error fetching status from nest");
  return res.json();
}

export async function rescueHomeData(): Promise<{ success: boolean; rescuedCount: number; message: string; store: any }> {
  const res = await fetch(`${BASE_URL}/rescue-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) throw new Error("Error en rescate de datos");
  return res.json();
}

export async function fetchAuditLogs(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/audit-logs`);
  if (!res.ok) return [];
  return res.json();
}

// Backup Management API
export async function createBackupNow(reason: string = "Manual desde Ajustes"): Promise<{
  success: boolean;
  filename: string;
  sizeFormatted: string;
  totalBackups: number;
  appVersion: string;
  schemaVersion: number;
  message: string;
}> {
  const res = await fetch(`${BASE_URL}/backup/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Error al crear la copia de seguridad");
  }
  return res.json();
}

export async function fetchBackupsList(): Promise<{
  success: boolean;
  backups: Array<{
    filename: string;
    createdAt: string;
    sizeFormatted: string;
    isLatest: boolean;
    appVersion: string;
    schemaVersion: number;
    requiresMigration: boolean;
  }>;
  total: number;
  currentAppVersion?: string;
  currentSchemaVersion?: number;
}> {
  const res = await fetch(`${BASE_URL}/backup/list`);
  if (!res.ok) throw new Error("Error al consultar la lista de copias de seguridad");
  return res.json();
}

export async function restoreBackupFile(filename: string): Promise<{
  success: boolean;
  message: string;
  filename: string;
  restoredAt: string;
  appVersion?: string;
  schemaVersion?: number;
  wasMigrated?: boolean;
}> {
  const res = await fetch(`${BASE_URL}/backup/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Error al restaurar desde la copia de seguridad");
  }
  return res.json();
}

// Calendar API
export async function createCalendarItem(item: Omit<CalendarItem, "id">): Promise<CalendarItem> {
  const res = await fetch(`${BASE_URL}/calendar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  return res.json();
}

export async function updateCalendarItem(id: string, updates: Partial<CalendarItem>): Promise<CalendarItem> {
  const res = await fetch(`${BASE_URL}/calendar/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function deleteCalendarItem(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/calendar/${id}`, {
    method: "DELETE",
  });
  return res.json();
}

// Pets API
export async function createPet(pet: Omit<Pet, "id" | "medical">): Promise<Pet> {
  const res = await fetch(`${BASE_URL}/pets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pet),
  });
  return res.json();
}

export async function updatePet(id: string, updates: Partial<Pet>): Promise<Pet> {
  const res = await fetch(`${BASE_URL}/pets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function deletePet(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/pets/${id}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function addPetVaccine(petId: string, vaccine: { name: string; date: string; nextDueDate?: string; notes?: string }): Promise<Pet> {
  const res = await fetch(`${BASE_URL}/pets/${petId}/vaccine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vaccine),
  });
  return res.json();
}

export async function addPetMedication(petId: string, med: { name: string; dosage: string; schedule: string; startDate: string; endDate?: string }): Promise<Pet> {
  const res = await fetch(`${BASE_URL}/pets/${petId}/medication`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(med),
  });
  return res.json();
}

export async function logPetWeight(petId: string, weight: number): Promise<Pet> {
  const res = await fetch(`${BASE_URL}/pets/${petId}/weight`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weight }),
  });
  return res.json();
}

// Plants API
export async function createPlant(plant: Omit<Plant, "id" | "careHistory" | "aiDiagnoses">): Promise<Plant> {
  const res = await fetch(`${BASE_URL}/plants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plant),
  });
  return res.json();
}

export async function deletePlant(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/plants/${id}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function updatePlant(id: string, updates: Partial<Plant>): Promise<Plant> {
  const res = await fetch(`${BASE_URL}/plants/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function identifyPlantWithAi(plantId: string): Promise<Plant> {
  const res = await fetch(`${BASE_URL}/plants/${plantId}/identify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) throw new Error("Error identificando especie de la planta");
  return res.json();
}

export async function analyzePlantsWithMilo(): Promise<{
  success: boolean;
  message: string;
  analyzedCount: number;
  unknownCount: number;
  identifiedCount: number;
  plants: Plant[];
}> {
  const res = await fetch(`${BASE_URL}/plants/milo-analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) throw new Error("Error ejecutando análisis de plantas con Milo");
  return res.json();
}

export async function addPlantAction(plantId: string, type: "water" | "fertilize" | "prune" | "repot" | "photo", performedBy: UserId): Promise<Plant> {
  const res = await fetch(`${BASE_URL}/plants/${plantId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, performedBy }),
  });
  return res.json();
}

export async function bulkPlantAction(ids: string[], type: "water" | "fertilize" | "prune", performedBy: UserId): Promise<Plant[]> {
  const res = await fetch(`${BASE_URL}/plants/bulk-action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, type, performedBy }),
  });
  return res.json();
}

// Wishes API
export async function createWish(wish: Omit<Wish, "id">): Promise<Wish> {
  const res = await fetch(`${BASE_URL}/wishes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(wish),
  });
  return res.json();
}

export async function updateWish(id: string, updates: Partial<Wish>): Promise<Wish> {
  const res = await fetch(`${BASE_URL}/wishes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function deleteWish(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/wishes/${id}`, {
    method: "DELETE",
  });
  return res.json();
}

// Memories API
export async function createMemory(memory: Omit<Memory, "id">): Promise<Memory> {
  const res = await fetch(`${BASE_URL}/memories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(memory),
  });
  return res.json();
}

export async function updateMemory(id: string, updates: Partial<Memory>): Promise<Memory> {
  const res = await fetch(`${BASE_URL}/memories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function deleteMemory(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/memories/${id}`, {
    method: "DELETE",
  });
  return res.json();
}

// Documents API
export async function createDocument(doc: Omit<HomeDocument, "id" | "dateUploaded">): Promise<HomeDocument> {
  const res = await fetch(`${BASE_URL}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc),
  });
  return res.json();
}

export async function deleteDocument(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/documents/${id}`, {
    method: "DELETE",
  });
  return res.json();
}

// Settings API
export async function updateHomeSettings(updates: Partial<Home>): Promise<Home> {
  const res = await fetch(`${BASE_URL}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return res.json();
}

// Gemini AI endpoints
export interface MiloHomeContextState {
  timeOfDay: "morning" | "afternoon" | "evening";
  dailyGreeting: string;
  weather: {
    city: string;
    temp: string;
    feelsLike: string;
    desc: string;
    probRain: string;
    wind: string;
    humidity: string;
    icon: string;
    gradient: string;
    miloAdvice: string;
    sunrise: string;
    sunset: string;
    sunlightHours: string;
    forecast: {
      morning: { temp: string; rain: string; icon: string };
      afternoon: { temp: string; rain: string; icon: string };
      night: { temp: string; rain: string; icon: string };
    };
  };
  moon: {
    phaseName: string;
    phaseEmoji: string;
    fullPhaseText: string;
    age: number;
    illuminationPct?: number;
    nextNewMoonText?: string;
    meaning: string;
  };
  briefing: {
    todayTasksTotal: number;
    pendingTasksCount: number;
    completedTasksCount: number;
    alertsCount: number;
    alerts: string[];
    summaryText: string;
  };
  harmonyScore: number;
  lastUpdated: string;
  homeSummary?: any;
}

export async function initializeMiloHomeContext(refresh?: boolean): Promise<MiloHomeContextState> {
  try {
    const url = `${BASE_URL}/ai/init-home-state${refresh ? "?refresh=true" : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch (err) {
    const solar = calculateSolarTimes(new Date());
    return {
      timeOfDay: "morning",
      dailyGreeting: "¡Hola Mafe & Benja! Les deseo un día hermoso, tranquilo y lleno de amor en el nido 🐾🏡✨.",
      weather: {
        city: "Bogotá, D.C.",
        temp: "15°C",
        feelsLike: "14°C",
        desc: "Cielo parcialmente nublado · Sabana de Bogotá",
        probRain: "35%",
        wind: "12 km/h",
        humidity: "72%",
        icon: "⛅",
        gradient: "from-sky-50 to-blue-100",
        miloAdvice: "Clima fresco en Bogotá. Ideal para disfrutar juntos un café calientito.",
        sunrise: solar.sunrise,
        sunset: solar.sunset,
        sunlightHours: solar.sunlightHours,
        forecast: {
          morning: { temp: "13°C", rain: "20%", icon: "⛅" },
          afternoon: { temp: "18°C", rain: "50%", icon: "🌧️" },
          night: { temp: "12°C", rain: "15%", icon: "🌙" }
        }
      },
      moon: {
        phaseName: "Luna Menguante",
        phaseEmoji: "🌘",
        fullPhaseText: "Luna Menguante 🌘",
        age: 22,
        meaning: "Sintoniza con la paz del nido y reflexiona en armonía."
      },
      briefing: {
        todayTasksTotal: 0,
        pendingTasksCount: 0,
        completedTasksCount: 0,
        alertsCount: 0,
        alerts: [],
        summaryText: "Todo el nido está en completa paz y orden hoy."
      },
      harmonyScore: 95,
      lastUpdated: new Date().toISOString()
    };
  }
}

export async function getMiloDailyStatus(): Promise<{ updatedToday: boolean; todayDate: string; lastUpdate: MiloHomeContextState | null }> {
  try {
    const res = await fetch(`${BASE_URL}/ai/milo-daily-status`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return { updatedToday: false, todayDate: new Date().toISOString().split("T")[0], lastUpdate: null };
  }
}

export async function updateMiloDailyContext(force?: boolean): Promise<{ success: boolean; updatedToday: boolean; data: MiloHomeContextState } | null> {
  try {
    const res = await fetch(`${BASE_URL}/ai/update-milo-daily-context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: !!force })
    });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return null;
  }
}

export async function getDailyAiGreeting(timeOfDay: "morning" | "afternoon" | "evening", refresh?: boolean): Promise<string> {
  try {
    const url = `${BASE_URL}/ai/daily-greeting?timeOfDay=${timeOfDay}${refresh ? "&refresh=true" : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.message;
  } catch (err) {
    return "¡Hola Mafe & Benja! Les deseo un día hermoso, tranquilo y lleno de amor en el nido 🐾🏡✨.";
  }
}

export async function getAiHoroscope(regenerate?: boolean): Promise<any> {
  try {
    const url = regenerate ? `${BASE_URL}/ai/horoscope?regenerate=true` : `${BASE_URL}/ai/horoscope`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch (err) {
    return {
      mafe: {
        prediction: "Las vibras miau-estelares sugieren que hoy debes consentir tus plantas. Tus raíces están fuertes y llenas de amor.",
        advice: "Bebe algo calientito al atardecer y comparte un ronroneo tierno."
      },
      benja: {
        prediction: "El cosmos activa tus ideas vanguardistas. Es un día perfecto para organizar tus prioridades compartidas con una sonrisa.",
        advice: "Estira las patitas con frecuencia y no pases todo el día pegado a las pantallas."
      }
    };
  }
}

export async function getAiMoonInfo(): Promise<{ phase: string; age: number; illuminationPct?: number; nextNewMoonText?: string; meaning: string }> {
  try {
    const res = await fetch(`${BASE_URL}/ai/moon-info`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch (err) {
    return {
      phase: "Luna Menguante 🌘",
      age: 22,
      illuminationPct: 48,
      nextNewMoonText: "En 8 días 🌑",
      meaning: "Un tiempo propicio para conectar con la paz del nido y reflexionar sobre nuestros propósitos de vida en pareja."
    };
  }
}

export async function askGatitoChat(messages: ChatMessage[], extraContext?: any): Promise<string> {
  try {
    const res = await fetch(`${BASE_URL}/ai/cat-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, extraContext }),
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.response;
  } catch (err) {
    return "¡Miau, perdón! Se me enredó la lana de la conexión. ¿Me lo repites con un cariñito en la cabecita? 🐾🐱";
  }
}

export async function diagnosePlantWithAi(plantId: string, imageBase64: string): Promise<{
  diagnosis: PlantDiagnosis;
  plant: Plant;
}> {
  const res = await fetch(`${BASE_URL}/ai/plant-diagnosis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plantId, imageBase64 }),
  });
  if (!res.ok) throw new Error("Error en diagnóstico vegetal");
  return res.json();
}

export async function createHomeOnboarding(payload: {
  homeName: string;
  userName: string;
  email?: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  emoji?: string;
}): Promise<{ home: Home; user: UserProfile }> {
  const res = await fetch(`${BASE_URL}/onboarding/create-home`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Error creating home onboarding");
  return res.json();
}

export async function joinHomeOnboarding(payload: {
  inviteCode: string;
  userName: string;
  email?: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  emoji?: string;
}): Promise<{ home: Home; user: UserProfile }> {
  const res = await fetch(`${BASE_URL}/onboarding/join-home`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-home-code": payload.inviteCode
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Ocurrió un error al unir al hogar.");
  }
  return res.json();
}

export async function updateUserProfile(
  userId: string,
  payload: {
    name: string;
    email?: string;
    birthDate: string;
    birthTime: string;
    birthPlace: string;
    emoji: string;
    pushToken?: string;
    alertPreferences?: {
      sintoniaReminders?: boolean;
      petVaccines?: boolean;
      plantCare?: boolean;
      budgetAlerts?: boolean;
      calendarEvents?: boolean;
      systemAlerts?: boolean;
      menstrualCycle?: boolean;
      completedGoals?: boolean;
    };
  }
): Promise<UserProfile> {
  const res = await fetch(`${BASE_URL}/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Error updating user profile");
  return res.json();
}

export async function resetDatabaseOnboarding(): Promise<{ success: boolean; store: any }> {
  const res = await fetch(`${BASE_URL}/onboarding/reset`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Error performing factory reset");
  return res.json();
}

// Check-ins & Astro Personality Engine endpoints

export async function fetchCheckins(date?: string): Promise<DailyEmotionalCheckin[]> {
  const url = date ? `${BASE_URL}/checkins?date=${encodeURIComponent(date)}` : `${BASE_URL}/checkins`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error fetching checkins");
  return res.json();
}

export async function submitCheckin(checkin: Omit<DailyEmotionalCheckin, "id">): Promise<{ checkin: DailyEmotionalCheckin; personalityState: HomePersonalityState }> {
  const res = await fetch(`${BASE_URL}/checkins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(checkin),
  });
  if (!res.ok) throw new Error("Error submitting checkin");
  return res.json();
}

export async function fetchAstroProfile(userId: string, date?: string): Promise<AstroProfile> {
  const url = date ? `${BASE_URL}/ai/astro-profile/${encodeURIComponent(userId)}?date=${encodeURIComponent(date)}` : `${BASE_URL}/ai/astro-profile/${encodeURIComponent(userId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error fetching astro profile");
  return res.json();
}

export async function fetchHomePersonality(date?: string): Promise<HomePersonalityState> {
  const url = date ? `${BASE_URL}/ai/home-personality?date=${encodeURIComponent(date)}` : `${BASE_URL}/ai/home-personality`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error fetching home personality");
  return res.json();
}

// Sintonía Map (Mapa de Emociones) API
export async function fetchSintoniaCheckins(): Promise<EmotionCheckin[]> {
  const res = await fetch(`${BASE_URL}/sintonia/checkins`);
  if (!res.ok) throw new Error("Error fetching sintonía checkins");
  return res.json();
}

export async function saveSintoniaCheckins(checkins: EmotionCheckin[]): Promise<EmotionCheckin[]> {
  const res = await fetch(`${BASE_URL}/sintonia/checkins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ checkins }),
  });
  if (!res.ok) throw new Error("Error saving sintonía checkins");
  return res.json();
}

export async function fetchCustomEmotions(): Promise<CustomEmotion[]> {
  const res = await fetch(`${BASE_URL}/sintonia/custom-emotions`);
  if (!res.ok) throw new Error("Error fetching custom emotions");
  return res.json();
}

export async function saveCustomEmotionsApi(customEmotions: CustomEmotion[]): Promise<CustomEmotion[]> {
  const res = await fetch(`${BASE_URL}/sintonia/custom-emotions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customEmotions }),
  });
  if (!res.ok) throw new Error("Error saving custom emotions");
  return res.json();
}

export async function fetchBudgetStore(): Promise<{
  items: BudgetItem[];
  estimates: BudgetEstimate[];
  templates: BudgetTemplate[];
  accounts: BudgetAccount[];
  closedFortnights?: string[];
}> {
  const res = await fetch(`${BASE_URL}/budget`);
  if (!res.ok) throw new Error("Error fetching budget store");
  return res.json();
}

export async function clearBudgetStoreApi(): Promise<{
  success: boolean;
  items: BudgetItem[];
  estimates: BudgetEstimate[];
  templates: BudgetTemplate[];
  accounts: BudgetAccount[];
  closedFortnights: string[];
}> {
  const res = await fetch(`${BASE_URL}/budget/clear`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) throw new Error("Error clearing budget store");
  return res.json();
}

export async function closeFortnight(payload: {
  fortnightId: string;
  nextFortnightId: string;
  leftoverAmount: number;
  targetAccount: string;
}): Promise<{ success: boolean; closedFortnights: string[] }> {
  const res = await fetch(`${BASE_URL}/budget/fortnight/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Error closing fortnight");
  return res.json();
}

export async function openFortnight(payload: {
  fortnightId: string;
}): Promise<{ success: boolean; closedFortnights: string[] }> {
  const res = await fetch(`${BASE_URL}/budget/fortnight/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Error opening/unlocking fortnight");
  return res.json();
}

export async function createBudgetItem(item: Omit<BudgetItem, "id">): Promise<BudgetItem> {
  const res = await fetch(`${BASE_URL}/budget/item`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Error al crear el movimiento");
  }
  return res.json();
}

export async function updateBudgetItem(id: string, updates: Partial<BudgetItem>): Promise<BudgetItem> {
  const res = await fetch(`${BASE_URL}/budget/item/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Error updating budget item");
  }
  return res.json();
}

export async function deleteBudgetItem(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/budget/item/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Error deleting budget item");
  return res.json();
}

export async function createBudgetTemplate(template: Omit<BudgetTemplate, "id">): Promise<BudgetTemplate> {
  const res = await fetch(`${BASE_URL}/budget/template`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(template),
  });
  if (!res.ok) throw new Error("Error creating budget template");
  return res.json();
}

export async function updateBudgetTemplate(id: string, template: Omit<BudgetTemplate, "id">): Promise<BudgetTemplate> {
  const res = await fetch(`${BASE_URL}/budget/template/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(template),
  });
  if (!res.ok) throw new Error("Error updating budget template");
  return res.json();
}

export async function deleteBudgetTemplate(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/budget/template/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Error deleting budget template");
  return res.json();
}

export async function applyBudgetTemplate(templateId: string, fortnightId: string): Promise<{ success: boolean; estimates: BudgetEstimate[] }> {
  const res = await fetch(`${BASE_URL}/budget/template/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateId, fortnightId }),
  });
  if (!res.ok) throw new Error("Error applying budget template");
  return res.json();
}

export async function createBudgetAccount(account: Omit<BudgetAccount, "id" | "createdAt">): Promise<BudgetAccount> {
  const res = await fetch(`${BASE_URL}/budget/account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(account),
  });
  if (!res.ok) throw new Error("Error creating budget account");
  return res.json();
}

export async function deleteBudgetAccount(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/budget/account/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Error deleting budget account");
  return res.json();
}

// ==========================================
// SALUD DEL HOGAR (HOME WELLNESS) CLIENT API
// ==========================================

export interface SaludHogarResponse {
  date: string;
  weekStartDate: string;
  questions: any[];
  challenges: any[];
  indicators: {
    conexion: number;
    armonia: number;
    bienestar: number;
  };
  answers: any[];
  frascoMessages: any[];
  cierresMensuales: any[];
}

export async function fetchSaludHogarData(date?: string, forceReflexion: boolean = false): Promise<SaludHogarResponse> {
  const queryParams = new URLSearchParams();
  if (date) queryParams.append("date", date);
  if (forceReflexion) queryParams.append("forceReflexion", "true");

  const res = await fetch(`${BASE_URL}/salud-hogar?${queryParams.toString()}`);
  if (!res.ok) throw new Error("Error al obtener la información de Salud del Hogar");
  return res.json();
}

export async function submitSaludAnswer(answer: {
  questionId: string;
  category: "conexion" | "armonia" | "bienestar" | "reflexion";
  userId: UserId;
  score?: number;
  textResponse?: string;
  date: string;
}): Promise<{ success: boolean; answer: any; indicators: any }> {
  const res = await fetch(`${BASE_URL}/salud-hogar/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(answer),
  });
  if (!res.ok) throw new Error("Error al enviar la respuesta de bienestar");
  return res.json();
}

export async function toggleSaludChallenge(
  id: string,
  userId: UserId,
  completed: boolean
): Promise<{ success: boolean; challenge: any; indicators: any }> {
  const res = await fetch(`${BASE_URL}/salud-hogar/challenge/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, userId, completed }),
  });
  if (!res.ok) throw new Error("Error al actualizar reto");
  return res.json();
}

export async function createCustomSaludChallenge(
  weekStartDate: string,
  title: string,
  category: "conexion" | "armonia" | "bienestar"
): Promise<{ success: boolean; challenge: any; indicators: any }> {
  const res = await fetch(`${BASE_URL}/salud-hogar/challenge/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weekStartDate, title, category }),
  });
  if (!res.ok) throw new Error("Error al agregar reto personalizado");
  return res.json();
}

export async function submitFrascoMessage(
  senderId: UserId,
  text: string,
  emoji?: string
): Promise<{ success: boolean; message: any }> {
  const res = await fetch(`${BASE_URL}/salud-hogar/frasco`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ senderId, text, emoji }),
  });
  if (!res.ok) throw new Error("Error al enviar papelito al frasco");
  return res.json();
}

export async function closeSaludMonth(month: string): Promise<{ success: boolean; cierre: any }> {
  const res = await fetch(`${BASE_URL}/salud-hogar/cierre-mensual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ month }),
  });
  if (!res.ok) throw new Error("Error al realizar el cierre mensual astro-emocional");
  return res.json();
}

export async function fetchDailySummary(date: string): Promise<{ hasSummary: boolean; alignmentScore?: number; textResponse?: string; answersCount?: number; message?: string }> {
  const res = await fetch(`${BASE_URL}/salud-hogar/resumen-diario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date }),
  });
  if (!res.ok) throw new Error("Error al obtener el resumen diario de sintonía");
  return res.json();
}

export async function enterHomeByCode(homeCode: string): Promise<{ home: Home; users: UserProfile[] }> {
  const res = await fetch(`${BASE_URL}/onboarding/enter-home`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ homeCode }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Código de hogar no encontrado o inválido.");
  }
  return res.json();
}

// ==========================================
// EJERCICIO / WORKOUT CLIENT-SIDE APIS
// ==========================================

export async function fetchWorkoutLogs(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/workout/logs`);
  if (!res.ok) throw new Error("Error al obtener los registros de ejercicio");
  return res.json();
}

export async function createWorkoutLog(log: {
  date: string;
  weightsUsed: string;
  repsDone: string;
  rpe: number;
  generalEnergy: number;
  feelingsText: string;
  workoutType?: string;
  userId?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/workout/log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(log),
  });
  if (!res.ok) throw new Error("Error al crear el registro de ejercicio");
  return res.json();
}

export async function removeWorkoutLog(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/workout/log/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error al eliminar el registro de ejercicio");
  return res.json();
}

// ROUTINES
export async function fetchWorkoutRoutines(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/workout/routines`);
  if (!res.ok) throw new Error("Error al obtener las rutinas");
  return res.json();
}

export async function saveWorkoutRoutineApi(routine: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/workout/routine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(routine)
  });
  if (!res.ok) throw new Error("Error al guardar la rutina");
  return res.json();
}

export async function deleteWorkoutRoutineApi(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/workout/routine/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error al eliminar la rutina");
  return res.json();
}

// DETAILED LOGS
export async function fetchWorkoutDetailedLogs(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/workout/detailed-logs`);
  if (!res.ok) throw new Error("Error al obtener el historial de entrenamientos");
  return res.json();
}

export async function saveWorkoutDetailedLogApi(log: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/workout/detailed-log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(log)
  });
  if (!res.ok) throw new Error("Error al guardar el entrenamiento");
  return res.json();
}

export async function deleteWorkoutDetailedLogApi(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/workout/detailed-log/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error al eliminar el registro");
  return res.json();
}

// BODY METRICS
export async function fetchBodyMetrics(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/workout/body-metrics`);
  if (!res.ok) throw new Error("Error al obtener medidas corporales");
  return res.json();
}

export async function saveBodyMetricApi(metric: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/workout/body-metric`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metric)
  });
  if (!res.ok) throw new Error("Error al guardar la medida corporal");
  return res.json();
}

export async function deleteBodyMetricApi(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/workout/body-metric/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error al eliminar medida corporal");
  return res.json();
}

// PERSONAL RECORDS
export async function fetchPersonalRecords(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/workout/prs`);
  if (!res.ok) throw new Error("Error al obtener récords personales");
  return res.json();
}

export async function savePersonalRecordApi(pr: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/workout/pr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pr)
  });
  if (!res.ok) throw new Error("Error al guardar récord personal");
  return res.json();
}

// CUSTOM EXERCISES
export async function fetchCustomExercises(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/workout/custom-exercises`);
  if (!res.ok) throw new Error("Error al obtener ejercicios personalizados");
  return res.json();
}

export async function saveCustomExerciseApi(ex: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/workout/custom-exercise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ex)
  });
  if (!res.ok) throw new Error("Error al guardar ejercicio personalizado");
  return res.json();
}

export async function deleteCustomExerciseApi(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/workout/custom-exercise/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error al eliminar ejercicio personalizado");
  return res.json();
}

export async function sendCoachMessage(
  message: string, 
  history: { role: "user" | "model"; text: string }[],
  profile?: any,
  aiPlan?: any
): Promise<{ reply: string }> {
  const res = await fetch(`${BASE_URL}/coach/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, profile, aiPlan }),
  });
  if (!res.ok) throw new Error("Error de conexión con el coach");
  return res.json();
}

export async function evaluateCoachPhysical(answers: {
  objective: string;
  peso: number;
  altura: number;
  experience: string;
  activity: string;
  medical: string;
  equipment: string;
  days: number;
  duration: string;
  medidas?: any;
  likesExercises?: string;
  dislikesExercises?: string;
}): Promise<{
  summary: string;
  nutritionalFocus: string;
  routines: Array<{
    id: string;
    name: string;
    focus: string;
    exercises: Array<{
      name: string;
      series: string;
      adaptation: string;
      description: string;
    }>;
  }>;
  generalAdvice: string;
}> {
  const res = await fetch(`${BASE_URL}/coach/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw new Error("Error en la evaluación del coach");
  return res.json();
}

export async function reportErrorLog(errorMessage: string, errorStack?: string, context?: any): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${BASE_URL}/error-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        errorMessage,
        errorStack: errorStack || "",
        context: context || {}
      })
    });
    return res.json();
  } catch (err) {
    console.error("Failed to report error log locally:", err);
    return { success: false };
  }
}

export async function getExerciseVisual(
  exerciseName: string,
  description?: string,
  adaptation?: string
): Promise<{ svg: string; instructions: string[]; muscles: string[] }> {
  const res = await fetch(`${BASE_URL}/coach/exercise-visual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exerciseName, description, adaptation }),
  });
  if (!res.ok) throw new Error("Error al obtener la visual del ejercicio");
  return res.json();
}

export async function markNotificationsAsRead(ids: string[]): Promise<{ success: boolean; notifications: HomeNotification[] }> {
  const res = await fetch(`${BASE_URL}/notifications/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  return res.json();
}

export async function clearNotifications(): Promise<{ success: boolean; notifications: HomeNotification[] }> {
  const res = await fetch(`${BASE_URL}/notifications/clear`, {
    method: "POST",
  });
  return res.json();
}

// ==========================================
// CLOSET / ARMARIO DIGITAL API HELPERS
// ==========================================

export async function fetchClosetGarments(): Promise<ClosetGarment[]> {
  const res = await fetch(`${BASE_URL}/closet/garments`);
  if (!res.ok) throw new Error("Error al obtener prendas del closet");
  return res.json();
}

export async function saveClosetGarment(garment: Partial<ClosetGarment>): Promise<{ success: boolean; garment: ClosetGarment }> {
  const res = await fetch(`${BASE_URL}/closet/garments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(garment),
  });
  if (!res.ok) throw new Error("Error al guardar prenda");
  return res.json();
}

export async function deleteClosetGarment(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/closet/garments/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Error al eliminar prenda");
  return res.json();
}

export async function fetchClosetCategories(): Promise<ClosetCategory[]> {
  const res = await fetch(`${BASE_URL}/closet/categories`);
  if (!res.ok) throw new Error("Error al obtener categorías del closet");
  return res.json();
}

export async function saveClosetCategory(category: Partial<ClosetCategory>): Promise<{ success: boolean; category: ClosetCategory }> {
  const res = await fetch(`${BASE_URL}/closet/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(category),
  });
  if (!res.ok) throw new Error("Error al guardar categoría");
  return res.json();
}

export async function deleteClosetCategory(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/closet/categories/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Error al eliminar categoría");
  return res.json();
}

export async function fetchSavedOutfits(): Promise<SavedOutfit[]> {
  const res = await fetch(`${BASE_URL}/closet/outfits`);
  if (!res.ok) throw new Error("Error al obtener outfits guardados");
  return res.json();
}

export async function saveSavedOutfit(outfit: Partial<SavedOutfit>): Promise<{ success: boolean; outfit: SavedOutfit }> {
  const res = await fetch(`${BASE_URL}/closet/outfits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(outfit),
  });
  if (!res.ok) throw new Error("Error al guardar outfit");
  return res.json();
}

export async function deleteSavedOutfit(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/closet/outfits/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Error al eliminar outfit");
  return res.json();
}

export async function fetchWornOutfitLogs(): Promise<WornOutfitLog[]> {
  const res = await fetch(`${BASE_URL}/closet/worn-logs`);
  if (!res.ok) throw new Error("Error al obtener historial de outfits usados");
  return res.json();
}

export async function recordWornOutfit(log: Partial<WornOutfitLog>): Promise<{ success: boolean; log: WornOutfitLog }> {
  const res = await fetch(`${BASE_URL}/closet/worn-logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(log),
  });
  if (!res.ok) throw new Error("Error al registrar uso de outfit");
  return res.json();
}

export async function processClosetImageWithAI(imageBase64: string): Promise<{
  category: string;
  subcategory: string;
  color: string;
  tags: string[];
  styleDescription: string;
  originalImageUrl: string;
  whiteBgImageUrl: string;
}> {
  const res = await fetch(`${BASE_URL}/closet/process-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64 }),
  });
  if (!res.ok) throw new Error("Error al procesar la imagen con Milo IA");
  return res.json();
}

export async function generateOutfitWithAI(params: {
  userId?: string;
  mode?: "random" | "occasion" | "weather" | "style" | "baseGarment";
  occasion?: string;
  weather?: string;
  style?: string;
  baseGarmentId?: string;
}): Promise<{
  success: boolean;
  outfit: {
    title: string;
    topGarmentIds: string[];
    bottomGarmentId?: string | null;
    shoesGarmentId?: string | null;
    accessoryGarmentIds?: string[];
    explanation: string;
    occasion: string;
    weather?: string;
    style?: string;
  };
}> {
  const res = await fetch(`${BASE_URL}/closet/generate-outfit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Error al generar outfit con Milo IA");
  return res.json();
}

export async function cleanGarmentBackground(imageBase64: string): Promise<{ success: boolean; whiteBgImageUrl: string }> {
  const res = await fetch(`${BASE_URL}/closet/clean-background`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64 }),
  });
  if (!res.ok) throw new Error("Error al limpiar fondo de la prenda");
  return res.json();
}

export async function generateVirtualTryOnImage(params: {
  userModel: "mafe" | "benja";
  garmentIds: string[];
}): Promise<{ success: boolean; imageUrl: string }> {
  const res = await fetch(`${BASE_URL}/closet/generate-tryon-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Error al generar la fotografía de probador virtual");
  return res.json();
}

export async function fetchCycleAnalysisApi(data: {
  cycleConfig: any;
  cycleHistory: any[];
  symptomLogs: any[];
  userNotes?: string;
}): Promise<{
  success: boolean;
  analysis: {
    regularityDiagnosis: string;
    recurringSymptoms: string[];
    symptomInsights: string;
    nutritionAdvice: string;
    exerciseAdvice: string;
    emotionalAdvice: string;
    partnerGuidance: string;
    miloSummary: string;
  };
}> {
  const res = await fetch(`${BASE_URL}/ai/cycle-analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al solicitar el análisis de ciclo a Milo IA");
  return res.json();
}




