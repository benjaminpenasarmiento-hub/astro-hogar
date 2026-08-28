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
