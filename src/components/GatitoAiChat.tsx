import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, X, Send, Sparkles, 
  Calendar, CheckSquare, PawPrint, Leaf, 
  Gift, Heart, FileText, Trash2,
  Paperclip, Maximize2, Minimize2
} from "lucide-react";
import { ChatMessage, UserProfile, ChatAttachment } from "../types";
import { askGatitoChat } from "../api";
import MiloVoiceChat from "./MiloVoiceChat";

interface GatitoAiChatProps {
  onRefreshData?: () => void;
  onRequestCreate?: (type: string) => void;
  users?: UserProfile[];
}

export default function GatitoAiChat({ onRefreshData, onRequestCreate, users = [] }: GatitoAiChatProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [lastMiloText, setLastMiloText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getActiveUser = () => {
    if (typeof window === "undefined") return users[0];
    const activeId = localStorage.getItem("astro_user_id");
    return users.find(u => u.id === activeId) || users[0];
  };

  const getHistoryKey = () => `milo_chat_history:${getActiveUser()?.id || "unknown"}`;

  const sanitizeText = (text: string) =>
    text
      .replace(/\*\*/g, "")
      .replace(/__/g, "")
      .replace(/^\s*[\"“”]+|[\"“”]+\s*$/g, "")
      .trim();

  const createWelcome = (): ChatMessage => {
    const user = getActiveUser();
    const name = user?.name?.trim();
    return {
      id: "msg-init",
      sender: "cat",
      text: name
        ? `Hola ${name}. Soy Milo. Estoy aquí contigo y voy conociéndote poco a poco. ¿Qué hacemos hoy? 🐾`
        : "Hola. Soy Milo. Todavía estoy conociéndote, así que no voy a asumir datos sobre ti. Cuéntame algo y empezamos. 🐾",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => []);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [catMood, setCatMood] = useState<"happy" | "calm" | "alert" | "busy" | "sleep">("happy");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = getHistoryKey();
    const saved = localStorage.getItem(key) || localStorage.getItem("milo_chat_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed.slice(-40));
          const latestCat = [...parsed].reverse().find((m: ChatMessage) => m.sender === "cat");
          if (latestCat) setLastMiloText(sanitizeText(latestCat.text));
          return;
        }
      } catch {}
    }
    setMessages([createWelcome()]);
  }, [users]);

  useEffect(() => {
    if (typeof window !== "undefined" && messages.length > 0) {
      localStorage.setItem(getHistoryKey(), JSON.stringify(messages.slice(-40)));
    }
  }, [messages, users]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsChatOpen(false);
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const attachment: ChatAttachment = {
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: reader.result as string
        };
        setPendingAttachments(prev => [...prev, attachment]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || userInput;
    if (!text.trim() && pendingAttachments.length === 0) return;

    if (!textToSend) setUserInput("");
    const newUserMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: text || "Enviado un archivo adjunto",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined
    };
    const currentPending = [...pendingAttachments];
    setPendingAttachments([]);
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setIsTyping(true);
    setCatMood("busy");

    try {
      const messagesForAi = updatedMessages.slice(-18).map(m => {
        if (m.attachments && m.attachments.length > 0) {
          const attachmentDesc = m.attachments.map(att => `[Archivo adjunto: "${att.name}" de tipo "${att.type}"]`).join("\n");
          return { ...m, text: `${m.text}\n\n${attachmentDesc}` };
        }
        return m;
      });
      const cycleConfigStr = localStorage.getItem("salud_cycle_config");
      const cycleLogsStr = localStorage.getItem("salud_cycle_logs");
      const cycleConfig = cycleConfigStr ? JSON.parse(cycleConfigStr) : null;
      const cycleLogs = cycleLogsStr ? JSON.parse(cycleLogsStr) : null;

      const activeUser = getActiveUser();
      const responseText = await askGatitoChat(messagesForAi, {
        cycleConfig,
        cycleLogs,
        activeUser: activeUser ? { id: activeUser.id, name: activeUser.name, zodiacSign: activeUser.zodiacSign } : null,
        registeredUsers: users.map(u => ({ id: u.id, name: u.name, zodiacSign: u.zodiacSign })),
        instruction: "Habla únicamente de usuarios registrados en este hogar. No inventes nombres, relaciones, recuerdos, pareja, familia ni hechos. Si un dato no existe, dilo claramente. Si solo hay un usuario registrado, responde únicamente para esa persona."
      });

      const cleanResponse = sanitizeText(responseText || "Estoy aquí contigo. ¿Qué hacemos ahora? 🐾");
      setLastMiloText(cleanResponse);
      setCatMood(cleanResponse.toLowerCase().includes("crear") ? "alert" : "happy");
      setMessages(prev => [...prev, {
        id: `cat-${Date.now()}`,
        sender: "cat",
        text: cleanResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch {
      const fallback = "No pude completar la respuesta ahora. Puedes intentarlo otra vez y seguiré desde aquí. 🐾";
      setLastMiloText(fallback);
      setCatMood("calm");
      setMessages(prev => [...prev, {
        id: `cat-err-${Date.now()}`,
        sender: "cat",
        text: fallback,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
      onRefreshData?.();
    }
  };

  const handleClearChat = () => {
    const initialMsg = createWelcome();
    setMessages([initialMsg]);
    setLastMiloText(initialMsg.text);
    if (typeof window !== "undefined") localStorage.setItem(getHistoryKey(), JSON.stringify([initialMsg]));
  };

  const suggestionChips = [
    "¿Qué tareas tenemos hoy?",
    "¿Cómo está el clima?",
    "¿Qué viene en el Cosmos?",
    "¿Qué debería recordar de hoy?"
  ];

  const createOptions = [
    { type: "chat", label: "Chatear con Milo 💬", desc: "Pregúntame o hablemos miau", icon: MessageSquare, color: "bg-[#FFE5D9] text-[#2C2723] border-[#FAD2C0]" },
    { type: "event", label: "Evento nuevo", desc: "Agenda familiar en calendario", icon: Calendar, color: "bg-blue-100 text-blue-600 border-blue-200" },
    { type: "task", label: "Tarea para hoy", desc: "Cosas pendientes del hogar", icon: CheckSquare, color: "bg-green-100 text-green-600 border-green-200" },
    { type: "pet", label: "Nueva mascota", desc: "Añadir un peludito miau", icon: PawPrint, color: "bg-purple-100 text-purple-600 border-purple-200" },
    { type: "plant", label: "Agregar planta", desc: "Escaneo botánico e ideal miau", icon: Leaf, color: "bg-emerald-100 text-emerald-600 border-emerald-200" },
    { type: "wish", label: "Lista de Deseos", desc: "Regalos y caprichos del hogar", icon: Gift, color: "bg-pink-100 text-pink-600 border-pink-200" },
    { type: "memory", label: "Nuevo Recuerdo", desc: "Guardar un momento feliz", icon: Heart, color: "bg-rose-100 text-rose-600 border-rose-200" }
  ] as const;

  const handleLauncherClick = () => {
    if (isChatOpen || isMenuOpen) {
      setIsChatOpen(false);
      setIsMenuOpen(false);
    } else {
      setIsChatOpen(true);
    }
  };

  return (
    <div className="fixed bottom-[76px] left-4 md:bottom-6 md:right-6 md:left-auto z-50" ref={containerRef}>
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0, scale: 0.85, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85, y: 15 }} className="absolute bottom-14 left-0 md:left-auto md:right-0 md:bottom-18 w-[calc(100vw-32px)] sm:w-80 bg-white rounded-3xl border-4 border-[#F3EFE6] shadow-[0_12px_40px_rgba(44,39,35,0.08)] p-4 space-y-3 overflow-hidden z-50">
            <div className="flex items-center gap-2 pb-2 border-b border-[#F3EFE6]">
              <span className="text-2xl">🐾</span>
              <div><h4 className="font-extrabold text-cute text-sm text-[#2C2723]">Centro de Control de Milo</h4><p className="text-[10px] text-[#8A817C] font-semibold leading-none">¡Elige qué quieres hacer hoy miau!</p></div>
            </div>
            <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
              {createOptions.map((opt) => {
                const IconComponent = opt.icon;
                return <button key={opt.type} onClick={() => { if (opt.type === "chat") setIsChatOpen(true); else onRequestCreate?.(opt.type); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-[#FAF7F2] transition-all leading-none text-cute font-medium text-xs text-[#625B57] text-left cursor-pointer group"><div className={`p-2 rounded-xl border ${opt.color} shrink-0 group-hover:scale-105 transition-transform`}><IconComponent size={16}/></div><div className="flex-1 min-w-0"><p className="text-xs font-extrabold text-[#2C2723]">{opt.label}</p><p className="text-[10px] text-[#8A817C] font-semibold truncate mt-0.5">{opt.desc}</p></div></button>;
              })}
            </div>
          </motion.div>
        )}

        {isChatOpen && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }} className={`mb-4 bg-white rounded-3xl border-4 border-[#F3EFE6] shadow-[0_12px_40px_rgba(44,39,35,0.08)] overflow-hidden flex flex-col absolute bottom-14 left-0 md:left-auto md:right-0 md:bottom-18 z-50 transition-all duration-300 ease-out ${isExpanded ? "w-[calc(100vw-32px)] md:w-[720px] lg:w-[840px] h-[75vh] md:h-[680px]" : "w-[calc(100vw-32px)] sm:w-104 h-[460px] sm:h-[520px]"}`}>
            <div className="bg-[#FAF7F2] p-4 border-b-2 border-[#F3EFE6] flex items-center justify-between">
              <div className="flex items-center gap-3"><span className="text-2xl md:text-3xl">{catMood === "happy" ? "😺" : catMood === "busy" ? "🐱" : catMood === "alert" ? "😿" : "😴"}</span><div><div className="flex items-center gap-1.5"><h3 className="font-bold text-[#2C2723] text-cute text-sm md:text-base">Milo (Gatito Asistente)</h3><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/></div><p className="text-[11px] md:text-xs text-[#8A817C] italic">{catMood === "busy" ? "Pensando con mis patitas…" : "Aquí contigo 🐾"}</p></div></div>
              <div className="flex items-center gap-1.5"><button onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "Reducir chat" : "Expandir chat"} className="p-1.5 rounded-full hover:bg-[#EAE5D9] text-[#8A817C] cursor-pointer">{isExpanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}</button><button onClick={handleClearChat} title="Reiniciar conversación" className="p-1.5 rounded-full hover:bg-red-50 hover:text-red-500 text-[#8A817C] cursor-pointer"><Trash2 size={16}/></button><button onClick={() => setIsChatOpen(false)} className="p-1.5 rounded-full hover:bg-[#EAE5D9] text-[#8A817C]"><X size={18}/></button></div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FCFAF7]">
              {messages.map(m => <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm text-xs md:text-sm ${m.sender === "user" ? "bg-[#D8E2DC] rounded-tr-none" : "bg-[#FFE5D9] rounded-tl-none border border-[#FAD2C0]"}`}><div className="leading-relaxed whitespace-pre-wrap">{sanitizeText(m.text)}</div><span className="block text-[10px] text-right mt-1 opacity-60 font-mono">{m.timestamp}</span></div></div>)}
              {isTyping && <div className="flex justify-start"><div className="bg-[#FFE5D9] border border-[#FAD2C0] rounded-2xl rounded-tl-none px-4 py-3 shadow-sm text-[11px] text-[#8A817C]">Milo está pensando con sus patitas… 🐾</div></div>}
              <div ref={fileInputRef as any}/>
            </div>

            <div className="px-4 py-2 bg-[#FAF7F2] border-t border-[#F3EFE6] overflow-x-auto flex gap-2 no-scrollbar whitespace-nowrap">{suggestionChips.map((chip, idx) => <button key={idx} onClick={() => handleSend(chip)} className="px-3 py-1 bg-white border border-[#EAE5D9] rounded-full text-[11px] text-[#625B57] hover:bg-[#FFE5D9] transition-all cursor-pointer">{chip}</button>)}</div>

            <div className="px-4 py-2 bg-white border-t-2 border-[#F3EFE6] flex flex-col gap-2">
              <MiloVoiceChat onTranscript={(text) => handleSend(text)} textToSpeak={lastMiloText} />
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 items-center">
                <button type="button" onClick={() => fileInputRef.current?.click()} title="Adjuntar archivo" className="p-2 text-[#8A817C] hover:bg-[#FAF7F2] rounded-full shrink-0"><Paperclip size={18}/></button>
                <input type="text" value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="Pregúntale a Milo... miau" className="flex-1 bg-[#FAF7F2] rounded-full px-4 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#FAD2C0]" />
                <button type="submit" className="p-2 bg-[#FAD2C0] hover:bg-[#FBC4AC] rounded-full shrink-0"><Send size={16}/></button>
              </form>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept="image/*,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={handleLauncherClick} className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#FFE5D9] border-4 border-white shadow-[0_8px_30px_rgba(44,39,35,0.12)] flex items-center justify-center text-2xl hover:scale-105 transition-transform cursor-pointer" title="Hablar con Milo">
        {isChatOpen ? "💬" : "🐱"}
      </button>
    </div>
  );
}
