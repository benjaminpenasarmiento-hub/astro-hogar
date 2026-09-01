import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, Send, Sparkles, Calendar, CheckSquare, PawPrint, Leaf, Gift, Heart, Trash2 } from "lucide-react";
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
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dailyQuestion = useMemo(() => {
    const questions = [
      "¿Qué pequeña cosa te hizo sentir bien hoy?",
      "¿Qué quieres que Milo recuerde de este momento?",
      "¿Qué parte de tu rutina te gustaría que Milo entendiera mejor?",
      "¿Qué detalle del hogar te hace sentir realmente en casa?",
      "¿Qué prefieres cuando estás cansado: silencio, compañía o ayuda práctica?",
      "¿Qué te gustaría que Milo aprendiera de ti esta semana?",
      "¿Qué hábito pequeño quieres construir con ayuda de Milo?",
    ];
    return questions[new Date().getDate() % questions.length];
  }, []);

  const createOptions = [
    { type: "event", label: "Evento nuevo", icon: Calendar },
    { type: "task", label: "Tarea para hoy", icon: CheckSquare },
    { type: "pet", label: "Nueva mascota", icon: PawPrint },
    { type: "plant", label: "Agregar planta", icon: Leaf },
    { type: "wish", label: "Lista de deseos", icon: Gift },
    { type: "memory", label: "Nuevo recuerdo", icon: Heart },
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(historyKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed.slice(-40));
          return;
        }
      } catch {
        // Ignore malformed history.
      }
    }
    setMessages([{ id: "milo-welcome", sender: "cat", text: activeUser?.name ? `Hola ${activeUser.name}. Soy Milo. ¿Qué hacemos hoy? 🐾` : "Hola. Soy Milo. Cuéntame algo y empezamos. 🐾", timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
  }, [historyKey, activeUser?.id, activeUser?.name]);

  useEffect(() => {
    if (messages.length && typeof window !== "undefined") localStorage.setItem(historyKey, JSON.stringify(messages.slice(-40)));
  }, [messages, historyKey]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
  }, [messages, typing, open]);

  useEffect(() => {
    if (open && !learnOpen) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open, learnOpen]);

  const send = async (forced?: string) => {
    const text = (forced ?? input).trim();
    if (!text || typing) return;
    setInput("");

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setTyping(true);

    try {
      const response = await askGatitoChat(next.slice(-18).map((m) => ({ ...m, text: cleanText(m.text) })), {
        activeUser: activeUser ? { id: activeUser.id, name: activeUser.name, zodiacSign: activeUser.zodiacSign } : null,
        registeredUsers: users.map((u) => ({ id: u.id, name: u.name, zodiacSign: u.zodiacSign })),
        dailyLearningQuestion: dailyQuestion,
        instruction: "Habla únicamente de usuarios registrados en este hogar. No inventes nombres, relaciones, recuerdos ni hechos. Si solo existe un usuario registrado, habla solamente con esa persona.",
      });

      setMessages((prev) => [...prev, {
        id: `cat-${Date.now()}`,
        sender: "cat",
        text: cleanText(response || "Estoy aquí contigo. ¿Qué necesitas? 🐾"),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `cat-error-${Date.now()}`,
        sender: "cat",
        text: "No pude responder ahora. Intenta otra vez y seguimos desde aquí. 🐾",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    } finally {
      setTyping(false);
      onRefreshData?.();
    }
  };

  const clear = () => {
    const welcome: ChatMessage = {
      id: "milo-welcome",
      sender: "cat",
      text: activeUser?.name ? `Hola ${activeUser.name}. Empecemos de nuevo. 🐾` : "Hola. Empecemos de nuevo; cuéntame algo. 🐾",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([welcome]);
    localStorage.setItem(historyKey, JSON.stringify([welcome]));
  };

  return (
    <div className="fixed inset-x-3 bottom-[76px] sm:inset-x-auto sm:right-5 sm:bottom-6 z-[70] pointer-events-none" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <AnimatePresence>
        {open && (
          <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto ml-auto w-full max-w-[430px] h-[min(700px,calc(100dvh-92px))] sm:h-[min(700px,calc(100dvh-48px))] bg-white rounded-[24px] border-2 border-[#F3EFE6] shadow-[0_18px_55px_rgba(44,39,35,0.18)] overflow-hidden flex flex-col"
            role="dialog"
            aria-label="Chat con Milo"
          >
            <header className="shrink-0 bg-[#FAF7F2] p-3.5 sm:p-4 border-b border-[#F3EFE6] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 shrink-0 rounded-2xl bg-[#FFE5D9] flex items-center justify-center text-2xl shadow-sm">🐱</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><h3 className="font-black text-[#2C2723]">Milo</h3><span className="w-2 h-2 rounded-full bg-emerald-500" /></div>
                  <p className="text-[10px] text-[#8A817C] truncate">{activeUser?.name ? `Contigo, ${activeUser.name}` : "Tu compañero del hogar"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => setLearnOpen((value) => !value)} className="hidden sm:block px-2.5 py-1.5 rounded-full text-[10px] font-black text-[#8A817C] hover:bg-white">Conozcámonos</button>
                <button type="button" onClick={clear} className="w-9 h-9 rounded-full flex items-center justify-center text-[#8A817C] hover:bg-white" aria-label="Borrar conversación"><Trash2 size={15} /></button>
                <button type="button" onClick={() => setOpen(false)} className="w-9 h-9 rounded-full flex items-center justify-center text-[#8A817C] hover:bg-white" aria-label="Cerrar chat de Milo"><X size={18} /></button>
              </div>
            </header>

            {learnOpen ? (
              <div className="flex-1 min-h-0 bg-[#FCFAF7] p-4 sm:p-5 overflow-y-auto space-y-4">
                <div className="bg-[#FFE5D9] p-5 rounded-3xl border border-[#FAD2C0]"><div className="flex items-center gap-2"><Sparkles size={18} /><span className="font-black text-sm">Conozcámonos con Milo</span></div><p className="text-xs text-[#5C5552] mt-2 leading-relaxed">Cada día puedes compartir algo nuevo. Milo usará lo que le cuentes para entender mejor tus rutinas y ayudarte dentro del hogar.</p></div>
                <div className="bg-white p-5 rounded-3xl border-2 border-[#E7E2D5]"><span className="text-[10px] uppercase font-black text-[#8C5D23]">Pregunta de hoy</span><p className="mt-2 font-black text-[#2C2723] leading-snug">{dailyQuestion}</p><button type="button" onClick={() => setLearnOpen(false)} className="mt-4 px-4 py-2.5 bg-[#2C2723] text-white rounded-xl text-xs font-black">Responder</button></div>
              </div>
            ) : (
              <>
                <div className="flex-1 min-h-0 bg-[#FCFAF7] p-3.5 sm:p-4 overflow-y-auto overscroll-contain space-y-3.5">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[88%] min-w-0 rounded-2xl px-3.5 py-3 text-xs sm:text-sm ${message.sender === "user" ? "bg-[#D8E2DC] rounded-tr-md" : "bg-[#FFE5D9] rounded-tl-md border border-[#FAD2C0]"}`}>
                        <div className="whitespace-pre-wrap break-words text-[#2C2723] leading-relaxed">{cleanText(message.text)}</div>
                        <span className="block text-[9px] opacity-45 mt-1.5">{message.timestamp}</span>
                      </div>
                    </div>
                  ))}
                  {typing && <div className="flex justify-start"><div className="bg-[#FFE5D9] border border-[#FAD2C0] rounded-2xl rounded-tl-md px-4 py-3 text-[10px] text-[#8A817C] animate-pulse">Milo está pensando…</div></div>}
                  <div ref={endRef} />
                </div>

                {onRequestCreate && <div className="shrink-0 border-t border-[#F3EFE6] bg-[#FAF7F2] px-3.5 py-2.5 overflow-x-auto"><div className="flex gap-2 min-w-max">{createOptions.map(({ type, label, icon: Icon }) => <button key={type} type="button" onClick={() => onRequestCreate(type)} className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white border border-[#E7E2D5] text-[10px] font-black text-[#5C5552] whitespace-nowrap"><Icon size={13} />{label}</button>)}</div></div>}

                <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="shrink-0 p-3.5 bg-white border-t border-[#F3EFE6]">
                  <div className="flex items-center gap-2">
                    <input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Escríbele a Milo…" aria-label="Mensaje para Milo" disabled={typing} className="flex-1 min-w-0 h-11 px-4 rounded-2xl border-2 border-[#E7E2D5] bg-[#FCFAF7] text-sm text-[#2C2723] placeholder:text-[#A29A94] outline-none focus:border-[#D4C9B7]" />
                    <button type="submit" disabled={!input.trim() || typing} className="w-11 h-11 shrink-0 rounded-2xl bg-[#2C2723] text-white flex items-center justify-center disabled:opacity-35" aria-label="Enviar mensaje"><Send size={17} /></button>
                  </div>
                </form>
              </>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {!open && <motion.button type="button" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileTap={{ scale: 0.95 }} onClick={() => setOpen(true)} className="pointer-events-auto ml-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#2C2723] text-white shadow-[0_12px_35px_rgba(44,39,35,0.28)] flex items-center justify-center" aria-label="Abrir chat de Milo"><MessageSquare size={23} /></motion.button>}
    </div>
  );
}
