import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

interface Props { onTranscript: (text: string) => void; textToSpeak?: string; }

export default function MiloVoiceChat({ onTranscript, textToSpeak }: Props) {
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [status, setStatus] = useState("Listo para escucharte");
  const [error, setError] = useState("");

  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices();
    const spanish = voices.find(v => /^es-CO$/i.test(v.lang)) || voices.find(v => /^es-/i.test(v.lang));
    const u = new SpeechSynthesisUtterance(text.replace(/\*\*/g, "").replace(/[\"“”]/g, ""));
    if (spanish) u.voice = spanish;
    u.lang = spanish?.lang || "es-CO";
    u.rate = 0.92;
    u.pitch = 1.08;
    u.volume = 1;
    u.onstart = () => { setSpeaking(true); setStatus("Milo está hablando 🐾"); };
    u.onend = () => { setSpeaking(false); setStatus("Listo para escucharte"); };
    u.onerror = () => { setSpeaking(false); setStatus("No pude reproducir la voz"); };
    window.speechSynthesis.speak(u);
  };

  useEffect(() => { if (textToSpeak) speak(textToSpeak); }, [textToSpeak]);

  const startListening = async () => {
    setError("");
    if (listening) { recognitionRef.current?.stop?.(); return; }
    if (typeof window === "undefined") return;
    try {
      if (!window.isSecureContext) { setError("El micrófono requiere HTTPS."); return; }
      if (!navigator.mediaDevices?.getUserMedia) { setError("Este navegador no permite acceso al micrófono."); return; }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!Recognition) { setError("Usa Chrome o Edge para dictado por voz."); return; }
      const recognition = new Recognition();
      recognition.lang = "es-CO";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onstart = () => { setListening(true); setStatus("Te estoy escuchando… 🎙️"); };
      recognition.onresult = (event: any) => {
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) finalText += event.results[i][0].transcript;
        if (finalText.trim()) onTranscript(finalText.trim());
      };
      recognition.onerror = (event: any) => {
        setListening(false);
        const map: Record<string,string> = { not_allowed: "El navegador bloqueó el micrófono.", denied: "El permiso del micrófono está bloqueado.", audio_capture: "No pude acceder al micrófono." };
        setError(map[event?.error] || "No pude escucharte. Intenta otra vez.");
        setStatus("Listo para escucharte");
      };
      recognition.onend = () => { setListening(false); setStatus("Listo para escucharte"); };
      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      setListening(false);
      setError(e?.name === "NotAllowedError" ? "Permiso de micrófono bloqueado. Actívalo en el candado de la barra de direcciones." : "No pude activar el micrófono.");
    }
  };

  return <div className="flex flex-wrap items-center gap-2">
    <button type="button" onClick={startListening} className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-black border transition-all ${listening ? "bg-rose-100 border-rose-200 text-rose-700 animate-pulse" : "bg-white border-[#E7E2D5] text-[#5C5552] hover:bg-[#FFE5D9]"}`} title="Hablar con Milo">
      {listening ? <MicOff size={15}/> : <Mic size={15}/>} {listening ? "Escuchando…" : "Hablar"}
    </button>
    <button type="button" onClick={() => textToSpeak && speak(textToSpeak)} className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-[#E7E2D5] text-[#5C5552] hover:bg-[#FFE5D9]" title={speaking ? "Detener voz" : "Escuchar a Milo"}>
      {speaking ? <VolumeX size={15}/> : <Volume2 size={15}/>} 
    </button>
    <span className="text-[10px] text-[#8A817C]">{status}</span>
    {error && <span className="w-full text-[10px] font-semibold text-rose-600">{error}</span>}
  </div>;
}
