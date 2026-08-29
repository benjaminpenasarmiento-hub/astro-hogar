/**
 * Types and Interfaces for AstroHogar
 */

export type UserId = "mafe" | "benja" | string;

export interface DailyEmotionalCheckin {
  userId: UserId;
  date: string;
  mood: "calm" | "tired" | "energetic" | "sensitive";
  connectionFeeling: "high" | "medium" | "low";
  homePerception: "light" | "normal" | "heavy";
}

export interface AstroTransitData {
  emotionalSensitivity: number;
  communicationEnergy: number;
  homeHarmonyInfluence: number;
}

export interface AstroProfile {
  userId: UserId;
  sunSign: string;
  moonSign: string;
  risingSign: string;
  transitData: AstroTransitData;
}

export interface HomePersonality {
  emotionalStability: number;
  socialConnection: number;
  activityLevel: number;
  stressResistance: number;
  harmonyIndex: number;
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
  miloLearningNotes?: string;
}

export interface UserEnvironment {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timezone: string;
  label?: string;
  capturedAt: string;
  notificationPermission?: string;
  notificationsEnabled?: boolean;
}

export interface Home {
  id: string;
  name: string;
  code?: string;
  members: string[];
  authorizedUids?: string[];
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
  authUid?: string;
  occupation?: string;
  about?: string;
  birthTime?: string;
  birthPlace?: string;
  zodiacSign: string;
  lunarSign?: string;
  ascendantSign?: string;
  mercurySign?: string;
  venusSign?: string;
  marsSign?: string;
  horoscopeToday?: string;
  horoscopeConsejo?: string;
  emoji?: string;
  pushToken?: string;
  environment?: UserEnvironment;
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
