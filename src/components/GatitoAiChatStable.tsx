import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, Volume2, VolumeX, X, Send, Trash2, Sparkles, Calendar, CheckSquare, PawPrint, Leaf } from "lucide-react";
import { ChatMessage, UserProfile } from "../types";
import { askGatitoChat } from "../api";

interface GatitoAiChatStableProps {
  onRefreshData?: () => void;
  onRequestCreate?: (type: string) => void;
  users?: UserProfile[];
}

const getActiveUser = (users: UserProfile[]) => {
  if (typeof window === "undefined") return users[0];
  const id = localStorage.getItem("astro_user_id");
  return users.find((u) => u.id === id) || users[0];
};

const getHistoryKey = (userId?: string) => `milo_chat_history:${userId || "unknown"}`;

const normalizeText = (value: string) =>
  value
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/^\s*[\"“”]+|[\"“”]+\s*$/g, "")
    .trim();

const createWelcome = (user?: UserProfile): ChatMessage => {
  const name = user?.name?.trim();
  return {
    id: "milo-welcome",
    sender: "cat",
    text: name
      ? `Hola ${name}. Soy Milo. Estoy aquí para acompañarte con lo que necesites del hogar, sin asumir nada que todavía no conozca. ¿Qué hacemos hoy? 🐾`
      : "Hola. Soy Milo. Todavía estoy conociéndote, así que no voy a inventar datos sobre ti. Cuéntame algo y empezamos. 🐾",
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  };
};

export default function GatitoAiChatStable({ onRefreshData, onRequestCreate, users = [] }: GatitoAiChatStableProps) {
  const activeUser = useMemo(() => getActiveUser(users), [users]);
  const historyKey = useMemo(() => getHistoryKey(activeUser?.id), [activeUser?.id]);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeView, setActiveView] = useState<"chat" | "learn">("chat");
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const dailyQuestion = useMemo(() => {
    const questions = [
      "¿Qué pequeña cosa te hizo sentir bien hoy?",
      "¿Qué te gustaría que Milo recordara de este momento?",
      "¿Qué parte de tu día suele costarte más y te gustaría que Milo te ayudara a cuidar?",
      "¿Qué detalle del hogar te hace sentir realmente en casa?",
      "¿Qué actividad disfrutas tanto que podríamos convertirla en una costumbre del nido?",
      "¿Qué prefieres cuando estás cansado: silencio, compañía o ayuda práctica?",
      "¿Hay algo que Milo todavía no entiende de ti y te gustaría enseñarle?"
    ];
    const day = new Date().getDate();
    return questions[day % questions.length];
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(historyKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed);
          return;
        }
      } catch {}
    }
    setMessages([createWelcome(activeUser)]);
  }, [historyKey, activeUser]);

  useEffect(() => {
    if (typeof window !== "undefined" && messages.length) {
      localStorage.setItem(historyKey, JSON.stringify(messages.slice(-40)));
    }
  }, [historyKey, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(normalizeText(text));
    utterance.lang = "es-CO";
    utterance.rate = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop?.();
      setIsListening(false);
      return;
    }
    if (typeof window === "undefined") return;
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      setInput((prev) => `${prev}${prev ? " " : ""}(Tu navegador no permite dictado por voz.)`);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "es-CO";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      setInput(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const sendMessage = async (forcedText?: string) => {
    const text = (forcedText ?? input).trim();
    if (!text || isTyping) return;
    setInput("");

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setIsTyping(true);

    try {
      const relevant = next.slice(-18).map((m) => ({ ...m, text: normalizeText(m.text) }));
      const response = await askGatitoChat(relevant, {
        activeUser: activeUser ? { id: activeUser.id, name: activeUser.name, zodiacSign: activeUser.zodiacSign } : null,
        registeredUsers: users.map((u) => ({ id: u.id, name: u.name, zodiacSign: u.zodiacSign })),
        dailyLearningQuestion: dailyQuestion,
        instruction: "Habla únicamente de usuarios registrados. No inventes nombres, relaciones, recuerdos ni hechos. Si un dato no existe, dilo claramente."
      });
      const catMsg: ChatMessage = {
        id: `cat-${Date.now()}`,
        sender: "cat",
        text: normalizeText(response || "Estoy aquí contigo. ¿Qué quieres que hagamos ahora?"),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, catMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `cat-error-${Date.now()}`,
        sender: "cat",
        text: "No pude completar la respuesta ahora. Puedes intentarlo otra vez y seguiré desde aquí. 🐾",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }]);
    } finally {
      setIsTyping(false);
      onRefreshData?.();
    }
  };

  const clearChat = () => {
    const welcome = createWelcome(activeUser);
    setMessages([welcome]);
    localStorage.setItem(historyKey, JSON.stringify([welcome]));
  };

  return (
    <div className="fixed bottom-[76px] left-4 md:bottom-6 md:right-6 md:left-auto z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 35, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 35, scale: 0.95 }}
            className={`mb-4 bg-white rounded-3xl border-4 border-[#F3EFE6] shadow-[0_12px_40px_rgba(44,39,35,0.12)] overflow-hidden flex flex-col absolute bottom-14 left-0 md:left-auto md:right-0 md:bottom-0 ${isExpanded ? "w-[calc(100vw-32px)] md:w-[760px] h-[78vh]" : "w-[calc(100vw-32px)] sm:w-[430px] h-[580px]"}`}
          >
            <div className="bg-[#FAF7F2] p-4 border-b-2 border-[#F3EFE6] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#FFE5D9] flex items-center justify-center text-2xl shrink-0">🐱</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-[#2C2723] text-sm md:text-base">Milo</h3>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                  <p className="text-[10px] text-[#8A817C] truncate">{activeUser?.name ? `Hablando contigo, ${activeUser.name}` : "Todavía estoy conociéndote"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setActiveView("learn")} className={`px-2.5 py-1.5 rounded-full text-[10px] font-black ${activeView === "learn" ? "bg-[#FFE5D9] text-[#2C2723]" : "text-[#8A817C] hover:bg-white"}`}>Conozcámonos</button>
                <button onClick={() => setActiveView("chat")} className={`px-2.5 py-1.5 rounded-full text-[10px] font-black ${activeView === "chat" ? "bg-white text-[#2C2723]" : "text-[#8A817C] hover:bg-white"}`}>Hablar</button>
                <button onClick={clearChat} title="Reiniciar conversación" className="p-1.5 rounded-full text-[#8A817C] hover:bg-white"><Trash2 size={15}/></button>
                <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-full text-[#8A817C] hover:bg-white"><X size={18}/></button>
              </div>
            </div>

            {activeView === "learn" ? (
              <div className="flex-1 overflow-y-auto bg-[#FCFAF7] p-5 space-y-5">
                <div className="bg-[#FFE5D9] rounded-3xl p-5 border border-[#FAD2C0]">
                  <div className="flex items-center gap-2 mb-2"><Sparkles size={18} /><span className="font-black text-sm">Conozcámonos con Milo</span></div>
                  <p className="text-xs text-[#5C5552] leading-relaxed">Cada día te haré una pregunta. No tienes que responder siempre; cuando lo hagas, la respuesta podrá formar parte de lo que Milo recuerde de ti.</p>
                </div>
                <div className="bg-white rounded-3xl p-5 border-2 border-[#E7E2D5] shadow-sm">
                  <span className="text-[10px] uppercase tracking-wider font-black text-[#8C5D23]">Pregunta de hoy</span>
                  <p className="mt-2 text-base font-black text-[#2C2723] leading-snug">{dailyQuestion}</p>
                  <button onClick={() => { setActiveView("chat"); setInput(""); }} className="mt-4 px-4 py-2 rounded-xl bg-[#2C2723] text-white text-xs font-black">Responderle a Milo</button>
                </div>
                <p className="text-[10px] text-[#8A817C]">Milo solo debe aprender de información que tú le compartas explícitamente.</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FCFAF7]">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm text-xs md:text-sm ${m.sender === "user" ? "bg-[#D8E2DC] rounded-tr-none" : "bg-[#FFE5D9] rounded-tl-none border border-[#FAD2C0]"}`}>
                        <div className="whitespace-pre-wrap leading-relaxed text-[#2C2723]">{normalizeText(m.text)}</div>
                        <div className="flex items-center justify-between gap-3 mt-1.5">
                          <span className="text-[9px] opacity-50 font-mono">{m.timestamp}</span>
                          {m.sender === "cat" && <button onClick={() => speak(m.text)} title="Escuchar a Milo" className="text-[#8A817C] hover:text-[#2C2723]"><Volume2 size={13}/></button>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTyping && <div className="flex justify-start"><div className="bg-[#FFE5D9] border border-[#FAD2C0] rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5"><span className="text-[10px] text-[#8A817C] mr-1">Milo está pensando</span><span className="w-1.5 h-1.5 rounded-full bg-[#8A817C] animate-bounce"/><span className="w-1.5 h-1.5 rounded-full bg-[#8A817C] animate-bounce [animation-delay:150ms]"/><span className="w-1.5 h-1.5 rounded-full bg-[#8A817C] animate-bounce [animation-delay:300ms]"/></div></div>}
                  <div ref={messagesEndRef}/>
                </div>

                <div className="px-4 py-2 border-t border-[#F3EFE6] bg-[#FAF7F2] flex gap-2 overflow-x-auto">
                  <button onClick={() => onRequestCreate?.("task")} className="shrink-0 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-[10px] font-black flex items-center gap-1"><CheckSquare size={12}/> Tarea</button>
                  <button onClick={() => onRequestCreate?.("event")} className="shrink-0 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black flex items-center gap-1"><Calendar size={12}/> Evento</button>
                  <button onClick={() => onRequestCreate?.("pet")} className="shrink-0 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-black flex items-center gap-1"><PawPrint size={12}/> Mascota</button>
                  <button onClick={() => onRequestCreate?.("plant")} className="shrink-0 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black flex items-center gap-1"><Leaf size={12}/> Planta</button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="p-3 bg-white border-t-2 border-[#F3EFE6] flex gap-2 items-center">
                  <button type="button" onClick={toggleListening} title={isListening ? "Detener escucha" : "Hablar con Milo"} className={`p-2 rounded-full ${isListening ? "bg-rose-100 text-rose-600 animate-pulse" : "text-[#8A817C] hover:bg-[#FAF7F2]"}`}>{isListening ? <MicOff size={18}/> : <Mic size={18}/>}</button>
                  <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={isListening ? "Te estoy escuchando..." : "Habla o escribe con Milo..."} className="flex-1 bg-[#FAF7F2] rounded-full px-4 py-2.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#FAD2C0]" />
                  <button type="submit" disabled={!input.trim() || isTyping} className="p-2.5 bg-[#FAD2C0] hover:bg-[#FBC4AC] disabled:opacity-40 rounded-full"><Send size={16}/></button>
                  <button type="button" onClick={() => { const last = [...messages].reverse().find((m) => m.sender === "cat"); if (last) speak(last.text); }} title={isSpeaking ? "Detener voz" : "Escuchar última respuesta"} className="p-2 rounded-full text-[#8A817C] hover:bg-[#FAF7F2]">{isSpeaking ? <VolumeX size={18}/> : <Volume2 size={18}/>}</button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button onClick={() => setIsOpen((v) => !v)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} className="w-12 h-12 md:w-16 md:h-16 bg-[#FFE5D9] hover:bg-[#FBC4AC] border-2 md:border-4 border-white shadow-[0_8px_30px_rgba(44,39,35,0.15)] rounded-full flex items-center justify-center text-xl md:text-3xl">
        {isOpen ? "🐾" : "🐱"}
      </motion.button>
    </div>
  );
}
