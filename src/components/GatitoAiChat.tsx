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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("milo_chat_history");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {
          console.error("Error loading saved chat history:", e);
        }
      }
    }
    return [];
  });
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [catMood, setCatMood] = useState<"happy" | "calm" | "alert" | "busy" | "sleep">("happy");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close everything when clicking outside
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

  // Save messages to localStorage on change
  useEffect(() => {
    if (typeof window !== "undefined" && messages.length > 0) {
      localStorage.setItem("milo_chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  // Set the default initial welcoming message if messages array is empty
  useEffect(() => {
    const names = users.map(u => u.name).join(" & ") || "familia";
    setMessages(prev => {
      if (prev.length === 0) {
        return [
          {
            id: "msg-init",
            sender: "cat",
            text: `¡Hola ${names}! 👋🐾 Soy **Milo**, su compañero y guardián del bienestar. Estoy atento a todo lo que ocurre en el nido —sus emociones, finanzas, salud, tareas, entrenamientos, metas y recuerdos— para guiarlos siempre con empatía, paz y cuidado mutuo. ¿En qué les acompaño hoy?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
      }
      return prev;
    });
  }, [users]);

  // Clear chat handler
  const handleClearChat = () => {
    const names = users.map(u => u.name).join(" & ") || "familia";
    const initialMsg: ChatMessage = {
      id: "msg-init",
      sender: "cat",
      text: `¡Hola ${names}! 👋🐾 Soy **Milo**, su compañero y guardián del bienestar. Estoy atento a todo lo que ocurre en el nido —sus emociones, finanzas, salud, tareas, entrenamientos, metas y recuerdos— para guiarlos siempre con empatía, paz y cuidado mutuo. ¿En qué les acompaño hoy?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([initialMsg]);
    if (typeof window !== "undefined") {
      localStorage.setItem("milo_chat_history", JSON.stringify([initialMsg]));
    }
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // Helper to render bold and italic text beautifully in messages
  const renderMessageText = (text: string) => {
    if (!text) return null;
    const boldParts = text.split(/\*\*|__/);
    return (
      <span className="whitespace-pre-wrap leading-relaxed">
        {boldParts.map((part, index) => {
          if (index % 2 !== 0) {
            return (
              <strong key={index} className="font-extrabold text-[#2C2723] bg-[#FFF2EB]/80 px-1 rounded-md">
                {part}
              </strong>
            );
          }
          const italicParts = part.split(/\*/);
          return italicParts.map((subPart, subIndex) => {
            if (subIndex % 2 !== 0) {
              return <em key={`${index}-${subIndex}`} className="font-semibold italic text-[#4A433E]">{subPart}</em>;
            }
            return subPart;
          });
        })}
      </span>
    );
  };

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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || userInput;
    if (!text.trim() && pendingAttachments.length === 0) return;

    if (!textToSend) {
      setUserInput("");
    }

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
      const messagesForAi = updatedMessages.map(m => {
        if (m.attachments && m.attachments.length > 0) {
          const attachmentDesc = m.attachments.map(att => `[Archivo Adjunto: "${att.name}" de tipo "${att.type}"]`).join("\n");
          return {
            ...m,
            text: `${m.text}\n\n${attachmentDesc}`
          };
        }
        return m;
      });

      const cycleConfigStr = localStorage.getItem("salud_cycle_config");
      const cycleLogsStr = localStorage.getItem("salud_cycle_logs");
      const cycleConfig = cycleConfigStr ? JSON.parse(cycleConfigStr) : null;
      const cycleLogs = cycleLogsStr ? JSON.parse(cycleLogsStr) : null;

      const responseText = await askGatitoChat(messagesForAi, { cycleConfig, cycleLogs });
      
      // Check if Milo suggested creating something
      if (responseText.toLowerCase().includes("botoncito") || responseText.toLowerCase().includes("crear")) {
        setCatMood("alert");
      } else {
        setCatMood("happy");
      }

      setMessages(prev => [
        ...prev,
        {
          id: `cat-${Date.now()}`,
          sender: "cat",
          text: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch {
      setCatMood("calm");
      setMessages(prev => [
        ...prev,
        {
          id: `cat-err-${Date.now()}`,
          sender: "cat",
          text: "¡Miau! Se me enredó el ovillo de lana de la conexión... ¿me rascas detrás de la orejita y vuelves a intentar? 🐾🐱",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestionChips = [
    "¿Qué tareas tenemos hoy?",
    "¿Cuándo regamos las plantas?",
    "¿Cómo está la sintonía del nido? 🏡",
    "¿Cuál es nuestra lista de deseos?"
  ];

  const createOptions = [
    { type: "chat", label: "Chatear con Milo 💬", desc: "Pregúntame o hablemos miau", icon: MessageSquare, color: "bg-[#FFE5D9] text-[#2C2723] border-[#FAD2C0]" },
    { type: "event", label: "Evento nuevo", desc: "Agenda familiar en calendario", icon: Calendar, color: "bg-blue-100 text-blue-600 border-blue-200" },
    { type: "task", label: "Tarea para hoy", desc: "Cosas pendientes del hogar", icon: CheckSquare, color: "bg-green-100 text-green-600 border-green-200" },
    { type: "pet", label: "Nueva mascota", desc: "Añadir un peludito miau", icon: PawPrint, color: "bg-purple-100 text-purple-600 border-purple-200" },
    { type: "plant", label: "Agregar planta", desc: "Escaneo botánico e ideal miau", icon: Leaf, color: "bg-emerald-100 text-emerald-600 border-emerald-200" },
    { type: "wish", label: "Lista de Deseos", desc: "Regalos y caprichos del hogar", icon: Gift, color: "bg-pink-100 text-pink-600 border-pink-200" },
    { type: "memory", label: "Nuevo Recuerdo", desc: "Guardar un momento feliz", icon: Heart, color: "bg-rose-100 text-rose-600 border-rose-200" },
    { type: "document", label: "Subir Documento", desc: "Facturas, PDF, etc.", icon: FileText, color: "bg-indigo-100 text-indigo-600 border-indigo-200" },
  ] as const;

  const handleLauncherClick = () => {
    if (isChatOpen || isMenuOpen) {
      setIsChatOpen(false);
      setIsMenuOpen(false);
    } else {
      setIsMenuOpen(true);
    }
  };

  return (
    <div className="fixed bottom-[76px] left-4 md:bottom-6 md:right-6 md:left-auto z-50" ref={containerRef}>
      <AnimatePresence>
        {/* 🐾 UNIFIED MILO ACTION CENTER DROPDOWN */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 15 }}
            className="absolute bottom-14 left-0 md:left-auto md:right-0 md:bottom-18 w-[calc(100vw-32px)] sm:w-80 bg-white rounded-3xl border-4 border-[#F3EFE6] shadow-[0_12px_40px_rgba(44,39,35,0.08)] p-4 space-y-3 overflow-hidden z-50"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-[#F3EFE6]">
              <span className="text-2xl">🐾</span>
              <div>
                <h4 className="font-extrabold text-cute text-sm text-[#2C2723]">Centro de Control de Milo</h4>
                <p className="text-[10px] text-[#8A817C] font-semibold leading-none">¡Elige qué quieres hacer hoy miau!</p>
              </div>
            </div>

            <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
              {createOptions.map((opt) => {
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.type}
                    onClick={() => {
                      if (opt.type === "chat") {
                        setIsChatOpen(true);
                      } else {
                        onRequestCreate?.(opt.type);
                      }
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-[#FAF7F2] transition-all leading-none text-cute font-medium text-xs text-[#625B57] hover:text-[#2C2723] text-left cursor-pointer group"
                  >
                    <div className={`p-2 rounded-xl border ${opt.color} shrink-0 group-hover:scale-105 transition-transform`}>
                      <IconComponent size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold text-[#2C2723]">{opt.label}</p>
                      <p className="text-[10px] text-[#8A817C] font-semibold truncate mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* 💬 MILO ASSISTANT CHAT WINDOW */}
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`mb-4 bg-white rounded-3xl border-4 border-[#F3EFE6] shadow-[0_12px_40px_rgba(44,39,35,0.08)] overflow-hidden flex flex-col absolute bottom-14 left-0 md:left-auto md:right-0 md:bottom-18 z-50 transition-all duration-300 ease-out ${
              isExpanded 
                ? "w-[calc(100vw-32px)] md:w-[720px] lg:w-[840px] h-[75vh] md:h-[680px]" 
                : "w-[calc(100vw-32px)] sm:w-104 h-[460px] sm:h-[520px]"
            }`}
          >
            {/* Header */}
            <div className="bg-[#FAF7F2] p-4 border-b-2 border-[#F3EFE6] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl md:text-3xl">
                  {catMood === "happy" ? "😺" : catMood === "busy" ? "🐱" : catMood === "alert" ? "😿" : "😴"}
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-[#2C2723] text-cute text-sm md:text-base">Milo (Gatito Asistente)</h3>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  </div>
                  <p className="text-[11px] md:text-xs text-[#8A817C] italic">
                    {catMood === "busy" ? "Escribiendo con mis patitas..." : "Guardián cariñoso del nido"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? "Reducir chat" : "Expandir chat"}
                  className="p-1.5 rounded-full hover:bg-[#EAE5D9] transition-colors text-[#8A817C] hover:text-[#2C2723] cursor-pointer"
                >
                  {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button
                  onClick={handleClearChat}
                  title="Reiniciar conversación"
                  className="p-1.5 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors text-[#8A817C] cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="p-1.5 rounded-full hover:bg-[#EAE5D9] transition-colors text-[#8A817C] hover:text-[#2C2723]"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FCFAF7]">
              {messages.map((m) => (
                <div 
                  key={m.id} 
                  className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm text-xs md:text-sm ${
                      m.sender === "user" 
                        ? "bg-[#D8E2DC] text-[#2C2723] rounded-tr-none" 
                        : "bg-[#FFE5D9] text-[#2C2723] rounded-tl-none border border-[#FAD2C0]"
                    }`}
                  >
                    <div className="leading-relaxed">
                      {renderMessageText(m.text)}
                    </div>

                    {/* Render attachments if any */}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="mt-2.5 space-y-2 border-t border-[#E7E2D5]/50 pt-2">
                        {m.attachments.map((att, attIdx) => (
                          <div key={attIdx} className="block">
                            {att.type.startsWith("image/") ? (
                              <div className="block mt-1">
                                <a href={att.dataUrl} target="_blank" rel="noopener noreferrer" className="block outline-none">
                                  <img 
                                    src={att.dataUrl} 
                                    className="max-w-full max-h-[180px] rounded-xl border border-[#E7E2D5] object-cover hover:opacity-90 transition-opacity cursor-pointer shadow-sm" 
                                    alt={att.name}
                                  />
                                </a>
                                <span className="text-[10px] text-[#8A817C] block mt-1 truncate max-w-[200px] font-mono">{att.name}</span>
                              </div>
                            ) : (
                              <a 
                                href={att.dataUrl} 
                                download={att.name} 
                                className="flex items-center gap-2 bg-white/80 hover:bg-white border border-[#E7E2D5] rounded-xl p-2 text-xs font-bold text-[#625B57] hover:text-[#2C2723] transition-colors mt-1 shadow-sm shrink-0"
                              >
                                <span className="text-sm">📄</span>
                                <div className="flex-1 min-w-0">
                                  <p className="truncate text-[11px] font-black">{att.name}</p>
                                  <p className="text-[9px] text-[#8A817C] font-mono">{(att.size / 1024).toFixed(1)} KB</p>
                                </div>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <span className="block text-[10px] text-right mt-1 opacity-60 font-mono">
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-[#FFE5D9] border border-[#FAD2C0] rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8A817C] animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8A817C] animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8A817C] animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions Chips */}
            <div className="px-4 py-2 bg-[#FAF7F2] border-t border-[#F3EFE6] overflow-x-auto flex gap-2 no-scrollbar whitespace-nowrap">
              {suggestionChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip)}
                  className="px-3 py-1 bg-white border border-[#EAE5D9] rounded-full text-[11px] text-[#625B57] hover:bg-[#FFE5D9] hover:border-[#FAD2C0] transition-all cursor-pointer font-medium"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Quick action buttons in bottom rail */}
            <div className="px-4 py-1.5 bg-[#FAF7F2] flex gap-2 justify-end border-t border-[#F3EFE6]/50">
              <button 
                onClick={() => { onRequestCreate?.("event"); setIsChatOpen(false); }}
                className="text-[10px] font-bold text-blue-600 hover:underline"
              >
                + Evento
              </button>
              <button 
                onClick={() => { onRequestCreate?.("task"); setIsChatOpen(false); }}
                className="text-[10px] font-bold text-green-600 hover:underline"
              >
                + Tarea
              </button>
              <button 
                onClick={() => { onRequestCreate?.("wish"); setIsChatOpen(false); }}
                className="text-[10px] font-bold text-pink-600 hover:underline"
              >
                + Deseo
              </button>
            </div>

            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              multiple 
              accept="image/*,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />

            {/* Pending Attachments */}
            {pendingAttachments.length > 0 && (
              <div className="px-4 py-2 bg-[#FAF7F2] border-t border-[#F3EFE6] flex flex-wrap gap-2 max-h-[100px] overflow-y-auto">
                {pendingAttachments.map((att, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-white border border-[#E7E2D5] rounded-xl px-2 py-1 text-[11px] font-bold text-[#625B57] relative pr-6 shadow-sm">
                    {att.type.startsWith("image/") ? (
                      <img src={att.dataUrl} className="w-4 h-4 rounded object-cover" alt="preview" />
                    ) : (
                      <span className="text-[11px]">📎</span>
                    )}
                    <span className="max-w-[100px] truncate">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => setPendingAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-rose-500 hover:text-rose-700 bg-rose-50 rounded-full p-0.5 cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input form */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="p-3 bg-white border-t-2 border-[#F3EFE6] flex gap-2 items-center"
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Adjuntar archivo"
                className="p-2 text-[#8A817C] hover:text-[#2C2723] hover:bg-[#FAF7F2] rounded-full transition-all cursor-pointer shrink-0"
              >
                <Paperclip size={18} />
              </button>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Pregúntale a Milo... miau"
                className="flex-1 bg-[#FAF7F2] rounded-full px-4 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#FAD2C0] text-[#2C2723]"
              />
              <button
                type="submit"
                className="p-2 bg-[#FAD2C0] hover:bg-[#FBC4AC] text-[#2C2723] rounded-full transition-all shadow-sm shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🐱 SINGLE LAUNCHER BUTTON FOR MILO & ACTIONS */}
      <motion.button
        onClick={handleLauncherClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="w-11 h-11 md:w-16 md:h-16 bg-[#FFE5D9] hover:bg-[#FBC4AC] border-2 md:border-4 border-white text-xl md:text-3xl shadow-[0_8px_30px_rgba(44,39,35,0.15)] rounded-full flex items-center justify-center cursor-pointer transition-all relative group"
      >
        <span className="transform group-hover:scale-110 duration-200">
          {isMenuOpen || isChatOpen ? "🐾" : "🐱"}
        </span>
        
        {/* Sparkle badge for Milo */}
        <span className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 w-3.5 h-3.5 md:w-5 md:h-5 bg-yellow-400 border border-white md:border-2 rounded-full flex items-center justify-center text-[7px] md:text-[10px] font-bold text-[#2C2723]">
          ✨
        </span>
      </motion.button>
    </div>
  );
}
