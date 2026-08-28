import React, { useState, useEffect } from "react";
import { UserProfile, EmotionCheckin, CustomEmotion } from "../types";
import { Heart, Loader2, Lock } from "lucide-react";
import { Avatar, getAvatarEmojiChar } from "./Avatar";
import { 
  fetchSintoniaCheckins, 
  fetchCustomEmotions, 
  fetchSaludHogarData 
} from "../api";

interface SincronizadorEmocionesProps {
  users: UserProfile[];
  activeUserId?: string;
}

const EMOTIONS = [
  { id: "feliz", name: "Amoroso / Sintonizado", emoji: "🥰" },
  { id: "agradecido", name: "Feliz / Satisfecho", emoji: "💝" },
  { id: "romantico", name: "Romántico / Enamorado", emoji: "💖" },
  { id: "mimado", name: "Con Mimos / Consentido", emoji: "🤗" },
  { id: "zen", name: "En Paz / Relajado / Zen", emoji: "🧘" },
  { id: "energico", name: "Enérgico / Motivado", emoji: "⚡" },
  { id: "emocionado", name: "Ilusionado / Radiante", emoji: "✨" },
  { id: "divertido", name: "Divertido / Jugón", emoji: "🎮" },
  { id: "cansado", name: "Agotado / Sin Batería", emoji: "😴" },
  { id: "perezoso", name: "Perezoso / Dormilón", emoji: "💤" },
  { id: "triste", name: "Sensible / Vulnerable", emoji: "🥺" },
  { id: "estresado", name: "Estresado / Abrumado", emoji: "😰" },
  { id: "inquieto", name: "Pensativo / Distante", emoji: "🤔" }
];

export function SincronizadorEmociones({ users, activeUserId }: SincronizadorEmocionesProps) {
  const user1 = users[0] || { id: "mafe", name: "Miembro 1", emoji: "🌸" };
  const user2 = users[1] || { id: "benja", name: "Miembro 2", emoji: "🦊" };

  const [checkins, setCheckins] = useState<EmotionCheckin[]>([]);
  const [customEmotions, setCustomEmotions] = useState<CustomEmotion[]>([]);
  
  const getLocalDateString = (date = new Date()) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  };

  const todayStr = getLocalDateString();
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  const [selectedDayQuestions, setSelectedDayQuestions] = useState<any[]>([]);
  const [selectedDayAnswers, setSelectedDayAnswers] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);

  // Load emotions and custom emotions
  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedCheckins = await fetchSintoniaCheckins();
        setCheckins(loadedCheckins);
      } catch (e) {
        console.error("Error loading sintonía checkins:", e);
        const saved = localStorage.getItem("emotion_checkins");
        if (saved) {
          try { setCheckins(JSON.parse(saved)); } catch (err) {}
        }
      }

      try {
        const loadedCustom = await fetchCustomEmotions();
        setCustomEmotions(loadedCustom);
      } catch (e) {
        console.error("Error loading custom emotions:", e);
        const savedCustom = localStorage.getItem("custom_emotions");
        if (savedCustom) {
          try { setCustomEmotions(JSON.parse(savedCustom)); } catch (err) {}
        }
      }
    };
    loadData();
  }, []);

  // Fetch questions and answers for selected day
  useEffect(() => {
    const fetchQuestionsAndAnswers = async () => {
      try {
        setLoadingQuestions(true);
        const data = await fetchSaludHogarData(selectedDateStr, false);
        setSelectedDayQuestions(data.questions || []);
        setSelectedDayAnswers(data.answers || []);
      } catch (err) {
        console.error("Error loading questions/answers for date:", err);
        setSelectedDayQuestions([]);
        setSelectedDayAnswers([]);
      } finally {
        setLoadingQuestions(false);
      }
    };
    fetchQuestionsAndAnswers();
  }, [selectedDateStr]);

  const allEmotions = [...EMOTIONS, ...customEmotions];

  const getEmotionById = (id: string) => {
    return allEmotions.find(e => e.id === id) || { emoji: "💭", name: id };
  };

  const getUserAnswer = (qId: string, uId: string) => {
    return selectedDayAnswers.find(a => a.date === selectedDateStr && a.questionId === qId && a.userId === uId);
  };

  const formatFriendlyDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
    } catch (e) {
      return dateStr;
    }
  };

  const user1SelectedCheckins = checkins.filter(c => c.date === selectedDateStr && c.userId === user1.id);
  const user2SelectedCheckins = checkins.filter(c => c.date === selectedDateStr && c.userId === user2.id);

  return (
    <div id="emociones-sintonia-card" className="bg-white rounded-3xl border-4 border-[#F3EFE6] shadow-sm p-5 sm:p-6 space-y-5 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F3EFE6] pb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-rose-600 font-extrabold text-sm uppercase tracking-wider">
            <Heart size={16} fill="currentColor" className="animate-pulse" />
            <h3>Mapa de Emociones y Sintonía</h3>
          </div>
          <p className="text-[10.5px] text-[#8A817C] font-semibold">
            Mira las emociones y respuestas a preguntas de sintonía en la fecha seleccionada.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-1.5 bg-[#FAF7F2] px-2.5 py-1.5 rounded-xl border border-[#F3EFE6] self-start shrink-0">
          <span className="text-[10px] text-gray-550 font-bold">Fecha:</span>
          <input 
            type="date"
            value={selectedDateStr}
            max={todayStr}
            onChange={(e) => setSelectedDateStr(e.target.value)}
            className="bg-transparent text-xs font-bold text-[#E07A5F] focus:outline-none focus:ring-0 w-[110px]"
          />
        </div>
      </div>

      {/* CORE DISPLAY CONTAINER */}
      <div className="bg-[#FAF9F5] p-5 rounded-2xl border-2 border-[#F3EFE6] space-y-6">
        
        {/* SECTION 1: EMOTIONS OF THE SELECTED DAY */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5 border-b border-[#EAE5D9] pb-1.5">
            <span>🎭</span> Emociones Registradas
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User 1 Checkins */}
            <div className="bg-white p-4 rounded-xl border border-[#F3EFE6] shadow-3xs">
              <p className="text-[10px] font-black text-rose-700 uppercase tracking-wider flex items-center gap-1 mb-3">
                <span>{getAvatarEmojiChar(user1.emoji)}</span> {user1.name}
              </p>
              {user1SelectedCheckins.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic font-bold">Sin registrar miau 🐾</p>
              ) : (
                <div className="space-y-2">
                  {user1SelectedCheckins.map((c, idx) => {
                    const emo = getEmotionById(c.emotion);
                    return (
                      <div key={idx} className="bg-[#FAF9F5] p-2.5 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-1.5 text-xs text-[#2C2723] font-bold">
                          <span className="text-sm shrink-0">{emo.emoji}</span>
                          <span>{emo.name.split(" / ")[0]}</span>
                          <span className="text-[9px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-md font-extrabold ml-auto shrink-0">Intensidad {c.intensity}/5</span>
                        </div>
                        {c.note && (
                          <p className="text-[10px] text-gray-550 font-medium italic mt-1.5 pl-5 border-l-2 border-rose-200">
                            "{c.note}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* User 2 Checkins */}
            <div className="bg-white p-4 rounded-xl border border-[#F3EFE6] shadow-3xs">
              <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider flex items-center gap-1 mb-3">
                <span>{getAvatarEmojiChar(user2.emoji)}</span> {user2.name}
              </p>
              {user2SelectedCheckins.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic font-bold">Sin registrar miau 🐾</p>
              ) : (
                <div className="space-y-2">
                  {user2SelectedCheckins.map((c, idx) => {
                    const emo = getEmotionById(c.emotion);
                    return (
                      <div key={idx} className="bg-[#FAF9F5] p-2.5 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-1.5 text-xs text-[#2C2723] font-bold">
                          <span className="text-sm shrink-0">{emo.emoji}</span>
                          <span>{emo.name.split(" / ")[0]}</span>
                          <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-extrabold ml-auto shrink-0">Intensidad {c.intensity}/5</span>
                        </div>
                        {c.note && (
                          <p className="text-[10px] text-gray-550 font-medium italic mt-1.5 pl-5 border-l-2 border-blue-200">
                            "{c.note}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: DAILY QUESTIONS OF THE SELECTED DAY */}
        <div className="space-y-3 pt-2">
          <h4 className="text-[11px] font-black uppercase tracking-wider text-rose-950 flex items-center gap-1.5 border-b border-[#EAE5D9] pb-1.5">
            <span>🎯</span> Preguntas Diarias
          </h4>

          {loadingQuestions ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-2">
              <Loader2 className="animate-spin text-rose-500" size={18} />
              <span className="text-[10px] text-gray-500 font-bold">Cargando preguntas de sintonía...</span>
            </div>
          ) : selectedDayQuestions.length === 0 ? (
            <div className="text-center py-6 bg-white rounded-xl border border-dashed border-[#EAE5D9]">
              <p className="text-xs text-[#8A817C] font-semibold">Sin preguntas registradas para esta fecha miau 🐾</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedDayQuestions.map((q) => {
                const ans1 = getUserAnswer(q.id, user1.id);
                const ans2 = getUserAnswer(q.id, user2.id);
                const isReflexion = q.category === "reflexion";
                
                // For reflection questions: hide answers if not both have answered
                const bothAnswered = ans1 !== undefined && ans2 !== undefined;
                
                return (
                  <div key={q.id} className="bg-white p-4 rounded-xl border border-[#F3EFE6] shadow-3xs space-y-3">
                    {/* Badge and Question category */}
                    <div className="flex items-center justify-between gap-2">
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
                        {q.category === "reflexion" && "🧘 Reflexión Profunda"}
                      </span>
                    </div>

                    <p className="text-xs font-black text-[#2C2723] leading-relaxed">
                      {q.text}
                    </p>

                    {/* Answers Container */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Answer 1 (Mafe) */}
                      <div className="bg-[#FAF9F5] p-3 rounded-lg border border-gray-50">
                        <p className="text-[9px] font-black text-rose-700 uppercase tracking-wider flex items-center gap-1 mb-2">
                          <span>{getAvatarEmojiChar(user1.emoji)}</span> {user1.name}
                        </p>
                        
                        {ans1 ? (
                          isReflexion ? (
                            bothAnswered ? (
                              <p className="text-xs text-[#2C2723] font-bold italic">
                                "{ans1.textResponse}"
                              </p>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50/50 p-2 rounded border border-amber-100/50">
                                <Lock size={11} className="text-amber-600" />
                                <span>🔒 Respondido. Oculto hasta que ambos respondan.</span>
                              </div>
                            )
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                                Puntuación: {ans1.score}/5
                              </span>
                            </div>
                          )
                        ) : (
                          <p className="text-[10px] text-gray-400 italic font-bold">Sin responder miau 🐾</p>
                        )}
                      </div>

                      {/* Answer 2 (Benja) */}
                      <div className="bg-[#FAF9F5] p-3 rounded-lg border border-gray-50">
                        <p className="text-[9px] font-black text-blue-700 uppercase tracking-wider flex items-center gap-1 mb-2">
                          <span>{getAvatarEmojiChar(user2.emoji)}</span> {user2.name}
                        </p>
                        
                        {ans2 ? (
                          isReflexion ? (
                            bothAnswered ? (
                              <p className="text-xs text-[#2C2723] font-bold italic">
                                "{ans2.textResponse}"
                              </p>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50/50 p-2 rounded border border-amber-100/50">
                                <Lock size={11} className="text-amber-600" />
                                <span>🔒 Respondido. Oculto hasta que ambos respondan.</span>
                              </div>
                            )
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                                Puntuación: {ans2.score}/5
                              </span>
                            </div>
                          )
                        ) : (
                          <p className="text-[10px] text-gray-400 italic font-bold">Sin responder miau 🐾</p>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
