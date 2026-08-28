import fs from "fs";
import path from "path";
import { AsyncLocalStorage } from "async_hooks";
import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, doc, setDoc, getDocs, getDoc, collection, Firestore, deleteDoc } from "firebase/firestore";
import { 
  Home, 
  UserProfile, 
  CalendarItem, 
  Pet, 
  Plant, 
  Wish, 
  Memory, 
  HomeDocument,
  PlantAction,
  PlantDiagnosis,
  Medication,
  Vaccination,
  UserId,
  DailyEmotionalCheckin,
  AstroProfile,
  HomePersonalityState,
  HomePersonality,
  BudgetItem,
  BudgetEstimate,
  BudgetTemplate,
  BudgetAccount,
  DailyQuestionsPool,
  DailyQuestionAnswer,
  SaludChallenge,
  FrascoMessage,
  CierreMensual,
  DailyQuestion,
  WorkoutLog,
  HomeNotification,
  EmotionCheckin,
  CustomEmotion,
  ClosetGarment,
  ClosetCategory,
  SavedOutfit,
  WornOutfitLog
} from "./src/types.js";

// Path for simple robust persistence
const DB_FILE = path.join(process.cwd(), "db_sim.json");

// Initialize Firestore based on firebase-applet-config.json
export let firestore: Firestore | null = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (config.projectId) {
      const firebaseApp = initializeApp(config);
      firestore = initializeFirestore(firebaseApp, {
        experimentalAutoDetectLongPolling: true
      }, config.firestoreDatabaseId || undefined);
      console.log("Firestore initialized successfully on server-side using config file.");
    }
  }
} catch (err) {
  console.error("Failed to initialize Firestore server-side:", err);
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userId: string;
  userName?: string;
  action: 'create' | 'update' | 'delete' | 'rescue' | 'restore' | 'backup';
  module: string;
  itemId: string;
  details?: string;
  homeCode: string;
}

interface DBStore {
  home: Home;
  users: UserProfile[];
  calendarItems: CalendarItem[];
  pets: Pet[];
  plants: Plant[];
  wishes: Wish[];
  memories: Memory[];
  documents: HomeDocument[];
  checkins?: DailyEmotionalCheckin[];
  budgetItems?: BudgetItem[];
  budgetEstimates?: BudgetEstimate[];
  budgetTemplates?: BudgetTemplate[];
  budgetAccounts?: BudgetAccount[];
  hasSeededAccounts?: boolean;
  closedFortnights?: string[];
  auditLogs?: AuditLogItem[];
  
  // Salud del Hogar indicators and logs
  dailyPools?: DailyQuestionsPool[];
  dailyAnswers?: DailyQuestionAnswer[];
  saludChallenges?: SaludChallenge[];
  frascoMessages?: FrascoMessage[];
  cierresMensuales?: CierreMensual[];
  workoutLogs?: WorkoutLog[];
  notifications?: HomeNotification[];
  emotionCheckins?: EmotionCheckin[];
  customEmotions?: CustomEmotion[];

  // Smart Workout Training System Stores
  workoutRoutines?: any[];
  workoutDetailedLogs?: any[];
  bodyMetrics?: any[];
  personalRecords?: any[];
  customExercises?: any[];

  // Closet / Armario Digital Stores
  closetGarments?: ClosetGarment[];
  closetCategories?: ClosetCategory[];
  savedOutfits?: SavedOutfit[];
  wornOutfitLogs?: WornOutfitLog[];
}

const INITIAL_DATA: DBStore = {
  home: {
    id: "",
    name: "",
    members: [],
    settings: {
      notificationsEnabled: true,
      aiCatMoodLevel: "normal"
    }
  },
  users: [],
  calendarItems: [],
  pets: [],
  plants: [],
  wishes: [],
  memories: [],
  documents: [],
  checkins: [],
  budgetItems: [],
  budgetEstimates: [],
  budgetTemplates: [],
  budgetAccounts: [],
  hasSeededAccounts: false,
  closedFortnights: [],
  notifications: [],

  
  // Initial Salud del Hogar empty arrays
  dailyPools: [],
  dailyAnswers: [],
  saludChallenges: [],
  frascoMessages: [],
  cierresMensuales: [],
  emotionCheckins: [],
  customEmotions: []
};

// Zodiac Solar signs definitions in correct chronological order starting with Aries
const ZODIAC_SIGNS = [
  { name: "Aries ♈", emoji: "♈", start: [3, 21], end: [4, 19] },
  { name: "Tauro ♉", emoji: "♉", start: [4, 20], end: [5, 20] },
  { name: "Géminis ♊", emoji: "♊", start: [5, 21], end: [6, 20] },
  { name: "Cáncer ♋", emoji: "♋", start: [6, 21], end: [7, 22] },
  { name: "Leo ♌", emoji: "♌", start: [7, 23], end: [8, 22] },
  { name: "Virgo ♍", emoji: "♍", start: [8, 23], end: [9, 22] },
  { name: "Libra ♎", emoji: "♎", start: [9, 23], end: [10, 22] },
  { name: "Escorpio ♏", emoji: "♏", start: [10, 23], end: [11, 21] },
  { name: "Sagitario ♐", emoji: "♐", start: [11, 22], end: [12, 21] },
  { name: "Capricornio ♑", emoji: "♑", start: [12, 22], end: [1, 19] },
  { name: "Acuario ♒", emoji: "♒", start: [1, 20], end: [2, 18] },
  { name: "Piscis ♓", emoji: "♓", start: [2, 19], end: [3, 20] }
];

export function getZodiacSign(dateStr: string): string {
  if (!dateStr) return "Cáncer ♋";
  const cleanDate = dateStr.split("T")[0].replace(/\//g, "-");
  const parts = cleanDate.split("-");
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  if (isNaN(month) || isNaN(day)) return "Cáncer ♋";

  for (const sign of ZODIAC_SIGNS) {
    const [startMonth, startDay] = sign.start;
    const [endMonth, endDay] = sign.end;
    
    if (startMonth < endMonth) {
      if (month === startMonth && day >= startDay) return sign.name;
      if (month === endMonth && day <= endDay) return sign.name;
    } else { // Capricorn: Dec - Jan (12 to 1)
      if (month === 12 && day >= 22) return sign.name;
      if (month === 1 && day <= 19) return sign.name;
    }
  }
  return "Capricornio ♑";
}

export function getAscendantSign(sunSign: string, birthTime: string): string {
  let sunIndex = ZODIAC_SIGNS.findIndex(s => s.name.toLowerCase().includes(sunSign.replace(/[\u2600-\u27BF]/g, "").trim().split(" ")[0].toLowerCase()));
  if (sunIndex === -1) sunIndex = 3; // fallback Cáncer
  
  let hour = 12;
  let min = 0;
  if (birthTime) {
    const parts = birthTime.split(":");
    hour = parseInt(parts[0], 10) || 12;
    min = parseInt(parts[1], 10) || 0;
  }
  
  const totalHours = hour + min / 60;
  // Sunrise average is at 06:00. Ascendant transitions roughly every 2 hours
  const hoursSinceSunrise = (totalHours - 6 + 24) % 24;
  const signShift = Math.floor(hoursSinceSunrise / 2);
  const ascendantIndex = (sunIndex + signShift) % 12;
  return ZODIAC_SIGNS[ascendantIndex].name;
}

export function getLunarSign(dateStr: string): string {
  if (!dateStr) return "Acuario ♒";
  const birth = new Date(dateStr + "T00:00:00");
  if (isNaN(birth.getTime())) return "Acuario ♒";
  
  // Base date: Jan 1, 1970 (Ephemeris reference)
  const diffTime = birth.getTime() - new Date("1970-01-01T00:00:00").getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  const moonPeriod = 27.32166; // lunar sidereal orbit period in days
  const signDuration = moonPeriod / 12;
  
  let moonAgeDays = diffDays % moonPeriod;
  if (moonAgeDays < 0) moonAgeDays += moonPeriod;
  
  // Align Jan 1, 1970 (Moon was around Libra, index 6 in list starting Aries=0)
  const baseOffset = 6;
  const signIndex = Math.floor(moonAgeDays / signDuration + baseOffset) % 12;
  return ZODIAC_SIGNS[signIndex].name;
}

function createSeedFromDate(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getMercurySign(sunSign: string, dateStr: string): string {
  let sunIndex = ZODIAC_SIGNS.findIndex(s => s.name.toLowerCase().includes(sunSign.replace(/[\u2600-\u27BF]/g, "").trim().split(" ")[0].toLowerCase()));
  if (sunIndex === -1) sunIndex = 0;
  
  const seed = createSeedFromDate(dateStr);
  const roll = seed % 100;
  let offset = 0;
  if (roll < 50) {
    offset = 0; // Same sign as Sun
  } else if (roll < 75) {
    offset = -1; // Preceding sign
  } else {
    offset = 1; // Following sign
  }
  
  const mercuryIndex = (sunIndex + offset + 12) % 12;
  return ZODIAC_SIGNS[mercuryIndex].name;
}

export function getVenusSign(sunSign: string, dateStr: string): string {
  let sunIndex = ZODIAC_SIGNS.findIndex(s => s.name.toLowerCase().includes(sunSign.replace(/[\u2600-\u27BF]/g, "").trim().split(" ")[0].toLowerCase()));
  if (sunIndex === -1) sunIndex = 0;
  
  const seed = createSeedFromDate(dateStr);
  const roll = seed % 100;
  let offset = 0;
  if (roll < 40) {
    offset = 0; // Same sign as Sun
  } else if (roll < 70) {
    offset = (seed % 2 === 0) ? 1 : -1; // 1 sign away
  } else {
    offset = (seed % 2 === 0) ? 2 : -2; // 2 signs away
  }
  
  const venusIndex = (sunIndex + offset + 12) % 12;
  return ZODIAC_SIGNS[venusIndex].name;
}

export function getMarsSign(dateStr: string): string {
  if (!dateStr) return "Escorpio ♏";
  const birth = new Date(dateStr + "T00:00:00");
  if (isNaN(birth.getTime())) return "Escorpio ♏";
  
  const diffTime = birth.getTime() - new Date("1970-01-01T00:00:00").getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  const marsPeriod = 686.971; // Mars solar orbit period in days
  const signDuration = marsPeriod / 12;
  
  let marsAgeDays = diffDays % marsPeriod;
  if (marsAgeDays < 0) marsAgeDays += marsPeriod;
  
  // Align Jan 1, 1970 (Mars was around Scorpio, index 7 in list starting Aries=0)
  const baseOffset = 7;
  const signIndex = Math.floor(marsAgeDays / signDuration + baseOffset) % 12;
  return ZODIAC_SIGNS[signIndex].name;
}

export function resetDatabase() {
  const code = getActiveHomeCode();
  try {
    createBackupDisk("auto-pre-reset");
  } catch (e) {
    console.warn("Could not create pre-reset backup:", e);
  }
  multiStore[code] = JSON.parse(JSON.stringify(INITIAL_DATA));
  multiStore[code].home.id = `home-${code}`;
  multiStore[code].home.code = code;
  multiStore[code].home.name = code;
  saveToDisk();
  console.log(`Database partition ${code} was reset to empty factory state.`);
}

export function onboardingCreateHome(
  homeName: string, 
  userName: string, 
  birthDate: string, 
  birthTime: string, 
  birthPlace: string,
  emoji?: string,
  aiSigns?: {
    zodiacSign?: string;
    lunarSign?: string;
    ascendantSign?: string;
    mercurySign?: string;
    venusSign?: string;
    marsSign?: string;
  },
  email?: string
) {
  // Generate a unique 5-character readable code (e.g., NIDO-G3F8K)
  let code = "";
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // unambiguous letters and numbers
  do {
    code = "NIDO-";
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (multiStore[code]);

  // Dynamically initialize multiStore slot
  multiStore[code] = JSON.parse(JSON.stringify(INITIAL_DATA));

  const userId = userName.toLowerCase().trim().replace(/\s+/g, "-") || "usuario-1";
  
  const solar = aiSigns?.zodiacSign || getZodiacSign(birthDate);
  const lunar = aiSigns?.lunarSign || getLunarSign(birthDate);
  const ascendant = aiSigns?.ascendantSign || getAscendantSign(solar, birthTime);
  const mercury = aiSigns?.mercurySign || getMercurySign(solar, birthDate);
  const venus = aiSigns?.venusSign || getVenusSign(solar, birthDate);
  const mars = aiSigns?.marsSign || getMarsSign(birthDate);
  
  const colors = ["ffd5dc", "d1e4ff", "ffe699", "cbf0cc", "e1ccff"];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const photoUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(userName)}&backgroundColor=${randomColor}`;
  
  const user: UserProfile = {
    id: userId as UserId,
    name: userName,
    photoUrl,
    birthDate,
    email,
    birthTime,
    birthPlace,
    zodiacSign: solar,
    lunarSign: lunar,
    ascendantSign: ascendant,
    mercurySign: mercury,
    venusSign: venus,
    marsSign: mars,
    emoji: emoji || "🐱",
    horoscopeToday: `¡Un día fantástico bajo el signo de ${solar}! Sientes el suave influjo de las estrellas miau.`,
    horoscopeConsejo: `Estira las patitas y respira hondo. Es momento de comenzar a soñar con el nido.`
  };
  
  multiStore[code].home = {
    id: `home-${Date.now()}`,
    name: homeName,
    code: code, // Save partition code
    members: [userId],
    settings: {
      notificationsEnabled: true,
      aiCatMoodLevel: "normal"
    }
  };
  
  multiStore[code].users = [user];
  multiStore[code].calendarItems = [];
  multiStore[code].pets = [];
  multiStore[code].plants = [];
  multiStore[code].wishes = [];
  multiStore[code].memories = [];
  multiStore[code].documents = [];
  multiStore[code].checkins = [];
  multiStore[code].budgetItems = [];
  multiStore[code].budgetEstimates = [];
  multiStore[code].budgetTemplates = [];
  multiStore[code].budgetAccounts = [];
  multiStore[code].hasSeededAccounts = true;
  multiStore[code].closedFortnights = [];
  multiStore[code].dailyAnswers = [];
  multiStore[code].frascoMessages = [];
  multiStore[code].cierresMensuales = [];
  
  saveToDisk();
  return { home: multiStore[code].home, user };
}

export function onboardingJoinHome(
  userName: string, 
  birthDate: string, 
  birthTime: string, 
  birthPlace: string,
  emoji?: string,
  aiSigns?: {
    zodiacSign?: string;
    lunarSign?: string;
    ascendantSign?: string;
    mercurySign?: string;
    venusSign?: string;
    marsSign?: string;
  },
  email?: string
) {
  const userId = userName.toLowerCase().trim().replace(/\s+/g, "-") || "usuario-2";
  
  const solar = aiSigns?.zodiacSign || getZodiacSign(birthDate);
  const lunar = aiSigns?.lunarSign || getLunarSign(birthDate);
  const ascendant = aiSigns?.ascendantSign || getAscendantSign(solar, birthTime);
  const mercury = aiSigns?.mercurySign || getMercurySign(solar, birthDate);
  const venus = aiSigns?.venusSign || getVenusSign(solar, birthDate);
  const mars = aiSigns?.marsSign || getMarsSign(birthDate);
  
  const colors = ["ffd5dc", "d1e4ff", "ffe699", "cbf0cc", "e1ccff"];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const photoUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(userName)}&backgroundColor=${randomColor}`;
  
  const user: UserProfile = {
    id: userId as UserId,
    name: userName,
    photoUrl,
    birthDate,
    email,
    birthTime,
    birthPlace,
    zodiacSign: solar,
    lunarSign: lunar,
    ascendantSign: ascendant,
    mercurySign: mercury,
    venusSign: venus,
    marsSign: mars,
    emoji: emoji || "🐹",
    horoscopeToday: `¡La alineación cósmica brilla sobre tu nido con ${solar}! Listos para formar un vínculo mágico.`,
    horoscopeConsejo: `Comparte tus sueños cósmicos con tu persona favorita hoy.`
  };
  
  // Note: properties will be modified on the active request context partition (selected in middleware code)
  currentStore.users = currentStore.users.filter(u => u.id !== userId);
  currentStore.users.push(user);
  
  if (!currentStore.home.members.includes(userId)) {
    currentStore.home.members.push(userId);
  }
  
  saveToDisk();
  return { home: currentStore.home, user };
}

export function updateUserProfile(
  userId: string,
  updates: {
    name: string;
    birthDate: string;
    birthTime: string;
    birthPlace: string;
    emoji: string;
    email?: string;
    pushToken?: string;
    alertPreferences?: {
      sintoniaReminders?: boolean;
      petVaccines?: boolean;
      plantCare?: boolean;
      budgetAlerts?: boolean;
      calendarEvents?: boolean;
      systemAlerts?: boolean;
    };
  },
  aiSigns?: {
    zodiacSign?: string;
    lunarSign?: string;
    ascendantSign?: string;
    mercurySign?: string;
    venusSign?: string;
    marsSign?: string;
  }
): UserProfile | null {
  const userIndex = currentStore.users.findIndex(u => u.id === userId);
  if (userIndex === -1) return null;

  const solar = aiSigns?.zodiacSign || getZodiacSign(updates.birthDate);
  const lunar = aiSigns?.lunarSign || getLunarSign(updates.birthDate);
  const ascendant = aiSigns?.ascendantSign || getAscendantSign(solar, updates.birthTime);
  const mercury = aiSigns?.mercurySign || getMercurySign(solar, updates.birthDate);
  const venus = aiSigns?.venusSign || getVenusSign(solar, updates.birthDate);
  const mars = aiSigns?.marsSign || getMarsSign(updates.birthDate);

  const updatedUser: UserProfile = {
    ...currentStore.users[userIndex],
    name: updates.name,
    birthDate: updates.birthDate,
    birthTime: updates.birthTime,
    birthPlace: updates.birthPlace,
    emoji: updates.emoji,
    email: updates.email !== undefined ? updates.email : currentStore.users[userIndex].email,
    zodiacSign: solar,
    lunarSign: lunar,
    ascendantSign: ascendant,
    mercurySign: mercury,
    venusSign: venus,
    marsSign: mars,
    horoscopeToday: `¡Un día fantástico bajo el influjo de ${solar}! Sientes el suave abrazo de las estrellas.`,
    horoscopeConsejo: `Estira tus patitas, regálate un respiro y haz que tu nido de amor brille miau.`,
    pushToken: updates.pushToken !== undefined ? updates.pushToken : currentStore.users[userIndex].pushToken,
    alertPreferences: updates.alertPreferences !== undefined ? updates.alertPreferences : currentStore.users[userIndex].alertPreferences
  };

  currentStore.users[userIndex] = updatedUser;
  saveToDisk();
  return updatedUser;
}

// Multi-household database simulation in memory
export const homeContextStorage = new AsyncLocalStorage<string>();

export function getActiveHomeCode(): string {
  return homeContextStorage.getStore() || "HOGARPELUDO"; // fallback code during bootstrap
}

let multiStore: { [code: string]: DBStore } = {};

// Transparent Proxy wrapper to auto-redirect property accesses on currentStore to the active request's partitioned home store
export const currentStore = new Proxy({} as any, {
  get(target, prop) {
    return (getStore() as any)[prop];
  },
  set(target, prop, value) {
    (getStore() as any)[prop] = value;
    return true;
  },
  has(target, prop) {
    return prop in getStore();
  },
  ownKeys(target) {
    return Reflect.ownKeys(getStore());
  },
  getOwnPropertyDescriptor(target, prop) {
    return Reflect.getOwnPropertyDescriptor(getStore(), prop);
  }
});

// ==========================================
// BACKUP AND DISK RESTORATION SYSTEM
// ==========================================

export const CURRENT_APP_VERSION = "1.3.2";
export const CURRENT_SCHEMA_VERSION = 2;

const BACKUP_DIR = path.join(process.cwd(), "backups");

function ensureBackupDirExists() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export function migrateBackupData(
  store: { [code: string]: DBStore },
  fromVersion: number,
  targetVersion: number
): { [code: string]: DBStore } {
  console.log(`[Backup Migration] Migrando esquema de v${fromVersion} a v${targetVersion}...`);
  const migrated = JSON.parse(JSON.stringify(store || {}));

  for (const code of Object.keys(migrated)) {
    let household = migrated[code];
    if (!household) continue;

    // Schema Migration v1 -> v2
    if (fromVersion < 2) {
      if (!Array.isArray(household.closetGarments)) household.closetGarments = [];
      if (!Array.isArray(household.closetCategories)) household.closetCategories = [];
      if (!Array.isArray(household.budgetAccounts)) household.budgetAccounts = [];
      if (!Array.isArray(household.healthMetrics)) household.healthMetrics = [];
      if (!Array.isArray(household.jarWishes)) household.jarWishes = [];
      if (!Array.isArray(household.monthlyClosures)) household.monthlyClosures = [];
      if (!Array.isArray(household.customEmotions)) household.customEmotions = [];
      if (!Array.isArray(household.auditLogs)) household.auditLogs = [];

      if (household.home) {
        if (!household.home.code) household.home.code = code;
        if (!household.home.id) household.home.id = `home-${code}`;
      }
    }

    migrated[code] = sanitizeStoreData(household);
  }

  console.log(`[Backup Migration] Migración completada exitosamente a v${targetVersion}.`);
  return migrated;
}

export function rotateBackupsDisk(maxToKeep: number = 10) {
  try {
    ensureBackupDirExists();
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith("db_backup_") && f.endsWith(".json"));
    
    const fileStats = files.map(filename => {
      const filePath = path.join(BACKUP_DIR, filename);
      const stat = fs.statSync(filePath);
      return { filename, filePath, mtimeMs: stat.mtimeMs };
    }).sort((a, b) => b.mtimeMs - a.mtimeMs);

    if (fileStats.length > maxToKeep) {
      const toDelete = fileStats.slice(maxToKeep);
      for (const item of toDelete) {
        try {
          fs.unlinkSync(item.filePath);
          console.log(`[Backup Rotation] Eliminado backup antiguo: ${item.filename}`);
        } catch (e) {
          console.warn(`[Backup Rotation] Error al eliminar ${item.filename}:`, e);
        }
      }
    }
  } catch (err) {
    console.error("[Backup Rotation Error]:", err);
  }
}

export function createBackupDisk(reason: string = "manual"): {
  success: boolean;
  filename: string;
  path: string;
  timestamp: string;
  sizeBytes: number;
  sizeFormatted: string;
  totalBackups: number;
  appVersion: string;
  schemaVersion: number;
  message: string;
} {
  try {
    ensureBackupDirExists();
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    
    const baseName = `db_backup_${year}-${month}-${day}_${hours}-${minutes}_v${CURRENT_APP_VERSION}`;
    let filename = `${baseName}.json`;
    let targetPath = path.join(BACKUP_DIR, filename);

    // If backup file with exact same name exists, append seconds
    if (fs.existsSync(targetPath)) {
      filename = `db_backup_${year}-${month}-${day}_${hours}-${minutes}-${seconds}_v${CURRENT_APP_VERSION}.json`;
      targetPath = path.join(BACKUP_DIR, filename);
    }

    const backupPayload = {
      backupMeta: {
        appVersion: CURRENT_APP_VERSION,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        createdAt: now.toISOString(),
        reason: reason
      },
      data: multiStore
    };

    const dataToWrite = JSON.stringify(backupPayload, null, 2);
    fs.writeFileSync(targetPath, dataToWrite, "utf8");

    const stat = fs.statSync(targetPath);
    const sizeBytes = stat.size;
    const sizeFormatted = sizeBytes > 1024 * 1024
      ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(sizeBytes / 1024).toFixed(1)} KB`;

    rotateBackupsDisk(10);

    const allBackups = listBackupsDisk();

    try {
      logAuditTrail(
        "sistema",
        "backup",
        "system",
        "crear-backup",
        `Backup guardado: ${filename} (App v${CURRENT_APP_VERSION}, Esquema v${CURRENT_SCHEMA_VERSION}, ${reason})`
      );
    } catch (e) {
      // Ignore if audit trail is initialized later
    }

    console.log(`[Backup System] Generado backup ${filename} (${sizeFormatted}, App v${CURRENT_APP_VERSION}). Causa: ${reason}`);

    return {
      success: true,
      filename,
      path: targetPath,
      timestamp: now.toISOString(),
      sizeBytes,
      sizeFormatted,
      totalBackups: allBackups.length,
      appVersion: CURRENT_APP_VERSION,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      message: `Copia de seguridad "${filename}" creada exitosamente.`
    };
  } catch (err: any) {
    console.error("Error al crear copia de seguridad:", err);
    throw new Error(`Error al crear la copia de seguridad: ${err?.message || err}`);
  }
}

export function listBackupsDisk(): Array<{
  filename: string;
  createdAt: string;
  sizeBytes: number;
  sizeFormatted: string;
  isLatest: boolean;
  appVersion: string;
  schemaVersion: number;
  requiresMigration: boolean;
}> {
  try {
    ensureBackupDirExists();
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith("db_backup_") && f.endsWith(".json"));

    const list = files.map((filename) => {
      const filePath = path.join(BACKUP_DIR, filename);
      const stat = fs.statSync(filePath);
      const sizeBytes = stat.size;
      const sizeFormatted = sizeBytes > 1024 * 1024
        ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`
        : `${(sizeBytes / 1024).toFixed(1)} KB`;

      let appVersion = "1.0.0";
      let schemaVersion = 1;

      // Try regex on filename for vX.Y.Z
      const filenameMatch = filename.match(/_v(\d+\.\d+\.\d+)/);
      if (filenameMatch) {
        appVersion = filenameMatch[1];
      }

      try {
        const content = fs.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === "object" && parsed.backupMeta) {
          if (parsed.backupMeta.appVersion) appVersion = parsed.backupMeta.appVersion;
          if (typeof parsed.backupMeta.schemaVersion === "number") schemaVersion = parsed.backupMeta.schemaVersion;
        }
      } catch (e) {
        // Fallback
      }

      const requiresMigration = schemaVersion < CURRENT_SCHEMA_VERSION;

      return {
        filename,
        createdAt: stat.mtime.toISOString(),
        mtimeMs: stat.mtimeMs,
        sizeBytes,
        sizeFormatted,
        isLatest: false,
        appVersion,
        schemaVersion,
        requiresMigration
      };
    }).sort((a, b) => b.mtimeMs - a.mtimeMs);

    if (list.length > 0) {
      list[0].isLatest = true;
    }

    return list.map(({ mtimeMs, ...rest }) => rest);
  } catch (err) {
    console.error("Error al listar backups:", err);
    return [];
  }
}

export function restoreBackupDisk(filename: string): {
  success: boolean;
  message: string;
  filename: string;
  restoredAt: string;
  appVersion: string;
  schemaVersion: number;
  wasMigrated: boolean;
} {
  try {
    ensureBackupDirExists();

    const safeFilename = path.basename(filename);
    if (safeFilename !== filename || !filename.startsWith("db_backup_") || !filename.endsWith(".json")) {
      throw new Error("Nombre de archivo de backup no válido.");
    }

    const filePath = path.join(BACKUP_DIR, safeFilename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`El archivo de respaldo "${safeFilename}" no existe en el servidor.`);
    }

    // 1. Mandatory safety backup before restoring
    try {
      createBackupDisk("auto-pre-restore-safety");
    } catch (e) {
      console.warn("Could not create pre-restore safety backup:", e);
    }

    // 2. Read backup file
    const content = fs.readFileSync(filePath, "utf8");
    const parsedData = JSON.parse(content);

    if (!parsedData || typeof parsedData !== "object") {
      throw new Error("El archivo de copia de seguridad no contiene una estructura de datos válida.");
    }

    let backupMeta = parsedData.backupMeta;
    let rawStore = parsedData.data || parsedData;
    let backupAppVersion = backupMeta?.appVersion || "1.0.0";
    let backupSchemaVersion = typeof backupMeta?.schemaVersion === "number" ? backupMeta.schemaVersion : 1;
    let wasMigrated = false;

    // 3. Auto-migration if schema version is older than current schema version
    if (backupSchemaVersion < CURRENT_SCHEMA_VERSION) {
      rawStore = migrateBackupData(rawStore, backupSchemaVersion, CURRENT_SCHEMA_VERSION);
      wasMigrated = true;
      backupSchemaVersion = CURRENT_SCHEMA_VERSION;
    }

    // 4. Update multiStore
    multiStore = rawStore;
    for (const code of Object.keys(multiStore)) {
      multiStore[code] = sanitizeStoreData(multiStore[code]);
    }

    // 5. Save to disk and Firestore
    saveToDisk();

    try {
      logAuditTrail(
        "sistema",
        "restore",
        "system",
        "restaurar-backup",
        `Estado del hogar restaurado exitosamente desde: ${safeFilename}${wasMigrated ? " (con migración automática de esquema a v" + CURRENT_SCHEMA_VERSION + ")" : ""}`
      );
    } catch (e) {
      // Ignore if audit trail unavailable
    }

    console.log(`[Backup System] Base de datos restaurada exitosamente desde ${safeFilename}${wasMigrated ? " (migrada a v" + CURRENT_SCHEMA_VERSION + ")" : ""}`);

    return {
      success: true,
      message: `¡Estado del hogar restaurado exitosamente desde "${safeFilename}"!${wasMigrated ? " (Se aplicó migración de esquema v1 ➔ v" + CURRENT_SCHEMA_VERSION + " de forma transparente)" : ""}`,
      filename: safeFilename,
      restoredAt: new Date().toISOString(),
      appVersion: backupAppVersion,
      schemaVersion: backupSchemaVersion,
      wasMigrated
    };
  } catch (err: any) {
    console.error("Error al restaurar backup:", err);
    throw new Error(`Error al restaurar la copia de seguridad: ${err?.message || err}`);
  }
}

export let isRestoredFromFirestore = false;
export let pendingWritesCount = 0;
export let lastSuccessfulSyncTime: string | null = null;
export let lastSyncError: string | null = null;
export let isFirestoreQuotaExhausted = false;
export let quotaExhaustedAt: number | null = null;
export let hasUnsyncedChanges = false;
const QUOTA_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutos de enfriamiento si se excede la cuota gratuita

let firestoreSaveTimer: NodeJS.Timeout | null = null;

// 1. Save all households synchronously to db_sim.json first (Primary Source of Truth)
export function saveToDisk() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(multiStore, null, 2), "utf8");
    hasUnsyncedChanges = true;
  } catch (err) {
    console.error("Error saving database to disk db_sim.json:", err);
  }

  // If Firestore is disabled or quota exhausted, remain 100% local without creating gRPC streams
  if (!firestore || isFirestoreQuotaExhausted) {
    if (isFirestoreQuotaExhausted && quotaExhaustedAt) {
      const elapsed = Date.now() - quotaExhaustedAt;
      if (elapsed >= QUOTA_COOLDOWN_MS) {
        // Cooldown period finished, reset circuit breaker
        isFirestoreQuotaExhausted = false;
        quotaExhaustedAt = null;
      } else {
        return; // Still in cooldown, rely purely on local db_sim.json
      }
    } else {
      return;
    }
  }

  // Debounce background Firestore secondary sync by 5000ms
  if (firestoreSaveTimer) {
    clearTimeout(firestoreSaveTimer);
  }
  firestoreSaveTimer = setTimeout(() => {
    saveToFirestore();
  }, 5000);
}

export function getSyncStatus() {
  let status: "synced" | "syncing" | "error" | "quota_exceeded" = "synced";
  if (isFirestoreQuotaExhausted) {
    status = "quota_exceeded";
  } else if (lastSyncError) {
    status = "error";
  } else if (pendingWritesCount > 0) {
    status = "syncing";
  }

  return {
    primarySource: "db_sim.json",
    isRestoredFromFirestore,
    pendingWrites: pendingWritesCount,
    hasUnsyncedChanges,
    lastSuccessfulSyncTime: lastSuccessfulSyncTime || new Date().toISOString(),
    lastSyncError: isFirestoreQuotaExhausted 
      ? "Modo Local Seguro Activo: Cuota diaria de Firestore alcanzada. db_sim.json es la fuente principal de verdad."
      : lastSyncError,
    isQuotaExhausted: isFirestoreQuotaExhausted,
    status
  };
}

function handleQuotaError(err: any, contextMsg: string) {
  const msg = String(err?.message || err);
  if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota limit exceeded") || msg.includes("quota") || err?.code === 8) {
    if (!isFirestoreQuotaExhausted) {
      isFirestoreQuotaExhausted = true;
      quotaExhaustedAt = Date.now();
      lastSyncError = "Cuota diaria de Firestore alcanzada. Funcionando 100% de forma local con db_sim.json.";
      console.warn(`[Local-First Circuit Breaker] Firestore write quota exhausted during ${contextMsg}. Pausing background Firestore sync for 15 minutes. Primary storage db_sim.json remains 100% operational.`);
    }
    return true;
  }
  return false;
}

function safeFirestoreWrite(op: () => Promise<any>, contextMsg: string = "writing"): void {
  if (!firestore || isFirestoreQuotaExhausted) return;
  op().catch(err => {
    if (!handleQuotaError(err, contextMsg)) {
      console.error(`Error in background Firestore ${contextMsg}:`, err);
    }
  });
}

export async function saveToFirestore() {
  if (!firestore) return;

  // Check cooldown if previously quota exhausted
  if (isFirestoreQuotaExhausted && quotaExhaustedAt) {
    const elapsed = Date.now() - quotaExhaustedAt;
    if (elapsed < QUOTA_COOLDOWN_MS) {
      return; // Still in cooldown, rely on db_sim.json local disk
    } else {
      isFirestoreQuotaExhausted = false; // Reset circuit breaker after cooldown
      quotaExhaustedAt = null;
    }
  }

  pendingWritesCount++;
  try {
    for (const code of Object.keys(multiStore)) {
      const cleanCode = normalizeHomeCode(code);
      if (!cleanCode) continue;
      const dataCopy = JSON.parse(JSON.stringify(multiStore[cleanCode]));
      await setDoc(doc(firestore, "nests", cleanCode), {
        homeCode: cleanCode,
        data: dataCopy,
        updatedAt: new Date().toISOString()
      });
    }
    lastSuccessfulSyncTime = new Date().toISOString();
    lastSyncError = null;
    hasUnsyncedChanges = false;
    isFirestoreQuotaExhausted = false;
    console.log("Database successfully backed up to Firestore secondary cloud.");
  } catch (err: any) {
    if (!handleQuotaError(err, "saveToFirestore")) {
      lastSyncError = err?.message || "Error al sincronizar con Firestore";
      console.error("Error backing up to Firestore:", err);
    }
  } finally {
    pendingWritesCount = Math.max(0, pendingWritesCount - 1);
  }
}

const MOCK_MEMBER_NAMES: string[] = [];

function sanitizeStoreData(data: DBStore): DBStore {
  if (!data) return data;
  if (Array.isArray(data.pets)) {
    data.pets = data.pets.filter(p => p && p.id !== 'pet-milo-demo-placeholder');
  }
  if (Array.isArray(data.plants)) {
    data.plants = data.plants.filter(p => p && p.id !== 'plant-demo-placeholder');
  }
  if (Array.isArray(data.wishes)) {
    data.wishes = data.wishes.filter(w => w && w.id !== 'wish-demo-placeholder');
  }
  if (Array.isArray(data.closetGarments)) {
    data.closetGarments = data.closetGarments.filter(g => g && g.id !== 'garment-demo-placeholder');
  }
  return data;
}

export async function restoreFromFirestore() {
  if (!firestore || isFirestoreQuotaExhausted) return;
  try {
    console.log("Comprobando sincronización secundaria en Firestore...");
    const snapshot = await getDocs(collection(firestore, "nests"));
    let count = 0;
    
    const getItemKey = (item: any) => {
      if (!item || typeof item !== "object") return null;
      if (item.id) return String(item.id);
      if (item.userId && item.date && item.questionId) return `q_${item.userId}_${item.date}_${item.questionId}`;
      if (item.userId && item.date && item.emotion) return `emo_${item.userId}_${item.date}_${item.emotion}`;
      if (item.userId && item.date && item.mood) return `chk_${item.userId}_${item.date}_${item.mood}`;
      if (item.userId && item.date) return `ud_${item.userId}_${item.date}`;
      if (item.date && item.text) return `dt_${item.date}_${item.text}`;
      if (item.name && item.date) return `nd_${item.name}_${item.date}`;
      try {
        return JSON.stringify(item);
      } catch (e) {
        return String(Math.random());
      }
    };

    const mergeArray = (localArr: any[] = [], remoteArr: any[] = []) => {
      const map = new Map<string, any>();
      if (Array.isArray(localArr)) {
        localArr.forEach((item: any) => {
          const k = getItemKey(item);
          if (k) map.set(k, item);
        });
      }
      if (Array.isArray(remoteArr)) {
        remoteArr.forEach((item: any) => {
          const k = getItemKey(item);
          if (k) map.set(k, item);
        });
      }
      return Array.from(map.values());
    };

    snapshot.forEach(d => {
      const docData = d.data();
      if (docData && docData.homeCode && docData.data) {
        const existing = multiStore[docData.homeCode];
        if (!existing) {
          multiStore[docData.homeCode] = docData.data;
        } else {
          docData.data.memories = mergeArray(existing.memories, docData.data.memories);
          docData.data.budgetItems = mergeArray(existing.budgetItems, docData.data.budgetItems);
          docData.data.checkins = mergeArray(existing.checkins, docData.data.checkins);
          docData.data.emotionCheckins = mergeArray(existing.emotionCheckins, docData.data.emotionCheckins);
          docData.data.calendarItems = mergeArray(existing.calendarItems, docData.data.calendarItems);
          docData.data.saludChallenges = mergeArray(existing.saludChallenges, docData.data.saludChallenges);
          docData.data.dailyAnswers = mergeArray(existing.dailyAnswers, docData.data.dailyAnswers);
          docData.data.frascoMessages = mergeArray(existing.frascoMessages, docData.data.frascoMessages);
          docData.data.workoutLogs = mergeArray(existing.workoutLogs, docData.data.workoutLogs);
          docData.data.workoutDetailedLogs = mergeArray(existing.workoutDetailedLogs, docData.data.workoutDetailedLogs);
          docData.data.pets = mergeArray(existing.pets, docData.data.pets);
          docData.data.plants = mergeArray(existing.plants, docData.data.plants);
          docData.data.wishes = mergeArray(existing.wishes, docData.data.wishes);
          docData.data.notifications = mergeArray(existing.notifications, docData.data.notifications);
          docData.data.customEmotions = mergeArray(existing.customEmotions, docData.data.customEmotions);
          docData.data.budgetAccounts = mergeArray(existing.budgetAccounts, docData.data.budgetAccounts);
          docData.data.budgetTemplates = mergeArray(existing.budgetTemplates, docData.data.budgetTemplates);
          docData.data.budgetEstimates = mergeArray(existing.budgetEstimates, docData.data.budgetEstimates);
          docData.data.customExercises = mergeArray(existing.customExercises, docData.data.customExercises);
          docData.data.workoutRoutines = mergeArray(existing.workoutRoutines, docData.data.workoutRoutines);
          docData.data.bodyMetrics = mergeArray(existing.bodyMetrics, docData.data.bodyMetrics);
          docData.data.personalRecords = mergeArray(existing.personalRecords, docData.data.personalRecords);
          docData.data.documents = mergeArray(existing.documents, docData.data.documents);
          docData.data.users = mergeArray(existing.users, docData.data.users);
          docData.data.closedFortnights = Array.from(new Set([...(existing.closedFortnights || []), ...(docData.data.closedFortnights || [])]));
          multiStore[docData.homeCode] = sanitizeStoreData(docData.data);
        }
        count++;
      }
    });
    isRestoredFromFirestore = true;
    if (count > 0) {
      console.log(`[Firestore Sync] Restauración completada exitosamente desde Firestore para ${count} nidos.`);
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(multiStore, null, 2), "utf8");
      } catch (e) {}
    }
  } catch (err: any) {
    if (!handleQuotaError(err, "restoreFromFirestore")) {
      lastSyncError = err?.message || "Error al restaurar desde Firestore";
      console.error("Error en restauración de Firestore:", err);
    }
  }
}

// Load all households from disk db_sim.json as Primary Source of Truth
export function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf8");
      const parsed = JSON.parse(content);
      
      // Auto-migrate legacy format databases containing only one single home
      if (parsed && parsed.home && (parsed.home.id !== undefined || parsed.home.name !== undefined)) {
        console.log("Migrando base de datos legacy a estructura multi-nido en db_sim.json...");
        const code = (parsed.home.name || "HOGARPELUDO").toUpperCase().trim().replace(/\s+/g, "");
        if (!parsed.home.code) {
          parsed.home.code = code;
        }
        multiStore = {
          [code]: parsed
        };
        saveToDisk();
      } else {
        multiStore = parsed || {};
      }
      console.log(`✅ Base de datos principal cargada exitosamente desde db_sim.json. Nidos activos: ${Object.keys(multiStore).join(", ")}`);
      // Ensure an initial complete backup exists in backups/
      if (listBackupsDisk().length === 0) {
        try {
          createBackupDisk("auto-initial-boot");
        } catch (bErr) {
          console.warn("No se pudo generar backup inicial al arrancar:", bErr);
        }
      }
    } else {
      multiStore = {};
      saveToDisk();
      console.log("Inicializado nuevo archivo local db_sim.json.");
    }
  } catch (err) {
    console.error("Error al cargar db_sim.json desde disco:", err);
    multiStore = {};
  }
  
  // Asynchronously attempt secondary Firestore sync after 3s if available & not in quota cooldown
  if (firestore && !isFirestoreQuotaExhausted) {
    setTimeout(() => {
      restoreFromFirestore().catch(() => {});
    }, 3000);
  }
  
  return getStore();
}

export function normalizeHomeCode(code: string): string {
  if (!code) return "NIDO-YCV5W";
  let clean = code.toUpperCase().trim();
  if (clean === "HOGARPELUDO" || clean === "HOGAR-PELUDO" || clean === "NIDO-HOGARPELUDO" || clean === "HOGAR PELUDO") {
    return "NIDO-YCV5W";
  }
  if (!clean.startsWith("NIDO-") && clean.length === 5) {
    clean = "NIDO-" + clean;
  }
  return clean;
}

export function getStoreByCode(code: string): DBStore {
  const cleanCode = normalizeHomeCode(code);
  if (!multiStore[cleanCode]) {
    multiStore[cleanCode] = JSON.parse(JSON.stringify(INITIAL_DATA));
    multiStore[cleanCode].home.id = `home-${cleanCode}`;
    multiStore[cleanCode].home.code = cleanCode;
    multiStore[cleanCode].home.name = `Hogar de Mafe y Benjamin`;
    saveToDisk();
  }

  // Dynamic seed / recovery for any home partition that has no users
  if (!multiStore[cleanCode].users || multiStore[cleanCode].users.length === 0) {
    const userMafe: UserProfile = {
      id: "mafe",
      name: "Mafe",
      birthDate: "1997-10-24",
      birthTime: "08:30",
      birthPlace: "Bogotá",
      zodiacSign: "Escorpio ♏",
      lunarSign: "Cáncer ♋",
      ascendantSign: "Sagitario ♐",
      mercurySign: "Libra ♎",
      venusSign: "Sagitario ♐",
      marsSign: "Acuario ♒",
      emoji: "cat_cosmic",
      photoUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Mafe&backgroundColor=ffd5dc",
      horoscopeToday: "¡Un día fantástico miau! Sientes la energía del amor puro rodeando el nido.",
      horoscopeConsejo: "Dale un ronroneo cariñoso a Benja hoy."
    };

    const userBenja: UserProfile = {
      id: "benja",
      name: "Benja",
      birthDate: "1997-03-24",
      birthTime: "14:15",
      birthPlace: "Bogotá",
      zodiacSign: "Aries ♈",
      lunarSign: "Libra ♎",
      ascendantSign: "Leo ♌",
      mercurySign: "Aries ♈",
      venusSign: "Tauro ♉",
      marsSign: "Géminis ♊",
      emoji: "cat_ginger",
      photoUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Benja&backgroundColor=d1e4ff",
      horoscopeToday: "¡La energía cósmica de Aries te llena de motivación hoy para lograr tus metas!",
      horoscopeConsejo: "Estira las patitas y regala una caricia terna a Mafe."
    };

    multiStore[cleanCode].users = [userMafe, userBenja];
    multiStore[cleanCode].home.members = ["mafe", "benja"];
    
    // Ensure array structures exist without injecting fake mock data
    if (!multiStore[cleanCode].budgetAccounts) {
      multiStore[cleanCode].budgetAccounts = [];
    }
    if (!multiStore[cleanCode].wishes) {
      multiStore[cleanCode].wishes = [];
    }
    if (!multiStore[cleanCode].pets) {
      multiStore[cleanCode].pets = [];
    }
    if (!multiStore[cleanCode].plants) {
      multiStore[cleanCode].plants = [];
    }
    if (!multiStore[cleanCode].closetGarments) {
      multiStore[cleanCode].closetGarments = [];
    }

    saveToDisk();
  }

  // Ensure arrays exist for all keys without injecting mock data
  if (!multiStore[cleanCode].wishes) {
    multiStore[cleanCode].wishes = [];
  }
  if (!multiStore[cleanCode].plants) {
    multiStore[cleanCode].plants = [];
  }
  if (!multiStore[cleanCode].closetGarments) {
    multiStore[cleanCode].closetGarments = [];
  }
  if (!multiStore[cleanCode].pets) {
    multiStore[cleanCode].pets = [];
  }

  if (!multiStore[cleanCode].emotionCheckins) {
    multiStore[cleanCode].emotionCheckins = [];
  }
  if (!multiStore[cleanCode].customEmotions) {
    multiStore[cleanCode].customEmotions = [];
  }
  
  multiStore[cleanCode] = sanitizeStoreData(multiStore[cleanCode]);
  return multiStore[cleanCode];
}

export function getStore(): DBStore {
  const code = getActiveHomeCode();
  return getStoreByCode(code);
}

// Security Validation Helper
export function validateUserAccess(homeCode: string, userId: string): boolean {
  if (!homeCode || !userId) return false;
  const cleanCode = normalizeHomeCode(homeCode);
  const store = getStoreByCode(cleanCode);
  if (!store) return false;
  // Check if user is registered in store users or home members
  const isMember = store.home?.members?.some(m => m.toLowerCase() === userId.toLowerCase()) ||
                   store.users?.some(u => u.id.toLowerCase() === userId.toLowerCase() || u.name.toLowerCase() === userId.toLowerCase());
  // Allow Mafe and Benja by default for primary home
  if (!isMember && (userId.toLowerCase() === 'mafe' || userId.toLowerCase() === 'benja' || userId.toLowerCase() === 'benjamín')) {
    return true;
  }
  return isMember;
}

// Audit Trail Logging
export function logAuditTrail(
  userId: string,
  action: 'create' | 'update' | 'delete' | 'rescue' | 'restore' | 'backup',
  moduleName: string,
  itemId: string,
  details?: string
): AuditLogItem {
  const store = getStore();
  if (!store.auditLogs) {
    store.auditLogs = [];
  }
  const cleanCode = getActiveHomeCode();
  const userName = store.users?.find(u => u.id.toLowerCase() === userId.toLowerCase())?.name || userId || "Usuario";
  
  const logItem: AuditLogItem = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    userId: userId || "sistema",
    userName,
    action,
    module: moduleName,
    itemId: itemId || "bulk",
    details: details || "",
    homeCode: cleanCode
  };

  store.auditLogs.unshift(logItem);
  if (store.auditLogs.length > 200) {
    store.auditLogs = store.auditLogs.slice(0, 200);
  }
  
  saveToDisk();

  safeFirestoreWrite(
    () => setDoc(doc(firestore!, "audit_logs", logItem.id), logItem),
    "saving audit log"
  );

  return logItem;
}

export function getAuditLogs(): AuditLogItem[] {
  const store = getStore();
  return store.auditLogs || [];
}

// Rescue Data Function for lost items (plants, closet, metas) belonging to homeCode
export async function rescueDataForHome(userId: string): Promise<{ success: boolean; rescuedCount: number; message: string; store: DBStore }> {
  const cleanCode = getActiveHomeCode();
  const store = getStoreByCode(cleanCode);
  let rescuedCount = 0;

  const MOCK_PET_NAMES = ['milo', 'milo 🐾'];
  const MOCK_PLANT_NAMES = ['monstera del nido 🪴', 'galaxia purpúrea 🌌', 'monstera del nido'];
  const MOCK_WISH_NAMES = ['nintendo switch oled 🎮', 'cafetera de espresso moderna ☕', 'cafetera de espresso italiana ☕', 'viaje de fin de semana a la playa 🏖️'];
  const MOCK_GARMENT_NAMES = ['chaqueta abrigada de invierno', 'camisa formal azul cielo', 'pantalón casual beige', 'vestido elegante de noche'];

  // Check all partitions in multiStore for any custom items belonging to this homeCode
  for (const [code, otherStore] of Object.entries(multiStore)) {
    if (!otherStore) continue;

    // Rescue plants
    if (otherStore.plants && Array.isArray(otherStore.plants)) {
      for (const p of otherStore.plants) {
        if (p && p.id && !MOCK_PLANT_NAMES.includes((p.name || '').toLowerCase().trim())) {
          if (!store.plants.some(existing => existing.id === p.id)) {
            store.plants.push(p);
            rescuedCount++;
          }
        }
      }
    }

    // Rescue wishes / metas
    if (otherStore.wishes && Array.isArray(otherStore.wishes)) {
      for (const w of otherStore.wishes) {
        if (w && w.id && !MOCK_WISH_NAMES.includes((w.name || '').toLowerCase().trim())) {
          if (!store.wishes.some(existing => existing.id === w.id)) {
            store.wishes.push(w);
            rescuedCount++;
          }
        }
      }
    }

    // Rescue closet garments
    if (otherStore.closetGarments && Array.isArray(otherStore.closetGarments)) {
      for (const g of otherStore.closetGarments) {
        if (g && g.id && !MOCK_GARMENT_NAMES.includes((g.name || '').toLowerCase().trim())) {
          if (!store.closetGarments.some(existing => existing.id === g.id)) {
            store.closetGarments.push(g);
            rescuedCount++;
          }
        }
      }
    }
  }

  // Also check Firestore if available and not quota exhausted
  if (firestore && !isFirestoreQuotaExhausted) {
    try {
      const docRef = doc(firestore, "nests", cleanCode);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const firestoreData = docSnap.data()?.data;
        if (firestoreData) {
          ['plants', 'wishes', 'closetGarments'].forEach((colKey) => {
            if (firestoreData[colKey] && Array.isArray(firestoreData[colKey])) {
              for (const item of firestoreData[colKey]) {
                if (item && item.id) {
                  const nameLower = (item.name || '').toLowerCase().trim();
                  const isMock = MOCK_PLANT_NAMES.includes(nameLower) || MOCK_WISH_NAMES.includes(nameLower) || MOCK_GARMENT_NAMES.includes(nameLower);
                  if (!isMock) {
                    const targetArr = (store as any)[colKey] || [];
                    if (!targetArr.some((existing: any) => existing.id === item.id)) {
                      targetArr.push(item);
                      rescuedCount++;
                    }
                  }
                }
              }
            }
          });
        }
      }
    } catch (err) {
      console.error("Error checking Firestore during data rescue:", err);
    }
  }

  saveToDisk();
  logAuditTrail(userId || "sistema", "rescue", "all", "rescate-global", `Escaneo de rescate ejecutado para ${cleanCode}. Elementos restaurados: ${rescuedCount}`);

  return {
    success: true,
    rescuedCount,
    message: rescuedCount > 0 ? `¡Rescate exitoso! Se restauraron ${rescuedCount} elementos pertenecientes a tu hogar.` : "El escaneo no detectó elementos perdidos adicionales. Los datos de tu hogar están intactos y sincronizados.",
    store
  };
}

export function doesHomeExist(code: string): boolean {
  if (!code) return false;
  const cleanCode = normalizeHomeCode(code);
  if (multiStore[cleanCode]) return true;
  // If it matches a NIDO formatted code (starts with NIDO-), allow it
  if (cleanCode.startsWith("NIDO-") && cleanCode.length >= 8) {
    return true;
  }
  return false;
}

export function addNotification(userId: string, title: string, message: string, type: string): HomeNotification {
  if (!currentStore.notifications) {
    currentStore.notifications = [];
  }
  
  const newNotification: HomeNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    userId,
    title,
    message,
    timestamp: new Date().toISOString(),
    type,
    readBy: []
  };
  
  currentStore.notifications.unshift(newNotification);
  // Cap at 50 notifications
  if (currentStore.notifications.length > 50) {
    const popped = currentStore.notifications.slice(50);
    currentStore.notifications = currentStore.notifications.slice(0, 50);
    for (const item of popped) {
      safeFirestoreWrite(() => deleteDoc(doc(firestore!, "notifications", item.id)), "deleting old notification");
    }
  }
  
  saveToDisk();

  // Asynchronously save to Firestore notifications collection
  const cleanCode = getActiveHomeCode();
  safeFirestoreWrite(
    () => setDoc(doc(firestore!, "notifications", newNotification.id), {
      ...newNotification,
      homeCode: cleanCode
    }),
    "saving notification"
  );

  return newNotification;
}

export function markNotificationsAsRead(userId: string, ids?: string[]): { success: boolean } {
  if (!currentStore.notifications) {
    currentStore.notifications = [];
    return { success: true };
  }
  
  currentStore.notifications = currentStore.notifications.map(notif => {
    if (!ids || ids.includes(notif.id)) {
      if (!notif.readBy.includes(userId)) {
        const updated = {
          ...notif,
          readBy: [...notif.readBy, userId]
        };
        // Asynchronously update Firestore notification
        const cleanCode = getActiveHomeCode();
        safeFirestoreWrite(
          () => setDoc(doc(firestore!, "notifications", notif.id), {
            ...updated,
            homeCode: cleanCode
          }),
          "updating notification"
        );
        return updated;
      }
    }
    return notif;
  });
  
  saveToDisk();
  return { success: true };
}

export function deleteNotification(id: string): boolean {
  if (!currentStore.notifications) return false;
  const initialLen = currentStore.notifications.length;
  currentStore.notifications = currentStore.notifications.filter(n => n.id !== id);
  if (currentStore.notifications.length !== initialLen) {
    saveToDisk();
    safeFirestoreWrite(
      () => deleteDoc(doc(firestore!, "notifications", id)),
      "deleting notification"
    );
    return true;
  }
  return false;
}

export function clearNotifications(): { success: boolean } {
  const oldNotifications = currentStore.notifications || [];
  currentStore.notifications = [];
  saveToDisk();
  for (const notif of oldNotifications) {
    safeFirestoreWrite(
      () => deleteDoc(doc(firestore!, "notifications", notif.id)),
      "clearing notification"
    );
  }
  return { success: true };
}

export function getUserName(userId: string): string {
  const store = getStore();
  const user = store.users.find(u => u.id === userId);
  if (user) return user.name;
  if (userId === "mafe") return "Mafe";
  if (userId === "benja") return "Benja";
  return userId || "Alguien";
}

// Operations wrappers
export function addCalendarItem(item: Omit<CalendarItem, "id">): CalendarItem {
  const newItem: CalendarItem = {
    ...item,
    id: `cal-${Date.now()}`
  };
  currentStore.calendarItems.push(newItem);
  saveToDisk();
  return newItem;
}

export function updateCalendarItem(id: string, updates: Partial<CalendarItem>): CalendarItem | null {
  const idx = currentStore.calendarItems.findIndex(i => i.id === id);
  if (idx === -1) return null;
  currentStore.calendarItems[idx] = { ...currentStore.calendarItems[idx], ...updates };
  saveToDisk();
  return currentStore.calendarItems[idx];
}

export function deleteCalendarItem(id: string): boolean {
  const initialLen = currentStore.calendarItems.length;
  currentStore.calendarItems = currentStore.calendarItems.filter(i => i.id !== id);
  const success = currentStore.calendarItems.length < initialLen;
  if (success) saveToDisk();
  return success;
}

export function addPet(pet: Omit<Pet, "id">): Pet {
  const newPet: Pet = {
    ...pet,
    id: `pet-${Date.now()}`,
    medical: pet.medical || { vaccinations: [], medications: [], allergies: [] },
    weightHistory: pet.weightHistory || [{ date: new Date().toISOString().split('T')[0], weight: pet.weight }]
  };
  currentStore.pets.push(newPet);
  saveToDisk();
  return newPet;
}

export function updatePet(id: string, updates: Partial<Pet>): Pet | null {
  const idx = currentStore.pets.findIndex(p => p.id === id);
  if (idx === -1) return null;
  currentStore.pets[idx] = { ...currentStore.pets[idx], ...updates };
  saveToDisk();
  return currentStore.pets[idx];
}

export function deletePet(id: string): boolean {
  const initialLen = currentStore.pets.length;
  currentStore.pets = currentStore.pets.filter(p => p.id !== id);
  const success = currentStore.pets.length < initialLen;
  if (success) saveToDisk();
  return success;
}

export function addPetVaccine(petId: string, vaccine: Vaccination): Pet | null {
  const pet = currentStore.pets.find(p => p.id === petId);
  if (!pet) return null;
  pet.medical.vaccinations.push(vaccine);
  
  // also inject to central calendar
  addCalendarItem({
    title: `💉 Vacuna para ${pet.name}: ${vaccine.name}`,
    description: vaccine.notes || `Vacuna preventiva`,
    type: "event",
    date: vaccine.date,
    assignedTo: "home",
    status: "pending"
  });

  if (vaccine.nextDueDate) {
    addCalendarItem({
      title: `🩺 Límite próximo de vacuna para ${pet.name}: ${vaccine.name}`,
      description: `Siguiente dosis requerida.`,
      type: "reminder",
      date: vaccine.nextDueDate,
      assignedTo: "home",
      status: "pending"
    });
  }

  saveToDisk();
  return pet;
}

export function addPetMedication(petId: string, med: Medication): Pet | null {
  const pet = currentStore.pets.find(p => p.id === petId);
  if (!pet) return null;
  pet.medical.medications.push(med);

  // also inject medication to central calendar for start date
  addCalendarItem({
    title: `💊 Iniciar medicina para ${pet.name}: ${med.name}`,
    description: `Dosis: ${med.dosage}. Horario: ${med.schedule}.`,
    type: "task",
    date: med.startDate,
    assignedTo: "home",
    status: "pending"
  });

  saveToDisk();
  return pet;
}

export function logPetWeight(petId: string, weight: number): Pet | null {
  const pet = currentStore.pets.find(p => p.id === petId);
  if (!pet) return null;
  pet.weight = weight;
  if (!pet.weightHistory) pet.weightHistory = [];
  pet.weightHistory.push({
    date: new Date().toISOString().split('T')[0],
    weight
  });
  saveToDisk();
  return pet;
}

export function addPlant(plant: any): Plant {
  if (!currentStore.plants) currentStore.plants = [];
  const newPlant: Plant = {
    ...plant,
    id: plant.id || `plant-${Date.now()}`,
    careHistory: plant.careHistory || [],
    aiDiagnoses: plant.aiDiagnoses || []
  };
  const existingIdx = currentStore.plants.findIndex(p => p.id === newPlant.id || p.name.toLowerCase().trim() === newPlant.name.toLowerCase().trim());
  if (existingIdx >= 0) {
    currentStore.plants[existingIdx] = { ...currentStore.plants[existingIdx], ...newPlant };
  } else {
    currentStore.plants.push(newPlant);
  }
  saveToDisk();
  return newPlant;
}

export function deletePlant(id: string): boolean {
  if (!currentStore.plants) currentStore.plants = [];
  const initialLen = currentStore.plants.length;
  currentStore.plants = currentStore.plants.filter(p => p.id !== id);
  const success = currentStore.plants.length < initialLen;
  if (success) saveToDisk();
  return success;
}

export function updatePlant(id: string, updates: Partial<Plant>): Plant | null {
  if (!currentStore.plants) currentStore.plants = [];
  const idx = currentStore.plants.findIndex(p => p.id === id);
  if (idx === -1) return null;
  currentStore.plants[idx] = { ...currentStore.plants[idx], ...updates };
  saveToDisk();
  return currentStore.plants[idx];
}

// Perform plant action (watering, etc.)
export function addPlantAction(plantId: string, actionType: PlantAction["type"], user: UserId): Plant | null {
  if (!currentStore.plants) currentStore.plants = [];
  const plant = currentStore.plants.find(p => p.id === plantId);
  if (!plant) return null;
  
  const action: PlantAction = {
    id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    type: actionType,
    date: new Date().toISOString().split('T')[0],
    performedBy: user
  };
  
  if (!plant.careHistory) plant.careHistory = [];
  plant.careHistory.unshift(action); // Put at top of list

  saveToDisk();
  return plant;
}

// Bulk Plant Action
export function bulkPlantAction(plantIds: string[], actionType: PlantAction["type"], user: UserId): Plant[] {
  const updatedPlants: Plant[] = [];
  plantIds.forEach(id => {
    const res = addPlantAction(id, actionType, user);
    if (res) updatedPlants.push(res);
  });
  return updatedPlants;
}

export function addPlantDiagnosis(plantId: string, diagnosis: Omit<PlantDiagnosis, "id" | "date">, species?: string): Plant | null {
  if (!currentStore.plants) currentStore.plants = [];
  const plant = currentStore.plants.find(p => p.id === plantId);
  if (!plant) return null;

  if (species) {
    plant.species = species;
  }

  const newDiag: PlantDiagnosis = {
    ...diagnosis,
    id: `diag-${Date.now()}`,
    date: new Date().toISOString().split('T')[0]
  };

  if (!plant.aiDiagnoses) plant.aiDiagnoses = [];
  plant.aiDiagnoses.unshift(newDiag);
  saveToDisk();
  return plant;
}

export function addWish(wish: any): Wish {
  if (!currentStore.wishes) currentStore.wishes = [];
  const newWish: Wish = {
    ...wish,
    id: wish.id || `wish-${Date.now()}`
  };
  const existingIdx = currentStore.wishes.findIndex(w => w.id === newWish.id || w.name.toLowerCase().trim() === newWish.name.toLowerCase().trim());
  if (existingIdx >= 0) {
    currentStore.wishes[existingIdx] = { ...currentStore.wishes[existingIdx], ...newWish };
  } else {
    currentStore.wishes.push(newWish);
  }
  saveToDisk();
  return newWish;
}

export function updateWish(id: string, updates: Partial<Wish>): Wish | null {
  const idx = currentStore.wishes.findIndex(w => w.id === id);
  if (idx === -1) return null;
  currentStore.wishes[idx] = { ...currentStore.wishes[idx], ...updates };
  saveToDisk();
  return currentStore.wishes[idx];
}

export function deleteWish(id: string): boolean {
  const initialLen = currentStore.wishes.length;
  currentStore.wishes = currentStore.wishes.filter(w => w.id !== id);
  const success = currentStore.wishes.length < initialLen;
  if (success) saveToDisk();
  return success;
}

export function addMemory(memory: Omit<Memory, "id">): Memory {
  const newMemory: Memory = {
    ...memory,
    id: `mem-${Date.now()}`,
    highlights: memory.highlights || []
  };
  currentStore.memories.unshift(newMemory); // newest memories first
  saveToDisk();
  return newMemory;
}

export function deleteMemory(id: string): boolean {
  const initialLen = currentStore.memories.length;
  currentStore.memories = currentStore.memories.filter(m => m.id !== id);
  const success = currentStore.memories.length < initialLen;
  if (success) saveToDisk();
  return success;
}

export function updateMemory(id: string, updates: Partial<Memory>): Memory | null {
  const index = currentStore.memories.findIndex(m => m.id === id);
  if (index === -1) return null;
  currentStore.memories[index] = { ...currentStore.memories[index], ...updates };
  saveToDisk();
  return currentStore.memories[index];
}

export function addDocument(doc: Omit<HomeDocument, "id" | "dateUploaded">): HomeDocument {
  const newDoc: HomeDocument = {
    ...doc,
    id: `doc-${Date.now()}`,
    dateUploaded: new Date().toISOString().split('T')[0]
  };
  currentStore.documents.unshift(newDoc);
  saveToDisk();
  return newDoc;
}

export function deleteDocument(id: string): boolean {
  const initialLen = currentStore.documents.length;
  currentStore.documents = currentStore.documents.filter(d => d.id !== id);
  const success = currentStore.documents.length < initialLen;
  if (success) saveToDisk();
  return success;
}

export function updateHomeSettings(updates: Partial<Home>): Home {
  currentStore.home = {
    ...currentStore.home,
    ...updates,
    settings: {
      ...currentStore.home.settings,
      ...(updates.settings || {})
    }
  };
  saveToDisk();
  return currentStore.home;
}

// ==========================================
// NEW EMOTIONAL INPUT & PERSONALITY ENGINE HELPERS
// ==========================================

export function addCheckin(checkin: DailyEmotionalCheckin): DailyEmotionalCheckin {
  if (!currentStore.checkins) currentStore.checkins = [];
  
  // Clean duplicate checkins for same user on same day
  currentStore.checkins = currentStore.checkins.filter(
    c => !(c.userId === checkin.userId && c.date === checkin.date)
  );
  
  currentStore.checkins.push(checkin);
  saveToDisk();
  return checkin;
}

export function getCheckins(date?: string): DailyEmotionalCheckin[] {
  const list = currentStore.checkins || [];
  if (date) {
    return list.filter(c => c.date === date);
  }
  return list;
}

export function getEmotionCheckins(): EmotionCheckin[] {
  if (!currentStore.emotionCheckins) {
    currentStore.emotionCheckins = [];
  }
  return currentStore.emotionCheckins;
}

export function saveEmotionCheckins(checkins: EmotionCheckin[]): EmotionCheckin[] {
  currentStore.emotionCheckins = checkins;
  saveToDisk();
  return currentStore.emotionCheckins;
}

export function getCustomEmotions(): CustomEmotion[] {
  if (!currentStore.customEmotions) {
    currentStore.customEmotions = [];
  }
  return currentStore.customEmotions;
}

export function saveCustomEmotions(customEmotions: CustomEmotion[]): CustomEmotion[] {
  currentStore.customEmotions = customEmotions;
  saveToDisk();
  return currentStore.customEmotions;
}

export function calculateTransitData(userId: string, dateStr: string) {
  let hash = 0;
  const seed = userId + dateStr;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  hash = Math.abs(hash);
  return {
    emotionalSensitivity: (hash % 41) + 50, // 50 to 90
    communicationEnergy: ((hash >> 2) % 41) + 50, // 50 to 90
    homeHarmonyInfluence: ((hash >> 4) % 36) + 65, // 65 to 100
  };
}

export function getAstroProfile(userId: string, dateStr: string): AstroProfile {
  const user = currentStore.users.find(u => u.id === userId);
  const sunSign = user?.zodiacSign || "Cáncer ♋";
  const moonSign = user?.lunarSign || "Acuario ♒";
  const risingSign = user?.ascendantSign || "Leo ♌";
  
  const transitData = calculateTransitData(userId, dateStr);
  
  return {
    userId,
    sunSign,
    moonSign,
    risingSign,
    transitData
  };
}

export function getHomePersonalityState(dateStr: string): HomePersonalityState {
  // 1. Calculate emotionalInput based on check-ins of today or last 10 entries
  const checkinsToday = getCheckins(dateStr);
  const targetCheckins = checkinsToday.length > 0 ? checkinsToday : (currentStore.checkins || []).slice(-10);
  
  let emotionalInput = 75;
  if (targetCheckins.length > 0) {
    const scores = targetCheckins.map(c => {
      let mVal = c.mood === "calm" ? 85 : c.mood === "energetic" ? 100 : c.mood === "sensitive" ? 65 : 45; // tired
      let cVal = c.connectionFeeling === "high" ? 100 : c.connectionFeeling === "medium" ? 70 : 30;
      let pVal = c.homePerception === "light" ? 100 : c.homePerception === "normal" ? 75 : 40; // heavy
      return (mVal + cVal + pVal) / 3;
    });
    const sum = scores.reduce((a, b) => a + b, 0);
    emotionalInput = sum / scores.length;
  }

  // 2. Calculate homeState score (tasks, plants, pets alerts)
  const pendingTasks = currentStore.calendarItems.filter(i => i.type === "task" && i.status === "pending").length;
  
  let dryPlantsCount = 0;
  if (!currentStore.plants) currentStore.plants = [];
  currentStore.plants.forEach(p => {
    const lastWater = [...(p.careHistory || [])].filter(h => h.type === 'water')[0];
    if (lastWater) {
      const diff = Math.floor(Math.abs(new Date().getTime() - new Date(lastWater.date).getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 6) dryPlantsCount++;
    } else {
      dryPlantsCount++;
    }
  });

  let petVacAlerts = 0;
  currentStore.pets.forEach(p => {
    const urgent = (p.medical?.vaccinations || []).filter(v => {
      if (!v.nextDueDate) return false;
      const days = Math.floor((new Date(v.nextDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 30;
    });
    petVacAlerts += urgent.length;
  });

  const homeStateScore = Math.max(15, 100 - (pendingTasks * 5) - (dryPlantsCount * 8) - (petVacAlerts * 15));

  // 3. Calculate astroInfluence (avg of all registered users transits)
  const users = currentStore.users;
  let astroInfluence = 75;
  if (users.length > 0) {
    const sum = users.reduce((acc, u) => acc + calculateTransitData(u.id, dateStr).homeHarmonyInfluence, 0);
    astroInfluence = sum / users.length;
  }

  // 4. Calculate historicalStability
  let baseStability = 88;
  const lastCheckins = (currentStore.checkins || []).slice(-15);
  const heavyCount = lastCheckins.filter(c => c.homePerception === "heavy").length;
  const tiredCount = lastCheckins.filter(c => c.mood === "tired").length;
  baseStability -= (heavyCount * 8) + (tiredCount * 4);
  const historicalStability = Math.max(35, Math.min(100, baseStability));

  // 5. Calculate userSync
  let userSync = 80;
  const checkinsByDateGrouped = checkinsToday;
  if (checkinsByDateGrouped.length >= 2) {
    // compare user checks
    const moods = checkinsByDateGrouped.map(c => c.mood);
    const uniqueMoods = new Set(moods);
    if (uniqueMoods.size === 1) {
      userSync = 98; // perfectly synced!
    } else if (uniqueMoods.size === 2 && moods.includes("calm") && moods.includes("energetic")) {
      userSync = 85; // complementary good vibes
    } else if (moods.includes("tired") && moods.includes("sensitive")) {
      userSync = 78;
    } else {
      userSync = 60; // slightly desynchronized today
    }
  } else if (currentStore.checkins && currentStore.checkins.length > 0) {
    // search average of last feel connections
    const connections = currentStore.checkins.slice(-8).map(c => c.connectionFeeling === "high" ? 95 : c.connectionFeeling === "medium" ? 75 : 45);
    userSync = connections.reduce((a, b) => a + b, 0) / connections.length;
  }

  // Algorithm Base
  const harmonyIndex = Math.round(
    emotionalInput * 0.3 +
    homeStateScore * 0.25 +
    astroInfluence * 0.2 +
    historicalStability * 0.15 +
    userSync * 0.1
  );

  const emotionalStability = Math.round(historicalStability * 0.7 + emotionalInput * 0.3);
  const socialConnection = Math.round(userSync * 0.6 + emotionalInput * 0.4);
  const activityLevel = Math.round(Math.max(10, 100 - homeStateScore) * 0.5 + (currentStore.calendarItems.length > 0 ? 70 : 40));
  const stressResistance = Math.round(homeStateScore * 0.7 + historicalStability * 0.3);

  const scores: HomePersonality = {
    emotionalStability,
    socialConnection,
    activityLevel,
    stressResistance,
    harmonyIndex
  };

  // Classify personality
  let currentPersonality: HomePersonalityState["currentPersonality"] = "balanced";
  let relationshipDynamic: HomePersonalityState["relationshipDynamic"] = "en crecimiento";
  let evolutionIdentity = "";

  if (harmonyIndex < 48) {
    currentPersonality = "intense";
    evolutionIdentity = "El nido muestra fricción y ciclos intensos. Tu asistente miau recomienda mimos urgentes.";
  } else if (harmonyIndex < 70 && emotionalStability >= 75) {
    currentPersonality = "reflective";
    evolutionIdentity = "Un halo místico rodea el nido. Es tiempo de introspección, siestas y música suave.";
  } else if (activityLevel >= 75) {
    currentPersonality = "active";
    evolutionIdentity = "Energía cósmica disparada. Lista de quehaceres fluyendo con ritmo alto.";
  } else if (harmonyIndex >= 70 && socialConnection >= 78) {
    currentPersonality = "connected";
    evolutionIdentity = "Oleada de ronroneos profundos. Los corazones vibran en tierna sincronía miau.";
  } else if (harmonyIndex >= 72 && emotionalStability >= 75) {
    currentPersonality = "calm";
    evolutionIdentity = "Paz absoluta en las esquinas del nido. Un rincón ideal para estirar la colita.";
  } else {
    currentPersonality = "balanced";
    evolutionIdentity = "Un balance estelar perfecto. El nido respira tranquilidad sincera.";
  }

  // Classify relationship dynamic
  if (socialConnection >= 85) {
    relationshipDynamic = "sincronizados";
  } else if (socialConnection >= 70) {
    relationshipDynamic = "complementarios";
  } else if (socialConnection < 50) {
    relationshipDynamic = "desalineados";
  } else {
    relationshipDynamic = "en crecimiento";
  }

  return {
    currentPersonality,
    scores,
    relationshipDynamic,
    evolutionIdentity,
    updatedAt: dateStr
  };
}

export function getBudgetStore() {
  if (!currentStore.budgetItems) currentStore.budgetItems = [];
  if (!currentStore.budgetEstimates) currentStore.budgetEstimates = [];
  if (!currentStore.budgetTemplates) currentStore.budgetTemplates = [];
  if (!currentStore.budgetAccounts) currentStore.budgetAccounts = [];
  if (!currentStore.closedFortnights) currentStore.closedFortnights = [];

  if (!currentStore.hasSeededAccounts) {
    currentStore.budgetAccounts = [];
    currentStore.hasSeededAccounts = true;
    saveToDisk();
  }
  return {
    items: currentStore.budgetItems,
    estimates: currentStore.budgetEstimates,
    templates: currentStore.budgetTemplates,
    accounts: currentStore.budgetAccounts,
    closedFortnights: currentStore.closedFortnights
  };
}

export function addBudgetItem(item: Omit<BudgetItem, "id"> & { id?: string }): BudgetItem {
  if (!currentStore.budgetItems) currentStore.budgetItems = [];
  if (!currentStore.budgetAccounts) currentStore.budgetAccounts = [];
  if (!currentStore.closedFortnights) currentStore.closedFortnights = [];

  if (currentStore.closedFortnights.includes(item.fortnightId)) {
    throw new Error("Miau, esta quincena está cerrada y no se pueden añadir más registros.");
  }

  const itemId = item.id || ("item-" + Date.now() + "-" + Math.floor(Math.random() * 1000));
  const newItem: BudgetItem = {
    ...item,
    id: itemId
  };
  currentStore.budgetItems.push(newItem);

  // Update specific account balance unless it is an automated rollover transfer
  if (!item.isLeftoverTransfer) {
    if (item.category === "Transferencia" && item.destinationAccount) {
      // Transfer between accounts!
      const sourceAccount = currentStore.budgetAccounts.find(acc => acc.id === item.account || acc.name === item.account);
      const destAccount = currentStore.budgetAccounts.find(acc => acc.id === item.destinationAccount || acc.name === item.destinationAccount);
      if (sourceAccount) {
        sourceAccount.balance -= item.amount;
      }
      if (destAccount) {
        destAccount.balance += item.amount;
      }
    } else {
      const account = currentStore.budgetAccounts.find(acc => acc.id === item.account || acc.name === item.account);
      if (account) {
        if (item.type === "income") {
          account.balance += item.amount;
        } else {
          account.balance -= item.amount;
        }
      }
    }
  }

  saveToDisk();
  return newItem;
}

export function deleteBudgetItem(id: string): boolean {
  if (!currentStore.budgetItems) currentStore.budgetItems = [];
  if (!currentStore.budgetAccounts) currentStore.budgetAccounts = [];
  if (!currentStore.closedFortnights) currentStore.closedFortnights = [];
  
  const itemIndex = currentStore.budgetItems.findIndex(it => it.id === id);
  if (itemIndex === -1) return false;
  
  const item = currentStore.budgetItems[itemIndex];

  if (currentStore.closedFortnights.includes(item.fortnightId)) {
    throw new Error("Miau, esta quincena está cerrada y no se pueden modificar sus registros.");
  }
  
  // Update account balance (reverse action) unless it was an automated rollover transfer
  if (!item.isLeftoverTransfer) {
    if (item.category === "Transferencia" && item.destinationAccount) {
      // Reverse transfer!
      const sourceAccount = currentStore.budgetAccounts.find(acc => acc.id === item.account || acc.name === item.account);
      const destAccount = currentStore.budgetAccounts.find(acc => acc.id === item.destinationAccount || acc.name === item.destinationAccount);
      if (sourceAccount) {
        sourceAccount.balance += item.amount;
      }
      if (destAccount) {
        destAccount.balance -= item.amount;
      }
    } else {
      const account = currentStore.budgetAccounts.find(acc => acc.id === item.account || acc.name === item.account);
      if (account) {
        if (item.type === "income") {
          account.balance -= item.amount;
        } else {
          account.balance += item.amount;
        }
      }
    }
  }

  currentStore.budgetItems.splice(itemIndex, 1);
  saveToDisk();
  return true;
}

export function updateBudgetItem(id: string, updatedFields: Partial<BudgetItem>): BudgetItem {
  if (!currentStore.budgetItems) currentStore.budgetItems = [];
  if (!currentStore.budgetAccounts) currentStore.budgetAccounts = [];
  if (!currentStore.closedFortnights) currentStore.closedFortnights = [];

  const itemIndex = currentStore.budgetItems.findIndex(it => it.id === id);
  if (itemIndex === -1) throw new Error("Miau, no se encontró el movimiento a editar.");

  const oldItem = currentStore.budgetItems[itemIndex];

  if (currentStore.closedFortnights.includes(oldItem.fortnightId)) {
    throw new Error("Miau, esta quincena está cerrada y no se pueden modificar sus registros.");
  }

  // Create the updated item object
  const newItem: BudgetItem = {
    ...oldItem,
    ...updatedFields,
    id // keep same id
  };

  if (currentStore.closedFortnights.includes(newItem.fortnightId)) {
    throw new Error("Miau, la quincena destino está cerrada y no se pueden guardar registros en ella.");
  }

  // 1. Revert old item's account balance changes
  if (!oldItem.isLeftoverTransfer) {
    if (oldItem.category === "Transferencia" && oldItem.destinationAccount) {
      const sourceAccount = currentStore.budgetAccounts.find(acc => acc.id === oldItem.account || acc.name === oldItem.account);
      const destAccount = currentStore.budgetAccounts.find(acc => acc.id === oldItem.destinationAccount || acc.name === oldItem.destinationAccount);
      if (sourceAccount) sourceAccount.balance += oldItem.amount;
      if (destAccount) destAccount.balance -= oldItem.amount;
    } else {
      const account = currentStore.budgetAccounts.find(acc => acc.id === oldItem.account || acc.name === oldItem.account);
      if (account) {
        if (oldItem.type === "income") {
          account.balance -= oldItem.amount;
        } else {
          account.balance += oldItem.amount;
        }
      }
    }
  }

  // 2. Apply new item's account balance changes
  if (!newItem.isLeftoverTransfer) {
    if (newItem.category === "Transferencia" && newItem.destinationAccount) {
      const sourceAccount = currentStore.budgetAccounts.find(acc => acc.id === newItem.account || acc.name === newItem.account);
      const destAccount = currentStore.budgetAccounts.find(acc => acc.id === newItem.destinationAccount || acc.name === newItem.destinationAccount);
      if (sourceAccount) sourceAccount.balance -= newItem.amount;
      if (destAccount) destAccount.balance += newItem.amount;
    } else {
      const account = currentStore.budgetAccounts.find(acc => acc.id === newItem.account || acc.name === newItem.account);
      if (account) {
        if (newItem.type === "income") {
          account.balance += newItem.amount;
        } else {
          account.balance -= newItem.amount;
        }
      }
    }
  }

  // 3. Update in store
  currentStore.budgetItems[itemIndex] = newItem;

  saveToDisk();
  return newItem;
}

export function addBudgetAccount(account: Omit<BudgetAccount, "id">): BudgetAccount {
  if (!currentStore.budgetAccounts) currentStore.budgetAccounts = [];
  const newAccount: BudgetAccount = {
    ...account,
    id: "acc-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
  };
  currentStore.budgetAccounts.push(newAccount);
  saveToDisk();
  return newAccount;
}

export function deleteBudgetAccount(id: string): boolean {
  if (!currentStore.budgetAccounts) currentStore.budgetAccounts = [];
  const initialLength = currentStore.budgetAccounts.length;
  currentStore.budgetAccounts = currentStore.budgetAccounts.filter(acc => acc.id !== id);
  const success = currentStore.budgetAccounts.length < initialLength;
  if (success) {
    saveToDisk();
  }
  return success;
}

export function addBudgetTemplate(template: Omit<BudgetTemplate, "id">): BudgetTemplate {
  if (!currentStore.budgetTemplates) currentStore.budgetTemplates = [];
  const newTemplate: BudgetTemplate = {
    ...template,
    id: "template-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
  };
  currentStore.budgetTemplates.push(newTemplate);
  saveToDisk();
  return newTemplate;
}

export function updateBudgetTemplate(id: string, updated: Omit<BudgetTemplate, "id">): BudgetTemplate | null {
  if (!currentStore.budgetTemplates) currentStore.budgetTemplates = [];
  const idx = currentStore.budgetTemplates.findIndex(t => t.id === id);
  if (idx === -1) return null;
  const newTemplate: BudgetTemplate = {
    ...updated,
    id
  };
  currentStore.budgetTemplates[idx] = newTemplate;
  saveToDisk();
  return newTemplate;
}

export function deleteBudgetTemplate(id: string): boolean {
  if (!currentStore.budgetTemplates) currentStore.budgetTemplates = [];
  const initialLength = currentStore.budgetTemplates.length;
  currentStore.budgetTemplates = currentStore.budgetTemplates.filter(t => t.id !== id);
  const success = currentStore.budgetTemplates.length < initialLength;
  if (success) {
    saveToDisk();
  }
  return success;
}

export function applyBudgetTemplate(templateId: string, fortnightId: string): BudgetEstimate[] {
  if (!currentStore.budgetEstimates) currentStore.budgetEstimates = [];
  if (!currentStore.budgetTemplates) currentStore.budgetTemplates = [];
  
  const template = currentStore.budgetTemplates.find(t => t.id === templateId);
  if (!template) {
    throw new Error("Template no encontrada");
  }
  
  // Clear old estimates for this fortnightId
  currentStore.budgetEstimates = currentStore.budgetEstimates.filter(est => est.fortnightId !== fortnightId);
  
  // Map and generate new estimates
  const newEstimates: BudgetEstimate[] = template.items.map((it, idx) => ({
    id: `est-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
    fortnightId: fortnightId,
    category: it.category,
    customName: it.customName || "",
    type: it.type,
    amount: it.amount,
    account: it.account || undefined
  }));
  
  currentStore.budgetEstimates = [...currentStore.budgetEstimates, ...newEstimates];
  saveToDisk();
  return newEstimates;
}

export function closeBudgetFortnight(
  fortnightId: string, 
  nextFortnightId: string, 
  leftoverAmount: number, 
  targetAccount: string
): { success: boolean; closedFortnights: string[] } {
  if (!currentStore.closedFortnights) currentStore.closedFortnights = [];
  if (!currentStore.budgetItems) currentStore.budgetItems = [];

  if (!currentStore.closedFortnights.includes(fortnightId)) {
    currentStore.closedFortnights.push(fortnightId);
  }

  // Remove any existing rollover item from prior tests so each fortnight cycle always starts at zero
  currentStore.budgetItems = currentStore.budgetItems.filter(it => !it.isLeftoverTransfer);

  saveToDisk();
  return {
    success: true,
    closedFortnights: currentStore.closedFortnights
  };
}

export function openBudgetFortnight(fortnightId: string): { success: boolean; closedFortnights: string[] } {
  if (!currentStore.closedFortnights) currentStore.closedFortnights = [];
  if (!currentStore.budgetItems) currentStore.budgetItems = [];

  currentStore.closedFortnights = currentStore.closedFortnights.filter(f => f !== fortnightId);
  
  // Clean up rollover transfer associated with this fortnight
  currentStore.budgetItems = currentStore.budgetItems.filter(it => it.id !== `rollover-${fortnightId}`);

  saveToDisk();
  return {
    success: true,
    closedFortnights: currentStore.closedFortnights
  };
}

export function clearBudgetStore(): {
  items: BudgetItem[];
  estimates: BudgetEstimate[];
  templates: BudgetTemplate[];
  accounts: BudgetAccount[];
  closedFortnights: string[];
} {
  currentStore.budgetItems = [];
  currentStore.budgetEstimates = [];
  currentStore.budgetTemplates = [];
  currentStore.budgetAccounts = [];
  currentStore.closedFortnights = [];
  currentStore.hasSeededAccounts = true;

  saveToDisk();
  return {
    items: [],
    estimates: [],
    templates: [],
    accounts: [],
    closedFortnights: []
  };
}

// ==========================================
// SALUD DEL HOGAR (WELLNESS) CORE LOGIC
// ==========================================

const QUESTIONS_CONEXION: Omit<DailyQuestion, "id">[] = [
  { text: "¿Te sentiste querido(a) hoy en el nido? ❤️", category: "conexion" },
  { text: "¿Disfrutaste pasar tiempo juntos y compartir hoy? 👩‍❤️‍👨", category: "conexion" },
  { text: "¿Te sentiste realmente escuchado(a) hoy? 🗣️", category: "conexion" },
  { text: "¿Sentiste apoyo cuando lo necesitaste del otro? 🫂", category: "conexion" },
  { text: "¿Te sentiste cercano(a) a tu pareja hoy? 💞", category: "conexion" },
  { text: "¿Compartimos alguna risa o sonrisa sincera hoy? 😊", category: "conexion" },
  { text: "¿Sentiste paciencia y ternura por parte del otro hoy? 🌸", category: "conexion" },
  { text: "¿Sentiste que tu lenguaje de amor fue correspondido? 💌", category: "conexion" },
  { text: "¿Disfrutaste nuestros pequeños gestos o caricias de hoy? 💋", category: "conexion" },
  { text: "¿Sientes gratitud por tener a tu compañero(a) a tu lado hoy? ✨", category: "conexion" }
];

const QUESTIONS_ARMONIA: Omit<DailyQuestion, "id">[] = [
  { text: "¿Cómo sentiste el ambiente y energía del hogar hoy? 🏡", category: "armonia" },
  { text: "¿Las tareas o quehaceres estuvieron equilibrados hoy? 🧹", category: "armonia" },
  { text: "¿Te sentiste cómodo(a) y en paz física en casa? 🛋️", category: "armonia" },
  { text: "¿La organización diaria de hoy fluyó con adecuación? 📅", category: "armonia" },
  { text: "¿Sentiste respeto y colaboración en las decisiones de hoy? 🧼", category: "armonia" },
  { text: "¿Colaboramos juntos de manera fluida y amorosa hoy? 🧺", category: "armonia" },
  { text: "¿Te agradó cómo organizamos las comidas y la cena hoy? 🍲", category: "armonia" },
  { text: "¿Se sintió la casa limpia, despejada y ordenada hoy? 🪟", category: "armonia" },
  { text: "¿Respetamos los espacios de retiro individual del otro? 🔑", category: "armonia" },
  { text: "¿Sentiste que el día fluyó sin presiones en lo doméstico? 🌊", category: "armonia" }
];

const QUESTIONS_BIENESTAR: Omit<DailyQuestion, "id">[] = [
  { text: "¿Cómo estuvo tu nivel de energía personal hoy? ⚡", category: "bienestar" },
  { text: "¿Cómo estuvo tu estado de ánimo en general hoy? ⛅", category: "bienestar" },
  { text: "¿Tuviste suficiente tiempo para descansar y respirar? 😴", category: "bienestar" },
  { text: "¿Cómo lograste manejar el estrés o presión de la jornada? 🧘", category: "bienestar" },
  { text: "¿Disfrutaste un momento de desconexión o autocuidado hoy? 🛀", category: "bienestar" },
  { text: "¿Te alimentaste bien y tomaste suficiente agua hoy? 💧", category: "bienestar" },
  { text: "¿Sentiste calidad en tu descanso nocturno anterior? 🌙", category: "bienestar" },
  { text: "¿Lograste desconectar tu mente del trabajo o responsabilidades? 🚶", category: "bienestar" },
  { text: "¿Tuviste espacio libre para tus propias aficiones individuales? 🎮", category: "bienestar" },
  { text: "¿Sentiste calma y balance emocional en tu interior hoy? 🧠", category: "bienestar" }
];

const QUESTIONS_REFLEXION: Omit<DailyQuestion, "id">[] = [
  { text: "¿Qué momento te hizo reír o sentir feliz estando juntos esta semana? 🌟", category: "reflexion" },
  { text: "¿Qué gesto, palabra o ayuda agradeces profundamente del otro esta semana? 🙏", category: "reflexion" },
  { text: "¿Qué actividad lúdica o salida te entusiasmaría planear con tu pareja este mes? 🗺️", category: "reflexion" },
  { text: "¿Qué fue el logro o momento de tranquilidad más lindo que vivieron esta semana? 🌈", category: "reflexion" },
  { text: "¿Qué pequeño detalle del otro hoy te hizo sonreír u olvidar el cansancio? 💖", category: "reflexion" },
  { text: "¿Cuál ha sido tu recuerdo preferido en nuestro nido de amor últimamente? 💭", category: "reflexion" },
  { text: "¿Hay algún sueño o proyecto doméstico que te entusiasme iniciar pronto juntos? 🚀", category: "reflexion" },
  { text: "¿De qué manera te gustaría que te abracen o consientan más en estos días? 🧸", category: "reflexion" },
  { text: "¿Qué aspecto de la forma de ser del otro te enamoró un poco más esta semana? 😍", category: "reflexion" },
  { text: "¿Qué palabra o frase define la calidez de nuestro nido en estos momentos? ✏️", category: "reflexion" }
];

const CHALLENGES_CONEXION: string[] = [
  "Cocinen juntos un plato totalmente nuevo usando ingredientes sorpresa 🍲",
  "Tengan una noche de películas o series sin celulares ni pantallas secundarias 🎬",
  "Tengan una conversación profunda de 15 minutos solo de metas y sueños futuros ☕",
  "Planeen y agenden una actividad o salida romántica especial para el fin de semana 🗺️",
  "Léanse un cuento, libro o artículo interesante en voz alta recostados juntos 📖",
  "Dense un abrazo continuo y silencioso de exactamente dos minutos antes de dormir 🫂",
  "Compartan un té o café por la mañana conversando sin mirar el celular ☀️"
];

const CHALLENGES_ARMONIA: string[] = [
  "Organicen y limpien juntos a fondo una repisa o espacio olvidado de casa 🧹",
  "Completen juntos una tarea pequeña de reparación o mantenimiento pendiente 🔧",
  "Depuren y limpien con música la cocina y saquen alimentos vencidos 🧼",
  "Reorganicen o redecoren juntos una zona o esquina para darle luz o plantas 🪴",
  "Limpien todo el sector de juguetes, mantitas y camita de vuestras mascotas 🐱🐾",
  "Dividan las responsabilidades de la semana visualmente en un tablero claro 📊",
  "Dediquen 10 minutos express juntos al final del día para dejar la sala impecable ✨"
];

const CHALLENGES_BIENESTAR: string[] = [
  "Salgan a caminar juntos durante 30 minutos sin prisa para ver el atardecer 🚶",
  "Realicen una rutina corta de 10 minutos de estiramientos o yoga suave 🧘",
  "Noche cero pantallas/redes sociales desde las 9:00 PM hasta el desayuno 🌙",
  "Preparen una botana o snack saludable y fresco para consentir sus cuerpos 🍎",
  "Escuchen un álbum completo relajados mientras se relajan juntos 🎶🐾",
  "Escriban en un papel tres cosas personales sobre las que quisieran reducir estrés 📝",
  "Tomen un baño tibio o dense un tiempo largo de meditación o té relajante 💤"
];

// Seed or retrieve daily questions
export function getOrCreateDailyQuestions(dateStr: string, forceReflexion: boolean = false): DailyQuestion[] {
  if (!currentStore.dailyPools) currentStore.dailyPools = [];
  
  // Try to find existing pool
  const existing = currentStore.dailyPools.find(p => p.date === dateStr);
  if (existing && !forceReflexion) {
    return existing.questions;
  }

  // Generate new questions pool using dateStr as deterministic seed or randomise safely
  const seedNum = dateStr.split("-").reduce((acc, part) => acc + parseInt(part, 10), 0);
  
  // Categories: 1 Conexion, 1 Armonía, 1 Bienestar.
  // Exception: once a week or if forced, replace Conexion or Bienestar with Reflexión.
  const isDeepDay = forceReflexion || (seedNum % 7 === 0); 

  const qConex = QUESTIONS_CONEXION[seedNum % QUESTIONS_CONEXION.length];
  const qArmon = QUESTIONS_ARMONIA[(seedNum + 2) % QUESTIONS_ARMONIA.length];
  const qBiene = QUESTIONS_BIENESTAR[(seedNum + 5) % QUESTIONS_BIENESTAR.length];
  const qRefle = QUESTIONS_REFLEXION[(seedNum + 9) % QUESTIONS_REFLEXION.length];

  const chosenQuestions: DailyQuestion[] = [];

  // Question 1: Connection or Deep Reflection
  if (isDeepDay) {
    chosenQuestions.push({
      id: `q-ref-${dateStr}`,
      text: qRefle.text,
      category: "reflexion"
    });
  } else {
    chosenQuestions.push({
      id: `q-con-${dateStr}`,
      text: qConex.text,
      category: "conexion"
    });
  }

  // Question 2: Harmony
  chosenQuestions.push({
    id: `q-arm-${dateStr}`,
    text: qArmon.text,
    category: "armonia"
  });

  // Question 3: Well-being
  chosenQuestions.push({
    id: `q-bie-${dateStr}`,
    text: qBiene.text,
    category: "bienestar"
  });

  if (existing) {
    existing.questions = chosenQuestions;
  } else {
    currentStore.dailyPools.push({
      date: dateStr,
      questions: chosenQuestions
    });
  }
  
  saveToDisk();
  return chosenQuestions;
}

// Get or create weekly challenges
export function getOrCreateActiveChallenges(weekStartDate: string): SaludChallenge[] {
  if (!currentStore.saludChallenges) currentStore.saludChallenges = [];
  
  // Check if we have challenges for this week startDate
  const weekSeed = weekStartDate.split("-").reduce((acc, part) => acc + parseInt(part, 10), 0);
  const active = currentStore.saludChallenges.filter(ch => ch.id.startsWith(`ch-${weekStartDate}`));
  
  if (active.length >= 3) {
    return active;
  }

  // Delete old incomplete challenges to keep of latest weeks neat
  currentStore.saludChallenges = currentStore.saludChallenges.filter(ch => ch.completed || !ch.id.startsWith(`ch-`));

  // Choose 1 challenge per category
  const titleConex = CHALLENGES_CONEXION[weekSeed % CHALLENGES_CONEXION.length];
  const titleArmon = CHALLENGES_ARMONIA[(weekSeed + 3) % CHALLENGES_ARMONIA.length];
  const titleBiene = CHALLENGES_BIENESTAR[(weekSeed + 6) % CHALLENGES_BIENESTAR.length];

  const newChallenges: SaludChallenge[] = [
    {
      id: `ch-${weekStartDate}-conex`,
      title: titleConex,
      category: "conexion",
      completed: false
    },
    {
      id: `ch-${weekStartDate}-armon`,
      title: titleArmon,
      category: "armonia",
      completed: false
    },
    {
      id: `ch-${weekStartDate}-biene`,
      title: titleBiene,
      category: "bienestar",
      completed: false
    }
  ];

  currentStore.saludChallenges = [...currentStore.saludChallenges, ...newChallenges];
  saveToDisk();
  return newChallenges;
}

// Toggle or submit a challenge
export function toggleSaludChallenge(id: string, userId: UserId, completed: boolean): SaludChallenge | null {
  if (!currentStore.saludChallenges) currentStore.saludChallenges = [];
  const idx = currentStore.saludChallenges.findIndex(c => c.id === id);
  if (idx === -1) return null;
  
  currentStore.saludChallenges[idx].completed = completed;
  currentStore.saludChallenges[idx].completedAt = completed ? new Date().toISOString().split("T")[0] : undefined;
  currentStore.saludChallenges[idx].completedBy = completed ? userId : undefined;
  
  saveToDisk();
  return currentStore.saludChallenges[idx];
}

// Add custom challenge for the week
export function addCustomSaludChallenge(weekStartDate: string, title: string, category: "conexion" | "armonia" | "bienestar"): SaludChallenge {
  if (!currentStore.saludChallenges) currentStore.saludChallenges = [];
  const newChallenge: SaludChallenge = {
    id: `ch-${weekStartDate}-custom-${Date.now()}`,
    title: title,
    category: category,
    completed: false
  };
  currentStore.saludChallenges.push(newChallenge);
  saveToDisk();
  return newChallenge;
}

// Submit a daily question answer
export function submitQuestionAnswer(answer: DailyQuestionAnswer): DailyQuestionAnswer {
  if (!currentStore.dailyAnswers) currentStore.dailyAnswers = [];
  
  // Filter out duplicate answers for same date, question, and user
  currentStore.dailyAnswers = currentStore.dailyAnswers.filter(
    a => !(a.date === answer.date && a.questionId === answer.questionId && a.userId === answer.userId)
  );

  currentStore.dailyAnswers.push(answer);
  saveToDisk();
  return answer;
}

// Manage Frasco messages
export function addFrascoMessage(msg: Omit<FrascoMessage, "id" | "date">): FrascoMessage {
  if (!currentStore.frascoMessages) currentStore.frascoMessages = [];
  const emojis = ["💝", "🌸", "💌", "🏡", "🐱", "✨", "🌻", "🥛", "🍯"];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

  const newMsg: FrascoMessage = {
    ...msg,
    id: `fras-${Date.now()}`,
    date: new Date().toISOString(),
    emoji: msg.emoji || randomEmoji
  };
  
  currentStore.frascoMessages.push(newMsg);
  saveToDisk();
  return newMsg;
}

// Calculate Salud Indicators (weighted recent averages)
export function calculateSaludIndicators(monthStr?: string) {
  const answers = currentStore.dailyAnswers || [];
  const challenges = currentStore.saludChallenges || [];
  
  // Determine target month (YYYY-MM)
  let targetMonth = monthStr;
  if (!targetMonth) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    targetMonth = `${year}-${month}`;
  }

  // Base value is 50 (middle neutral) if no answers are registered yet, but we accumulate.
  let scoreConex = 50;
  let scoreArmon = 50;
  let scoreBiene = 50;

  const getAverageForCategory = (cat: "conexion" | "armonia" | "bienestar") => {
    let sum = 0;
    let count = 0;

    answers.forEach(ans => {
      if (ans.category !== cat || ans.score === undefined) return;
      // Check if answer falls in targetMonth or within the last 30 days (including yesterday)
      if (ans.date && (ans.date.startsWith(targetMonth) || ans.date >= targetMonth)) {
        // Convert 1-5 score to percentage: 5=100, 4=85, 3=70, 2=50, 1=30
        const percentageScore = ans.score === 5 ? 100 : ans.score === 4 ? 85 : ans.score === 3 ? 70 : ans.score === 2 ? 50 : 30;
        sum += percentageScore;
        count++;
      }
    });

    return count > 0 ? (sum / count) : null;
  };

  const avgConex = getAverageForCategory("conexion");
  const avgArmon = getAverageForCategory("armonia");
  const avgBiene = getAverageForCategory("bienestar");

  if (avgConex !== null) scoreConex = avgConex;
  if (avgArmon !== null) scoreArmon = avgArmon;
  if (avgBiene !== null) scoreBiene = avgBiene;

  // Challenges completed in the target month add +4 up to max 100
  const completedChallenges = challenges.filter(c => c.completed);
  completedChallenges.forEach(ch => {
    if (ch.category === "conexion") scoreConex = Math.min(100, scoreConex + 4);
    if (ch.category === "armonia") scoreArmon = Math.min(100, scoreArmon + 4);
    if (ch.category === "bienestar") scoreBiene = Math.min(100, scoreBiene + 4);
  });

  return {
    conexion: Math.round(scoreConex),
    armonia: Math.round(scoreArmon),
    bienestar: Math.round(scoreBiene)
  };
}

// Closeout a month (generates monthly history log)
export function addCierreMensual(cierre: CierreMensual): CierreMensual {
  if (!currentStore.cierresMensuales) currentStore.cierresMensuales = [];
  
  // Avoid duplicates
  currentStore.cierresMensuales = currentStore.cierresMensuales.filter(c => c.month !== cierre.month);
  currentStore.cierresMensuales.push(cierre);
  
  saveToDisk();
  return cierre;
}

// ==========================================
// EJERCICIO / WORKOUT LOG FUNCTIONS
// ==========================================

export function getWorkoutLogs(): WorkoutLog[] {
  if (!currentStore.workoutLogs) {
    currentStore.workoutLogs = [];
  }
  return currentStore.workoutLogs;
}

export function addWorkoutLog(log: Omit<WorkoutLog, "id">): WorkoutLog {
  if (!currentStore.workoutLogs) {
    currentStore.workoutLogs = [];
  }
  const newLog: WorkoutLog = {
    ...log,
    id: `workout-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString()
  };
  currentStore.workoutLogs.push(newLog);
  saveToDisk();
  return newLog;
}

export function deleteWorkoutLog(id: string): boolean {
  if (!currentStore.workoutLogs) {
    currentStore.workoutLogs = [];
  }
  const initialLen = currentStore.workoutLogs.length;
  currentStore.workoutLogs = currentStore.workoutLogs.filter(w => w.id !== id);
  if (currentStore.workoutLogs.length < initialLen) {
    saveToDisk();
    return true;
  }
  return false;
}

// ROUTINES
export function getWorkoutRoutines(): any[] {
  if (!currentStore.workoutRoutines) {
    currentStore.workoutRoutines = [];
  }
  return currentStore.workoutRoutines;
}

export function saveWorkoutRoutine(routine: any): any {
  if (!currentStore.workoutRoutines) {
    currentStore.workoutRoutines = [];
  }
  if (!routine.id) {
    routine.id = `routine-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    routine.createdAt = new Date().toISOString();
  }
  routine.updatedAt = new Date().toISOString();
  
  const existingIdx = currentStore.workoutRoutines.findIndex(r => r.id === routine.id);
  if (existingIdx >= 0) {
    currentStore.workoutRoutines[existingIdx] = routine;
  } else {
    currentStore.workoutRoutines.push(routine);
  }
  saveToDisk();
  return routine;
}

export function deleteWorkoutRoutine(id: string): boolean {
  if (!currentStore.workoutRoutines) currentStore.workoutRoutines = [];
  const initialLen = currentStore.workoutRoutines.length;
  currentStore.workoutRoutines = currentStore.workoutRoutines.filter(r => r.id !== id);
  if (currentStore.workoutRoutines.length < initialLen) {
    saveToDisk();
    return true;
  }
  return false;
}

// DETAILED LOGS
export function getWorkoutDetailedLogs(): any[] {
  if (!currentStore.workoutDetailedLogs) {
    currentStore.workoutDetailedLogs = [];
  }
  return currentStore.workoutDetailedLogs;
}

export function saveWorkoutDetailedLog(log: any): any {
  if (!currentStore.workoutDetailedLogs) {
    currentStore.workoutDetailedLogs = [];
  }
  if (!log.id) {
    log.id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    log.createdAt = new Date().toISOString();
  }
  const existingIdx = currentStore.workoutDetailedLogs.findIndex(l => l.id === log.id);
  if (existingIdx >= 0) {
    currentStore.workoutDetailedLogs[existingIdx] = log;
  } else {
    currentStore.workoutDetailedLogs.push(log);
  }
  saveToDisk();
  return log;
}

export function deleteWorkoutDetailedLog(id: string): boolean {
  if (!currentStore.workoutDetailedLogs) currentStore.workoutDetailedLogs = [];
  const initialLen = currentStore.workoutDetailedLogs.length;
  currentStore.workoutDetailedLogs = currentStore.workoutDetailedLogs.filter(l => l.id !== id);
  if (currentStore.workoutDetailedLogs.length < initialLen) {
    saveToDisk();
    return true;
  }
  return false;
}

// BODY METRICS
export function getBodyMetrics(): any[] {
  if (!currentStore.bodyMetrics) {
    currentStore.bodyMetrics = [];
  }
  return currentStore.bodyMetrics;
}

export function saveBodyMetric(metric: any): any {
  if (!currentStore.bodyMetrics) {
    currentStore.bodyMetrics = [];
  }
  if (!metric.id) {
    metric.id = `metric-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    metric.createdAt = new Date().toISOString();
  }
  const existingIdx = currentStore.bodyMetrics.findIndex(m => m.id === metric.id);
  if (existingIdx >= 0) {
    currentStore.bodyMetrics[existingIdx] = metric;
  } else {
    currentStore.bodyMetrics.push(metric);
  }
  saveToDisk();
  return metric;
}

export function deleteBodyMetric(id: string): boolean {
  if (!currentStore.bodyMetrics) currentStore.bodyMetrics = [];
  const initialLen = currentStore.bodyMetrics.length;
  currentStore.bodyMetrics = currentStore.bodyMetrics.filter(m => m.id !== id);
  if (currentStore.bodyMetrics.length < initialLen) {
    saveToDisk();
    return true;
  }
  return false;
}

// PERSONAL RECORDS
export function getPersonalRecords(): any[] {
  if (!currentStore.personalRecords) {
    currentStore.personalRecords = [];
  }
  return currentStore.personalRecords;
}

export function savePersonalRecord(pr: any): any {
  if (!currentStore.personalRecords) {
    currentStore.personalRecords = [];
  }
  if (!pr.id) {
    pr.id = `pr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }
  const existingIdx = currentStore.personalRecords.findIndex(p => p.id === pr.id);
  if (existingIdx >= 0) {
    currentStore.personalRecords[existingIdx] = pr;
  } else {
    currentStore.personalRecords.push(pr);
  }
  saveToDisk();
  return pr;
}

// CUSTOM EXERCISES
export function getCustomExercises(): any[] {
  if (!currentStore.customExercises) {
    currentStore.customExercises = [];
  }
  return currentStore.customExercises;
}

export function saveCustomExercise(ex: any): any {
  if (!currentStore.customExercises) {
    currentStore.customExercises = [];
  }
  if (!ex.id) {
    ex.id = `custom-ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    ex.isCustom = true;
  }
  const existingIdx = currentStore.customExercises.findIndex(e => e.id === ex.id);
  if (existingIdx >= 0) {
    currentStore.customExercises[existingIdx] = ex;
  } else {
    currentStore.customExercises.push(ex);
  }
  saveToDisk();
  return ex;
}

export function deleteCustomExercise(id: string): boolean {
  if (!currentStore.customExercises) currentStore.customExercises = [];
  const initialLen = currentStore.customExercises.length;
  currentStore.customExercises = currentStore.customExercises.filter(e => e.id !== id);
  if (currentStore.customExercises.length < initialLen) {
    saveToDisk();
    return true;
  }
  return false;
}

// ==========================================
// CLOSET / ARMARIO DIGITAL STORE FUNCTIONS
// ==========================================

export const DEFAULT_CLOSET_CATEGORIES: ClosetCategory[] = [
  { id: "cat-camisetas", name: "Camisetas", icon: "Shirt", color: "#FFECEC", isCustom: false },
  { id: "cat-camisas", name: "Camisas", icon: "Shirt", color: "#EBF3FF", isCustom: false },
  { id: "cat-tops", name: "Tops", icon: "Sparkles", color: "#FDF2F8", isCustom: false },
  { id: "cat-buzos", name: "Buzos y sacos", icon: "Layers", color: "#F3E8FF", isCustom: false },
  { id: "cat-chaquetas", name: "Chaquetas", icon: "Folder", color: "#FEF3C7", isCustom: false },
  { id: "cat-vestidos", name: "Vestidos", icon: "Sparkles", color: "#FCE7F3", isCustom: false },
  { id: "cat-faldas", name: "Faldas", icon: "Layers", color: "#F1F5F9", isCustom: false },
  { id: "cat-pantalones", name: "Pantalones", icon: "ShoppingBag", color: "#E0F2FE", isCustom: false },
  { id: "cat-jeans", name: "Jeans", icon: "ShoppingBag", color: "#DBEAFE", isCustom: false },
  { id: "cat-shorts", name: "Shorts", icon: "Sun", color: "#E0E7FF", isCustom: false },
  { id: "cat-sudaderas", name: "Sudaderas", icon: "Dumbbell", color: "#ECFDF5", isCustom: false },
  { id: "cat-zapatos", name: "Zapatos", icon: "Footprints", color: "#FEF3C7", isCustom: false },
  { id: "cat-accesorios", name: "Accesorios", icon: "Glasses", color: "#FAF5FF", isCustom: false },
];

export function getClosetCategories(): ClosetCategory[] {
  if (!currentStore.closetCategories || currentStore.closetCategories.length === 0) {
    currentStore.closetCategories = JSON.parse(JSON.stringify(DEFAULT_CLOSET_CATEGORIES));
  }
  return currentStore.closetCategories;
}

export function saveClosetCategory(category: ClosetCategory): ClosetCategory {
  if (!currentStore.closetCategories || currentStore.closetCategories.length === 0) {
    currentStore.closetCategories = JSON.parse(JSON.stringify(DEFAULT_CLOSET_CATEGORIES));
  }
  if (!category.id) {
    category.id = `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }
  category.isCustom = category.isCustom !== false;
  const existingIdx = currentStore.closetCategories.findIndex(c => c.id === category.id || c.name.toLowerCase() === category.name.toLowerCase());
  if (existingIdx >= 0) {
    currentStore.closetCategories[existingIdx] = category;
  } else {
    currentStore.closetCategories.push(category);
  }
  saveToDisk();
  return category;
}

export function deleteClosetCategory(id: string): boolean {
  if (!currentStore.closetCategories) return false;
  const initialLen = currentStore.closetCategories.length;
  currentStore.closetCategories = currentStore.closetCategories.filter(c => c.id !== id);
  if (currentStore.closetCategories.length < initialLen) {
    saveToDisk();
    return true;
  }
  return false;
}

export function getClosetGarments(): ClosetGarment[] {
  if (!currentStore.closetGarments) {
    currentStore.closetGarments = [];
  }
  return currentStore.closetGarments;
}

export function saveClosetGarment(garment: ClosetGarment): ClosetGarment {
  if (!currentStore.closetGarments) {
    currentStore.closetGarments = [];
  }
  if (!garment.id) {
    garment.id = `garment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }
  if (!garment.createdAt) {
    garment.createdAt = new Date().toISOString();
  }
  if (typeof garment.usageCount !== "number") {
    garment.usageCount = 0;
  }
  
  const existingIdx = currentStore.closetGarments.findIndex(g => g.id === garment.id);
  if (existingIdx >= 0) {
    currentStore.closetGarments[existingIdx] = { ...currentStore.closetGarments[existingIdx], ...garment };
  } else {
    currentStore.closetGarments.push(garment);
  }
  saveToDisk();
  return garment;
}

export function deleteClosetGarment(id: string): boolean {
  if (!currentStore.closetGarments) return false;
  const initialLen = currentStore.closetGarments.length;
  currentStore.closetGarments = currentStore.closetGarments.filter(g => g.id !== id);
  if (currentStore.closetGarments.length < initialLen) {
    saveToDisk();
    return true;
  }
  return false;
}

export function getSavedOutfits(): SavedOutfit[] {
  if (!currentStore.savedOutfits) {
    currentStore.savedOutfits = [];
  }
  return currentStore.savedOutfits;
}

export function saveSavedOutfit(outfit: SavedOutfit): SavedOutfit {
  if (!currentStore.savedOutfits) {
    currentStore.savedOutfits = [];
  }
  if (!outfit.id) {
    outfit.id = `outfit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }
  if (!outfit.createdAt) {
    outfit.createdAt = new Date().toISOString();
  }
  const existingIdx = currentStore.savedOutfits.findIndex(o => o.id === outfit.id);
  if (existingIdx >= 0) {
    currentStore.savedOutfits[existingIdx] = { ...currentStore.savedOutfits[existingIdx], ...outfit };
  } else {
    currentStore.savedOutfits.push(outfit);
  }
  saveToDisk();
  return outfit;
}

export function deleteSavedOutfit(id: string): boolean {
  if (!currentStore.savedOutfits) return false;
  const initialLen = currentStore.savedOutfits.length;
  currentStore.savedOutfits = currentStore.savedOutfits.filter(o => o.id !== id);
  if (currentStore.savedOutfits.length < initialLen) {
    saveToDisk();
    return true;
  }
  return false;
}

export function getWornOutfitLogs(): WornOutfitLog[] {
  if (!currentStore.wornOutfitLogs) {
    currentStore.wornOutfitLogs = [];
  }
  return currentStore.wornOutfitLogs;
}

export function recordWornOutfit(log: WornOutfitLog): WornOutfitLog {
  if (!currentStore.wornOutfitLogs) {
    currentStore.wornOutfitLogs = [];
  }
  if (!log.id) {
    log.id = `worn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }
  if (!log.date) {
    log.date = new Date().toISOString().split("T")[0];
  }
  currentStore.wornOutfitLogs.unshift(log);

  // Update usage count & last worn date for used garments
  if (!currentStore.closetGarments) currentStore.closetGarments = [];
  const todayStr = log.date;
  log.garmentIds.forEach(garmentId => {
    const g = currentStore.closetGarments?.find(item => item.id === garmentId);
    if (g) {
      g.usageCount = (g.usageCount || 0) + 1;
      g.lastWornDate = todayStr;
    }
  });

  saveToDisk();
  return log;
}



