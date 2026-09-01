import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, Sparkles, Calendar, CheckSquare, PawPrint, Leaf, Gift, Heart, Trash2, Grip } from "lucide-react";
import { ChatMessage, UserProfile } from "../types";
import { askGatitoChat } from "../api";

interface Props {
  onRefreshData?: () => void;
  onRequestCreate?: (type: string) => void;
  users?: UserProfile[];
}

type Position = { x: number; y: number };
const PANEL_WIDTH = 390;
const PANEL_HEIGHT = 560;
const EDGE = 16;
const DEFAULT_TOP = 96;
const GAP = 12;

const cleanText = (value: string) => value.replace(/\*\*/g, "").replace(/__/g, "").replace(/^\s*[\"“”]+|[\"“”]+\s*$/g, "").trim();
const historyKeyFor = (id?: string) => `milo_chat_history:${id || "unknown"}`;

export default function GatitoAiChat({ onRefreshData, onRequestCreate, users = [] }: Props) {
  const activeUser = useMemo(() => {
    if (typeof window === "undefined") return users[0];
    const saved = localStorage.getItem("astro_user_id");
    return users.find((u) => u.id === saved) || users[0];
  }, [users]);

  const [open, setOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [position, setPosition] = useState<Position>({ x: EDGE, y: DEFAULT_TOP });
  const [loaded, setLoaded] = useState(false);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const clampPosition = (value: Position) => {
    if (typeof window === "undefined") return value;
    const panelW = Math.min(PANEL_WIDTH, window.innerWidth - EDGE * 2);
    const panelH = Math.min(PANEL_HEIGHT, window.innerHeight - EDGE * 2);
    return {
      x: Math.max(EDGE, Math.min(value.x, window.innerWidth - panelW - EDGE)),
      y: Math.max(EDGE, Math.min(value.y, window.innerHeight - panelH - EDGE)),
    };
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const fallback = typeof window === "undefined"
        ? { x: EDGE, y: DEFAULT_TOP }
        : { x: Math.max(EDGE, window.innerWidth - PANEL_WIDTH - EDGE), y: DEFAULT_TOP };
      let next = fallback;
      if (activeUser?.id && typeof window !== "undefined") {
        const saved = localStorage.getItem(`milo_chat_position:${activeUser.id}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) next = { x: Number(parsed.x), y: Number(parsed.y) };
          } catch {}
        }
      }
      if (!cancelled) {
        setPosition(clampPosition(next));
        setLoaded(true);
      }
    };
    setLoaded(false);
    void load();
    return () => { cancelled = true; };
  }, [activeUser?.id]);

  useEffect(() => {
    const openFromShortcut = () => setOpen(true);
    window.addEventListener("astro-open-milo", openFromShortcut);
    return () => window.removeEventListener("astro-open-milo", openFromShortcut);
  }, []);

  useEffect(() => {
    if (!loaded || typeof window === "undefined") return;
    const onResize = () => setPosition((current) => clampPosition(current));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [loaded]);

  const savePosition = (next: Position) => {
    if (!activeUser?.id || typeof window === "undefined") return;
    localStorage.setItem(`milo_chat_position:${activeUser.id}`, JSON.stringify(next));
  };

  const startDrag = (event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    };
  };

  const moveDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.moved = true;
    if (drag.moved) setPosition(clampPosition({ x: drag.originX + dx, y: drag.originY + dy }));
  };

  const endDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const next = clampPosition(position);
    setPosition(next);
    if (drag.moved) savePosition(next);
  };

  const historyKey = historyKeyFor(activeUser?.id);
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
      } catch {}
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
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, sender: "user", text, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
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
      setMessages((prev) => [...prev, { id: `cat-${Date.now()}`, sender: "cat", text: cleanText(response || "Estoy aquí contigo. ¿Qué necesitas? 🐾"), timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    } catch {
      setMessages((prev) => [...prev, { id: `cat-error-${Date.now()}`, sender: "cat", text: "No pude responder ahora. Intenta otra vez y seguimos desde aquí. 🐾", timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    } finally {
      setTyping(false);
      onRefreshData?.();
    }
  };

  const clear = () => {
    const welcome: ChatMessage = { id: "milo-welcome", sender: "cat", text: activeUser?.name ? `Hola ${activeUser.name}. Empecemos de nuevo. 🐾` : "Hola. Empecemos de nuevo; cuéntame algo. 🐾", timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setMessages([welcome]);
    if (typeof window !== "undefined") localStorage.setItem(historyKey, JSON.stringify([welcome]));
  };

  const panelPosition = useMemo(() => {
    const panelW = typeof window === "undefined" ? PANEL_WIDTH : Math.min(PANEL_WIDTH, window.innerWidth - EDGE * 2);
    return {
      left: Math.max(EDGE, Math.min(position.x, (typeof window === "undefined" ? panelW + EDGE : window.innerWidth - panelW - EDGE))),
      top: position.y,
    };
  }, [position]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.section
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.16 }}
          className="fixed overflow-hidden flex flex-col bg-white rounded-[22px] border-2 border-[#F3EFE6] shadow-[0_18px_55px_rgba(44,39,35,0.22)]"
          style={{ zIndex: 999998, left: panelPosition.left, top: panelPosition.top, width: `min(${PANEL_WIDTH}px, calc(100vw - ${EDGE * 2}px))`, height: `min(${PANEL_HEIGHT}px, calc(100dvh - ${EDGE * 2}px))`, maxWidth: `calc(100vw - ${EDGE * 2}px)`, maxHeight: `calc(100dvh - ${EDGE * 2}px)` }}
          role="dialog"
          aria-label="Chat con Milo"
        >
          <header
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            className="shrink-0 bg-[#FAF7F2] p-3 border-b border-[#F3EFE6] flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing touch-none select-none"
            title="Arrastra el chat de Milo"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#FFE5D9] flex items-center justify-center text-2xl shadow-sm shrink-0">🐱</div>
              <div className="min-w-0"><div className="flex items-center gap-2"><h3 className="font-black text-[#2C2723]">Milo</h3><span className="w-2 h-2 rounded-full bg-emerald-500" /></div><p className="text-[10px] text-[#8A817C] truncate">{activeUser?.name ? `Contigo, ${activeUser.name}` : "Tu compañero del hogar"}</p></div>
            </div>
            <div className="flex items-center gap-1 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
              <Grip size={15} className="text-[#B5ACA5] hidden sm:block" />
              <button type="button" onClick={() => setLearnOpen((v) => !v)} className="hidden sm:block px-2 py-1.5 rounded-full text-[10px] font-black text-[#8A817C] hover:bg-white">Conozcámonos</button>
              <button type="button" onClick={clear} className="w-8 h-8 rounded-full flex items-center justify-center text-[#8A817C] hover:bg-white" aria-label="Borrar conversación"><Trash2 size={14} /></button>
              <button type="button" onClick={() => setOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#8A817C] hover:bg-white" aria-label="Cerrar chat de Milo"><X size={17} /></button>
            </div>
          </header>

          {learnOpen ? (
            <div className="flex-1 min-h-0 bg-[#FCFAF7] p-4 overflow-y-auto space-y-4">
              <div className="bg-[#FFE5D9] p-4 rounded-3xl border border-[#FAD2C0]"><div className="flex items-center gap-2"><Sparkles size={17} /><span className="font-black text-sm">Conozcámonos con Milo</span></div><p className="text-xs text-[#5C5552] mt-2 leading-relaxed">Cada día puedes compartir algo nuevo. Milo usará lo que le cuentes para entender mejor tus rutinas y ayudarte dentro del hogar.</p></div>
              <div className="bg-white p-4 rounded-3xl border-2 border-[#E7E2D5]"><span className="text-[10px] uppercase font-black text-[#8C5D23]">Pregunta de hoy</span><p className="mt-2 font-black text-[#2C2723] leading-snug">{dailyQuestion}</p><button type="button" onClick={() => setLearnOpen(false)} className="mt-4 px-4 py-2.5 bg-[#2C2723] text-white rounded-xl text-xs font-black">Responder</button></div>
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 bg-[#FCFAF7] p-3 overflow-y-auto overscroll-contain space-y-3">
                {messages.map((message) => <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] min-w-0 rounded-2xl px-3 py-2.5 text-xs ${message.sender === "user" ? "bg-[#D8E2DC] rounded-tr-md" : "bg-[#FFE5D9] rounded-tl-md border border-[#FAD2C0]"}`}><div className="whitespace-pre-wrap break-words text-[#2C2723] leading-relaxed">{cleanText(message.text)}</div><span className="block text-[9px] opacity-45 mt-1">{message.timestamp}</span></div></div>)}
                {typing && <div className="flex justify-start"><div className="bg-[#FFE5D9] border border-[#FAD2C0] rounded-2xl rounded-tl-md px-3 py-2.5 text-[10px] text-[#8A817C] animate-pulse">Milo está pensando…</div></div>}
                <div ref={endRef} />
              </div>
              {onRequestCreate && <div className="shrink-0 border-t border-[#F3EFE6] bg-[#FAF7F2] px-3 py-2 overflow-x-auto"><div className="flex gap-2 min-w-max">{createOptions.map(({ type, label, icon: Icon }) => <button key={type} type="button" onClick={() => onRequestCreate(type)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-[#E7E2D5] text-[10px] font-black text-[#5C5552] whitespace-nowrap"><Icon size={12} />{label}</button>)}</div></div>}
              <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="shrink-0 p-3 bg-white border-t border-[#F3EFE6]"><div className="flex items-center gap-2"><input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Escríbele a Milo…" aria-label="Mensaje para Milo" disabled={typing} className="flex-1 min-w-0 h-10 px-3.5 rounded-xl border-2 border-[#E7E2D5] bg-[#FCFAF7] text-sm text-[#2C2723] placeholder:text-[#A29A94] outline-none focus:border-[#D4C9B7]" /><button type="submit" disabled={!input.trim() || typing} className="w-10 h-10 shrink-0 rounded-xl bg-[#2C2723] text-white flex items-center justify-center disabled:opacity-35" aria-label="Enviar mensaje"><Send size={16} /></button></div></form>
            </>
          )}
        </motion.section>
      )}
    </AnimatePresence>,
    document.body
  );
}
