import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, Volume2, VolumeX, X, Send, Trash2, Sparkles, Maximize2, Minimize2, Calendar, CheckSquare, PawPrint, Leaf, Gift, Heart } from "lucide-react";
import { ChatMessage, UserProfile } from "../types";
import { askGatitoChat } from "../api";

interface Props { onRefreshData?: () => void; onRequestCreate?: (type: string) => void; users?: UserProfile[]; }
const clean = (v: string) => v.replace(/\*\*/g, "").replace(/__/g, "").replace(/[\"“”]/g, "").trim();

const ACTIONS = [
  { type: "event", label: "Evento", icon: Calendar, cls: "bg-blue-50 text-blue-700 border-blue-100" },
  { type: "task", label: "Tarea", icon: CheckSquare, cls: "bg-green-50 text-green-700 border-green-100" },
  { type: "pet", label: "Mascota", icon: PawPrint, cls: "bg-purple-50 text-purple-700 border-purple-100" },
  { type: "plant", label: "Planta", icon: Leaf, cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  { type: "wish", label: "Deseo", icon: Gift, cls: "bg-pink-50 text-pink-700 border-pink-100" },
  { type: "memory", label: "Recuerdo", icon: Heart, cls: "bg-rose-50 text-rose-700 border-rose-100" },
] as const;

export default function GatitoAiChatVoiceHome({ onRefreshData, onRequestCreate, users = [] }: Props) {
  const activeUser = useMemo(() => {
    if (typeof window === "undefined") return users[0];
    const id = localStorage.getItem("astro_user_id");
    return users.find(u => u.id === id) || users[0];
  }, [users]);
  const historyKey = `milo_chat_history:${activeUser?.id || "unknown"}`;
  const [open, setOpen] = useState(false), [expanded, setExpanded] = useState(false), [learn, setLearn] = useState(false);
  const [input, setInput] = useState(""), [messages, setMessages] = useState<ChatMessage[]>([]), [typing, setTyping] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle"|"requesting"|"listening"|"processing"|"speaking"|"error">("idle");
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef<any>(null), endRef = useRef<HTMLDivElement>(null);

  const welcome = useMemo<ChatMessage>(() => ({ id: "milo-welcome", sender: "cat", text: activeUser?.name ? `Hola ${activeUser.name}. Soy Milo. Estoy contigo. Cuéntame qué necesitas y lo vemos juntos. 🐾` : "Hola. Soy Milo. Todavía estoy conociéndote, así que no voy a asumir quién eres ni inventar datos sobre ti. Cuéntame algo y empezamos. 🐾", timestamp: new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}) }), [activeUser?.name]);
  const dailyQuestion = useMemo(() => ["¿Qué pequeño detalle de tu día te gustaría que Milo recordara?","¿Qué te hace sentir realmente en casa?","¿Cómo prefieres que Milo te ayude cuando tienes un día pesado?","¿Qué costumbre te gustaría construir en el nido?","¿Qué tema te entusiasma y podríamos aprender juntos?","¿Qué momento reciente te hizo sonreír?","¿Qué debería aprender Milo de ti para conocerte mejor?"][new Date().getDate()%7], []);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(historyKey) : null;
    try { const parsed = saved ? JSON.parse(saved) : null; setMessages(Array.isArray(parsed)&&parsed.length ? parsed.slice(-40) : [welcome]); } catch { setMessages([welcome]); }
  }, [historyKey, welcome]);
  useEffect(() => { if (messages.length) localStorage.setItem(historyKey, JSON.stringify(messages.slice(-40))); }, [historyKey,messages]);
  useEffect(() => { endRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages,typing]);
  useEffect(() => () => { recognitionRef.current?.stop?.(); window.speechSynthesis?.cancel(); }, []);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) { setVoiceError("Tu dispositivo no permite reproducir la voz de Milo."); setVoiceState("error"); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean(text));
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v=>/^es-CO$/i.test(v.lang)) || voices.find(v=>/^es-/i.test(v.lang));
    if (voice) u.voice=voice;
    u.lang = voice?.lang || "es-CO"; u.rate=.88; u.pitch=1.16; u.volume=1;
    u.onstart=()=>setVoiceState("speaking"); u.onend=()=>setVoiceState("idle"); u.onerror=()=>setVoiceState("error");
    window.speechSynthesis.speak(u);
  };

  const listen = async () => {
    setVoiceError("");
    if (voiceState === "listening") { recognitionRef.current?.stop?.(); setVoiceState("idle"); return; }
    if (!window.isSecureContext) { setVoiceError("El micrófono necesita HTTPS."); setVoiceState("error"); return; }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) { setVoiceError("Tu navegador no admite dictado por voz. Prueba Chrome o Edge."); setVoiceState("error"); return; }
    setVoiceState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true}});
      stream.getTracks().forEach(t=>t.stop());
      const r = new Recognition(); r.lang="es-CO"; r.interimResults=true; r.continuous=false;
      r.onstart=()=>setVoiceState("listening");
      r.onresult=(e:any)=>{ let t=""; for(let i=e.resultIndex;i<e.results.length;i++) t+=e.results[i][0].transcript; if(t.trim()) setInput(t.trim()); };
      r.onerror=(e:any)=>{ setVoiceState("error"); setVoiceError(e?.error==="not-allowed" ? "El micrófono está bloqueado. Permítelo en el candado del sitio." : e?.error==="no-speech" ? "No te escuché. Inténtalo otra vez." : "No pude activar el micrófono."); };
      r.onend=()=>setVoiceState(v=>v==="listening"?"idle":v);
      recognitionRef.current=r; r.start();
    } catch(e:any) { setVoiceState("error"); setVoiceError(e?.name==="NotAllowedError" ? "El micrófono está bloqueado. Permítelo en el candado del sitio." : "No pude acceder al micrófono."); }
  };

  const send = async () => {
    const text=input.trim(); if(!text||typing) return;
    setInput(""); setVoiceState("processing");
    const userMsg:ChatMessage={id:`u-${Date.now()}`,sender:"user",text,timestamp:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})};
    const next=[...messages,userMsg]; setMessages(next); setTyping(true);
    try {
      const response=await askGatitoChat(next.slice(-18), {activeUser:activeUser?{id:activeUser.id,name:activeUser.name,zodiacSign:activeUser.zodiacSign}:null, registeredUsers:users.map(u=>({id:u.id,name:u.name,zodiacSign:u.zodiacSign})), dailyLearningQuestion:dailyQuestion, instruction:"Habla solo de usuarios realmente registrados en este hogar. Nunca inventes nombres, relaciones, recuerdos o hechos. Si solo hay un usuario registrado, habla solo con esa persona."});
      const answer=clean(response||"Estoy aquí contigo. 🐾"); const cat:ChatMessage={id:`c-${Date.now()}`,sender:"cat",text:answer,timestamp:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})};
      setMessages(prev=>[...prev,cat]); speak(answer);
    } catch { setVoiceState("idle"); setMessages(prev=>[...prev,{id:`e-${Date.now()}`,sender:"cat",text:"Se me enredó un poquito el ovillo. Intenta otra vez y seguimos. 🐾",timestamp:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}]); }
    finally { setTyping(false); onRefreshData?.(); }
  };

  const statusText = voiceState==="requesting" ? "Pidiendo permiso al micrófono…" : voiceState==="listening" ? "🔵 Te estoy escuchando…" : voiceState==="processing" ? "Procesando lo que me dijiste…" : voiceState==="speaking" ? "🐾 Milo está hablando…" : voiceState==="error" ? voiceError : "Listo para escucharte";

  return <div className="fixed bottom-[76px] left-4 md:bottom-6 md:right-6 md:left-auto z-50">
    <AnimatePresence>{open && <motion.div initial={{opacity:0,y:30,scale:.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:30,scale:.97}} className={`mb-4 bg-white rounded-3xl border-4 border-[#F3EFE6] shadow-[0_12px_40px_rgba(44,39,35,.12)] overflow-hidden flex flex-col absolute bottom-14 left-0 md:right-0 ${expanded?"w-[calc(100vw-32px)] md:w-[760px] h-[78vh]":"w-[calc(100vw-32px)] sm:w-[440px] h-[600px]"}`}>
      <div className="bg-[#FAF7F2] p-4 border-b-2 border-[#F3EFE6] flex items-center justify-between gap-2"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-[#FFE5D9] flex items-center justify-center text-2xl">🐱</div><div><h3 className="font-black">Milo</h3><p className="text-[10px] text-[#8A817C]">{activeUser?.name?`Contigo, ${activeUser.name}`:"Todavía estoy conociéndote"}</p></div></div><div className="flex items-center gap-1"><button onClick={()=>setLearn(v=>!v)} className={`px-2.5 py-1.5 rounded-full text-[10px] font-black ${learn?"bg-[#FFE5D9]":"bg-white"}`}>Conozcámonos</button><button onClick={()=>setExpanded(v=>!v)} className="p-1.5 text-[#8A817C]">{expanded?<Minimize2 size={16}/>:<Maximize2 size={16}/>}</button><button onClick={()=>{setMessages([welcome]);localStorage.setItem(historyKey,JSON.stringify([welcome]));}} className="p-1.5 text-[#8A817C]"><Trash2 size={16}/></button><button onClick={()=>setOpen(false)} className="p-1.5 text-[#8A817C]"><X size={18}/></button></div></div>
      {learn ? <div className="flex-1 overflow-y-auto bg-[#FCFAF7] p-5"><div className="bg-[#FFE5D9] rounded-3xl p-5 border border-[#FAD2C0]"><div className="flex items-center gap-2 font-black"><Sparkles size={17}/>Conozcámonos con Milo</div><p className="text-xs text-[#5C5552] mt-2">Cada día puedes enseñarme algo sobre ti. Solo recordaré lo que tú decidas compartir.</p></div><div className="bg-white rounded-3xl border-2 border-[#E7E2D5] p-5 mt-4"><span className="text-[10px] uppercase font-black text-[#8C5D23]">Pregunta de hoy</span><p className="mt-2 font-black text-[#2C2723]">{dailyQuestion}</p><button onClick={()=>{setLearn(false);setInput(dailyQuestion)}} className="mt-4 px-4 py-2 rounded-xl bg-[#2C2723] text-white text-xs font-black">Responder</button></div></div> : <><div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FCFAF7]">{messages.map(m=><div key={m.id} className={`flex ${m.sender==="user"?"justify-end":"justify-start"}`}><div className={`max-w-[86%] rounded-2xl px-4 py-3 text-xs md:text-sm shadow-sm ${m.sender==="user"?"bg-[#D8E2DC] rounded-tr-none":"bg-[#FFE5D9] rounded-tl-none border border-[#FAD2C0]"}`}><div className="whitespace-pre-wrap leading-relaxed">{clean(m.text)}</div><div className="flex justify-end items-center mt-1"><span className="text-[9px] opacity-50 font-mono">{m.timestamp}</span>{m.sender==="cat"&&<button onClick={()=>speak(m.text)} className="ml-2 text-[#8A817C]"><Volume2 size={13}/></button>}</div></div></div>)}{typing&&<div className="text-[10px] text-[#8A817C]">Milo está pensando con sus patitas… 🐾</div>}<div ref={endRef}/></div><div className="px-4 py-2 bg-[#FAF7F2] border-t border-[#F3EFE6]"><div className="flex flex-wrap gap-1.5 mb-2">{ACTIONS.map(a=>{const I=a.icon;return <button key={a.type} type="button" onClick={()=>onRequestCreate?.(a.type)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[10px] font-black ${a.cls}`}><I size={12}/>{a.label}</button>})}</div><div className="flex items-center gap-2"><button type="button" onClick={listen} className={`relative p-2.5 rounded-full border-2 transition-all ${voiceState==="listening"?"bg-blue-500 border-blue-500 text-white shadow-[0_0_0_5px_rgba(59,130,246,.15)] animate-pulse":voiceState==="error"?"bg-red-50 border-red-200 text-red-600":"bg-white border-[#E7E2D5] text-[#5C5552] hover:bg-[#FFE5D9]"}`}>{voiceState==="listening"?<MicOff size={17}/>:<Mic size={17}/>}</button><span className={`text-[10px] font-bold ${voiceState==="listening"?"text-blue-600":voiceState==="error"?"text-red-600":"text-[#8A817C]"}`}>{statusText}</span>{voiceState==="speaking"&&<button type="button" onClick={()=>{window.speechSynthesis?.cancel();setVoiceState("idle")}} className="ml-auto p-1.5 rounded-full text-[#8A817C] bg-white"><VolumeX size={15}/></button>}</div></div><form onSubmit={e=>{e.preventDefault();send()}} className="p-3 bg-white border-t-2 border-[#F3EFE6] flex items-center gap-2"><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Pregúntale a Milo…" className="flex-1 bg-[#FAF7F2] rounded-full px-4 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#FAD2C0]"/><button type="submit" className="p-2.5 bg-[#FAD2C0] rounded-full"><Send size={16}/></button></form></>}
    </motion.div>}</AnimatePresence>
    <button onClick={()=>setOpen(v=>!v)} className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#FFE5D9] border-4 border-white shadow-[0_8px_30px_rgba(44,39,35,.12)] flex items-center justify-center text-2xl hover:scale-105 transition-transform">{open?"💬":"🐱"}</button>
  </div>;
}