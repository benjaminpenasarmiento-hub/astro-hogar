import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, Volume2, VolumeX, X, Send, Trash2, Sparkles, Maximize2, Minimize2 } from "lucide-react";
import { ChatMessage, UserProfile } from "../types";
import { askGatitoChat } from "../api";

interface Props {
  onRefreshData?: () => void;
  onRequestCreate?: (type: string) => void;
  users?: UserProfile[];
}

const clean = (value: string) => value.replace(/\*\*/g, "").replace(/__/g, "").replace(/[\"“”]/g, "").trim();

export default function GatitoAiChatVoiceStable({ onRefreshData, onRequestCreate, users = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [learn, setLearn] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const activeUser = useMemo(() => {
    if (typeof window === "undefined") return users[0];
    const id = localStorage.getItem("astro_user_id");
    return users.find(u => u.id === id) || users[0];
  }, [users]);

  const historyKey = `milo_chat_history:${activeUser?.id || "unknown"}`;

  const welcome = useMemo<ChatMessage>(() => ({
    id: "milo-welcome",
    sender: "cat",
    text: activeUser?.name
      ? `Hola ${activeUser.name}. Soy Milo. Estoy contigo. Cuéntame qué necesitas y lo vemos juntos. 🐾`
      : "Hola. Soy Milo. Todavía estoy conociéndote, así que no voy a asumir quién eres ni inventar datos sobre ti. Cuéntame algo y empezamos. 🐾",
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }), [activeUser?.name]);

  const dailyQuestion = useMemo(() => {
    const questions = [
      "¿Qué pequeño detalle de tu día te gustaría que Milo recordara?",
      "¿Qué te hace sentir realmente en casa?",
      "¿Cómo prefieres que Milo te ayude cuando tienes un día pesado?",
      "¿Qué cosa te gustaría convertir en una costumbre del nido?",
      "¿Qué tema te entusiasma tanto que podríamos aprender juntos?",
      "¿Qué momento reciente te hizo sonreír?",
      "¿Qué debería aprender Milo de ti para conocerte mejor?"
    ];
    return questions[new Date().getDate() % questions.length];
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(historyKey);
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      setMessages(Array.isArray(parsed) && parsed.length ? parsed.slice(-40) : [welcome]);
    } catch {
      setMessages([welcome]);
    }
  }, [historyKey, welcome]);

  useEffect(() => {
    if (typeof window !== "undefined" && messages.length) {
      localStorage.setItem(historyKey, JSON.stringify(messages.slice(-40)));
    }
  }, [historyKey, messages]);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, typing]);

  useEffect(() => () => {
    recognitionRef.current?.stop?.();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean(text));
    const voices = window.speechSynthesis.getVoices();
    const es = voices.find(v => /^es-CO$/i.test(v.lang)) || voices.find(v => /^es-/i.test(v.lang));
    if (es) utterance.voice = es;
    utterance.lang = es?.lang || "es-CO";
    utterance.rate = 0.9;
    utterance.pitch = 1.12;
    utterance.volume = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const startListening = async () => {
    setVoiceError("");
    if (listening) {
      recognitionRef.current?.stop?.();
      return;
    }
    if (typeof window === "undefined" || !window.isSecureContext) {
      setVoiceError("El micrófono necesita una conexión HTTPS.");
      return;
    }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError("Tu navegador no permite dictado por voz. Usa Chrome o Edge.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError("Este navegador no permite acceso al micrófono.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      stream.getTracks().forEach(track => track.stop());
      const recognition = new Recognition();
      recognition.lang = "es-CO";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onstart = () => setListening(true);
      recognition.onresult = (event: any) => {
        let text = "";
        for (let i = event.resultIndex; i < event.results.length; i++) text += event.results[i][0].transcript;
        if (text.trim()) setInput(text.trim());
      };
      recognition.onerror = (event: any) => {
        setListening(false);
        if (event?.error === "not-allowed") setVoiceError("El micrófono está bloqueado. Actívalo en el candado de astro-hogar-five.vercel.app.");
        else if (event?.error === "no-speech") setVoiceError("No te escuché. Vuelve a intentarlo.");
        else setVoiceError("No pude activar el micrófono.");
      };
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch (error: any) {
      setListening(false);
      setVoiceError(error?.name === "NotAllowedError" ? "El micrófono está bloqueado. Actívalo en el candado del sitio." : "No pude activar el micrófono.");
    }
  };

  const send = async (forced?: string) => {
    const text = (forced ?? input).trim();
    if (!text || typing) return;
    setInput("");
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, sender: "user", text, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    const next = [...messages, userMessage];
    setMessages(next);
    setTyping(true);
    try {
      const response = await askGatitoChat(next.slice(-18), {
        activeUser: activeUser ? { id: activeUser.id, name: activeUser.name, zodiacSign: activeUser.zodiacSign } : null,
        registeredUsers: users.map(u => ({ id: u.id, name: u.name, zodiacSign: u.zodiacSign })),
        dailyLearningQuestion: dailyQuestion,
        instruction: "Solo puedes hablar de usuarios realmente registrados en este hogar. Nunca inventes nombres, relaciones, recuerdos o hechos. Si solo existe un usuario registrado, habla solo con esa persona. Si no existe un dato, dilo claramente."
      });
      const answer = clean(response || "Estoy aquí contigo. 🐾");
      const catMessage: ChatMessage = { id: `cat-${Date.now()}`, sender: "cat", text: answer, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
      setMessages(prev => [...prev, catMessage]);
      speak(answer);
    } catch {
      const answer = "Se me enredó un poquito el ovillo. Intenta otra vez y seguimos. 🐾";
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, sender: "cat", text: answer, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    } finally {
      setTyping(false);
      onRefreshData?.();
    }
  };

  const clearChat = () => {
    setMessages([welcome]);
    localStorage.setItem(historyKey, JSON.stringify([welcome]));
  };

  return <div className="fixed bottom-[76px] left-4 md:bottom-6 md:right-6 md:left-auto z-50">
    <AnimatePresence>
      {open && <motion.div initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.97 }} className={`mb-4 bg-white rounded-3xl border-4 border-[#F3EFE6] shadow-[0_12px_40px_rgba(44,39,35,0.12)] overflow-hidden flex flex-col absolute bottom-14 left-0 md:left-auto md:right-0 ${expanded ? "w-[calc(100vw-32px)] md:w-[760px] h-[78vh]" : "w-[calc(100vw-32px)] sm:w-[430px] h-[600px]"}`}>
        <div className="bg-[#FAF7F2] p-4 border-b-2 border-[#F3EFE6] flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-[#FFE5D9] flex items-center justify-center text-2xl">🐱</div><div><div className="flex items-center gap-2"><h3 className="font-black text-[#2C2723]">Milo</h3><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/></div><p className="text-[10px] text-[#8A817C]">{activeUser?.name ? `Contigo, ${activeUser.name}` : "Todavía estoy conociéndote"}</p></div></div>
          <div className="flex items-center gap-1"><button onClick={() => setLearn(v => !v)} className={`px-2.5 py-1.5 rounded-full text-[10px] font-black ${learn ? "bg-[#FFE5D9]" : "bg-white"}`}>Conozcámonos</button><button onClick={() => setExpanded(v => !v)} className="p-1.5 text-[#8A817C]">{expanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}</button><button onClick={clearChat} className="p-1.5 text-[#8A817C]"><Trash2 size={16}/></button><button onClick={() => setOpen(false)} className="p-1.5 text-[#8A817C]"><X size={18}/></button></div>
        </div>
        {learn ? <div className="flex-1 bg-[#FCFAF7] p-5 overflow-y-auto"><div className="bg-[#FFE5D9] rounded-3xl p-5 border border-[#FAD2C0] mb-4"><div className="flex items-center gap-2 font-black text-sm"><Sparkles size={17}/>Conozcámonos con Milo</div><p className="text-xs text-[#5C5552] mt-2 leading-relaxed">Cada día te hago una pregunta para conocerte mejor. Solo guardamos lo que tú decides compartir.</p></div><div className="bg-white rounded-3xl border-2 border-[#E7E2D5] p-5"><span className="text-[10px] uppercase tracking-wider font-black text-[#8C5D23]">Pregunta de hoy</span><p className="mt-2 font-black text-[#2C2723] leading-snug">{dailyQuestion}</p><button onClick={() => setLearn(false)} className="mt-4 px-4 py-2 rounded-xl bg-[#2C2723] text-white text-xs font-black">Hablar con Milo</button></div></div> : <><div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FCFAF7]">{messages.map(m => <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[86%] rounded-2xl px-4 py-3 text-xs md:text-sm shadow-sm ${m.sender === "user" ? "bg-[#D8E2DC] rounded-tr-none" : "bg-[#FFE5D9] rounded-tl-none border border-[#FAD2C0]"}`}><div className="whitespace-pre-wrap leading-relaxed">{clean(m.text)}</div><div className="flex justify-end mt-1"><span className="text-[9px] opacity-50 font-mono">{m.timestamp}</span>{m.sender === "cat" && <button onClick={() => speak(m.text)} className="ml-2 text-[#8A817C]"><Volume2 size={13}/></button>}</div></div></div>)}{typing && <div className="text-[10px] text-[#8A817C]">Milo está pensando con sus patitas… 🐾</div>}<div ref={endRef}/></div><div className="px-4 py-2 bg-[#FAF7F2] border-t border-[#F3EFE6]"><MiloVoiceBar listening={listening} speaking={speaking} error={voiceError} onListen={startListening} onStopSpeak={() => { window.speechSynthesis?.cancel(); setSpeaking(false); }} /></div><form onSubmit={e => { e.preventDefault(); send(); }} className="p-3 bg-white border-t-2 border-[#F3EFE6] flex items-center gap-2"><input value={input} onChange={e => setInput(e.target.value)} placeholder={listening ? "Te escucho…" : "Pregúntale a Milo..."} className="flex-1 bg-[#FAF7F2] rounded-full px-4 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#FAD2C0]"/><button type="submit" className="p-2 bg-[#FAD2C0] rounded-full"><Send size={16}/></button></form></>}
      </motion.div>}
    </AnimatePresence>
    <button onClick={() => setOpen(v => !v)} className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#FFE5D9] border-4 border-white shadow-[0_8px_30px_rgba(44,39,35,0.12)] flex items-center justify-center text-2xl hover:scale-105 transition-transform">{open ? "💬" : "🐱"}</button>
  </div>;
}

function MiloVoiceBar({ listening, speaking, error, onListen, onStopSpeak }: { listening: boolean; speaking: boolean; error: string; onListen: () => void; onStopSpeak: () => void }) {
  return <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={onListen} className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-black border ${listening ? "bg-rose-100 border-rose-200 text-rose-700 animate-pulse" : "bg-white border-[#E7E2D5] text-[#5C5552] hover:bg-[#FFE5D9]"}`}>{listening ? <MicOff size={15}/> : <Mic size={15}/>} {listening ? "Escuchando…" : "Hablar"}</button><button type="button" onClick={onStopSpeak} className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-[#E7E2D5] text-[#5C5552]">{speaking ? <VolumeX size={15}/> : <Volume2 size={15}/>}</button><span className="text-[10px] text-[#8A817C]">{listening ? "Dime algo…" : speaking ? "Milo está hablando 🐾" : "Listo para escucharte"}</span>{error && <span className="w-full text-[10px] font-semibold text-rose-600">{error}</span>}</div>;
}
