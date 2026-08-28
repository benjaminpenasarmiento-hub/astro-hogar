import React, { useState, useEffect } from "react";
import { 
  Heart, 
  Home as HomeIcon, 
  Leaf, 
  MessageCircle, 
  Sparkles, 
  Lock, 
  Eye, 
  Send, 
  Calendar, 
  Award, 
  History, 
  ChevronDown, 
  ChevronUp,
  CheckCircle2, 
  Loader2, 
  MoonStar, 
  BookOpen, 
  UserPlus
} from "lucide-react";
import { UserProfile, UserId } from '../types';
import { 
  fetchSaludHogarData, 
  submitSaludAnswer, 
  toggleSaludChallenge, 
  submitFrascoMessage, 
  closeSaludMonth,
  fetchDailySummary,
  SaludHogarResponse,
  createCustomSaludChallenge
} from "../api";
import { Avatar } from "./Avatar";

function formatMarkdownText(text?: string): React.ReactNode {
  if (!text) return "";
  const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-extrabold text-red-700">{part}</strong>;
    }
    return part;
  });
}

function getTodayLocalDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface SaludHogarWidgetProps {
  users: UserProfile[];
  onRefreshAll?: () => void;
  activeUserId?: string;
}

export default function SaludHogarWidget({ users, onRefreshAll, activeUserId }: SaludHogarWidgetProps) {
  // Simulator active user to test multi-user inputs in one session
  const [currentUser, setCurrentUser] = useState<UserId>("" as UserId);
  const [loading, setLoading] = useState<boolean>(true);
  const [submittingAnswer, setSubmittingAnswer] = useState<string | null>(null);
  const [submittingFrasco, setSubmittingFrasco] = useState<boolean>(false);
  const [closingMonth, setClosingMonth] = useState<boolean>(false);
  
  // States from API
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocalDateStr());
  const [saludData, setSaludData] = useState<SaludHogarResponse | null>(null);
  const [todayQuestions, setTodayQuestions] = useState<any[]>([]);
  const [localAnswers, setLocalAnswers] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-06");
  const [newFrascoText, setNewFrascoText] = useState<string>("");
  const [selectedEmoji, setSelectedEmoji] = useState<string>("💝");
  const [activeTab, setActiveTab2] = useState<"diarias" | "retos" | "frasco" | "cierre">("diarias");
  const [customReflexionToggle, setCustomReflexionToggle] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>("");

  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});
  const [editingQuestions, setEditingQuestions] = useState<Record<string, boolean>>({});
  const [dailySummary, setDailySummary] = useState<{
    hasSummary: boolean;
    alignmentScore?: number;
    textResponse?: string;
    answersCount?: number;
    message?: string;
  } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  const [customChallengeTitle, setCustomChallengeTitle] = useState<string>("");
  const [customChallengeCategory, setCustomChallengeCategory] = useState<"conexion" | "armonia" | "bienestar">("conexion");
  const [submittingCustomChallenge, setSubmittingCustomChallenge] = useState<boolean>(false);

  const loadDailySummary = async (dateStr?: string) => {
    try {
      setLoadingSummary(true);
      const targetDate = dateStr || selectedDate;
      const summary = await fetchDailySummary(targetDate);
      setDailySummary(summary);
    } catch (err) {
      console.error("Error loading daily summary:", err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadData = async (forceRef?: boolean, targetDate?: string) => {
    try {
      setLoading(true);
      setErrorText("");
      const dateStr = targetDate || selectedDate;
      const data = await fetchSaludHogarData(dateStr, forceRef ?? customReflexionToggle);
      setSaludData(data);
      if (data?.answers) {
        setLocalAnswers(data.answers);
      }
      const todayStr = getTodayLocalDateStr();
      if (dateStr === todayStr && data?.questions) {
        setTodayQuestions(data.questions);
      }
      await loadDailySummary(dateStr);
    } catch (err: any) {
      console.error(err);
      setErrorText("Error al cargar datos de bienestar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch today's questions on mount to ensure comparison works even if starting on another day
    const fetchTodayOnMount = async () => {
      try {
        const todayStr = getTodayLocalDateStr();
        const data = await fetchSaludHogarData(todayStr, false);
        if (data?.questions) {
          setTodayQuestions(data.questions);
        }
      } catch (err) {
        console.error("Error fetching today's questions on mount:", err);
      }
    };
    fetchTodayOnMount();
  }, []);

  useEffect(() => {
    if (activeUserId) {
      setCurrentUser(activeUserId as UserId);
    } else if (users.length > 0) {
      setCurrentUser(prev => {
        const found = users.find(u => u.id === prev);
        return found ? found.id : users[0].id;
      });
    }
  }, [users, activeUserId]);

  useEffect(() => {
    loadData(false, selectedDate);
  }, [selectedDate, customReflexionToggle]);

  useEffect(() => {
    if (saludData?.answers) {
      setLocalAnswers(saludData.answers);
    }
  }, [saludData]);

  if (loading && !saludData) {
    return (
      <div className="bg-white rounded-3xl p-6 border-4 border-[#F3EFE6] shadow-2xs flex flex-col items-center justify-center py-12 space-y-3">
        <Loader2 className="animate-spin text-amber-600" size={32} />
        <p className="text-sm font-semibold text-gray-500 font-sans">Sintonizando canales de armonía en el nido miau...</p>
      </div>
    );
  }

  const indicators = saludData?.indicators || { conexion: 0, armonia: 0, bienestar: 0 };
  const questions = saludData?.questions || [];
  const challenges = saludData?.challenges || [];
  const answers = localAnswers;
  const frascoMessages = saludData?.frascoMessages || [];
  const cierresMensuales = saludData?.cierresMensuales || [];

  // Generate days in the current month
  const getDaysInMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, etc.
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Adjust firstDayIndex to start on Monday (0 = Monday, 6 = Sunday)
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    
    const days: { dateStr: string; dayNum: number; isPadding: boolean }[] = [];
    
    // Padding days for previous month
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push({ dateStr: "", dayNum: 0, isPadding: true });
    }
    
    // Days in current month
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dateStr, dayNum: d, isPadding: false });
    }
    
    return days;
  };

  const getDayHarmony = (dateStr: string) => {
    if (!dateStr) return null;
    const dayAnswers = answers.filter(a => a.date === dateStr && a.score !== undefined);
    if (dayAnswers.length === 0) return null;
    
    let sum = 0;
    dayAnswers.forEach(ans => {
      const percentageScore = ans.score === 5 ? 100 : ans.score === 4 ? 85 : ans.score === 3 ? 70 : ans.score === 2 ? 50 : 30;
      sum += percentageScore;
    });
    
    return Math.round(sum / dayAnswers.length);
  };

  // Helper to check if a specific user answered a question
  const getUserAnswer = (qId: string, uId: string, targetDate?: string) => {
    const dateStr = targetDate || selectedDate;
    if (!answers || !Array.isArray(answers)) return undefined;
    return answers.find(a => {
      // Must match exact date string
      if (!a.date || a.date !== dateStr) return false;
      // Must match user ID
      if (a.userId !== uId) return false;

      // Match exact question ID
      if (a.questionId === qId) return true;

      // Match normalized prefix/suffix if present
      if (a.questionId && qId) {
        if (a.questionId.startsWith(qId) || qId.startsWith(a.questionId)) return true;
      }

      // Category match fallback strictly for the same date
      if (a.category && qId) {
        if (a.category === qId) return true;
        if (qId.startsWith("q-con") && a.category === "conexion") return true;
        if (qId.startsWith("q-arm") && a.category === "armonia") return true;
        if (qId.startsWith("q-bie") && a.category === "bienestar") return true;
        if (qId.startsWith("q-ref") && a.category === "reflexion") return true;
      }

      return false;
    });
  };

  // Submit score-based answer
  const handleScoreAnswer = async (qId: string, category: any, score: number, targetDate?: string) => {
    const dateStr = targetDate || selectedDate;
    const optimisticAnswer = {
      id: `optimistic-${qId}-${currentUser}-${dateStr}`,
      questionId: qId,
      category,
      userId: currentUser,
      score,
      date: dateStr
    };
    
    // Clear edit mode for this question
    setEditingQuestions(prev => ({ ...prev, [`${dateStr}-${qId}-${currentUser}`]: false }));

    // Instantly update localAnswers state to reflect checkmark in UI
    setLocalAnswers(prev => [
      ...prev.filter(a => !(a.date === dateStr && a.userId === currentUser && (a.questionId === qId || a.category === category))),
      optimisticAnswer
    ]);

    try {
      await submitSaludAnswer({
        questionId: qId,
        category,
        userId: currentUser,
        score,
        date: dateStr
      });
      // Fetch fresh data for the target date
      const updated = await fetchSaludHogarData(dateStr, customReflexionToggle);
      setSaludData(updated);
      if (updated?.answers) {
        setLocalAnswers(updated.answers);
      }
      if (onRefreshAll) onRefreshAll();
    } catch (err) {
      console.error(err);
      loadData(false, dateStr);
    }
  };

  // Submit deep reflection text answer
  const handleTextAnswerSubmit = async (qId: string, text: string, targetDate?: string) => {
    if (!text.trim()) return;
    const dateStr = targetDate || selectedDate;
    const optimisticAnswer = {
      id: `optimistic-${qId}-${currentUser}-${dateStr}`,
      questionId: qId,
      category: "reflexion",
      userId: currentUser,
      textResponse: text.trim(),
      date: dateStr
    };

    setEditingQuestions(prev => ({ ...prev, [`${dateStr}-${qId}-${currentUser}`]: false }));

    setLocalAnswers(prev => [
      ...prev.filter(a => !(a.date === dateStr && a.userId === currentUser && (a.questionId === qId || a.category === "reflexion"))),
      optimisticAnswer
    ]);

    try {
      await submitSaludAnswer({
        questionId: qId,
        category: "reflexion",
        userId: currentUser,
        textResponse: text.trim(),
        date: dateStr
      });
      const updated = await fetchSaludHogarData(dateStr, customReflexionToggle);
      setSaludData(updated);
      if (updated?.answers) {
        setLocalAnswers(updated.answers);
      }
      if (onRefreshAll) onRefreshAll();
    } catch (err) {
      console.error(err);
      loadData(false, dateStr);
    }
  };

  // Toggle challenge completion
  const handleToggleChallenge = async (chId: string, completed: boolean) => {
    try {
      await toggleSaludChallenge(chId, currentUser, completed);
      await loadData();
      if (onRefreshAll) onRefreshAll();
    } catch (err) {
      console.error(err);
    }
  };

  // Submit custom challenge proposed by Mafe or Benja
  const handleCreateCustomChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customChallengeTitle.trim()) return;
    setSubmittingCustomChallenge(true);
    try {
      const weekStart = saludData?.weekStartDate || new Date().toISOString().split("T")[0];
      const activeUserObj = users.find(u => u.id === currentUser);
      const userPrefix = activeUserObj ? `Propuesto por ${activeUserObj.name}: ` : "";
      await createCustomSaludChallenge(
        weekStart,
        `${userPrefix}${customChallengeTitle.trim()}`,
        customChallengeCategory
      );
      setCustomChallengeTitle("");
      await loadData();
      if (onRefreshAll) onRefreshAll();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingCustomChallenge(false);
    }
  };

  // Submit message to frasco
  const handleFrascoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFrascoText.trim()) return;
    setSubmittingFrasco(true);
    try {
      await submitFrascoMessage(currentUser, newFrascoText.trim(), selectedEmoji);
      setNewFrascoText("");
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingFrasco(false);
    }
  };

  // Trigger monthly closing
  const handleCloseMonth = async () => {
    setClosingMonth(true);
    try {
      await closeSaludMonth(selectedMonth);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setClosingMonth(false);
    }
  };

  // Helper to map user profile name/avatar
  const getUserProfile = (uId: string) => {
    const found = users.find(u => u.id === uId);
    return found || { name: uId, emoji: "👤" };
  };

  const renderQuestionsForDate = (targetQuestions: any[], targetDate: string, isCurrentDay: boolean) => {
    if (!targetQuestions || targetQuestions.length === 0) {
      return (
        <div className="text-center py-8 bg-stone-50 rounded-2xl border border-dashed border-[#E7E2D5]">
          <p className="text-xs text-[#8A817C] font-semibold">Sin preguntas registradas para esta fecha miau 🐾</p>
        </div>
      );
    }

    return (
      <div className="space-y-3.5">
        {targetQuestions.map((q) => {
          const answerByActive = getUserAnswer(q.id, currentUser, targetDate);
          const isReflexion = q.category === "reflexion";
          
          // If answered, collapse it by default, unless they explicitly set its expansion
          const isExpanded = expandedQuestions[`${targetDate}-${q.id}`] !== undefined 
            ? expandedQuestions[`${targetDate}-${q.id}`] 
            : !answerByActive;

          if (!isExpanded) {
            return (
              <div key={`${targetDate}-${q.id}`} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ${
                    q.category === "conexion" 
                      ? "bg-red-50 text-red-700 border border-red-100" 
                      : q.category === "armonia" 
                      ? "bg-green-50 text-green-700 border border-green-100" 
                      : q.category === "bienestar"
                      ? "bg-blue-50 text-blue-700 border border-blue-100"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}>
                    {q.category === "conexion" && "❤️ Conexión"}
                    {q.category === "armonia" && "🏡 Armonía"}
                    {q.category === "bienestar" && "🌱 Bienestar"}
                    {q.category === "reflexion" && "🧘 Reflexión"}
                  </span>
                  <p className="text-xs font-bold text-gray-700 truncate max-w-[150px] sm:max-w-xs">
                    {q.text}
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="flex gap-1">
                    {users.map(u => {
                      const hasAns = getUserAnswer(q.id, u.id, targetDate);
                      return (
                        <span key={u.id} className="opacity-75" title={`${u.name}: ${hasAns ? 'ya respondió' : 'pendiente'}`}>
                          <Avatar emoji={u.emoji} className={`w-4 h-4 rounded-full border ${hasAns ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`} />
                        </span>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setExpandedQuestions(prev => ({ ...prev, [`${targetDate}-${q.id}`]: true }))}
                    className="p-1 hover:bg-stone-200 text-stone-500 hover:text-stone-900 rounded-lg transition-all"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={`${targetDate}-${q.id}`} className="p-4 bg-white rounded-2xl border-2 border-[#F3EFE6] space-y-3 shadow-3xs relative overflow-hidden">
              {/* Category Stamp */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    q.category === "conexion" 
                      ? "bg-red-50 text-red-700 border border-red-100" 
                      : q.category === "armonia" 
                      ? "bg-green-50 text-green-700 border border-green-100" 
                      : q.category === "bienestar"
                      ? "bg-blue-50 text-blue-700 border border-blue-100"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}>
                    {q.category === "conexion" && "❤️ Conexión"}
                    {q.category === "armonia" && "🏡 Armonía"}
                    {q.category === "bienestar" && "🌱 Bienestar"}
                    {q.category === "reflexion" && "🧘 Reflexión Profunda (Oculta)"}
                  </span>

                  {answerByActive && (
                    <button
                      onClick={() => setExpandedQuestions(prev => ({ ...prev, [`${targetDate}-${q.id}`]: false }))}
                      className="p-1 hover:bg-stone-100 text-stone-500 hover:text-stone-900 rounded-md transition-all flex items-center gap-1 text-[9px] font-bold"
                    >
                      <ChevronUp size={11} /> Contraer
                    </button>
                  )}
                </div>

                {/* Participant progress badges */}
                <div className="flex gap-1">
                  {users.map(u => {
                    const hasAns = getUserAnswer(q.id, u.id, targetDate);
                    return (
                      <span 
                        key={u.id} 
                        className={`text-[10px] w-5 h-5 flex items-center justify-center rounded-full border ${
                          hasAns 
                            ? "bg-emerald-100 border-emerald-200 text-emerald-800" 
                            : "bg-gray-100 border-gray-200 text-gray-400"
                        }`}
                        title={`${u.name} ${hasAns ? 'ya respondió hoy miau' : 'no ha respondido'}`}
                      >
                        <Avatar emoji={u.emoji} className="w-4 h-4" />
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Question text */}
              <p className="text-xs sm:text-sm font-extrabold text-[#2C2723] leading-relaxed">
                {q.text}
              </p>

              {/* SCORE-BASED CHOICE (1-5 Buttons) */}
              {!isReflexion && (
                <div>
                  {answerByActive && !editingQuestions[`${targetDate}-${q.id}-${currentUser}`] ? (
                    <div className="flex items-center justify-between gap-2 text-xs bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl font-bold text-emerald-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0">✅</span>
                        <span className="truncate">Respuesta registrada: {answerByActive.score}/5. ¡Gracias por participar!</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingQuestions(prev => ({ ...prev, [`${targetDate}-${q.id}-${currentUser}`]: true }))}
                        className="text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-extrabold px-2.5 py-1 rounded-lg border border-emerald-300 shrink-0 cursor-pointer transition-all active:scale-95"
                      >
                        Cambiar ✏️
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="grid grid-cols-5 gap-1.5 max-w-sm flex-1">
                          {[1, 2, 3, 4, 5].map((score) => (
                            <button
                              key={score}
                              disabled={submittingAnswer !== null}
                              onClick={() => handleScoreAnswer(q.id, q.category, score, targetDate)}
                              className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                answerByActive?.score === score
                                  ? "bg-[#E07A5F] text-white border border-[#E07A5F] shadow-xs scale-105"
                                  : "bg-[#FAF7F2] hover:bg-[#FFE5D9] hover:text-[#E07A5F] active:scale-95 text-[#2C2723] border border-gray-200"
                              }`}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                        {editingQuestions[`${targetDate}-${q.id}-${currentUser}`] && (
                          <button
                            type="button"
                            onClick={() => setEditingQuestions(prev => ({ ...prev, [`${targetDate}-${q.id}-${currentUser}`]: false }))}
                            className="text-[10px] text-gray-500 hover:text-gray-800 font-bold ml-1 underline shrink-0 cursor-pointer"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                      <div className="flex justify-between text-[9px] font-black text-gray-400 max-w-sm px-1">
                        <span>Bajo / Desacuerdo</span>
                        <span>Muy Bueno / De la semana</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* DEEP REFLECTION INPUT */}
              {isReflexion && (
                <div className="space-y-3">
                  {(() => {
                    const userProfiles = users.map(u => ({
                      id: u.id,
                      name: u.name,
                      emoji: u.emoji,
                      ans: getUserAnswer(q.id, u.id, targetDate)
                    }));
                    
                    const allAnswered = userProfiles.every(up => up.ans !== undefined);

                    if (allAnswered) {
                      return (
                        <div className="bg-[#FAF7F2] p-3 rounded-xl border border-amber-200 space-y-3.5">
                          <div className="text-xs font-black text-amber-900 border-b border-amber-200 pb-1.5 flex items-center gap-1.5">
                            <Eye size={12} className="text-amber-800" />
                            <span>¡Respuestas reveladas! Qué hermoso ver sus reflexiones del alma 🌟</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {userProfiles.map(u => (
                              <div key={u.id} className="bg-white p-3 rounded-xl border border-gray-100 flex gap-2.5 items-start">
                                <div className="shrink-0 p-1 bg-[#FAF7F2] rounded-lg mt-0.5"><Avatar emoji={u.emoji} className="w-5 h-5"/></div>
                                <div className="min-w-0">
                                  <p className="text-[10px] font-black text-slate-800 tracking-wide uppercase">{u.name}</p>
                                  <p className="text-[11px] leading-relaxed text-[#2C2723] mt-0.5 font-bold italic font-medium">"{u.ans?.textResponse}"</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    } else {
                      // Active user status
                      const activeUserAns = getUserAnswer(q.id, currentUser, targetDate);
                      return (
                        <div className="space-y-3">
                          {activeUserAns ? (
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl font-bold text-emerald-800">
                                <span>✅ Reflexión guardada:</span>
                                <span className="italic font-medium">"{activeUserAns.textResponse}"</span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] font-bold text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                                <Lock size={12} className="shrink-0 text-amber-700" />
                                <span>🔒 Oculto hasta que ambos respondan para este día.</span>
                              </div>
                            </div>
                          ) : (
                            <form 
                              onSubmit={(e) => {
                                e.preventDefault();
                                const text = (e.currentTarget.elements.namedItem("reflexText") as HTMLInputElement).value;
                                handleTextAnswerSubmit(q.id, text, targetDate);
                                e.currentTarget.reset();
                              }}
                              className="flex gap-2"
                            >
                              <input 
                                name="reflexText"
                                type="text"
                                required
                                disabled={submittingAnswer === q.id}
                                placeholder="Escribe tu respuesta reflexiva con el corazón..."
                                className="flex-1 bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
                              />
                              <button 
                                type="submit"
                                disabled={submittingAnswer === q.id}
                                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-3.5 flex items-center justify-center transition-all cursor-pointer"
                              >
                                {submittingAnswer === q.id ? <Loader2 className="animate-spin w-4 h-4"/> : <Send size={14}/>}
                              </button>
                            </form>
                          )}
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-[#FAF9F5] rounded-3xl border-4 border-[#F3EFE6] shadow-sm overflow-hidden flex flex-col font-sans">
      
      {/* SECTION HEADER */}
      <div className="p-5 sm:p-6 border-b-2 border-[#F3EFE6] bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">🥗</span>
            <h3 className="font-extrabold text-[#2C2723] text-base leading-tight">
              Salud del Hogar
            </h3>
          </div>
          <p className="text-xs text-[#8A817C]">
            Medidor dinámico de armonía, cercanía emocional y bienestar personal.
          </p>
        </div>

        {/* Dynamic Simulator User Selector */}
        {users.length > 0 && (
          <div className="flex items-center gap-2 bg-[#FAF7F2] p-1.5 rounded-2xl border border-[#F3EFE6] self-start">
            <span className="text-[10px] font-bold text-[#8A817C] pl-2 uppercase tracking-wider">
              Respondiendo como:
            </span>
            <div className="flex gap-1">
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => setCurrentUser(u.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    currentUser === u.id
                      ? "bg-[#FFE5D9] text-[#E07A5F] shadow-2xs border border-[#FFE5D9]"
                      : "text-gray-550 hover:bg-[#EAE5D9]"
                  }`}
                >
                  <Avatar emoji={u.emoji} className="w-4 h-4" />
                  <span>{u.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* METRIC BOARD (INDICATORS) */}
      <div className="p-5 bg-white border-b border-[#F3EFE6] grid grid-cols-3 gap-3">
        {/* ❤️ CONEXION */}
        <div className="flex flex-col items-center text-center p-3.5 rounded-2xl bg-gradient-to-b from-[#FFF0F2] to-white border-2 border-[#FFE3E8] shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-2 select-none">
            <Heart size={20} fill="#EF4444" className="animate-pulse" />
          </div>
          <span className="text-[10px] font-black text-red-800 uppercase tracking-wider">Conexión</span>
          <span className="text-xl sm:text-2xl font-mono font-black text-[#2C2723] mt-1">{indicators.conexion}%</span>
          <div className="w-full bg-red-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-red-500 h-full rounded-full transition-all duration-700" style={{ width: `${indicators.conexion}%` }}></div>
          </div>
          <span className="text-[9px] font-bold text-red-700 mt-1.5">
            {indicators.conexion >= 90 ? "Sincronizados 💞" : indicators.conexion >= 75 ? "Cálido y tierno 💕" : "Cultivar afecto 🕯️"}
          </span>
        </div>

        {/* 🏡 ARMONIA */}
        <div className="flex flex-col items-center text-center p-3.5 rounded-2xl bg-gradient-to-b from-[#F0FDF4] to-white border-2 border-[#DCFCE7] shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-2 select-none">
            <HomeIcon size={20} className="text-emerald-700" />
          </div>
          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Armonía</span>
          <span className="text-xl sm:text-2xl font-mono font-black text-[#2C2723] mt-1">{indicators.armonia}%</span>
          <div className="w-full bg-green-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-700" style={{ width: `${indicators.armonia}%` }}></div>
          </div>
          <span className="text-[9px] font-bold text-emerald-700 mt-1.5">
            {indicators.armonia >= 90 ? "Nido en orden ✨" : indicators.armonia >= 75 ? "Fluido y limpio 🧹" : "Balancear tareas 🧼"}
          </span>
        </div>

        {/* 🌱 BIENESTAR */}
        <div className="flex flex-col items-center text-center p-3.5 rounded-2xl bg-gradient-to-b from-[#F0F9FF] to-white border-2 border-[#E0F2FE] shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-2 select-none">
            <Leaf size={20} className="text-blue-700" />
          </div>
          <span className="text-[10px] font-black text-blue-800 uppercase tracking-wider">Bienestar</span>
          <span className="text-xl sm:text-2xl font-mono font-black text-[#2C2723] mt-1">{indicators.bienestar}%</span>
          <div className="w-full bg-blue-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-[#0284C7] h-full rounded-full transition-all duration-700" style={{ width: `${indicators.bienestar}%` }}></div>
          </div>
          <span className="text-[9px] font-bold text-blue-700 mt-1.5">
            {indicators.bienestar >= 90 ? "Vitalidad plena 🧘" : indicators.bienestar >= 75 ? "Energía sana ⚡" : "Priorizar descanso 😴"}
          </span>
        </div>
      </div>

      {/* CALENDARIO DE SINTONÍA DIARIA DEL MES */}
      <div className="mx-5 my-4 bg-gradient-to-br from-[#FCFBF7] to-[#F7F4EB] border-2 border-[#E7E2D5] p-4 rounded-2xl shadow-3xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📅</span>
            <h3 className="font-extrabold text-[#2C2723] text-xs sm:text-sm">Historial de Sintonía Diaria ({new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' })})</h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-200">Mes Activo</span>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-[#8A817C] mb-2 uppercase tracking-wider">
          <span>Lun</span>
          <span>Mar</span>
          <span>Mié</span>
          <span>Jue</span>
          <span>Vie</span>
          <span>Sáb</span>
          <span>Dom</span>
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {getDaysInMonth().map((day, idx) => {
            if (day.isPadding) {
              return <div key={`pad-${idx}`} className="h-9 rounded-lg bg-transparent" />;
            }
            
            const score = getDayHarmony(day.dateStr);
            let bgColor = "bg-[#FAF8F5] text-gray-300 border-[#EFECE3]"; // No answers
            let badgeTitle = "Sin registros miau 🐾";
            
            if (score !== null) {
              if (score >= 85) {
                bgColor = "bg-[#ECFDF5] text-emerald-800 border-[#A7F3D0] shadow-2xs font-extrabold";
                badgeTitle = `Sintonía Excelente: ${score}% miau ✨`;
              } else if (score >= 60) {
                bgColor = "bg-[#FFFBEB] text-amber-800 border-[#FDE68A] shadow-3xs font-bold";
                badgeTitle = `Sintonía Cálida: ${score}% miau 🔸`;
              } else {
                bgColor = "bg-[#EFF6FF] text-blue-800 border-[#BFDBFE] font-medium";
                badgeTitle = `Sintonía Sensible: ${score}% miau 🔹`;
              }
            }
            
            const isSelected = selectedDate === day.dateStr;
            
            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setSelectedDate(day.dateStr)}
                title={`${day.dateStr}: ${badgeTitle}`}
                className={`h-10 rounded-xl flex flex-col items-center justify-center border text-xs transition-all relative group cursor-pointer hover:scale-105 active:scale-95 ${
                  isSelected 
                    ? "ring-2 ring-rose-500 bg-rose-50/40 border-rose-400 font-extrabold shadow-xs scale-105 z-10" 
                    : bgColor
                }`}
              >
                <span className="leading-none text-[10px] font-black">{day.dayNum}</span>
                {score !== null && (
                  <span className="text-[7.5px] mt-0.5 font-mono leading-none opacity-80">{score}%</span>
                )}
                {/* Micro tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-[#2C2723] text-white text-[9.5px] py-1 px-2 rounded-lg whitespace-nowrap z-40 shadow-md font-sans border border-[#3E3833]">
                  {day.dayNum} de {new Date().toLocaleString('es-ES', { month: 'long' })}: <span className="font-extrabold">{score !== null ? `${score}%` : "Sin respuestas"}</span>
                </div>
              </button>
            );
          })}
        </div>
        
        <div className="flex justify-between items-center mt-3 text-[9px] text-[#8A817C] border-t border-[#E7E2D5] pt-2 gap-1 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#ECFDF5] border border-[#A7F3D0]"></span>
            <span>Excelente (≥85%)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#FFFBEB] border border-[#FDE68A]"></span>
            <span>Cálido (60-84%)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#EFF6FF] border border-[#BFDBFE]"></span>
            <span>{"Sensible (<60%)"}</span>
          </div>
        </div>
      </div>

      {/* WIDGET NAVIGATION TABS */}
      <div className="bg-[#FAF7F2] border-b-2 border-[#F3EFE6] flex text-xs font-bold divide-x-2 divide-[#F3EFE6]">
        <button
          onClick={() => setActiveTab2("diarias")}
          className={`flex-1 py-3 text-center transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "diarias" ? "bg-white text-[#2C2723] font-black" : "text-[#8A817C] hover:bg-[#FAF9F5]"
          }`}
        >
          <span>🎯</span> Preguntas Diarias
        </button>
        <button
          onClick={() => setActiveTab2("retos")}
          className={`flex-1 py-3 text-center transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "retos" ? "bg-white text-[#2C2723] font-black" : "text-[#8A817C] hover:bg-[#FAF9F5]"
          }`}
        >
          <span>🌱</span> Retos de Nido
        </button>
        <button
          onClick={() => setActiveTab2("frasco")}
          className={`flex-1 py-3 text-center transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "frasco" ? "bg-white text-[#2C2723] font-black" : "text-[#8A817C] hover:bg-[#FAF9F5]"
          }`}
        >
          <span>🍯</span> Frasco Gratitud
        </button>
        <button
          onClick={() => setActiveTab2("cierre")}
          className={`flex-1 py-3 text-center transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "cierre" ? "bg-white text-[#2C2723] font-black" : "text-[#8A817C] hover:bg-[#FAF9F5]"
          }`}
        >
          <span>🌙</span> Cierres
        </button>
      </div>

      {/* CONTENT BLOCKS */}
      <div className="p-5 flex-1 min-h-[300px]">

        {/* 1. DAILY QUESTIONS TABS */}
        {activeTab === "diarias" && (() => {
          const todayStr = new Date().toISOString().split("T")[0];
          const isSelectedToday = selectedDate === todayStr;

          return (
            <div className="space-y-4 animate-fade-in text-[#2C2723]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#F3EFE6]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm">📅</span>
                  <span className="text-xs font-bold text-gray-500">Sintonía de la fecha:</span>
                  <input 
                    type="date"
                    value={selectedDate}
                    max={todayStr}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-white text-xs font-bold text-[#E07A5F] border border-[#E7E2D5] rounded-xl px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-rose-400"
                  />
                  {!isSelectedToday && (
                    <button
                      type="button"
                      onClick={() => setSelectedDate(todayStr)}
                      className="text-[9px] bg-rose-500 hover:bg-rose-600 text-white font-black px-2.5 py-1 rounded-lg cursor-pointer transition-all active:scale-95 flex items-center gap-1 shrink-0"
                    >
                      Volver a Hoy ☀️
                    </button>
                  )}
                </div>
                
                {/* Feature tester: force deep reflection question swap */}
                <button
                  onClick={() => {
                    setCustomReflexionToggle(prev => !prev);
                  }}
                  className={`text-[9px] font-bold px-2.5 py-1 rounded-full border transition-all self-start sm:self-auto shrink-0 ${
                    customReflexionToggle 
                      ? "bg-[#FFE5D9] text-[#E07A5F] border-[#E07A5F]" 
                      : "bg-white text-gray-500 border-gray-200"
                  }`}
                  title="Haga clic para forzar que salga una pregunta de Reflexión Profunda"
                >
                  {customReflexionToggle ? "⏳ Reflexión Forzada Activa" : "⚡ Forzar Reflexión Profunda"}
                </button>
              </div>

              {isSelectedToday ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 border-b border-[#F3EFE6] pb-1.5">
                    <span className="text-xs font-black text-rose-600 uppercase tracking-wide">Preguntas del Día de Hoy ({selectedDate})</span>
                  </div>
                  {renderQuestionsForDate(questions, selectedDate, true)}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Selected Day Panel */}
                  <div className="space-y-3 bg-[#FAF8F5]/60 p-4 rounded-2xl border-2 border-[#F3EFE6]">
                    <div className="flex items-center justify-between border-b border-[#F3EFE6] pb-2">
                      <span className="text-xs font-black text-[#E07A5F] uppercase tracking-wide">📆 Día Seleccionado ({selectedDate})</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">Historial</span>
                    </div>
                    {renderQuestionsForDate(questions, selectedDate, false)}
                  </div>

                  {/* Today / Actual Day Panel */}
                  <div className="space-y-3 bg-white p-4 rounded-2xl border-2 border-[#E7E2D5] shadow-3xs">
                    <div className="flex items-center justify-between border-b border-rose-100 pb-2">
                      <span className="text-xs font-black text-rose-600 uppercase tracking-wide">✨ Día Actual (Hoy)</span>
                      <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">Activo</span>
                    </div>
                    {renderQuestionsForDate(todayQuestions, todayStr, true)}
                  </div>
                </div>
              )}

              {/* DAILY SINTONIA / ALIGNMENT SUMMARY */}
              <div className="p-4 bg-gradient-to-r from-red-50 to-[#FFF9F2] rounded-3xl border-2 border-red-100 space-y-3 shadow-3xs mt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💞</span>
                    <div>
                      <h4 className="text-xs font-black text-red-900 tracking-wide uppercase">Sintonía del Día</h4>
                      <p className="text-[10px] text-[#8A817C] font-semibold">Análisis en directo del nido por Milo 🐾</p>
                    </div>
                  </div>
                  <button
                    onClick={() => loadDailySummary()}
                    disabled={loadingSummary}
                    className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl cursor-pointer transition-all active:scale-95 flex items-center gap-1 shrink-0"
                  >
                    {loadingSummary ? <Loader2 size={10} className="animate-spin" /> : "Actualizar Sintonía ✨"}
                  </button>
                </div>

                {loadingSummary ? (
                  <div className="flex flex-col items-center justify-center py-6 space-y-2">
                    <Loader2 className="animate-spin text-red-500" size={18} />
                    <span className="text-[10px] text-gray-555 font-bold">Consiguiendo miau-análisis...</span>
                  </div>
                ) : dailySummary && dailySummary.hasSummary ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-white/70 p-3 rounded-2xl border border-red-50">
                      <div className="w-11 h-11 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-mono font-black text-sm shrink-0">
                        {dailySummary.alignmentScore ?? 50}%
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-gray-555 uppercase">Grado de Sintonía</p>
                        <p className="text-xs font-bold text-gray-800">
                          {(dailySummary.alignmentScore ?? 50) >= 90 ? "¡Unidad Astral Perfecta! 🌌" : (dailySummary.alignmentScore ?? 50) >= 70 ? "¡Caminos muy Alineados! 💕" : "¡Ocasión para mimarse miau! 🕯️"}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs leading-relaxed text-[#2C2723] bg-white/40 p-3 rounded-2xl border border-[#FFE3E8] font-medium whitespace-pre-line">
                      {formatMarkdownText(dailySummary.textResponse)}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-white/50 rounded-2xl border border-red-50">
                    <p className="text-[11px] text-[#625B57] font-bold">Respondan hoy para revelar la sintonía del nido miau.</p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* 2. WEEKLY CHALLENGES (RETOS DE NIDO) */}
        {activeTab === "retos" && (
          <div className="space-y-4 animate-fade-in text-[#2C2723]">
            <div className="p-4 bg-[#FFF9F2] rounded-2xl border-2 border-[#FFE8CC] flex items-start gap-3">
              <span className="text-xl">☀️</span>
              <div className="space-y-0.5">
                <h4 className="text-xs font-black text-amber-900 tracking-wide uppercase flex items-center gap-1.5">
                  Esta Semana en el Nido
                </h4>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Completen los tres retos semanales recomendados por Milo. Cada reto completado incrementará con orgullo +4 puntos al promedio ponderado mensual.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {challenges.map((ch) => {
                const completedByUser = ch.completedBy ? getUserProfile(ch.completedBy) : null;
                
                return (
                  <div 
                    key={ch.id} 
                    className={`p-4 rounded-2xl border-2 transition-all flex items-start gap-3 relative overflow-hidden ${
                      ch.completed 
                        ? "bg-slate-50 border-gray-200 opacity-70 text-gray-400" 
                        : ch.category === "conexion"
                        ? "bg-red-50/40 border-red-100"
                        : ch.category === "armonia"
                        ? "bg-green-50/40 border-green-100"
                        : "bg-blue-50/40 border-blue-100"
                    }`}
                  >
                    {/* Tick Checkbox */}
                    <button
                      onClick={() => handleToggleChallenge(ch.id, !ch.completed)}
                      className={`mt-0.5 w-6 h-6 rounded-xl border-2 shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                        ch.completed
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "bg-white border-gray-300 hover:border-emerald-500 text-transparent"
                      }`}
                    >
                      <CheckCircle2 size={16} className={ch.completed ? 'opacity-100' : 'opacity-0'} />
                    </button>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          ch.category === "conexion"
                            ? "bg-red-100 text-red-800"
                            : ch.category === "armonia"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {ch.category === "conexion" && "Conexión"}
                          {ch.category === "armonia" && "Armonía"}
                          {ch.category === "bienestar" && "Bienestar"}
                        </span>
                        
                        {ch.completed && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                            ¡Completado!
                          </span>
                        )}
                      </div>

                      <p className={`text-xs sm:text-sm font-extrabold leading-relaxed ${ch.completed ? 'line-through text-gray-400' : 'text-[#2C2723]'}`}>
                        {ch.title}
                      </p>

                      {ch.completed && completedByUser && (
                        <p className="text-[10.5px] text-[#8A817C] font-semibold flex items-center gap-1">
                          <span>Marcado por:</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 font-bold">
                            <Avatar emoji={completedByUser.emoji} className="w-4 h-4 inline-block" />
                            <span>{completedByUser.name}</span>
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Form to PROPOSE a custom challenge */}
            <form onSubmit={handleCreateCustomChallengeSubmit} className="bg-white p-4.5 rounded-2xl border-2 border-[#F3EFE6] mt-6 space-y-3 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <span className="text-base">✨</span>
                <span className="text-xs font-black uppercase tracking-wider text-amber-900">Proponer Reto Propio para la Semana</span>
              </div>
              <p className="text-[10.5px] text-[#8A817C] font-semibold">
                ¿Quieren hacer algo especial seleccionado por ustedes esta semana? Escriban su idea miau para sumarla como un reto oficial.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  required
                  value={customChallengeTitle}
                  onChange={(e) => setCustomChallengeTitle(e.target.value)}
                  placeholder="Ej: Cocinar pasta juntos de noche, Caminata al atardecer, Ver peli abrazados..."
                  className="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none text-[#2C2723]"
                />
                
                <select
                  value={customChallengeCategory}
                  onChange={(e) => setCustomChallengeCategory(e.target.value as any)}
                  className="bg-white border border-gray-300 rounded-xl px-2.5 py-2 text-xs font-black focus:outline-none focus:ring-1 focus:ring-amber-500 text-[#2C2723]"
                >
                  <option value="conexion">❤️ Conexión</option>
                  <option value="armonia">🏡 Armonía</option>
                  <option value="bienestar">🌱 Bienestar</option>
                </select>

                <button
                  type="submit"
                  disabled={submittingCustomChallenge}
                  className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white rounded-xl text-xs font-black px-4 py-2 transition-all cursor-pointer inline-flex items-center justify-center gap-1 shrink-0 text-cute"
                >
                  {submittingCustomChallenge ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <span>+ Añadir Reto</span>}
                </button>
              </div>
            </form>

          </div>
        )}

        {/* 3. FRASCO DEL HOGAR */}
        {activeTab === "frasco" && (
          <div className="space-y-4 animate-fade-in text-[#2C2723]">
            <div className="flex flex-col sm:flex-row gap-5">
              
              {/* Form Input Paper */}
              <form onSubmit={handleFrascoSubmit} className="flex-1 bg-white p-4.5 rounded-2xl border-2 border-[#F3EFE6] space-y-3.5 shadow-2xs">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-800">
                    Escribir un Papelito
                  </h4>
                  <p className="text-[10px] text-[#8A817C] font-medium">
                    Guarda agradecimientos, recuerdos bonitos o cariño espontáneo en el tarro para leer juntos.
                  </p>
                </div>

                <textarea
                  required
                  value={newFrascoText}
                  onChange={(e) => setNewFrascoText(e.target.value)}
                  placeholder="¡Gracias por regalarme un café hoy! O ¿Recuerdas cuando nos comimos esos tacos deliciosos?..."
                  className="w-full bg-slate-50 rounded-xl p-3 text-xs font-medium border border-gray-200 focus:ring-1 focus:ring-amber-500 focus:outline-[#EAE5D9] resize-none h-[80px]"
                />

                <div className="flex items-center justify-between gap-3">
                  {/* Emoji selector */}
                  <div className="flex gap-1.5 bg-[#FAF7F2] p-1 rounded-xl border border-gray-150">
                    {["💝", "🌸", "🏡", "✨", "🌻"].map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setSelectedEmoji(em)}
                        className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                          selectedEmoji === em ? "bg-white scale-110 shadow-3xs" : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={submittingFrasco}
                    className="bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-black px-4 py-2 flex items-center gap-1 cursor-pointer transition-all active:scale-95 text-cute shrink-0"
                  >
                    {submittingFrasco ? <Loader2 className="animate-spin w-3.5 h-3.5"/> : <Send size={12}/>}
                    <span>Guardar en Tarro</span>
                  </button>
                </div>
              </form>

              {/* Visual Pot Display Jar preview */}
              <div className="w-full sm:w-[220px] bg-gradient-to-b from-[#FFFDF9] to-[#FAF8F3] p-4 rounded-3xl border-4 border-[#F3EFE6] flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden group">
                <span className="text-5xl group-hover:scale-115 duration-500 select-none drop-shadow-md">🍯</span>
                <span className="text-xs font-black text-amber-900 mt-2">Frasco del Hogar</span>
                <p className="text-[10px] text-[#8A817C] font-semibold mt-0.5">
                  {frascoMessages.length} {frascoMessages.length === 1 ? 'papelito atesorado' : 'papelitos atesorados'}
                </p>
                <div className="w-full bg-amber-100/50 h-px my-2"></div>
                <p className="text-[9.5px] italic text-[#C27F38] font-bold">
                  "{frascoMessages.length > 0 
                    ? frascoMessages[frascoMessages.length - 1].text 
                    : "Vacío. ¡Escribe el primero!"}"
                </p>
              </div>
            </div>

            {/* Historical list */}
            {frascoMessages.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-[10px] font-black uppercase tracking-wider text-gray-400 mt-2">
                  Historial de Notas del Tarro
                </h5>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {[...frascoMessages].reverse().map((msg) => {
                    const profile = getUserProfile(msg.senderId);
                    
                    return (
                      <div key={msg.id} className="p-3 bg-white rounded-xl border border-gray-100 flex items-start gap-2.5 text-xs shadow-2xs">
                        <span className="text-base shrinkage-0 mt-0.5">{msg.emoji || "💝"}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10.5px] text-[#2C2723] font-bold leading-normal">
                            "{msg.text}"
                          </p>
                          <div className="text-[9px] text-[#8A817C] mt-1 font-bold flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-0.5">
                              <Avatar emoji={profile.emoji} className="w-3.5 h-3.5 inline-block" />
                              <span>{profile.name}</span>
                            </span>
                            <span>·</span>
                            <span>{new Date(msg.date).toLocaleDateString("es-ES", { day: 'numeric', month: 'short', hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. CIERRES MENSUALES */}
        {activeTab === "cierre" && (
          <div className="space-y-4 animate-fade-in text-[#2C2723]">
            <div className="bg-[#FAFDFB] p-4 rounded-2xl border border-green-200 text-xs text-green-950 space-y-2 shadow-2xs">
              <h4 className="font-extrabold text-sm text-green-800 flex items-center gap-2">
                🌙 Cerrar Mes
              </h4>
              <p className="text-[11px] leading-relaxed text-green-900">
                Al terminar el mes de sintonización y tareas, presionen el botón de cierre. Milo redactará con sabiduría tierno-felina y de forma ultra fidedigna un reporte mensual astro-emocional que se archivará para siempre en su historial familiar.
              </p>
              
              <div className="flex items-center gap-3 pt-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-white border border-green-300 rounded-xl px-2.5 py-1 text-xs font-mono font-bold focus:outline-none"
                >
                  <option value="2026-06">Junio de 2026</option>
                  <option value="2026-07">Julio de 2026</option>
                  <option value="2026-08">Agosto de 2026</option>
                  <option value="2026-09">Septiembre de 2026</option>
                </select>

                <button
                  onClick={handleCloseMonth}
                  disabled={closingMonth}
                  className="bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-800 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all transform active:scale-95 shadow-sm text-cute"
                >
                  {closingMonth ? (
                    <>
                      <Loader2 className="animate-spin w-3.5 h-3.5" />
                      <span>Escribiendo reporte...</span>
                    </>
                  ) : (
                    <>
                      <MoonStar size={13} />
                      <span>🌙 Realizar Cierre</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Cierres History ledger */}
            {cierresMensuales.length === 0 ? (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-150 rounded-2xl">
                <span className="text-2xl">📦</span>
                <p className="text-[11px] font-bold mt-1 text-gray-500">Historial de cierres vacío</p>
                <p className="text-[10px] text-gray-400">Aún no se registran cierres de mes para este nido.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h5 className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Libreto Histórico de Cierres
                </h5>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {[...cierresMensuales].reverse().map((cierre) => (
                    <div key={cierre.id} className="bg-white p-4.5 rounded-2xl border-2 border-[#F3EFE6] space-y-3 text-xs leading-normal relative shadow-2xs">
                      
                      <div className="flex justify-between items-center bg-[#FAF7F2] p-2.5 rounded-xl border border-gray-100">
                        <div>
                          <p className="text-xs font-black text-[#2C2723] uppercase tracking-wide">
                            {cierre.month === "2026-06" ? "Junio de 2026 🌙" : cierre.month === "2026-07" ? "Julio de 2026 🌙" : `${cierre.month}`}
                          </p>
                          <p className="text-[9px] text-[#8A817C] font-semibold mt-0.5">Cerrado el {cierre.dateCierre}</p>
                        </div>

                        <div className="flex gap-2.5 text-[10px] font-mono font-black text-slate-800">
                          <div>❤️ {cierre.averageConexion}%</div>
                          <div>🏡 {cierre.averageArmonia}%</div>
                          <div>🌱 {cierre.averageBienestar}%</div>
                        </div>
                      </div>

                      {/* Small Summary list attributes */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-bold text-[#8A817C] border-b border-gray-100 pb-2">
                        <div>🏆 {cierre.completedChallengesCount} Retos</div>
                        <div>💌 {cierre.frascoMessagesCount} Tarro</div>
                        <div>📅 {cierre.completedTasksCount} Tareas</div>
                        <div>📷 {cierre.memoriesCount} Recuerdos</div>
                      </div>

                      {/* AI Markdown content */}
                      <div className="text-[11.5px] leading-relaxed text-[#5C5552] whitespace-pre-line font-medium bg-[#FAFAF8] p-3 rounded-xl border border-[#FAFAF8]">
                        {formatMarkdownText(cierre.aiReflection)}
                      </div>

                      <p className="text-right text-[10px] font-black text-amber-700 font-mono">
                        🐾 Tu fiel amigo asistente Milo.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
