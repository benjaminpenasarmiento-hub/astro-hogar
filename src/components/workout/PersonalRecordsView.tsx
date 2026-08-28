import React, { useState } from "react";
import { Trophy, Dumbbell, Sparkles, Flame, Calendar, Award } from "lucide-react";
import { WorkoutLogDetail, MovementPattern, Exercise } from "../../types/workout";

interface PersonalRecordsViewProps {
  workoutHistory: WorkoutLogDetail[];
  allMovementPatterns: MovementPattern[];
  allExercises: Exercise[];
}

interface PRItem {
  exerciseId: string;
  exerciseName: string;
  patternName: string;
  category: string;
  maxWeightKg: number;
  repsAtMaxWeight: number;
  maxVolumeKg: number;
  achievedDate: string;
}

export default function PersonalRecordsView({
  workoutHistory,
  allMovementPatterns,
  allExercises
}: PersonalRecordsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Calculate PRs dynamically from workout history
  const prMap = new Map<string, PRItem>();

  workoutHistory.forEach(log => {
    log.exercises.forEach(exSession => {
      const exDef = allExercises.find(e => e.id === exSession.exerciseId);
      const patternDef = allMovementPatterns.find(p => p.id === exSession.movementPatternId);

      exSession.sets.forEach(set => {
        if (!set.weightKg || set.weightKg <= 0) return;

        const currentPr = prMap.get(exSession.exerciseId);
        const setVolume = set.weightKg * set.reps;

        if (!currentPr || set.weightKg > currentPr.maxWeightKg) {
          prMap.set(exSession.exerciseId, {
            exerciseId: exSession.exerciseId,
            exerciseName: exSession.exerciseName,
            patternName: patternDef?.name || exSession.movementPatternName || "Patrón",
            category: patternDef?.category || "Upper",
            maxWeightKg: set.weightKg,
            repsAtMaxWeight: set.reps,
            maxVolumeKg: setVolume,
            achievedDate: log.date
          });
        }
      });
    });
  });

  const allPrs = Array.from(prMap.values());
  const filteredPrs = selectedCategory === "ALL" 
    ? allPrs 
    : allPrs.filter(p => p.category === selectedCategory);

  return (
    <div className="space-y-6 text-gray-100 max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-[#111827] border border-gray-800 p-5 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-800/40">
              Hall of Fame
            </span>
          </div>
          <h2 className="text-xl font-black text-white mt-1 flex items-center gap-2">
            <Trophy size={22} className="text-amber-400" /> Récords Personales (PRs)
          </h2>
          <p className="text-xs text-gray-400">
            Cargas máximas absolutas registradas en tus entrenamientos por ejercicio.
          </p>
        </div>

        {/* CATEGORY CHIPS */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          {["ALL", "Upper", "Lower", "Arms", "Core"].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                selectedCategory === cat 
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20" 
                  : "bg-[#1A2234] text-gray-300 hover:bg-gray-800"
              }`}
            >
              {cat === "ALL" ? "Todos" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* PR GRID */}
      {filteredPrs.length === 0 ? (
        <div className="bg-[#111827] border border-gray-800 rounded-3xl p-12 text-center text-gray-500 text-xs">
          <Award size={32} className="mx-auto text-gray-600 mb-2" />
          <p>Aún no se registran récords personales. Realiza tu primer entrenamiento para generar tus marcas históricas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrs.map(pr => (
            <div 
              key={pr.exerciseId}
              className="bg-[#111827] border border-amber-500/20 hover:border-amber-500/40 rounded-3xl p-5 space-y-3 shadow-xl relative overflow-hidden group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/40">
                    {pr.patternName}
                  </span>
                  <h3 className="font-extrabold text-white text-base mt-1 group-hover:text-amber-400 transition-colors">
                    {pr.exerciseName}
                  </h3>
                </div>

                <span className="p-2 bg-amber-500/10 text-amber-400 rounded-2xl">
                  <Trophy size={18} />
                </span>
              </div>

              <div className="bg-[#1A2234] p-3 rounded-2xl border border-gray-800 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400">Máxima Carga Movida</p>
                  <p className="text-2xl font-black text-amber-400">{pr.maxWeightKg} kg</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-gray-400">Repeticiones</p>
                  <p className="text-lg font-black text-white">{pr.repsAtMaxWeight} reps</p>
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-gray-400 font-semibold pt-1">
                <span className="flex items-center gap-1 text-gray-500">
                  <Calendar size={12} /> Logrado el {pr.achievedDate}
                </span>
                <span className="text-emerald-400 font-bold">PR Verificado</span>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
