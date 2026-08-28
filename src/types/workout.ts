export type UserId = "mafe" | "benja" | "home" | string;

export type PatternCategory = "Upper" | "Lower" | "Core" | "Arms" | "Cardio";

export interface MovementPattern {
  id: string;
  name: string; // e.g. "Empuje Horizontal"
  category: PatternCategory;
  targetMuscles: string[]; // e.g. ["Pectoral Mayor", "Tríceps", "Deltoides Anterior"]
  icon: string; // emoji
  description: string;
  defaultExerciseId: string;
  isCustom?: boolean;
}

export type EquipmentType = 
  | "Barra" 
  | "Mancuernas" 
  | "Máquina Hammer" 
  | "Máquina Guiada / Selector" 
  | "Polea" 
  | "Máquina Smith" 
  | "Peso Corporal" 
  | "Banda de Resistencia"
  | "Otro";

export interface Exercise {
  id: string;
  movementPatternId: string;
  name: string; // e.g. "Press Pecho Máquina Hammer"
  equipment: EquipmentType;
  defaultTargetReps: string; // e.g. "6-8"
  defaultTargetSets: number; // e.g. 3
  incrementKg: number; // e.g. 2.5 or 5
  description?: string;
  isCustom?: boolean;
}

export interface RoutinePatternItem {
  movementPatternId: string;
  preferredExerciseId: string;
  targetSets?: number; // default 3
  targetRepsRange?: string; // default "6-8"
  notes?: string;
}

export interface Routine {
  id: string;
  name: string; // e.g. "Día 1: Empuje (Pecho, Hombro, Tríceps)"
  description?: string;
  color?: string; // hex color for tag
  patterns: RoutinePatternItem[];
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LoggedSet {
  setNumber: number; // 1, 2, 3
  weightKg: number;
  reps: number;
  isEffective: boolean; // default true
  rpe?: number; // optional 1-10 rating
}

export interface LoggedExerciseSession {
  movementPatternId: string;
  movementPatternName: string;
  exerciseId: string;
  exerciseName: string;
  sets: LoggedSet[];
  wasSwapped?: boolean;
  swappedFromExerciseId?: string;
  swappedFromExerciseName?: string;
  aiRecommendation?: string; // e.g. "¡Excelente! Aumenta +2.5 kg la próxima vez"
  notes?: string;
}

export interface WorkoutLogDetail {
  id: string;
  routineId?: string;
  routineName: string;
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  userId?: string;
  exercises: LoggedExerciseSession[];
  totalVolumeKg: number;
  totalSetsCompleted: number;
  notes?: string;
  prsAchieved?: {
    exerciseId: string;
    exerciseName: string;
    type: "weight" | "volume";
    value: number;
  }[];
  createdAt: string;
}

export interface BodyMetric {
  id: string;
  date: string; // YYYY-MM-DD
  userId?: string;
  weightKg: number; // Peso corporal
  armCm?: number; // Brazo
  chestCm?: number; // Pecho
  waistCm?: number; // Cintura
  hipsCm?: number; // Cadera
  thighCm?: number; // Muslo
  calfCm?: number; // Pantorrilla
  photoUrl?: string; // Foto de progreso
  notes?: string;
  createdAt: string;
}

export interface PersonalRecord {
  id: string;
  userId?: string;
  exerciseId: string;
  exerciseName: string;
  movementPatternId: string;
  maxWeightKg: number;
  maxWeightReps: number;
  maxVolumeSetKg: number; // weight * reps
  achievedAt: string; // YYYY-MM-DD
}

export interface ProgressionAnalysis {
  exerciseId: string;
  exerciseName: string;
  status: "increase_weight" | "consolidate" | "deload_or_swap" | "insufficient_data";
  suggestion: string;
  nextTargetWeightKg: number;
  nextTargetReps: string;
  consecutiveSuccessCount: number;
}
