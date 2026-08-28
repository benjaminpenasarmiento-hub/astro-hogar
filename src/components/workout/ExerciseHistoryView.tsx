import React, { useState } from "react";
import { Search, Clock, Calendar, TrendingUp, Dumbbell, Trash2, Layers } from "lucide-react";
import { WorkoutLogDetail, MovementPattern, Exercise } from "../../types/workout";

interface ExerciseHistoryViewProps {
  workoutHistory: WorkoutLogDetail[];
  allMovementPatterns: MovementPattern[];
  allExercises: Exercise[];
  onDeleteLog: (logId: string) => Promise<void>;
}

export default function ExerciseHistoryView({
  workoutHistory,
  allMovementPatterns,
  allExercises,
  onDeleteLog
}: ExerciseHistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("ALL");

  const sortedLogs = [...workoutHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filter logs by search term or exercise
  const filteredLogs = sortedLogs.filter(log => {
    const matchesSearch = log.routineName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.exercises.some(e => e.exerciseName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (selectedExerciseId === "ALL") return matchesSearch;
    return matchesSearch && log.exercises.some(e => e.exerciseId === selectedExerciseId);
  });

  return (
    <div className="space-y-6 text-gray-100 max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-[#111827] border border-gray-800 p-5 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-800/40">
              Historial Completo
            </span>
          </div>
          <h2 className="text-xl font-black text-white mt-1">Bitácora de Entrenamientos</h2>
          <p className="text-xs text-gray-400">
            Registro cronológico detallado de series, repeticiones y cargas efectivas.
          </p>
        </div>

        {/* SEARCH BAR & FILTER */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar ejercicio o rutina..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#1A2234] border border-gray-800 rounded-2xl pl-9 pr-3 py-2 text-xs font-semibold text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            className="bg-[#1A2234] border border-gray-800 rounded-2xl px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="ALL">Todos los Ejercicios</option>
            {allExercises.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* LOGS LIST */}
      {filteredLogs.length === 0 ? (
        <div className="bg-[#111827] border border-gray-800 rounded-3xl p-12 text-center text-gray-500 text-xs">
          <Clock size={32} className="mx-auto text-gray-600 mb-2" />
          <p>No se encontraron registros de entrenamiento para este criterio.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLogs.map(log => (
            <div 
              key={log.id}
              className="bg-[#111827] border border-gray-800 hover:border-gray-700/80 rounded-3xl p-5 space-y-4 shadow-xl transition-all"
            >
              {/* Log Header */}
              <div className="flex justify-between items-start pb-3 border-b border-gray-800/80">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-base">{log.routineName || "Entrenamiento"}</span>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold rounded-md border border-emerald-500/20">
                      {log.date}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 font-semibold">
                    <span>Volumen: <strong className="text-emerald-400">{log.totalVolumeKg} kg</strong></span>
                    <span>•</span>
                    <span>Series: <strong className="text-white">{log.totalSetsCompleted}</strong></span>
                    <span>•</span>
                    <span>Duración: <strong className="text-white">{log.durationMinutes} min</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteLog(log.id)}
                  className="p-1.5 text-gray-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Eliminar Registro"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Exercises in Log */}
              <div className="space-y-3">
                {log.exercises.map((ex, exIdx) => (
                  <div 
                    key={exIdx}
                    className="bg-[#1A2234] border border-gray-800 p-3.5 rounded-2xl space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
                          {ex.movementPatternName}
                        </span>
                        <span className="font-extrabold text-white text-sm">{ex.exerciseName}</span>
                      </div>

                      {ex.wasSwapped && (
                        <span className="text-[10px] text-amber-400 font-bold bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-800/40">
                          Reemplazado en gimnasio
                        </span>
                      )}
                    </div>

                    {/* Sets pills */}
                    <div className="flex flex-wrap gap-2">
                      {ex.sets.map((s, sIdx) => (
                        <div 
                          key={sIdx}
                          className="bg-[#111827] border border-gray-700/80 px-2.5 py-1 rounded-xl text-xs font-bold text-gray-200 flex items-center gap-1"
                        >
                          <span className="text-gray-500 text-[10px]">#{s.setNumber}:</span>
                          <span className="text-emerald-400 font-black">{s.weightKg} kg</span>
                          <span className="text-gray-400">×</span>
                          <span className="text-white">
                            {ex.exerciseName.toLowerCase().includes("ciclismo") || ex.exerciseName.toLowerCase().includes("bici")
                              ? `${s.reps} min`
                              : `${s.reps} reps`}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* AI Recommendation log */}
                    {ex.aiRecommendation && (
                      <p className="text-[11px] text-emerald-400/90 font-medium italic pt-1 border-t border-gray-800/50">
                        💡 {ex.aiRecommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
