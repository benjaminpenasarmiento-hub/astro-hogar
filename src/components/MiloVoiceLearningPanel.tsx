import React, { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Volume2, VolumeX, BookOpen, Check, Sparkles } from "lucide-react";
import { UserProfile } from "../types";

interface Props {
  users?: UserProfile[];
  lastMiloMessage?: string;
  onTranscript: (text: string) => void;
}

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const DAILY_QUESTIONS = [
  "¿Qué cosa pequeña te hizo sentir bien hoy?",
  "¿Qué te gustaría que Milo recuerde de ti?",
  "¿Qué te ayuda a sentirte en casa de verdad?",
  "¿Qué detalle de hoy te gustaría repetir otro día?",
  "¿Qué te está ocupando la cabeza últimamente?",
  "¿Qué te gustaría mejorar de nuestra rutina en casa?",
  "¿Qué actividad disfrutas más cuando tienes tiempo para ti?",
  "¿Cómo prefieres que Milo te ayude cuando estás teniendo un día difícil?",
  "¿Qué objetivo personal te gustaría que Milo te ayudara a recordar?",
  "¿Qué cosa nunca debería olvidar Milo sobre ti?"
];

function getUserKey() {
  if (typeof window === "undefined") return "anonymous";
  return localStorage.getItem("astro_user_id") || "anonymous";
}

function getDailyQuestion() {
  const start = new Date(2026, 0, 1);
  const today = new Date();
  const day = Math.floor((today.getTime() - start.getTime()) / 86400000);
  return DAILY_QUESTIONS[((day % DAILY_QUESTIONS.length) + DAILY_QUESTIONS.length) % DAILY_QUESTIONS.length];
}

export default function MiloVoiceLearningPanel({ users = [], lastMiloMessage = "", onTranscript }: Props) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [answer, setAnswer] = useState("");
  const [savedToday, setSavedToday] = useState(false);

  const userId = getUserKey();
  const activeUser = useMemo(() => users.find((u) => u.id === userId) || users[0], [users, userId]);
  const question = useMemo(() => getDailyQuestion(), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedRaw = localStorage.getItem(`milo_learning_notes:${userId}`);
    if (!savedRaw) return;
    try {
      const saved = JSON.parse(savedRaw);
      const today = new Date().toISOString().slice(0, 10);
      if (saved?.date === today && saved?.question === question) {
        setSavedToday(true);
        setAnswer(saved.answer || "");
      }
    } catch {}
  }, [question, userId]);

  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch {}
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const toggleListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      window.alert("Este navegador no ofrece reconocimiento de voz. Puedes usar Chrome o Edge en el celular.");
      return;
    }

    if (isListening) {
      try { recognitionRef.current?.stop(); } catch {}
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor() as SpeechRecognitionInstance;
    recognition.lang = "es-CO";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0]?.transcript || "";
      }
      transcript = transcript.trim();
      if (transcript) onTranscript(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  const speakMilo = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const clean = lastMiloMessage.replace(/\*\*/g, "").replace(/[*_]/g, "").trim();
    if (!clean) return;
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "es-CO";
    utterance.rate = 1.02;
    utterance.pitch = 1.02;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const saveLearning = () => {
    const text = answer.trim();
    if (!text || typeof window === "undefined") return;
    const record = {
      date: new Date().toISOString().slice(0, 10),
      question,
      answer: text,
      userId,
      userName: activeUser?.name || ""
    };
    localStorage.setItem(`milo_learning_notes:${userId}`, JSON.stringify(record));
    setSavedToday(true);
  };

  return (
    <div className="px-4 py-2.5 bg-white border-t border-[#F3EFE6] space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-xl bg-[#FFE5D9] text-[#8C5D23] flex items-center justify-center"><Mic size={14}/></span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#8C5D23]">Habla con Milo</p>
            <p className="text-[9px] text-[#8A817C]">{isListening ? "Te estoy escuchando..." : "Puedes hablarme o escuchar mi última respuesta."}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={toggleListening} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black border transition-all ${isListening ? "bg-rose-100 text-rose-700 border-rose-200 animate-pulse" : "bg-[#FAF7F2] text-[#625B57] border-[#E7E2D5] hover:bg-[#FFE5D9]"}`}>
            {isListening ? <MicOff size={12}/> : <Mic size={12}/>} {isListening ? "Escuchando" : "Hablar"}
          </button>
          <button type="button" onClick={speakMilo} disabled={!lastMiloMessage} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black border transition-all ${isSpeaking ? "bg-purple-100 text-purple-700 border-purple-200" : "bg-[#FAF7F2] text-[#625B57] border-[#E7E2D5] hover:bg-purple-50"}`}>
            {isSpeaking ? <VolumeX size={12}/> : <Volume2 size={12}/>} {isSpeaking ? "Detener" : "Escuchar"}
          </button>
        </div>
      </div>

      {isListening && (
        <div className="rounded-xl bg-rose-50 border border-rose-100 px-3 py-2 flex items-center gap-2 text-[10px] text-rose-700 font-bold">
          <span className="flex gap-0.5"><span className="w-1 h-3 bg-rose-400 rounded-full animate-pulse"/><span className="w-1 h-4 bg-rose-500 rounded-full animate-pulse"/><span className="w-1 h-2 bg-rose-300 rounded-full animate-pulse"/></span>
          Habla normalmente. Cuando termines, tu texto aparecerá en el cuadro de mensaje.
        </div>
      )}

      <div className="rounded-2xl bg-[#FAF7F2] border border-[#E7E2D5] p-3">
        <div className="flex items-start gap-2">
          <BookOpen size={13} className="text-[#8C5D23] mt-0.5 shrink-0"/>
          <div className="flex-1">
            <p className="text-[10px] font-black text-[#2C2723]">Conozcámonos con Milo</p>
            <p className="text-[10px] text-[#625B57] mt-0.5">{question}</p>
            <div className="flex gap-2 mt-2">
              <input value={answer} onChange={(e) => { setAnswer(e.target.value); setSavedToday(false); }} placeholder="Cuéntame algo sobre ti..." className="flex-1 bg-white border border-[#E7E2D5] rounded-xl px-2.5 py-1.5 text-[10px] focus:outline-none focus:ring-2 focus:ring-[#FAD2C0]"/>
              <button type="button" onClick={saveLearning} disabled={!answer.trim()} className="inline-flex items-center gap-1 rounded-xl bg-[#D8E2DC] px-2.5 py-1.5 text-[10px] font-black text-[#2C2723] disabled:opacity-40">
                {savedToday ? <Check size={12}/> : <Sparkles size={12}/>} {savedToday ? "Guardado" : "Aprender"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
