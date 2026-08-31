import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, Send, Sparkles, Calendar, CheckSquare, PawPrint, Leaf, Gift, Heart, Trash2, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { ChatMessage, UserProfile } from "../types";
import { askGatitoChat } from "../api";

interface Props {
  onRefreshData?: () => void;
  onRequestCreate?: (type: string) => void;
  users?: UserProfile[];
}

const cleanText = (value: string) => value.replace(/\*\*/g, "").replace(/__/g, "").replace(/^\s*[\"“”]+|[\"“”]+\s*$/g, "").trim();
const historyKeyFor = (id?: string) => `milo_chat_history:${id || "unknown"}`;

export default function GatitoAiChat({ onRefreshData, onRequestCreate, users = [] }: Props) {
  const activeUser = useMemo(() => {
    if (typeof window === "undefined") return users[0];
    const saved = localStorage.getItem("astro_user_id");
    return users.find((u) => u.id === saved) || users[0];
  }, [users]);
  const historyKey = historyKeyFor(activeUser?.id);
  const [open, setOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Listo para escucharte");
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const dailyQuestion = useMemo(() => {
    const questions = [
      "¿Qué pequeña cosa te hizo sentir bien hoy?",
      "¿Qué quieres que Milo recuerde de este momento?",
      "¿Qué parte de tu rutina te gustaría que Milo entendiera mejor?",
      "¿Qué detalle del hogar te hace sentir realmente en casa?",
      "¿Qué prefieres cuando estás cansado: silencio, compañía o ayuda práctica?",
      "¿Qué te gustaría que Milo aprendiera de ti esta semana?",
      "¿Qué hábito pequeño quieres construir con ayuda de Milo?"
    ];
    return questions[new Date().getDate() % questions.length];
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(historyKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) { setMessages(parsed.slice(-40)); return; }
      } catch {}
    }
    setMessages([{ id: "milo-welcome", sender: "cat", text: activeUser?.name ? `Hola ${activeUser.name}. Soy Milo. Estoy aquí contigo. ¿Qué hacemos hoy? 🐾` : "Hola. Soy Milo. Todavía estoy conociéndote; no voy a inventar datos sobre ti. 🐾", timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
  }, [historyKey, activeUser?.id, activeUser?.name]);

  useEffect(() => { if (messages.length && typeof window !== "undefined") localStorage.setItem(historyKey, JSON.stringify(messages.slice(-40))); }, [messages, historyKey]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing, open]);
  useEffect(() => () => { recognitionRef.current?.stop?.(); streamRef.current?.getTracks().forEach((t) => t.stop()); window.speechSynthesis?.cancel(); }, []);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) { setVoiceError("La voz no está disponible en este navegador."); return; }
    const voices = window.speechSynthesis.getVoices();
    const spanish = voices.find((v) => /^es-CO$/i.test(v.lang)) || voices.find((v) => /^es-/i.test(v.lang));
    const utterance = new SpeechSynthesisUtterance(cleanText(text));
    utterance.voice = spanish || null; utterance.lang = spanish?.lang || "es-CO"; utterance.rate = 0.9; utterance.pitch = 1.12; utterance.volume = 1;
    window.speechSynthesis.cancel();
    utterance.onstart = () => { setSpeaking(true); setVoiceStatus("Milo está hablando 🐾"); };
    utterance.onend = () => { setSpeaking(false); setVoiceStatus("Listo para escucharte"); };
    utterance.onerror = () => { setSpeaking(false); setVoiceStatus("La voz no pudo reproducirse"); };
    window.speechSynthesis.speak(utterance);
  };
  const stopSpeaking = () => { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); setSpeaking(false); setVoiceStatus("Listo para escucharte"); };

  const startListening = async () => {
    setVoiceError("");
    if (listening) { recognitionRef.current?.stop?.(); return; }
    if (typeof window === "undefined") return;
    if (!window.isSecureContext) { setVoiceError("El micrófono requiere HTTPS."); return; }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) { setVoiceError("El dictado por voz de este navegador no está disponible. Usa Chrome o Edge."); return; }
    try {
      if (!navigator.mediaDevices?.getUserMedia) { setVoiceError("Este navegador no permite acceso al micrófono."); return; }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const recognition = new Recognition(); recognition.lang = "es-CO"; recognition.continuous = false; recognition.interimResults = true;
      recognition.onstart = () => { setListening(true); setVoiceStatus("Te estoy escuchando… 🎙️"); };
      recognition.onresult = (event: any) => { let transcript = ""; for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript; if (transcript.trim()) setInput(transcript.trim()); };
      recognition.onerror = (event: any) => { setListening(false); const code = event?.error; setVoiceStatus("Listo para escucharte"); setVoiceError(code === "not-allowed" || code === "service-not-allowed" ? "El micrófono está bloqueado. Pulsa el candado 🔒 del navegador y permite el micrófono." : code === "no-speech" ? "No alcancé a escucharte. Intenta otra vez." : "No pude activar el micrófono."); };
      recognition.onend = () => { setListening(false); streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setVoiceStatus("Listo para escucharte"); };
      recognitionRef.current = recognition; recognition.start();
    } catch (err: any) { setListening(false); setVoiceError(err?.name === "NotAllowedError" ? "Permiso de micrófono bloqueado. Actívalo en el candado 🔒 de la barra del navegador." : "No pude activar el micrófono."); }
  };

  const send = async (forced?: string) => {
    const text = (forced ?? input).trim(); if (!text || typing) return;
    setInput("");
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, sender: "user", text, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    const next = [...messages, userMsg]; setMessages(next); setTyping(true);
    try {
      const response = await askGatitoChat(next.slice(-18).map((m) => ({ ...m, text: cleanText(m.text) })), {
        activeUser: activeUser ? { id: activeUser.id, name: activeUser.name, zodiacSign: activeUser.zodiacSign } : null,
        registeredUsers: users.map((u) => ({ id: u.id, name: u.name, zodiacSign: u.zodiacSign })),
        dailyLearningQuestion: dailyQuestion,
        instruction: "Habla únicamente de usuarios registrados en este hogar. No inventes nombres, relaciones, recuerdos ni hechos. Si solo existe un usuario registrado, habla solamente con esa persona."
      });
      const catMsg: ChatMessage = { id: `cat-${Date.now()}`, sender: "cat", text: cleanText(response || "Estoy aquí contigo. 🐾"), timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
      setMessages((prev) => [...prev, catMsg]); speak(catMsg.text);
    } catch {
      setMessages((prev) => [...prev, { id: `cat-error-${Date.now()}`, sender: "cat", text: "No pude responder ahora. Intenta otra vez y seguimos desde aquí. 🐾", timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    } finally { setTyping(false); onRefreshData?.(); }
  };

  const clear = () => {
    const welcome: ChatMessage = { id: "milo-welcome", sender: "cat", text: activeUser?.name ? `Hola ${activeUser.name}. Empecemos de nuevo. 🐾` : "Hola. Empecemos de nuevo; cuéntame algo y te voy conociendo. 🐾", timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setMessages([welcome]); localStorage.setItem(historyKey, JSON.stringify([welcome])); stopSpeaking();
  };

  const createOptions = [
    { type: "event", label: "Evento nuevo", desc: "Agenda familiar en calendario", icon: Calendar },
    { type: "task", label: "Tarea para hoy", desc: "Cosas pendientes del hogar", icon: CheckSquare },
    { type: "pet", label: "Nueva mascota", desc: "Añadir un peludito miau", icon: PawPrint },
    { type: "plant", label: "Agregar planta", desc: "Escaneo botánico e ideal miau", icon: Leaf },
    { type: "wish", label: "Lista de Deseos", desc: "Regalos y caprichos del hogar", icon: Gift },
    { type: "memory", label: "Nuevo Recuerdo", desc: "Guardar un momento feliz", icon: Heart }
  ];

  return (
    <div className="fixed bottom-[76px] left-3 right-3 sm:left-auto sm:right-5 md:bottom-6 z-50 pointer-events-none">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }} className="pointer-events-auto relative sm:absolute sm:bottom-20 sm:right-0 w-full sm:w-[430px] h-[min(700px,calc(100vh-115px))] bg-white rounded-3xl border-4 border-[#F3EFE6] shadow-[0_18px_50px_rgba(44,39,35,0.15)] overflow-hidden flex flex-col">
            <div className="bg-[#FAF7F2] p-4 border-b-2 border-[#F3EFE6] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-[#FFE5D9] flex items-center justify-center text-2xl">🐱</div><div><div className="flex items-center gap-2"><h3 className="font-black text-[#2C2723]">Milo</h3><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/></div><p className="text-[10px] text-[#8A817C]">{activeUser?.name ? `Contigo, ${activeUser.name}` : "Todavía te estoy conociendo"}</p></div></div>
              <div className="flex items-center gap-1"><button onClick={() => setLearnOpen(v => !v)} className="px-2 py-1.5 rounded-full text-[10px] font-black text-[#8A817C] hover:bg-white">Conozcámonos</button><button onClick={clear} className="p-1.5 text-[#8A817C] hover:bg-white rounded-full"><Trash2 size={15}/></button><button onClick={() => setOpen(false)} className="p-1.5 text-[#8A817C] hover:bg-white rounded-full"><X size={18}/></button></div>
            </div>
            {learnOpen ? (
              <div className="flex-1 bg-[#FCFAF7] p-5 overflow-y-auto space-y-4"><div className="bg-[#FFE5D9] p-5 rounded-3xl border border-[#FAD2C0]"><div className="flex items-center gap-2"><Sparkles size={18}/><span className="font-black text-sm">Conozcámonos con Milo</span></div><p className="text-xs text-[#5C5552] mt-2 leading-relaxed">Cada día una pregunta distinta. Solo guardaré lo que tú decidas compartir conmigo.</p></div><div className="bg-white p-5 rounded-3xl border-2 border-[#E7E2D5]"><span className="text-[10px] uppercase font-black text-[#8C5D23]">Pregunta de hoy</span><p className="mt-2 font-black text-[#2C2723] leading-snug">{dailyQuestion}</p><button onClick={() => { setLearnOpen(false); setInput(""); }} className="mt-4 px-4 py-2 bg-[#2C2723] text-white rounded-xl text-xs font-black">Responder</button></div></div>
            ) : (
              <><div className="flex-1 bg-[#FCFAF7] p-4 overflow-y-auto space-y-4">{messages.map(m => <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs md:text-sm ${m.sender === "user" ? "bg-[#D8E2DC] rounded-tr-none" : "bg-[#FFE5D9] rounded-tl-none border border-[#FAD2C0]"}`}><div className="whitespace-pre-wrap text-[#2C2723] leading-relaxed">{cleanText(m.text)}</div><div className="flex justify-between items-center mt-1.5"><span className="text-[9px] opacity-50">{m.timestamp}</span>{m.sender === "cat" && <button onClick={() => speak(m.text)} className="text-[#8A817C] hover:text-[#2C2723]" title="Escuchar a Milo"><Volume2 size={13}/></button>}</div></div></div>)}{typing && <div className="flex justify-start"><div className="bg-[#FFE5D9] border border-[#FAD2C0] rounded-2xl px-4 py-3 text-[10px] text-[#8A817C] animate-pulse">Milo está pensando…</div></div>}<div ref={endRef}/></div>
                <div className="px-4 py-2 bg-[#FAF7F2] border-t border-[#F3EFE6]"><div className="flex items-center gap-2"><button type="button" onClick={startListening} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${listening ? "bg-blue-100 border-blue-400 text-blue-700 animate-pulse shadow-[0_0_0_4px_rgba(59,130,246,0.12)]" : "bg-white border-[#E7E2D5] text-[#5C5552]"}`} title={listening ? "Detener escucha" : "Hablar con Milo"}>{listening ? <MicOff size={18}/> : <Mic size={18}/>}</button><span className={`text-[10px] flex-1 ${listening ? "text-blue-700 font-bold" : "text-[#8A817C]"}`}>{voiceStatus}</span>{speaking && <button onClick={stopSpeaking} className="p-2 rounded-full bg-white border border-[#E7E2D5] text-[#5C5552]" title="Detener voz"><VolumeX size={15}/></button>}</div>{voiceError && <p className="text-[10px] text-rose-600 font-semibold mt-1">{voiceError}</p>}</div>
                <form onSubmit={e => { e.preventDefault(); send(); }} className="p-3 bg-white border-t-2 border-[#F3EFE6] flex gap-2"><input value={input} onChange={e => setInput(e.target.value)} placeholder="Háblale a Milo…" className="flex-1 bg-[#FAF7F2] rounded-full px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#FAD2C0]"/><button type="submit" disabled={typing || !input.trim()} className="p-2.5 bg-[#FAD2C0] rounded-full disabled:opacity-40"><Send size={16}/></button></form></>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => { setOpen(v => !v); setLearnOpen(false); }} className="pointer-events-auto fixed bottom-[76px] left-3 sm:static sm:ml-auto w-14 h-14 md:w-16 md:h-16 bg-[#FFE5D9] hover:bg-[#FBC4AC] border-4 border-white shadow-[0_8px_30px_rgba(44,39,35,0.15)] rounded-full flex items-center justify-center text-2xl md:text-3xl z-50" title="Hablar con Milo">{open ? "🐾" : "🐱"}<span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 border-2 border-white rounded-full flex items-center justify-center text-[8px]">✨</span></button>
      {!open && <button onClick={() => { setOpen(true); setLearnOpen(false); }} className="pointer-events-auto fixed bottom-[76px] right-3 sm:static sm:ml-2 sm:mr-0 px-3 py-2 bg-white border border-[#E7E2D5] rounded-full text-[10px] font-black text-[#625B57] shadow-sm">Abrir Milo</button>}
    </div>
  );
}
