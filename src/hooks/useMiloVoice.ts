import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
};

export function useMiloVoice(onTranscript?: (text: string) => void) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptHandlerRef = useRef(onTranscript);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);

  useEffect(() => {
    transcriptHandlerRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as any;
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    const supported = typeof Recognition === "function";
    setIsSupported(supported);
    if (!supported) {
      setVoiceError("Este navegador no admite reconocimiento de voz para Milo.");
      return;
    }

    const recognition: SpeechRecognitionLike = new Recognition();
    recognition.lang = "es-CO";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = "";
      let partialText = "";
      for (let i = event.resultIndex || 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result?.[0]?.transcript || "";
        if (result?.isFinal) finalText += text;
        else partialText += text;
      }
      setInterimTranscript(partialText.trim() || finalText.trim());
      if (finalText.trim()) {
        const clean = finalText.trim();
        setInterimTranscript("");
        setVoiceError(null);
        transcriptHandlerRef.current?.(clean);
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      setInterimTranscript("");
      const code = String(event?.error || "");
      const messages: Record<string, string> = {
        "not-allowed": "El micrófono está bloqueado. Permite el acceso al micrófono en el navegador.",
        "service-not-allowed": "El navegador no permitió usar el servicio de voz.",
        "no-speech": "No escuché una frase. Habla un poco más cerca del micrófono e inténtalo de nuevo.",
        "audio-capture": "No pude acceder al micrófono del dispositivo.",
        "network": "El servicio de reconocimiento de voz no está disponible en este momento."
      };
      setVoiceError(messages[code] || "No pude escuchar bien. Inténtalo de nuevo.");
    };
    recognitionRef.current = recognition;

    return () => {
      try { recognition.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return false;
    setVoiceError(null);
    setInterimTranscript("");
    try {
      recognitionRef.current.start();
      setIsListening(true);
      return true;
    } catch (error: any) {
      setVoiceError(error?.message || "No pude activar el micrófono.");
      setIsListening(false);
      return false;
    }
  }, []);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) {
      setVoiceError("La voz de salida no está disponible en este navegador.");
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, ""));
      utterance.lang = "es-CO";
      utterance.rate = 1.02;
      utterance.pitch = 1.05;
      utterance.onstart = () => { setVoiceError(null); setIsSpeaking(true); };
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => { setIsSpeaking(false); setVoiceError("No pude reproducir la respuesta de Milo por voz."); };
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
      setVoiceError("No pude reproducir la respuesta de Milo por voz.");
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  return { isSupported, isListening, isSpeaking, interimTranscript, voiceError, startListening, stopListening, speak, stopSpeaking };
}
