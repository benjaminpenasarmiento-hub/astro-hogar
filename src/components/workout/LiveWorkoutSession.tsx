import React, { useState, useEffect } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  Copy, 
  RefreshCw, 
  Flame, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight, 
  X, 
  Timer,
  Clock,
  Dumbbell,
  AlertCircle
} from "lucide-react";
import confetti from "canvas-confetti";
import { 
  Routine, 
  MovementPattern, 
  Exercise, 
  WorkoutLogDetail, 
  LoggedSet, 
  LoggedExerciseSession,
  EquipmentType 
} from "../../types/workout";
import { analyzeProgression } from "../../utils/workoutAI";
import ExerciseSwapModal from "./ExerciseSwapModal";

interface LiveWorkoutSessionProps {
  routine: Routine;
  userId: string;
  allMovementPatterns: MovementPattern[];
  allExercises: Exercise[];
  workoutHistory: WorkoutLogDetail[];
  onSaveWorkout: (log: WorkoutLogDetail) => Promise<void>;
  onCancel: () => void;
  onCreateCustomExercise: (newEx: Omit<Exercise, "id">) => Promise<Exercise>;
}

interface PatternState {
  pattern: MovementPattern;
  exercise: Exercise;
  sets: LoggedSet[];
  wasSwapped: boolean;
  swappedFromExercise?: Exercise;
}

export default function LiveWorkoutSession({
  routine,
  userId,
  allMovementPatterns,
  allExercises,
  workoutHistory,
  onSaveWorkout,
  onCancel,
  onCreateCustomExercise
}: LiveWorkoutSessionProps) {
  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Rest Timer State
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [isResting, setIsResting] = useState(false);

  // Active pattern states initialized from routine
  const [patternStates, setPatternStates] = useState<PatternState[]>([]);
  const [activeSwapPattern, setActiveSwapPattern] = useState<MovementPattern | null>(null);

  // Final summary modal state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [completedLog, setCompletedLog] = useState<WorkoutLogDetail | null>(null);

  // Initialize Pattern States based on Routine
  useEffect(() => {
    if (!routine) return;

    const initialStates: PatternState[] = routine.patterns.map((item) => {
      const pattern = allMovementPatterns.find(p => p.id === item.movementPatternId) || {
        id: item.movementPatternId,
        name: "Movimiento",
        category: "Upper",
        targetMuscles: [],
        icon: "🏋️‍♂️",
        description: "",
        defaultExerciseId: item.preferredExerciseId
      };

      // Preferred or default exercise
      const exercise = allExercises.find(e => e.id === item.preferredExerciseId) ||
        allExercises.find(e => e.movementPatternId === pattern.id) || {
          id: item.preferredExerciseId,
          movementPatternId: pattern.id,
          name: "Ejercicio Personalizado",
          equipment: "Máquina Hammer" as EquipmentType,
          defaultTargetReps: item.targetRepsRange || "6-8",
          defaultTargetSets: item.targetSets || 3,
          incrementKg: 2.5
        };

      // Try to find last weight used for this exercise or movement pattern from history
      let defaultWeight = 50;
      for (const pastLog of workoutHistory) {
        const foundEx = pastLog.exercises.find(e => e.exerciseId === exercise.id || e.movementPatternId === pattern.id);
        if (foundEx && foundEx.sets.length > 0 && foundEx.sets[0].weightKg > 0) {
          defaultWeight = foundEx.sets[0].weightKg;
          break;
        }
      }

      const defaultSetsCount = item.targetSets || 3;
      const initialSets: LoggedSet[] = Array.from({ length: defaultSetsCount }).map((_, idx) => ({
        setNumber: idx + 1,
        weightKg: defaultWeight,
        reps: 8,
        isEffective: true
      }));

      return {
        pattern,
        exercise,
        sets: initialSets,
        wasSwapped: false
      };
    });

    setPatternStates(initialStates);
  }, [routine, allMovementPatterns, allExercises, workoutHistory]);

  // Session timer ticker
  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Rest timer ticker
  useEffect(() => {
    let interval: any;
    if (isResting && restSeconds !== null && restSeconds > 0) {
      interval = setInterval(() => {
        setRestSeconds(prev => (prev! > 1 ? prev! - 1 : 0));
      }, 1000);
    } else if (restSeconds === 0) {
      setIsResting(false);
      // Optional subtle audio alert / vibration
      if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }
    return () => clearInterval(interval);
  }, [isResting, restSeconds]);

  const startRestTimer = (seconds: number) => {
    setRestSeconds(seconds);
    setIsResting(true);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  // Exercise Swap logic
  const handleSwapExercise = (patternId: string, newExercise: Exercise) => {
    setPatternStates(prev => prev.map(p => {
      if (p.pattern.id === patternId) {
        // Try to update weights based on new exercise history if available
        let newWeight = p.sets[0]?.weightKg || 50;
        for (const pastLog of workoutHistory) {
          const foundEx = pastLog.exercises.find(e => e.exerciseId === newExercise.id);
          if (foundEx && foundEx.sets.length > 0 && foundEx.sets[0].weightKg > 0) {
            newWeight = foundEx.sets[0].weightKg;
            break;
          }
        }

        const updatedSets = p.sets.map(s => ({ ...s, weightKg: newWeight }));

        return {
          ...p,
          swappedFromExercise: p.exercise,
          exercise: newExercise,
          wasSwapped: true,
          sets: updatedSets
        };
      }
      return p;
    }));
  };

  // Update set value
  const handleUpdateSet = (patternId: string, setIndex: number, field: "weightKg" | "reps", value: number) => {
    setPatternStates(prev => prev.map(p => {
      if (p.pattern.id === patternId) {
        const newSets = [...p.sets];
        newSets[setIndex] = {
          ...newSets[setIndex],
          [field]: Math.max(0, value)
        };
        return { ...p, sets: newSets };
      }
      return p;
    }));
  };

  // Quick weight step (+2.5, +5, -2.5, -5)
  const handleStepWeight = (patternId: string, setIndex: number, delta: number) => {
    setPatternStates(prev => prev.map(p => {
      if (p.pattern.id === patternId) {
        const currentW = p.sets[setIndex]?.weightKg || 0;
        const newSets = [...p.sets];
        newSets[setIndex] = {
          ...newSets[setIndex],
          weightKg: Math.max(0, parseFloat((currentW + delta).toFixed(2)))
        };
        return { ...p, sets: newSets };
      }
      return p;
    }));
  };

  // Quick reps/time step (+1, -1 or +5, -5 for cardio)
  const handleStepReps = (patternId: string, setIndex: number, delta: number) => {
    setPatternStates(prev => prev.map(p => {
      if (p.pattern.id === patternId) {
        const currentR = p.sets[setIndex]?.reps || 0;
        const newSets = [...p.sets];
        newSets[setIndex] = {
          ...newSets[setIndex],
          reps: Math.max(1, currentR + delta)
        };
        return { ...p, sets: newSets };
      }
      return p;
    }));
  };

  // Copy Set 1 to all sets for this exercise
  const handleCopyFirstSet = (patternId: string) => {
    setPatternStates(prev => prev.map(p => {
      if (p.pattern.id === patternId && p.sets.length > 0) {
        const firstSet = p.sets[0];
        const copiedSets = p.sets.map(s => ({
          ...s,
          weightKg: firstSet.weightKg,
          reps: firstSet.reps
        }));
        return { ...p, sets: copiedSets };
      }
      return p;
    }));
  };

  // Get last session performance for an exercise
  const getLastSessionPerf = (exerciseId: string, patternId: string) => {
    for (const pastLog of workoutHistory) {
      const found = pastLog.exercises.find(e => e.exerciseId === exerciseId || e.movementPatternId === patternId);
      if (found && found.sets.length > 0) {
        const repsList = found.sets.map(s => s.reps).join(", ");
        const weight = found.sets[0].weightKg;
        return {
          date: pastLog.date,
          weight,
          repsText: repsList,
          exerciseName: found.exerciseName
        };
      }
    }
    return null;
  };

  // Finish Workout Session
  const handleFinishWorkout = async () => {
    setIsSubmitting(true);
    try {
      let totalVol = 0;
      let totalSets = 0;

      const loggedExerciseSessions: LoggedExerciseSession[] = patternStates.map(p => {
        const setVol = p.sets.reduce((acc, s) => acc + (s.weightKg * s.reps), 0);
        totalVol += setVol;
        totalSets += p.sets.length;

        const aiAnalysis = analyzeProgression(
          p.exercise.id,
          p.exercise.name,
          p.sets,
          p.exercise.defaultTargetReps,
          p.exercise.incrementKg
        );

        return {
          movementPatternId: p.pattern.id,
          movementPatternName: p.pattern.name,
          exerciseId: p.exercise.id,
          exerciseName: p.exercise.name,
          sets: p.sets,
          wasSwapped: p.wasSwapped,
          swappedFromExerciseId: p.swappedFromExercise?.id,
          swappedFromExerciseName: p.swappedFromExercise?.name,
          aiRecommendation: aiAnalysis.suggestion
        };
      });

      const newLogDetail: WorkoutLogDetail = {
        id: `workout-${Date.now()}`,
        routineId: routine.id,
        routineName: routine.name,
        date: new Date().toISOString().split("T")[0],
        durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
        userId: userId,
        exercises: loggedExerciseSessions,
        totalVolumeKg: Math.round(totalVol),
        totalSetsCompleted: totalSets,
        createdAt: new Date().toISOString()
      };

      await onSaveWorkout(newLogDetail);
      setCompletedLog(newLogDetail);

      // Trigger Confetti!
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // ignore
      }

      setShowCelebration(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-gray-100 max-w-4xl mx-auto pb-24">
      {/* HEADER BAR */}
      <div className="bg-[#111827] border border-gray-800 rounded-3xl p-5 shadow-2xl sticky top-2 z-30 backdrop-blur-xl bg-[#111827]/95">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <span 
              className="p-3 rounded-2xl text-xl font-extrabold shadow-lg"
              style={{ backgroundColor: `${routine.color || "#10B981"}20`, color: routine.color || "#10B981" }}
            >
              🔥
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/40">
                  Modo Entrenamiento En Vivo
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1 font-semibold">
                  <Clock size={12} /> {formatTime(elapsedSeconds)}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                {routine.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onCancel}
              className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleFinishWorkout}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black rounded-xl text-xs hover:from-emerald-400 hover:to-teal-300 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? "Guardando..." : "Finalizar Entrenamiento"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* REST TIMER FLOATING WIDGET */}
      {isResting && restSeconds !== null && (
        <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-emerald-950 border border-cyan-500/40 rounded-2xl p-4 shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl animate-pulse">
              <Timer size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-cyan-400">Descanso en Progreso</p>
              <p className="text-xl font-black text-white font-mono">{formatTime(restSeconds)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setRestSeconds(prev => (prev || 0) + 30)}
              className="px-2.5 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-extrabold text-xs rounded-lg cursor-pointer"
            >
              +30s
            </button>
            <button
              onClick={() => setIsResting(false)}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* MOVEMENT PATTERNS LIST */}
      <div className="space-y-6">
        {patternStates.map((pState, pIdx) => {
          const { pattern, exercise, sets, wasSwapped, swappedFromExercise } = pState;
          const lastPerf = getLastSessionPerf(exercise.id, pattern.id);
          const aiAnalysis = analyzeProgression(
            exercise.id,
            exercise.name,
            sets,
            exercise.defaultTargetReps,
            exercise.incrementKg
          );

          return (
            <div 
              key={pattern.id}
              className="bg-[#111827] border border-gray-800 rounded-3xl p-5 space-y-4 shadow-xl hover:border-gray-700/80 transition-all relative overflow-hidden"
            >
              {/* Pattern Header & Swap Action */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-gray-800/80">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-[#1A2234] border border-gray-800 text-2xl rounded-2xl">
                    {pattern.icon}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
                        {pattern.name} ({pattern.category})
                      </span>
                      {wasSwapped && (
                        <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-800/40">
                          Reemplazado
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-white text-base sm:text-lg flex items-center gap-2">
                      {exercise.name}
                    </h3>
                  </div>
                </div>

                {/* SWAP BUTTON */}
                <button
                  onClick={() => setActiveSwapPattern(pattern)}
                  className="px-3.5 py-2 bg-[#1A2234] hover:bg-[#222B40] text-emerald-400 border border-emerald-500/30 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw size={13} className="text-emerald-400" />
                  <span>⚡ Cambiar Ejercicio (Gimnasio Lleno)</span>
                </button>
              </div>

              {/* Swapped Warning note */}
              {wasSwapped && swappedFromExercise && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>Cambiaste temporalmente <strong>{swappedFromExercise.name}</strong> por <strong>{exercise.name}</strong> para no perder tu entrenamiento.</span>
                </div>
              )}

              {/* Last Performance Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1A2234]/70 px-3.5 py-2 rounded-2xl border border-gray-800 text-xs">
                <div className="flex items-center gap-2 text-gray-300 font-semibold">
                  <Clock size={13} className="text-cyan-400" />
                  <span>
                    {lastPerf 
                      ? `Último registro (${lastPerf.date}): ${lastPerf.weight} kg → [${lastPerf.repsText}] reps`
                      : "Primer registro para este ejercicio/patrón 💪"}
                  </span>
                </div>

                <button
                  onClick={() => handleCopyFirstSet(pattern.id)}
                  className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  title="Copiar Serie 1 a todas las series"
                >
                  <Copy size={12} /> Copiar Serie 1 a todas
                </button>
              </div>

              {/* SETS LOGGING TABLE */}
              <div className="space-y-2.5">
                {(() => {
                  const isCardio = pattern.id === "cardio_ciclismo" || pattern.category === "Cardio";
                  return (
                    <>
                      <div className="grid grid-cols-12 text-[10px] font-black uppercase text-gray-400 px-2">
                        <div className="col-span-2">Serie</div>
                        <div className="col-span-4">{isCardio ? "Resistencia (Nivel/kg)" : "Peso (kg)"}</div>
                        <div className="col-span-6">{isCardio ? "Tiempo Pedaleo (Minutos)" : "Repeticiones (Elegir o Stepper)"}</div>
                      </div>

                      {sets.map((set, sIdx) => (
                        <div 
                          key={set.setNumber}
                          className="grid grid-cols-12 items-center gap-2 bg-[#1A2234] border border-gray-800 p-2.5 rounded-2xl hover:border-gray-700 transition-colors"
                        >
                          {/* Set Label */}
                          <div className="col-span-2 flex items-center gap-1.5 font-extrabold text-xs text-white">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xs">
                              {set.setNumber}
                            </span>
                            <span className="hidden sm:inline text-gray-400 font-semibold text-[11px]">
                              {isCardio ? "Bloque" : "Efectiva"}
                            </span>
                          </div>

                          {/* Weight Input + Steppers */}
                          <div className="col-span-4 flex items-center gap-1">
                            <button
                              onClick={() => handleStepWeight(pattern.id, sIdx, -2.5)}
                              className="w-7 h-7 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-black cursor-pointer shrink-0"
                            >
                              -
                            </button>

                            <input
                              type="number"
                              step="0.5"
                              value={set.weightKg}
                              onChange={(e) => handleUpdateSet(pattern.id, sIdx, "weightKg", parseFloat(e.target.value) || 0)}
                              className="w-full bg-[#111827] border border-gray-700 rounded-xl px-2 py-1.5 text-xs sm:text-sm font-black text-center text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />

                            <button
                              onClick={() => handleStepWeight(pattern.id, sIdx, +2.5)}
                              className="w-7 h-7 bg-gray-800 hover:bg-gray-700 text-emerald-400 rounded-xl text-xs font-black cursor-pointer shrink-0"
                            >
                              +
                            </button>
                          </div>

                          {/* Reps / Time Controls: Steppers + Dropdown Select + Quick Pills */}
                          <div className="col-span-6 flex items-center gap-1.5">
                            {/* Decrement Stepper */}
                            <button
                              onClick={() => handleStepReps(pattern.id, sIdx, isCardio ? -5 : -1)}
                              className="w-7 h-7 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-black cursor-pointer shrink-0"
                              title={isCardio ? "-5 minutos" : "-1 repetición"}
                            >
                              -
                            </button>

                            {/* Dropdown Select for Reps / Minutes */}
                            <select
                              value={set.reps}
                              onChange={(e) => handleUpdateSet(pattern.id, sIdx, "reps", parseInt(e.target.value, 10) || 1)}
                              className="bg-[#111827] border border-gray-700 rounded-xl px-2 py-1.5 text-xs font-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shrink-0"
                            >
                              {isCardio ? (
                                [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 90, 120].map(min => (
                                  <option key={min} value={min}>{min} min</option>
                                ))
                              ) : (
                                Array.from({ length: 40 }, (_, i) => i + 1).map(r => (
                                  <option key={r} value={r}>{r} reps</option>
                                ))
                              )}
                            </select>

                            {/* Increment Stepper */}
                            <button
                              onClick={() => handleStepReps(pattern.id, sIdx, isCardio ? 5 : 1)}
                              className="w-7 h-7 bg-gray-800 hover:bg-gray-700 text-emerald-400 rounded-xl text-xs font-black cursor-pointer shrink-0"
                              title={isCardio ? "+5 minutos" : "+1 repetición"}
                            >
                              +
                            </button>

                            {/* Rep Chips */}
                            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5">
                              {(isCardio ? [15, 20, 30, 45] : [6, 8, 10, 12]).map(r => (
                                <button
                                  key={r}
                                  onClick={() => handleUpdateSet(pattern.id, sIdx, "reps", r)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition-colors ${
                                    set.reps === r 
                                      ? "bg-emerald-500 text-slate-950 font-black" 
                                      : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                                  }`}
                                >
                                  {isCardio ? `${r}m` : r}
                                </button>
                              ))}
                            </div>

                            {/* Quick Rest Timer Trigger */}
                            <button
                              onClick={() => startRestTimer(90)}
                              className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-xl text-xs cursor-pointer ml-auto shrink-0"
                              title="Iniciar Descanso (90s)"
                            >
                              <Timer size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>

              {/* SMART AI PROGRESSION BANNER */}
              <div className="bg-gradient-to-r from-[#1A2234] to-[#141C2E] p-3.5 rounded-2xl border border-emerald-500/20 flex items-start gap-3">
                <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0 mt-0.5">
                  <Sparkles size={16} />
                </span>
                <div>
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                    Recomendación de Progresión Inteligente
                  </h4>
                  <p className="text-xs text-gray-200 mt-0.5 font-medium leading-relaxed">
                    {aiAnalysis.suggestion}
                  </p>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* SWAP EXERCISE MODAL */}
      {activeSwapPattern && (
        <ExerciseSwapModal
          isOpen={!!activeSwapPattern}
          onClose={() => setActiveSwapPattern(null)}
          movementPattern={activeSwapPattern}
          currentExerciseId={
            patternStates.find(p => p.pattern.id === activeSwapPattern.id)?.exercise.id || ""
          }
          allExercises={allExercises}
          onSelectExercise={(newEx) => handleSwapExercise(activeSwapPattern.id, newEx)}
          onCreateCustomExercise={onCreateCustomExercise}
        />
      )}

      {/* CELEBRATION SUMMARY MODAL */}
      {showCelebration && completedLog && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border-2 border-emerald-500/40 rounded-3xl max-w-md w-full p-6 text-center space-y-5 shadow-2xl animate-in zoom-in-90 duration-200">
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 rounded-full flex items-center justify-center mx-auto text-3xl shadow-lg shadow-emerald-500/30 font-black">
              🏆
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">¡Entrenamiento Completado!</h3>
              <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                {completedLog.routineName}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-[#1A2234] p-4 rounded-2xl border border-gray-800 text-left">
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400">Volumen Total</p>
                <p className="text-lg font-black text-white">{completedLog.totalVolumeKg} kg</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400">Series Efectivas</p>
                <p className="text-lg font-black text-emerald-400">{completedLog.totalSetsCompleted} series</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400">Tiempo Total</p>
                <p className="text-lg font-black text-white">{completedLog.durationMinutes} min</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400">Fecha</p>
                <p className="text-lg font-black text-white">{completedLog.date}</p>
              </div>
            </div>

            <button
              onClick={onCancel}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              Volver al Panel de Entrenamiento
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
