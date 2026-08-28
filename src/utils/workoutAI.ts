import { LoggedSet, ProgressionAnalysis } from "../types/workout";

export function analyzeProgression(
  exerciseId: string,
  exerciseName: string,
  sets: LoggedSet[],
  targetRepsRange: string = "6-8",
  incrementKg: number = 2.5
): ProgressionAnalysis {
  if (!sets || sets.length === 0) {
    return {
      exerciseId,
      exerciseName,
      status: "insufficient_data",
      suggestion: "Registra tus 3 series efectivas para recibir recomendaciones de carga.",
      nextTargetWeightKg: 0,
      nextTargetReps: targetRepsRange,
      consecutiveSuccessCount: 0
    };
  }

  // Parse target reps range
  const rangeParts = targetRepsRange.split("-").map(p => parseInt(p.trim(), 10));
  const minTargetReps = rangeParts[0] || 6;
  const maxTargetReps = rangeParts[1] || 8;

  const currentWeight = sets[0]?.weightKg || 0;
  const repsArray = sets.map(s => s.reps);

  // Check if all effective sets hit maximum target reps (e.g. 8-8-8)
  const allHitTop = repsArray.length >= 3 && repsArray.slice(0, 3).every(r => r >= maxTargetReps);

  // Check if all effective sets are within acceptable target reps (e.g. at least 6)
  const allInTarget = repsArray.slice(0, 3).every(r => r >= minTargetReps);

  if (allHitTop) {
    const nextWeight = currentWeight + incrementKg;
    return {
      exerciseId,
      exerciseName,
      status: "increase_weight",
      suggestion: `🔥 ¡Dominaste las ${maxTargetReps} reps! Sube a ${nextWeight} kg (+${incrementKg} kg) la próxima sesión.`,
      nextTargetWeightKg: nextWeight,
      nextTargetReps: targetRepsRange,
      consecutiveSuccessCount: 1
    };
  }

  if (allInTarget) {
    return {
      exerciseId,
      exerciseName,
      status: "consolidate",
      suggestion: `💪 Buen rango (${repsArray.join("-")} reps). Mantén ${currentWeight} kg la próxima sesión hasta lograr ${maxTargetReps}-${maxTargetReps}-${maxTargetReps}.`,
      nextTargetWeightKg: currentWeight,
      nextTargetReps: targetRepsRange,
      consecutiveSuccessCount: 0
    };
  }

  // Below target range (e.g. 5, 4, 4)
  return {
    exerciseId,
    exerciseName,
    status: "deload_or_swap",
    suggestion: `💡 Fatiga alta o peso exigido (${repsArray.join("-")} reps). Mantén la carga o cambia a una máquina/alternativa compatible si el gimnasio está lleno.`,
    nextTargetWeightKg: currentWeight,
    nextTargetReps: targetRepsRange,
    consecutiveSuccessCount: 0
  };
}

export function calculateRestTimerSeconds(reps: number): number {
  // Heavy compound vs isolation suggestion
  if (reps <= 6) return 120; // 2 min
  if (reps <= 8) return 90;  // 1.5 min
  return 60; // 1 min
}
