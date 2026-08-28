import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Bot, 
  Send, 
  RefreshCw, 
  Check, 
  Plus, 
  Dumbbell, 
  Activity, 
  Heart, 
  ShieldAlert, 
  User, 
  Calendar, 
  ChevronRight, 
  Search, 
  Info,
  Flame,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  sendCoachMessage, 
  evaluateCoachPhysical, 
  getExerciseVisual 
} from "../../api";
import { Routine, EquipmentType } from "../../types/workout";

interface MiloCoachTabProps {
  activeUserName: string;
  activeUserId: string;
  users?: any[];
  onSaveRoutine: (routine: Routine) => Promise<void>;
  onStartRoutine: (routine: Routine) => void;
  onNavigateTab: (tab: "routines" | "dashboard") => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "coach";
  text: string;
  timestamp: string;
}

export default function MiloCoachTab({
  activeUserName,
  activeUserId,
  users = [],
  onSaveRoutine,
  onStartRoutine,
  onNavigateTab
}: MiloCoachTabProps) {
  const [subTab, setSubTab] = useState<"chat" | "evaluation" | "visuals">("chat");

  // User-specific Profile Preset state
  const isMafe = activeUserId.toLowerCase().includes("mafe") || activeUserName.toLowerCase().includes("mafe");

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      sender: "coach",
      text: `¡Hola ${activeUserName}! Soy Milo, tu Coach Personal y Nutricionista deportivo en Templo 🏋️‍♂️.\n\nEstoy aquí para guiarte en tu entrenamiento, adaptar tus ejercicios a tu energía o cualquier consideración de salud, y darte recomendaciones claras de nutrición.\n\n¿En qué te puedo ayudar hoy?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Evaluation Form State
  const [objective, setObjective] = useState(isMafe ? "Recomposición Corporal & Tono" : "Fuerza & Masa Muscular");
  const [peso, setPeso] = useState<number>(isMafe ? 58 : 74);
  const [altura, setAltura] = useState<number>(isMafe ? 162 : 176);
  const [experience, setExperience] = useState("Principiante - Intermedio");
  const [activity, setActivity] = useState("Moderada (3-4 días/semana)");
  const [medical, setMedical] = useState(isMafe ? "Cuidado suave en zona pectoral / cicatriz de mastectomía" : "Ninguna reportada");
  const [equipment, setEquipment] = useState("Mancuernas ajustables, bandas y peso corporal");
  const [days, setDays] = useState<number>(3);
  const [duration, setDuration] = useState("35-45 minutos");
  const [focusBodyParts, setFocusBodyParts] = useState(isMafe ? "Pierna, Glúteos & Core" : "Espalda, Pecho & Hombros");
  const [likesExercises, setLikesExercises] = useState(isMafe ? "Sentadilla Copa, Peso Muerto Rumano, Bicho Muerto" : "Press de Pecho, Remo con Mancuerna, Zancadas");
  const [dislikesExercises, setDislikesExercises] = useState("");

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    summary: string;
    nutritionalFocus: string;
    routines: Array<{
      id: string;
      name: string;
      focus: string;
      exercises: Array<{
        name: string;
        series: string;
        adaptation: string;
        description: string;
      }>;
    }>;
    generalAdvice: string;
  } | null>(null);

  const [savedRoutinesSuccess, setSavedRoutinesSuccess] = useState(false);

  // Exercise Visualizer State
  const [visualSearchName, setVisualSearchName] = useState("Goblet Squat (Sentadilla con Copa)");
  const [isLoadingVisual, setIsLoadingVisual] = useState(false);
  const [visualData, setVisualData] = useState<{
    svg: string;
    instructions: string[];
    muscles: string[];
  } | null>(null);

  // Scroll Chat to Bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isSendingChat]);

  // Handle Send Chat
  const handleSendChatMessage = async (presetText?: string) => {
    const messageText = presetText || chatInput.trim();
    if (!messageText || isSendingChat) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!presetText) setChatInput("");
    setIsSendingChat(true);

    try {
      const history = chatMessages.slice(-6).map(m => ({
        role: m.sender === "user" ? ("user" as const) : ("model" as const),
        text: m.text
      }));

      const profileObj = {
        objetivo: objective,
        peso,
        altura,
        cicatriz: medical,
        experience,
        equipment,
        days,
        duration
      };

      const res = await sendCoachMessage(messageText, history, profileObj, evaluationResult);

      const coachMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "coach",
        text: res.reply || "¡Miau! Entendido, estoy listo para guiarte.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => [...prev, coachMsg]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: "coach",
          text: "Hubo un pequeño inconveniente de conexión con el Coach. ¡Inténtalo nuevamente en un instante!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Handle Run Physical AI Evaluation
  const handleRunEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEvaluating(true);
    setSavedRoutinesSuccess(false);

    try {
      const result = await evaluateCoachPhysical({
        objective,
        peso,
        altura,
        experience,
        activity,
        medical,
        equipment,
        days,
        duration,
        likesExercises,
        dislikesExercises
      });

      setEvaluationResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Convert Evaluation Routines & Save
  const handleImportRoutines = async () => {
    if (!evaluationResult || evaluationResult.routines.length === 0) return;

    try {
      for (const r of evaluationResult.routines) {
        const newRoutine: Routine = {
          id: `routine-coach-${r.id}-${Date.now()}`,
          name: `${r.name} (${activeUserName})`,
          description: `Enfoque: ${r.focus}. ${r.exercises.map(e => e.name).join(", ")}`,
          color: r.id === "A" ? "#10B981" : r.id === "B" ? "#3B82F6" : "#8B5CF6",
          createdBy: activeUserId,
          createdAt: new Date().toISOString(),
          patterns: r.exercises.map((e, idx) => ({
            movementPatternId: `pattern-${idx + 1}`,
            preferredExerciseId: `ex-${e.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
            targetSets: parseInt(e.series.match(/\d+/)?.[0] || "3"),
            targetRepsRange: e.series.includes("x") ? e.series.split("x")[1]?.trim() || "8-12" : "10-12",
            notes: e.adaptation || e.description
          }))
        };

        await onSaveRoutine(newRoutine);
      }
      setSavedRoutinesSuccess(true);
    } catch (err) {
      console.error("Error importing coach routines:", err);
    }
  };

  // Search Biomechanical Visual
  const handleFetchVisual = async (exName: string) => {
    setIsLoadingVisual(true);
    setVisualSearchName(exName);
    try {
      const data = await getExerciseVisual(exName);
      setVisualData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingVisual(false);
    }
  };

  // Auto load first visual on subtab switch
  useEffect(() => {
    if (subTab === "visuals" && !visualData) {
      handleFetchVisual(visualSearchName);
    }
  }, [subTab]);

  return (
    <div className="space-y-6 text-[#2C2723] max-w-5xl mx-auto">
      {/* TOP HEADER */}
      <div className="bg-gradient-to-r from-amber-500 via-rose-400 to-amber-600 border-2 border-amber-200/80 p-6 rounded-3xl shadow-xs relative overflow-hidden text-white">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-white/20 text-white font-black text-[10px] uppercase rounded-full tracking-wider flex items-center gap-1 backdrop-blur-xs">
                <Sparkles size={12} /> Coach Inteligente
              </span>
              <span className="text-xs text-amber-100 font-extrabold">
                Para {activeUserName} ({isMafe ? "Entrenamiento en Casa 🏡" : "Gimnasio 🏋️‍♂️"})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Milo Physical Coach 🤖
            </h1>
            <p className="text-xs sm:text-sm text-amber-50 font-medium">
              Acompañamiento biomecánico, adaptación kinesiológica y generación de planes personalizados.
            </p>
          </div>

          {/* SubTab Selectors */}
          <div className="flex bg-white/20 border border-white/30 p-1 rounded-2xl shrink-0 self-start sm:self-auto backdrop-blur-xs">
            <button
              onClick={() => setSubTab("chat")}
              className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                subTab === "chat" 
                  ? "bg-white text-[#2C2723] shadow-xs" 
                  : "text-white hover:bg-white/10"
              }`}
            >
              <Bot size={15} />
              <span>Chat Coach</span>
            </button>
            <button
              onClick={() => setSubTab("evaluation")}
              className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                subTab === "evaluation" 
                  ? "bg-white text-[#2C2723] shadow-xs" 
                  : "text-white hover:bg-white/10"
              }`}
            >
              <Activity size={15} />
              <span>Evaluar Plan</span>
            </button>
            <button
              onClick={() => setSubTab("visuals")}
              className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                subTab === "visuals" 
                  ? "bg-white text-[#2C2723] shadow-xs" 
                  : "text-white hover:bg-white/10"
              }`}
            >
              <Dumbbell size={15} />
              <span>Guía Visual</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUBTAB 1: CHAT COACH */}
      {subTab === "chat" && (
        <div className="bg-white border-2 border-[#E7E2D5] rounded-3xl p-4 sm:p-6 shadow-2xs flex flex-col h-[580px]">
          {/* Chat Suggestions */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 border-b border-[#E7E2D5] no-scrollbar mb-4">
            <span className="text-[10px] font-black uppercase text-amber-800 shrink-0 flex items-center gap-1">
              <Sparkles size={12} /> Preguntas rápidas:
            </span>
            {[
              isMafe ? "¿Cómo progresar con bandas de resistencia en casa?" : "¿Cómo sustituyo una máquina si está ocupada?",
              isMafe ? "¿Cómo proteger la zona pectoral en mis rutinas de torso?" : "¿Cuál es el rango óptimo de repeticiones?",
              "¿Qué comer hoy para buena recuperación muscular?",
              "¿Cómo estructurar mi descanso activo?"
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendChatMessage(chip)}
                className="px-3 py-1 bg-[#FAF7F2] border border-[#E7E2D5] hover:border-amber-300 text-[#2C2723] hover:bg-amber-50 text-xs rounded-full whitespace-nowrap transition-colors cursor-pointer shrink-0 font-medium"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {chatMessages.map(m => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.sender === "coach" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-rose-400 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-2xs mt-1">
                    🤖
                  </div>
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    m.sender === "user"
                      ? "bg-amber-500 text-white font-medium rounded-tr-none shadow-2xs"
                      : "bg-[#FAF7F2] border-2 border-[#E7E2D5] text-[#2C2723] rounded-tl-none whitespace-pre-line"
                  }`}
                >
                  <p>{m.text}</p>
                  <span
                    className={`block text-[9px] mt-2 text-right ${
                      m.sender === "user" ? "text-amber-100 font-bold" : "text-[#625B57]"
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isSendingChat && (
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-rose-400 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-2xs">
                  🤖
                </div>
                <div className="bg-[#FAF7F2] border-2 border-[#E7E2D5] p-3 rounded-2xl rounded-tl-none flex items-center gap-2 text-xs text-amber-800 font-bold animate-pulse">
                  <RefreshCw size={14} className="animate-spin text-amber-600" />
                  <span>Milo Coach está analizando biomecánica y preparando respuesta...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="pt-4 border-t border-[#E7E2D5] flex items-center gap-2 mt-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendChatMessage()}
              placeholder={`Escribe a Milo Coach para ${activeUserName}...`}
              className="flex-1 bg-[#FAF7F2] border-2 border-[#E7E2D5] focus:border-amber-400 rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#2C2723] placeholder-[#625B57] outline-none transition-colors font-medium"
            />
            <button
              onClick={() => handleSendChatMessage()}
              disabled={!chatInput.trim() || isSendingChat}
              className="p-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-black rounded-2xl transition-all cursor-pointer shrink-0 shadow-2xs"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB 2: PHYSICAL EVALUATION WIZARD */}
      {subTab === "evaluation" && (
        <div className="space-y-6">
          <form onSubmit={handleRunEvaluation} className="bg-white border-2 border-[#E7E2D5] rounded-3xl p-6 shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#E7E2D5] pb-4">
              <div>
                <h2 className="text-lg font-black text-[#2C2723] flex items-center gap-2">
                  <Activity size={20} className="text-amber-500" />
                  <span>Evaluación Físico-Kinesiología Milo</span>
                </h2>
                <p className="text-xs text-[#625B57]">
                  Cuestionario adaptativo inteligente para estructurar tu plan ideal en Templo.
                </p>
              </div>
              <span className="text-xs bg-amber-100 border border-amber-200 text-amber-900 font-extrabold px-3 py-1 rounded-full">
                {activeUserName}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[#625B57] font-extrabold mb-1">Objetivo Principal</label>
                <input
                  type="text"
                  value={objective}
                  onChange={e => setObjective(e.target.value)}
                  className="w-full bg-[#FAF7F2] border-2 border-[#E7E2D5] rounded-xl px-3 py-2 text-[#2C2723] outline-none focus:border-amber-400 font-medium"
                  placeholder="Ej: Recomposición, Fuerza, Salud"
                />
              </div>

              <div>
                <label className="block text-[#625B57] font-extrabold mb-1">Zonas Foco / Enfoque Corporal</label>
                <input
                  type="text"
                  value={focusBodyParts}
                  onChange={e => setFocusBodyParts(e.target.value)}
                  className="w-full bg-[#FAF7F2] border-2 border-[#E7E2D5] rounded-xl px-3 py-2 text-[#2C2723] outline-none focus:border-amber-400 font-medium"
                  placeholder="Ej: Piernas, Glúteos, Pecho, Espalda"
                />
              </div>

              <div>
                <label className="block text-[#625B57] font-extrabold mb-1">Peso Corporal (kg)</label>
                <input
                  type="number"
                  value={peso}
                  onChange={e => setPeso(Number(e.target.value))}
                  className="w-full bg-[#FAF7F2] border-2 border-[#E7E2D5] rounded-xl px-3 py-2 text-[#2C2723] outline-none focus:border-amber-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-[#625B57] font-extrabold mb-1">Altura (cm)</label>
                <input
                  type="number"
                  value={altura}
                  onChange={e => setAltura(Number(e.target.value))}
                  className="w-full bg-[#FAF7F2] border-2 border-[#E7E2D5] rounded-xl px-3 py-2 text-[#2C2723] outline-none focus:border-amber-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-[#625B57] font-extrabold mb-1">Nivel de Experiencia</label>
                <select
                  value={experience}
                  onChange={e => setExperience(e.target.value)}
                  className="w-full bg-[#FAF7F2] border-2 border-[#E7E2D5] rounded-xl px-3 py-2 text-[#2C2723] outline-none focus:border-amber-400 font-medium"
                >
                  <option value="Principiante (0-6 meses)">Principiante (0-6 meses)</option>
                  <option value="Intermedio (6 meses - 2 años)">Intermedio (6 meses - 2 años)</option>
                  <option value="Avanzado (+2 años)">Avanzado (+2 años)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#625B57] font-extrabold mb-1">Días Semanales Deseados</label>
                <select
                  value={days}
                  onChange={e => setDays(Number(e.target.value))}
                  className="w-full bg-[#FAF7F2] border-2 border-[#E7E2D5] rounded-xl px-3 py-2 text-[#2C2723] outline-none focus:border-amber-400 font-medium"
                >
                  <option value={2}>2 días por semana</option>
                  <option value={3}>3 días por semana (Recomendado)</option>
                  <option value={4}>4 días por semana</option>
                  <option value={5}>5 días por semana</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[#625B57] font-extrabold mb-1">Equipamiento Disponible</label>
                <input
                  type="text"
                  value={equipment}
                  onChange={e => setEquipment(e.target.value)}
                  className="w-full bg-[#FAF7F2] border-2 border-[#E7E2D5] rounded-xl px-3 py-2 text-[#2C2723] outline-none focus:border-amber-400 font-medium"
                  placeholder="Ej: Mancuernas, Bando de ejercicio, Máquinas de gym..."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[#625B57] font-extrabold mb-1 flex items-center gap-1 text-amber-800">
                  <ShieldAlert size={14} />
                  <span>Historial Médico / Precauciones (Movilidad, bajo impacto, cicatriz)</span>
                </label>
                <input
                  type="text"
                  value={medical}
                  onChange={e => setMedical(e.target.value)}
                  className="w-full bg-[#FAF7F2] border-2 border-[#E7E2D5] rounded-xl px-3 py-2 text-[#2C2723] outline-none focus:border-amber-400 font-medium"
                  placeholder="Ej: Cuidado en zona pectoral / Bajo impacto en rodillas..."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isEvaluating}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-2xl transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {isEvaluating ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Evaluando biomecánica con Milo IA...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Generar Plan Personalizado de Entrenamiento & Nutrición</span>
                </>
              )}
            </button>
          </form>

          {/* EVALUATION RESULTS DISPLAY */}
          {evaluationResult && (
            <div className="bg-white border-2 border-[#E7E2D5] rounded-3xl p-6 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#E7E2D5] pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-200">
                    Plan Generado Exclusivo
                  </span>
                  <h3 className="text-xl font-black text-[#2C2723] mt-1">
                    Diagnóstico Físico y Recomendaciones Templo
                  </h3>
                </div>

                <button
                  onClick={handleImportRoutines}
                  disabled={savedRoutinesSuccess}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-all shadow-2xs cursor-pointer flex items-center gap-2 shrink-0"
                >
                  {savedRoutinesSuccess ? (
                    <>
                      <Check size={16} />
                      <span>¡Rutinas Guardadas en Templo!</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Guardar Rutinas en mis Planes</span>
                    </>
                  )}
                </button>
              </div>

              {/* Summary */}
              <div className="bg-[#FAF7F2] border-2 border-[#E7E2D5] rounded-2xl p-4 space-y-2 text-xs text-[#2C2723] leading-relaxed whitespace-pre-line">
                <h4 className="font-bold text-amber-800 text-sm flex items-center gap-1.5">
                  <Activity size={16} />
                  <span>Análisis de Estado Físico:</span>
                </h4>
                <p>{evaluationResult.summary}</p>
              </div>

              {/* Nutritional Focus */}
              <div className="bg-[#FAF7F2] border-2 border-[#E7E2D5] rounded-2xl p-4 space-y-2 text-xs text-[#2C2723] leading-relaxed whitespace-pre-line">
                <h4 className="font-bold text-emerald-800 text-sm flex items-center gap-1.5">
                  <Flame size={16} />
                  <span>Foco Nutricional & Requerimientos:</span>
                </h4>
                <p>{evaluationResult.nutritionalFocus}</p>
              </div>

              {/* Routines Grid */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#2C2723] text-sm">Rutinas Sugeridas:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {evaluationResult.routines.map((r, idx) => (
                    <div key={idx} className="bg-[#FAF7F2] border-2 border-[#E7E2D5] rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                          {r.id}
                        </span>
                        <span className="text-[10px] font-bold text-[#625B57]">{r.focus}</span>
                      </div>
                      <h5 className="font-black text-[#2C2723] text-sm">{r.name}</h5>
                      <ul className="space-y-2 text-xs">
                        {r.exercises.map((ex, eIdx) => (
                          <li key={eIdx} className="bg-white p-2.5 rounded-xl border border-[#E7E2D5]">
                            <p className="font-bold text-emerald-800">{ex.name}</p>
                            <p className="text-[11px] text-[#625B57]">{ex.series}</p>
                            {ex.adaptation && (
                              <p className="text-[10px] text-amber-800 mt-1 italic">
                                💡 {ex.adaptation}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: BIOMECHANICAL VISUAL GUIDE */}
      {subTab === "visuals" && (
        <div className="bg-white border-2 border-[#E7E2D5] rounded-3xl p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#E7E2D5] pb-4">
            <div>
              <h2 className="text-lg font-black text-[#2C2723] flex items-center gap-2">
                <Dumbbell size={20} className="text-amber-500" />
                <span>Guía Biomecánica Visual</span>
              </h2>
              <p className="text-xs text-[#625B57]">
                Visualiza la ejecución correcta, postura y grupos musculares enfocados.
              </p>
            </div>

            {/* Quick Search Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={visualSearchName}
                onChange={e => setVisualSearchName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleFetchVisual(visualSearchName)}
                placeholder="Nombre del ejercicio..."
                className="bg-[#FAF7F2] border-2 border-[#E7E2D5] focus:border-amber-400 text-xs text-[#2C2723] px-3 py-2 rounded-xl outline-none font-medium"
              />
              <button
                onClick={() => handleFetchVisual(visualSearchName)}
                disabled={isLoadingVisual}
                className="p-2 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl transition-all cursor-pointer"
              >
                <Search size={16} />
              </button>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              "Goblet Squat (Sentadilla con Copa)",
              "Dumbbell Floor Press (Prensa en Suelo)",
              "Remo con Mancuerna a Un Brazo",
              "Peso Muerto Rumano",
              "Bicho Muerto (Dead Bug)"
            ].map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleFetchVisual(preset)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors cursor-pointer font-medium ${
                  visualSearchName === preset 
                    ? "bg-amber-500 text-white font-black border-amber-600" 
                    : "bg-[#FAF7F2] text-[#2C2723] border-[#E7E2D5] hover:bg-amber-50"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Visual SVG Card */}
          {isLoadingVisual ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-3 bg-[#FAF7F2] rounded-2xl border-2 border-[#E7E2D5]">
              <RefreshCw size={24} className="animate-spin text-amber-500" />
              <p className="text-xs text-[#625B57] font-bold">Generando modelo biomecánico...</p>
            </div>
          ) : visualData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* SVG Graphic Output */}
              <div 
                className="bg-[#FAF7F2] border-2 border-[#E7E2D5] rounded-2xl p-4 shadow-inner flex items-center justify-center min-h-[260px]"
                dangerouslySetInnerHTML={{ __html: visualData.svg }}
              />

              {/* Instructions & Muscles */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-black uppercase text-amber-800 tracking-wider mb-2 flex items-center gap-1.5">
                    <Activity size={14} /> Músculos Objetivo Principal:
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {visualData.muscles.map((m, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold rounded-lg">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase text-emerald-800 tracking-wider mb-2 flex items-center gap-1.5">
                    <Info size={14} /> Instrucciones Biomecánicas de Forma:
                  </h4>
                  <ol className="space-y-2 text-xs text-[#2C2723] list-decimal list-inside leading-relaxed">
                    {visualData.instructions.map((inst, idx) => (
                      <li key={idx} className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E7E2D5]">
                        {inst}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
