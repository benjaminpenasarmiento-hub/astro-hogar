import React from "react";
import { Play, Dumbbell, Flame, Trophy, Scale, Calendar, Clock, ChevronRight, Plus, Sparkles, Trash2 } from "lucide-react";
import { Routine, WorkoutLogDetail, BodyMetric } from "../../types/workout";

interface WorkoutDashboardProps {
  routines: Routine[];
  workoutHistory: WorkoutLogDetail[];
  bodyMetrics: BodyMetric[];
  onStartRoutine: (routine: Routine) => void;
  onNavigateTab: (tab: "routines" | "history" | "metrics" | "prs") => void;
  onDeleteLog: (logId: string) => Promise<void>;
}

export default function WorkoutDashboard({
  routines,
  workoutHistory,
  bodyMetrics,
  onStartRoutine,
  onNavigateTab,
  onDeleteLog
}: WorkoutDashboardProps) {
  // Compute monthly stats
  const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const logsThisMonth = workoutHistory.filter(l => l.date && l.date.startsWith(currentMonthStr));
  const totalVolumeThisMonth = logsThisMonth.reduce((acc, l) => acc + (l.totalVolumeKg || 0), 0);
  
  const latestWeight = bodyMetrics.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.weightKg;

  // Compute streak (unique dates in past 14 days)
  const recentDates = new Set(workoutHistory.map(l => l.date));
  const streakCount = recentDates.size;

  return (
    <div className="space-y-6 text-[#2C2723] max-w-5xl mx-auto">
      {/* HERO BANNER */}
      <div className="bg-gradient-to-r from-amber-500 via-rose-400 to-amber-600 border-2 border-amber-200/80 rounded-3xl p-6 shadow-xs relative overflow-hidden text-white">
        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-white/20 text-white font-black text-[10px] uppercase rounded-full tracking-wider backdrop-blur-xs">
                AstroHogar Fitness Engine
              </span>
              <span className="text-xs text-amber-100 font-extrabold flex items-center gap-1">
                <Flame size={14} className="text-amber-200 fill-amber-300" /> Racha: {streakCount} Días de Entrenamiento
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Templo • Bitácora de Salud & Ejercicio
            </h1>
            <p className="text-xs sm:text-sm text-amber-50 font-medium leading-relaxed">
              Organizado para entrenamientos en casa (bandas, mancuernas, bajo impacto) y de gimnasio. Registra tus series y el progreso día a día.
            </p>
          </div>

          {/* Quick Start First Routine */}
          {routines.length > 0 && (
            <button
              onClick={() => onStartRoutine(routines[0])}
              className="px-6 py-3.5 bg-white text-[#2C2723] hover:bg-amber-50 font-black rounded-2xl text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 shrink-0 group"
            >
              <Play size={18} className="fill-[#2C2723] group-hover:scale-110 transition-transform" />
              <span>Iniciar: {routines[0].name.split(":")[0]}</span>
            </button>
          )}
        </div>
      </div>

      {/* METRICS CARDS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => onNavigateTab("history")}
          className="bg-white border-2 border-[#E7E2D5] hover:border-emerald-300 p-4 rounded-3xl cursor-pointer transition-colors shadow-2xs"
        >
          <div className="flex items-center gap-2 text-emerald-600">
            <Calendar size={16} />
            <span className="text-[10px] font-black uppercase text-[#625B57]">Este Mes</span>
          </div>
          <p className="text-2xl font-black text-[#2C2723] mt-1">{logsThisMonth.length}</p>
          <p className="text-[10px] text-[#625B57] mt-0.5">Sesiones completadas</p>
        </div>

        <div className="bg-white border-2 border-[#E7E2D5] p-4 rounded-3xl shadow-2xs">
          <div className="flex items-center gap-2 text-amber-600">
            <Dumbbell size={16} />
            <span className="text-[10px] font-black uppercase text-[#625B57]">Volumen Mes</span>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-1">{(totalVolumeThisMonth / 1000).toFixed(1)}k <span className="text-xs text-[#625B57] font-bold">kg</span></p>
          <p className="text-[10px] text-[#625B57] mt-0.5">Carga total movida</p>
        </div>

        <div 
          onClick={() => onNavigateTab("metrics")}
          className="bg-white border-2 border-[#E7E2D5] hover:border-purple-300 p-4 rounded-3xl cursor-pointer transition-colors shadow-2xs"
        >
          <div className="flex items-center gap-2 text-purple-600">
            <Scale size={16} />
            <span className="text-[10px] font-black uppercase text-[#625B57]">Peso Corporal</span>
          </div>
          <p className="text-2xl font-black text-[#2C2723] mt-1">{latestWeight ? `${latestWeight} kg` : "--"}</p>
          <p className="text-[10px] text-purple-600 font-bold mt-0.5">+ Actualizar medida</p>
        </div>

        <div 
          onClick={() => onNavigateTab("prs")}
          className="bg-white border-2 border-[#E7E2D5] hover:border-amber-300 p-4 rounded-3xl cursor-pointer transition-colors shadow-2xs"
        >
          <div className="flex items-center gap-2 text-amber-500">
            <Trophy size={16} />
            <span className="text-[10px] font-black uppercase text-[#625B57]">Récords PRs</span>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-1">Ver PRs</p>
          <p className="text-[10px] text-[#625B57] mt-0.5">Hall of Fame</p>
        </div>
      </div>

      {/* QUICK LAUNCH ROUTINES SECTION */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-extrabold text-[#2C2723] flex items-center gap-2">
            <Dumbbell size={18} className="text-amber-500" />
            <span>Seleccionar Rutina para Hoy</span>
          </h2>

          <button
            onClick={() => onNavigateTab("routines")}
            className="text-xs font-extrabold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Ver / Modificar Rutinas</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {routines.map(r => (
            <div 
              key={r.id}
              className="bg-white border-2 border-[#E7E2D5] hover:border-amber-300 rounded-3xl p-5 space-y-4 shadow-2xs transition-all group relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span 
                    className="px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full border"
                    style={{ 
                      backgroundColor: `${r.color || "#F59E0B"}15`, 
                      color: r.color || "#B45309",
                      borderColor: `${r.color || "#F59E0B"}40` 
                    }}
                  >
                    {r.patterns.length} Ejercicios
                  </span>
                </div>
                <h3 className="font-extrabold text-[#2C2723] text-base mt-2 group-hover:text-amber-600 transition-colors">
                  {r.name}
                </h3>
                <p className="text-xs text-[#625B57] mt-1 line-clamp-2">{r.description}</p>
              </div>

              <button
                onClick={() => onStartRoutine(r)}
                className="w-full py-2.5 bg-[#FAF7F2] hover:bg-amber-500 hover:text-white text-[#2C2723] font-extrabold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border-2 border-[#E7E2D5]"
              >
                <Play size={14} className="fill-current" />
                <span>Comenzar Entrenamiento</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* RECENT WORKOUT LOGS */}
      <div className="bg-white border-2 border-[#E7E2D5] rounded-3xl p-5 space-y-4 shadow-2xs">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-extrabold text-[#2C2723] flex items-center gap-2">
            <Clock size={18} className="text-emerald-600" />
            <span>Últimos Entrenamientos Registrados</span>
          </h2>

          <button
            onClick={() => onNavigateTab("history")}
            className="text-xs font-bold text-[#625B57] hover:text-[#2C2723] flex items-center gap-1 cursor-pointer"
          >
            <span>Ver Historial Completo</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {workoutHistory.length === 0 ? (
          <div className="text-center py-8 text-[#625B57] text-xs">
            Aún no has registrado sesiones. Selecciona una rutina arriba para empezar tu primera bitácora.
          </div>
        ) : (
          <div className="space-y-3">
            {workoutHistory.slice(0, 3).map(log => (
              <div 
                key={log.id}
                className="bg-[#FAF7F2] border-2 border-[#E7E2D5] p-4 rounded-2xl space-y-2 hover:border-amber-200 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#2C2723] text-sm">{log.routineName || "Entrenamiento"}</span>
                      <span className="text-[10px] text-[#625B57] font-semibold">{log.date}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#625B57] mt-0.5">
                      <span><strong>{log.totalVolumeKg} kg</strong> volumen</span>
                      <span>•</span>
                      <span><strong>{log.totalSetsCompleted}</strong> series efectivas</span>
                      <span>•</span>
                      <span><strong>{log.durationMinutes}</strong> min</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteLog(log.id)}
                    className="p-1.5 text-[#625B57] hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                    title="Eliminar Registro"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Exercises summary pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {log.exercises.map((ex, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-0.5 bg-white border border-[#E7E2D5] text-[10px] font-semibold text-[#2C2723] rounded-lg"
                    >
                      {ex.exerciseName} ({ex.sets.length}s)
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
