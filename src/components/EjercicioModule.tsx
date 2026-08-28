import React, { useState, useEffect } from "react";
import { 
  Dumbbell, 
  Layers, 
  Clock, 
  Scale, 
  Trophy, 
  Plus, 
  Play, 
  Sparkles,
  Flame,
  X,
  ChevronRight,
  Bot,
  User,
  RotateCcw,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Routine, 
  MovementPattern, 
  Exercise, 
  WorkoutLogDetail, 
  BodyMetric 
} from "../types/workout";
import { 
  DEFAULT_MOVEMENT_PATTERNS, 
  DEFAULT_EXERCISES, 
  DEFAULT_ROUTINES 
} from "../data/workoutDefaultData";
import { 
  fetchWorkoutRoutines, 
  saveWorkoutRoutineApi, 
  deleteWorkoutRoutineApi,
  fetchWorkoutDetailedLogs, 
  saveWorkoutDetailedLogApi, 
  deleteWorkoutDetailedLogApi,
  fetchBodyMetrics, 
  saveBodyMetricApi, 
  deleteBodyMetricApi,
  fetchCustomExercises, 
  saveCustomExerciseApi 
} from "../api";

import WorkoutDashboard from "./workout/WorkoutDashboard";
import LiveWorkoutSession from "./workout/LiveWorkoutSession";
import RoutinesManager from "./workout/RoutinesManager";
import ExerciseHistoryView from "./workout/ExerciseHistoryView";
import BodyMetricsModule from "./workout/BodyMetricsModule";
import PersonalRecordsView from "./workout/PersonalRecordsView";
import MiloCoachTab from "./workout/MiloCoachTab";

interface EjercicioModuleProps {
  activeUser?: string;
  userId?: string;
  users?: any[];
}

type TabType = "dashboard" | "coach" | "session" | "routines" | "history" | "metrics" | "prs";

export default function EjercicioModule({ activeUser, userId, users }: EjercicioModuleProps) {
  // Active User Persona State (Mafe vs Benja vs General)
  const initialUser = activeUser || userId || "Benja";
  const [selectedUser, setSelectedUser] = useState<string>(
    initialUser.toLowerCase().includes("mafe") ? "Mafe" : "Benja"
  );

  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  // State
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutLogDetail[]>([]);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetric[]>([]);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Live Session Routine State
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [hasSavedSessionState, setHasSavedSessionState] = useState(false);

  // All Exercises combines default + custom exercises
  const allExercises = [...DEFAULT_EXERCISES, ...customExercises];

  // Check for active workout session saved in localStorage
  useEffect(() => {
    try {
      const savedState = localStorage.getItem("astro_active_workout_session");
      if (savedState) {
        setHasSavedSessionState(true);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Load initial data from server APIs with fallback to DEFAULT data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [fetchedRoutines, fetchedLogs, fetchedMetrics, fetchedCustoms] = await Promise.all([
          fetchWorkoutRoutines().catch(() => []),
          fetchWorkoutDetailedLogs().catch(() => []),
          fetchBodyMetrics().catch(() => []),
          fetchCustomExercises().catch(() => [])
        ]);

        if (fetchedRoutines && fetchedRoutines.length > 0) {
          setRoutines(fetchedRoutines);
        } else {
          // Initialize with default routines if empty
          setRoutines(DEFAULT_ROUTINES);
          for (const r of DEFAULT_ROUTINES) {
            saveWorkoutRoutineApi(r).catch(() => {});
          }
        }

        setWorkoutHistory(fetchedLogs || []);
        setBodyMetrics(fetchedMetrics || []);
        setCustomExercises(fetchedCustoms || []);
      } catch (err) {
        console.error("Error loading workout data:", err);
        setRoutines(DEFAULT_ROUTINES);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Save Workout Session
  const handleSaveWorkout = async (log: WorkoutLogDetail) => {
    try {
      const logWithUser = { ...log, userId: selectedUser };
      const saved = await saveWorkoutDetailedLogApi(logWithUser);
      setWorkoutHistory(prev => [saved, ...prev]);
      localStorage.removeItem("astro_active_workout_session");
      setHasSavedSessionState(false);
    } catch (err) {
      console.error(err);
      setWorkoutHistory(prev => [log, ...prev]);
    }
  };

  // Resume Session from Local Storage
  const handleResumeActiveSession = () => {
    try {
      const saved = localStorage.getItem("astro_active_workout_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.routine) {
          setActiveRoutine(parsed.routine);
          setActiveTab("session");
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save Routine
  const handleSaveRoutine = async (routineToSave: Routine) => {
    try {
      const routineWithUser: Routine = {
        ...routineToSave,
        createdBy: routineToSave.createdBy || selectedUser
      };
      const saved = await saveWorkoutRoutineApi(routineWithUser);
      setRoutines(prev => {
        const idx = prev.findIndex(r => r.id === saved.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [...prev, saved];
      });
    } catch (err) {
      console.error(err);
      setRoutines(prev => [...prev, routineToSave]);
    }
  };

  // Delete Routine
  const handleDeleteRoutine = async (routineId: string) => {
    try {
      await deleteWorkoutRoutineApi(routineId);
      setRoutines(prev => prev.filter(r => r.id !== routineId));
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Workout Log
  const handleDeleteLog = async (logId: string) => {
    try {
      await deleteWorkoutDetailedLogApi(logId);
      setWorkoutHistory(prev => prev.filter(l => l.id !== logId));
    } catch (err) {
      console.error(err);
    }
  };

  // Save Body Metric
  const handleSaveMetric = async (metric: BodyMetric) => {
    try {
      const metricWithUser = { ...metric, userId: selectedUser };
      const saved = await saveBodyMetricApi(metricWithUser);
      setBodyMetrics(prev => [saved, ...prev]);
    } catch (err) {
      console.error(err);
      setBodyMetrics(prev => [metric, ...prev]);
    }
  };

  // Delete Body Metric
  const handleDeleteMetric = async (id: string) => {
    try {
      await deleteBodyMetricApi(id);
      setBodyMetrics(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Create Custom Exercise
  const handleCreateCustomExercise = async (newEx: Omit<Exercise, "id">) => {
    const created = await saveCustomExerciseApi(newEx);
    setCustomExercises(prev => [...prev, created]);
    return created;
  };

  // Start Live Session
  const handleStartRoutine = (routine: Routine) => {
    setActiveRoutine(routine);
    setActiveTab("session");
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center text-gray-400 space-y-3">
        <Dumbbell className="animate-spin text-emerald-400" size={32} />
        <p className="text-xs font-bold uppercase tracking-wider text-gray-300">
          Cargando AstroHogar Training Engine...
        </p>
      </div>
    );
  }

  // Filter routines, history, and metrics per active persona
  const filteredRoutines = routines.filter(r => {
    const userLower = selectedUser.toLowerCase();
    if (userLower.includes("mafe")) {
      return (
        (r.createdBy && r.createdBy.toLowerCase().includes("mafe")) ||
        r.id.toLowerCase().includes("mafe") ||
        r.id.toLowerCase().includes("casa")
      );
    } else {
      return (
        (r.createdBy && r.createdBy.toLowerCase().includes("benja")) ||
        (!r.createdBy && !r.id.toLowerCase().includes("mafe") && !r.id.toLowerCase().includes("casa")) ||
        r.id.toLowerCase().includes("push") ||
        r.id.toLowerCase().includes("pull") ||
        r.id.toLowerCase().includes("legs") ||
        r.id.toLowerCase().includes("torso") ||
        r.id.toLowerCase().includes("ciclismo")
      );
    }
  });

  const filteredHistory = workoutHistory.filter(h => 
    !h.userId || h.userId.toLowerCase().includes(selectedUser.toLowerCase()) || h.userId === "home"
  );
  const filteredMetrics = bodyMetrics.filter(m => 
    !m.userId || m.userId.toLowerCase().includes(selectedUser.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2C2723] font-sans p-3 sm:p-6 space-y-6">
      
      {/* ACTIVE WORKOUT SESSION RECOVERY BANNER */}
      {hasSavedSessionState && activeTab !== "session" && (
        <div className="bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border-2 border-amber-200/90 p-4 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-3 shadow-xs animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-600 shrink-0" size={22} />
            <div>
              <p className="text-xs font-black text-[#2C2723]">
                Tienes un entrenamiento en curso pausado en segundo plano
              </p>
              <p className="text-[11px] text-[#625B57]">
                Los conjuntos e intervalos registrados están guardados localmente.
              </p>
            </div>
          </div>
          <button
            onClick={handleResumeActiveSession}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-2xl transition-all shadow-2xs cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <RotateCcw size={15} />
            <span>Reanudar Entrenamiento</span>
          </button>
        </div>
      )}

      {/* NAVIGATION HEADER & TABS BAR */}
      <div className="bg-white border-2 border-[#E7E2D5] rounded-3xl p-3.5 sm:p-5 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className={`p-2.5 bg-gradient-to-br text-white font-black rounded-2xl shadow-xs ${
            selectedUser === "Mafe" ? "from-rose-500 to-amber-400" : "from-emerald-600 to-amber-500"
          }`}>
            <Dumbbell size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                selectedUser === "Mafe" 
                  ? "bg-rose-50 text-rose-800 border-rose-200" 
                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
              }`}>
                <span>{selectedUser === "Mafe" ? "🌸" : "🏋️‍♂️"}</span> El Templo ({selectedUser})
              </span>
              <span className="text-xs text-[#625B57] font-semibold">• Coach Inteligente</span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-[#2C2723]">
              Templo • {selectedUser === "Mafe" ? "Entrenamiento en Casa & Tono" : "Hipertrofia & Fuerza Gimnasio"}
            </h1>
          </div>
        </div>

        {/* USER PERSONA SWITCHER (Mafe vs Benja) */}
        <div className="flex items-center gap-1 bg-[#FAF7F2] border-2 border-[#E7E2D5] p-1 rounded-2xl">
          <span className="text-[10px] font-extrabold text-[#625B57] px-2 flex items-center gap-1">
            <User size={12} /> Perfil:
          </span>
          <button
            onClick={() => setSelectedUser("Benja")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedUser === "Benja"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-[#625B57] hover:text-[#2C2723]"
            }`}
          >
            <span>Benja 🏋️‍♂️ (Gimnasio)</span>
          </button>
          <button
            onClick={() => setSelectedUser("Mafe")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedUser === "Mafe"
                ? "bg-rose-500 text-white shadow-2xs"
                : "text-[#625B57] hover:text-[#2C2723]"
            }`}
          >
            <span>Mafe 🌸 (Casa)</span>
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-1 bg-[#FAF7F2] p-1.5 rounded-2xl border-2 border-[#E7E2D5] w-full md:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-[#2C2723] text-amber-300 shadow-2xs"
                : "text-[#625B57] hover:text-[#2C2723]"
            }`}
          >
            <Sparkles size={14} />
            <span>Panel</span>
          </button>

          <button
            onClick={() => setActiveTab("coach")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "coach"
                ? selectedUser === "Mafe" ? "bg-rose-500 text-white shadow-2xs" : "bg-amber-500 text-white shadow-2xs"
                : "text-[#625B57] hover:text-[#2C2723]"
            }`}
          >
            <Bot size={14} />
            <span>Coach Milo</span>
          </button>

          <button
            onClick={() => setActiveTab("routines")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "routines"
                ? "bg-[#2C2723] text-amber-300 shadow-2xs"
                : "text-[#625B57] hover:text-[#2C2723]"
            }`}
          >
            <Layers size={14} />
            <span>Rutinas ({filteredRoutines.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "history"
                ? "bg-[#2C2723] text-amber-300 shadow-2xs"
                : "text-[#625B57] hover:text-[#2C2723]"
            }`}
          >
            <Clock size={14} />
            <span>Historial</span>
          </button>

          <button
            onClick={() => setActiveTab("metrics")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "metrics"
                ? "bg-[#2C2723] text-amber-300 shadow-2xs"
                : "text-[#625B57] hover:text-[#2C2723]"
            }`}
          >
            <Scale size={14} />
            <span>Medidas</span>
          </button>

          <button
            onClick={() => setActiveTab("prs")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "prs"
                ? "bg-[#2C2723] text-amber-300 shadow-2xs"
                : "text-[#625B57] hover:text-[#2C2723]"
            }`}
          >
            <Trophy size={14} />
            <span>PRs</span>
          </button>
        </div>
      </div>

      {/* ACTIVE CONTENT VIEW */}
      <AnimatePresence mode="wait">
        {activeTab === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <WorkoutDashboard
              routines={filteredRoutines}
              workoutHistory={filteredHistory}
              bodyMetrics={filteredMetrics}
              onStartRoutine={handleStartRoutine}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onDeleteLog={handleDeleteLog}
            />
          </motion.div>
        )}

        {activeTab === "coach" && (
          <motion.div
            key={`coach-${selectedUser}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <MiloCoachTab
              key={selectedUser}
              activeUserName={selectedUser}
              activeUserId={selectedUser.toLowerCase()}
              users={users}
              onSaveRoutine={handleSaveRoutine}
              onStartRoutine={handleStartRoutine}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          </motion.div>
        )}

        {activeTab === "session" && activeRoutine && (
          <motion.div
            key="session"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            <LiveWorkoutSession
              routine={activeRoutine}
              userId={selectedUser}
              allMovementPatterns={DEFAULT_MOVEMENT_PATTERNS}
              allExercises={allExercises}
              workoutHistory={workoutHistory}
              onSaveWorkout={handleSaveWorkout}
              onCancel={() => {
                setActiveRoutine(null);
                setActiveTab("dashboard");
              }}
              onCreateCustomExercise={handleCreateCustomExercise}
            />
          </motion.div>
        )}

        {activeTab === "routines" && (
          <motion.div
            key="routines"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <RoutinesManager
              routines={filteredRoutines}
              allMovementPatterns={DEFAULT_MOVEMENT_PATTERNS}
              allExercises={allExercises}
              onSaveRoutine={handleSaveRoutine}
              onDeleteRoutine={handleDeleteRoutine}
              onStartRoutine={handleStartRoutine}
            />
          </motion.div>
        )}

        {activeTab === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <ExerciseHistoryView
              workoutHistory={filteredHistory}
              allMovementPatterns={DEFAULT_MOVEMENT_PATTERNS}
              allExercises={allExercises}
              onDeleteLog={handleDeleteLog}
            />
          </motion.div>
        )}

        {activeTab === "metrics" && (
          <motion.div
            key="metrics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <BodyMetricsModule
              metrics={filteredMetrics}
              onSaveMetric={handleSaveMetric}
              onDeleteMetric={handleDeleteMetric}
            />
          </motion.div>
        )}

        {activeTab === "prs" && (
          <motion.div
            key="prs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <PersonalRecordsView
              workoutHistory={filteredHistory}
              allMovementPatterns={DEFAULT_MOVEMENT_PATTERNS}
              allExercises={allExercises}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
