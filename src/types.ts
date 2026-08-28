/**
 * Types and Interfaces for Hogar de Mafe & Benja
 */

export type UserId = "mafe" | "benja" | string;

export interface DailyEmotionalCheckin {
  userId: UserId;
  date: string; // YYYY-MM-DD
  mood: "calm" | "tired" | "energetic" | "sensitive";
  connectionFeeling: "high" | "medium" | "low";
  homePerception: "light" | "normal" | "heavy";
}

export interface AstroTransitData {
  emotionalSensitivity: number; // 0-100
  communicationEnergy: number;   // 0-100
  homeHarmonyInfluence: number;  // 0-100
}

export interface AstroProfile {
  userId: UserId;
  sunSign: string;
  moonSign: string;
  risingSign: string;
  transitData: AstroTransitData;
}

export interface HomePersonality {
  emotionalStability: number; // 0-100
  socialConnection: number;  // 0-100
  activityLevel: number;     // 0-100
  stressResistance: number;  // 0-100
  harmonyIndex: number;      // 0-100
}

export interface HomePersonalityState {
  currentPersonality: "calm" | "active" | "connected" | "reflective" | "intense" | "balanced";
  scores: HomePersonality;
  relationshipDynamic: "sincronizados" | "complementarios" | "desalineados" | "en crecimiento";
  evolutionIdentity: string;
  updatedAt: string;
}

export interface HomeSettings {
  notificationsEnabled: boolean;
  aiCatMoodLevel: "soft" | "normal" | "active";
}

export interface Home {
  id: string;
  name: string;
  code?: string;
  members: string[];
  settings: HomeSettings;
  address?: string;
  wifiSsid?: string;
  wifiPassword?: string;
}

export interface UserProfile {
  id: UserId;
  name: string;
  photoUrl: string;
  birthDate: string;
  email?: string;
  birthTime?: string; // HH:MM
  birthPlace?: string;
  zodiacSign: string; // Solar Sign
  lunarSign?: string;
  ascendantSign?: string;
  mercurySign?: string;
  venusSign?: string;
  marsSign?: string;
  horoscopeToday?: string;
  horoscopeConsejo?: string;
  emoji?: string;
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

export interface CalendarItem {
  id: string;
  title: string;
  description?: string;
  type: "event" | "task" | "reminder";
  date: string; // YYYY-MM-DD (fecha de inicio)
  time?: string; // HH:MM (hora de inicio)
  endDate?: string; // YYYY-MM-DD (fecha de fin)
  endTime?: string; // HH:MM (hora de fin)
  emoji?: string; // Icono representativo para el evento
  assignedTo: "home" | UserId;
  status: "pending" | "done";
  notify1HourBefore?: boolean; // Push notification 1 hour before event
  notify1HourSent?: boolean;   // Tracks if 1h alert was already dispatched
  recurrence?: {
    type: "none" | "daily" | "weekly" | "monthly" | "custom" | "specific" | string;
    interval?: number; // every X days for custom
    specificDate?: string;
  };
}

export interface Vaccination {
  name: string;
  date: string;
  nextDueDate?: string;
  notes?: string;
}

export interface Medication {
  name: string;
  dosage: string;
  schedule: string;
  startDate: string;
  endDate?: string;
}

export interface PetWeightEntry {
  date: string;
  weight: number;
}

export interface Pet {
  id: string;
  name: string;
  photoUrl: string;
  breed?: string;
  birthDate?: string;
  weight: number; // in kg
  medical: {
    vaccinations: Vaccination[];
    medications: Medication[];
    allergies?: string[];
  };
  weightHistory?: PetWeightEntry[];
  documentIds?: string[];
}

export interface PlantAction {
  id: string;
  type: "water" | "fertilize" | "prune" | "repot" | "photo";
  date: string; // YYYY-MM-DD
  performedBy: UserId;
}

export interface PlantDiagnosis {
  id: string;
  date: string;
  image: string; // base64 or placeholder
  result: "healthy" | "alert" | "critical";
  confidence: number;
  recommendations: string[];
}

export interface Plant {
  id: string;
  name: string;
  species?: string;
  emoji?: string;
  photoUrl: string;
  photoUrls?: string[];
  careHistory: PlantAction[];
  aiDiagnoses: PlantDiagnosis[];
  idealLocation?: string;
  recommendedWatering?: string;
  currentStateDesc?: string;
}

export interface Wish {
  id: string;
  name: string;
  category: string;
  owner: "Mafe" | "Benja" | "Hogar" | string;
  status: "desired" | "planned" | "saving" | "purchased" | "discarded";
  notes?: string;
  link?: string;
  goalCategory?: string;
}

export interface Memory {
  id: string;
  title: string;
  type: "trip" | "date" | "event" | "birthday" | "custom" | string;
  customCategory?: string;
  date: string; // YYYY-MM-DD
  location?: string;
  description?: string;
  people: UserId[];
  media: string[]; // image URLs/base64
  highlights?: string[];
}

export interface HomeDocument {
  id: string;
  title: string;
  category: "home" | "pet" | "other" | "contract" | "invoice" | "medical";
  fileUrl: string; // simulated path
  dateUploaded: string;
  fileType: string; // e.g. "pdf", "jpg", "png"
  type?: "contract" | "invoice" | "medical" | "other";
  notes?: string;
  metadata?: {
    expirationDate?: string;
    issuer?: string;
  };
}

export interface ChatAttachment {
  name: string;
  type: string;
  size: number;
  dataUrl: string; // base64 representation
}

export interface ChatMessage {
  id: string;
  sender: "user" | "cat";
  text: string;
  timestamp: string;
  attachments?: ChatAttachment[];
}

export interface HomeAlert {
  id: string;
  type: "warning" | "info" | "calendar";
  message: string;
}

export interface BudgetItem {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  account: string; // references account name or ID
  destinationAccount?: string; // Target account for transfers
  date: string; // YYYY-MM-DD
  description?: string;
  fortnightId: string; // e.g. "2026-06-Q1" or "2026-06-Q2"
  isLeftoverTransfer?: boolean; // True if this is a rollover/leftover from a closed fortnight
}

export interface BudgetEstimate {
  id: string;
  fortnightId: string; // e.g., "2026-06-Q1"
  category: string;
  customName?: string; // Custom personalized label/name
  type: "income" | "expense";
  amount: number;
  account?: string; // Associated default account
}

export interface BudgetTemplate {
  id: string;
  name: string;
  assignedFortnight: "Q1" | "Q2" | "both";
  items: {
    category: string;
    customName?: string; // Custom personalized name for template item
    type: "income" | "expense";
    amount: number;
    account?: string;
  }[];
}

export interface BudgetAccount {
  id: string;
  name: string;
  balance: number;
  createdAt: string;
}

// ==========================================
// SALUD DEL HOGAR (WELLNESS) TYPES
// ==========================================

export interface DailyQuestion {
  id: string;
  text: string;
  category: "conexion" | "armonia" | "bienestar" | "reflexion";
}

export interface DailyQuestionsPool {
  date: string; // YYYY-MM-DD
  questions: DailyQuestion[];
}

export interface DailyQuestionAnswer {
  questionId: string;
  category: "conexion" | "armonia" | "bienestar" | "reflexion";
  userId: UserId;
  score?: number; // 1-5 for conexion/armonia/bienestar
  textResponse?: string; // for reflexion profunda
  date: string; // YYYY-MM-DD
}

export interface SaludChallenge {
  id: string;
  title: string;
  category: "conexion" | "armonia" | "bienestar";
  completed: boolean;
  completedAt?: string;
  completedBy?: UserId;
}

export interface FrascoMessage {
  id: string;
  senderId: UserId;
  text: string;
  date: string; // ISO
  emoji?: string;
}

export interface CierreMensual {
  id: string;
  month: string; // e.g. "2026-06"
  averageConexion: number;
  averageArmonia: number;
  averageBienestar: number;
  completedChallengesCount: number;
  frascoMessagesCount: number;
  completedTasksCount: number;
  eventsCount: number;
  memoriesCount: number;
  aiReflection: string;
  dateCierre: string;
}

// ==========================================
// FITNESS / EJERCICIO TYPES
// ==========================================

export interface WorkoutLog {
  id: string;
  date: string; // YYYY-MM-DD
  weightsUsed: string; // e.g. "Dumbbell Floor Press: 12kg, Squats: 16kg"
  repsDone: string; // e.g. "8-8-8, 12-12-12"
  rpe: number; // 1-10
  generalEnergy: number; // 1-10
  feelingsText: string;
  workoutType?: string; // "Push", "Pull", "Legs" etc.
  createdAt?: string;
  userId?: string;
}

// ==========================================
// NOTIFICATIONS TYPES
// ==========================================

export interface HomeNotification {
  id: string;
  userId: UserId; // Who performed the action
  title: string;
  message: string;
  timestamp: string; // ISO string
  type: "calendar" | "pet" | "plant" | "wish" | "memory" | "document" | "budget" | "salud" | "workout" | "other" | string;
  readBy: UserId[]; // Users who saw/dismissed this
}

export interface EmotionCheckin {
  date: string;
  userId: string;
  emotion: string; // emotion Id
  intensity: number;
  note: string;
}

export interface CustomEmotion {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

// ==========================================
// CLOSET / ARMARIO DIGITAL TYPES
// ==========================================

export interface ClosetGarment {
  id: string;
  ownerId: UserId | "ambos" | string; // "mafe", "benja", or "ambos"
  name: string;
  category: string; // e.g. "Camisetas", "Camisas", "Tops", "Buzos y sacos", "Chaquetas", "Vestidos", "Faldas", "Pantalones", "Jeans", "Shorts", "Sudaderas", "Zapatos", "Accesorios", or custom
  subcategory?: string;
  color: string; // e.g. "Negro", "Blanco", "Azul marino", "Beige"
  tags: string[]; // e.g. ["Casual", "Algodón", "Invierno"]
  originalImageUrl: string;
  whiteBgImageUrl: string; // Primary image in closet
  isFavorite?: boolean;
  usageCount: number; // Number of times worn in outfits
  lastWornDate?: string; // YYYY-MM-DD
  createdAt: string; // ISO date
  notes?: string;
  styleDescription?: string;
}

export interface ClosetCategory {
  id: string;
  name: string;
  icon: string; // Emoji or Lucide icon key
  color: string; // Color identifier
  isCustom?: boolean;
}

export interface SavedOutfit {
  id: string;
  userId: UserId | "ambos" | string;
  title: string;
  occasion: string; // "Trabajo", "Oficina", "Universidad", "Salida casual", "Cita", "Fiesta", "Viaje", "Ejercicio", "Casa", "Elegante", "Formal"
  weather?: string;
  style?: string;
  topGarmentIds: string[]; // 1 or more top pieces
  bottomGarmentId?: string;
  shoesGarmentId?: string;
  accessoryGarmentIds?: string[];
  explanation: string;
  createdAt: string; // ISO
  lastWornDate?: string;
  isFavorite?: boolean;
}

export interface WornOutfitLog {
  id: string;
  userId: UserId | string;
  date: string; // YYYY-MM-DD
  garmentIds: string[];
  occasion: string;
  notes?: string;
  outfitTitle?: string;
}


