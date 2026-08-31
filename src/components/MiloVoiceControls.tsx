import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

interface MiloVoiceControlsProps {
  onTranscript?: (text: string) => void;
  textToSpeak?: string;
}

type VoiceState = "idle" | "listening" | "speaking" | "error";

export default function MiloVoiceControls({ onTranscript, textToSpeak }: MiloVoiceControlsProps) {
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<VoiceState>("idle");
  const [status, setStatus] = useState("Listo para escucharte");
  const [error, setError] = useState("");

  useEffect(() => () => {
    recognitionRef.current?.stop?.();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  const speak = (text?: string) => {
    if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) {
      setError("Este navegador no tiene voz disponible.");
      setState("error");
      setStatus("Voz no disponible");
      return;
    }
    setError("");
    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => /^es-CO$/i.test(v.lang)) || voices.find((v) => /^es-/i.test(v.lang));
    const clean = text.replace(/\*\*/g, "").replace(/[\"“”]/g, "").trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || "es-CO";
    utterance.rate = 0.9;
    utterance.pitch = 1.12;
    utterance.volume = 1;
    utterance.onstart = () => { setState("speaking"); setStatus("Milo está hablando 🐾"); };
    utterance.onend = () => { setState("idle"); setStatus("Listo para escucharte"); };
    utterance.onerror = () => { setState("error"); setStatus("No pude reproducir la voz"); };
    window.speechSynthesis.speak(utterance);
  };

  const startListening = async () => {
    setError("");
    const Recognition = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
    if (!Recognition) {
      setError("Tu navegador no permite dictado por voz. Usa Chrome o Edge.");
      setState("error");
      setStatus("Micrófono no compatible");
      return;
    }
    if (typeof window === "undefined" || !window.isSecureContext) {
      setError("El micrófono requiere una conexión segura HTTPS.");
      setState("error");
      setStatus("Micrófono no disponible");
      return;
    }
    try {
      const permission = await navigator.permissions?.query?.({ name: "microphone" as PermissionName }).catch(() => null);
      if (permission?.state === "denied") {
        setError("El micrófono está bloqueado. Permítelo en el candado de la barra de direcciones y vuelve a pulsar.");
        setState("error");
        setStatus("Micrófono bloqueado");
        return;
      }
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      const recognition = new Recognition();
      recognition.lang = "es-CO";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onstart = () => { setState("listening"); setStatus("Te estoy escuchando… 🎙️"); };
      recognition.onresult = (event: any) => {
        let text = "";
        for (let i = event.resultIndex; i < event.results.length; i++) text += event.results[i][0].transcript;
        if (text.trim()) onTranscript?.(text.trim());
      };
      recognition.onerror = (event: any) => {
        const code = event?.error || "unknown";
        const messages: Record<string, string> = {
          "not-allowed": "El navegador bloqueó el micrófono. Permítelo en el candado de la barra de direcciones.",
          "service-not-allowed": "El navegador no permitió el servicio de reconocimiento de voz.",
          "audio-capture": "No pude acceder al micrófono. Revisa que otro programa no lo esté usando.",
          "no-speech": "No detecté voz. Acércate un poco al micrófono y vuelve a intentarlo."
        };
        setError(messages[code] || "No pude escuchar el micrófono. Intenta otra vez.");
        setState("error");
        setStatus("No pude escucharte");
      };
      recognition.onend = () => {
        if (state !== "error") {
          setState("idle");
          setStatus("Listo para escucharte");
        }
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      const message = err?.name === "NotAllowedError"
        ? "El permiso del micrófono fue rechazado o está bloqueado. Actívalo en el candado de la barra de direcciones."
        : "No pude activar el micrófono. Revisa los permisos del sitio.";
      setError(message);
      setState("error");
      setStatus("Micrófono no disponible");
    }
  };

  const toggleListening = () => {
    if (state === "listening") {
      recognitionRef.current?.stop?.();
      setState("idle");
      setStatus("Listo para escucharte");
      return;
    }
    void startListening();
  };

  const listeningClass = state === "listening"
    ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 animate-pulse"
    : state === "error"
      ? "bg-rose-50 text-rose-600 border-rose-200"
      : "bg-white text-[#5C5552] border-[#E7E2D5] hover:bg-[#FFE5D9]";

  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      <button
        type="button"
        onClick={toggleListening}
        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-black border transition-all ${listeningClass}`}
        aria-label={state === "listening" ? "Dejar de escuchar a Milo" : "Hablar con Milo"}
      >
        {state === "listening" ? <MicOff size={15} /> : <Mic size={15} />}
        {state === "listening" ? "Escuchando…" : "Hablar"}
      </button>

      <button
        type="button"
        onClick={() => state === "speaking" ? window.speechSynthesis?.cancel() : speak(textToSpeak)}
        disabled={!textToSpeak}
        className={`inline-flex items-center justify-center w-9 h-9 rounded-full border ${state === "speaking" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-white text-[#5C5552] border-[#E7E2D5]"} disabled:opacity-40`}
        title="Escuchar a Milo"
      >
        {state === "speaking" ? <VolumeX size={15} /> : <Volume2 size={15} />}
      </button>

      <span className={`text-[10px] font-semibold ${state === "listening" ? "text-blue-600" : state === "error" ? "text-rose-600" : "text-[#8A817C]"}`}>
        {status}
      </span>

      {error && (
        <div className="w-full rounded-xl bg-rose-50 border border-rose-100 px-3 py-2 text-[10px] font-semibold text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
}
