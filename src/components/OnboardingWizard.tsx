import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Calendar, Heart, Leaf, Copy, User, HelpCircle, ArrowRight, ArrowLeft, Key } from "lucide-react";
import { createHomeOnboarding, joinHomeOnboarding, enterHomeByCode } from "../api";
import { Home, UserProfile } from "../types";
import { CUSTOM_AVATARS, Avatar } from "./Avatar";

interface OnboardingWizardProps {
  onCompleted: (home: Home, user: UserProfile) => void;
}

export default function OnboardingWizard({ onCompleted }: OnboardingWizardProps) {
  const [flow, setFlow] = useState<"choose" | "create" | "join" | "enter">("choose");
  const [step, setStep] = useState(1);

  // Form states - Create Nido
  const [homeName, setHomeName] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("12:00");
  const [birthPlace, setBirthPlace] = useState("Bogotá");
  const [selectedEmoji, setSelectedEmoji] = useState("cat_cosmic");

  // Form states - Join Nido
  const [inviteCode, setInviteCode] = useState("");
  const [joinUserName, setJoinUserName] = useState("");
  const [joinUserEmail, setJoinUserEmail] = useState("");
  const [joinBirthDate, setJoinBirthDate] = useState("");
  const [joinBirthTime, setJoinBirthTime] = useState("12:00");
  const [joinBirthPlace, setJoinBirthPlace] = useState("Bogotá");
  const [joinSelectedEmoji, setJoinSelectedEmoji] = useState("cat_ginger");

  // Form states - Enter Existing Nido (Login)
  const [loginCode, setLoginCode] = useState("");
  const [loginHome, setLoginHome] = useState<Home | null>(null);
  const [loginUsers, setLoginUsers] = useState<UserProfile[]>([]);

  // Loading & calculated data states
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [createdUser, setCreatedUser] = useState<UserProfile | null>(null);
  const [createdHome, setCreatedHome] = useState<Home | null>(null);

  // Computed invitation code
  const getMockInviteCode = () => {
    if (createdHome?.code) {
      return createdHome.code;
    }
    if (createdHome?.id) {
      return `ASTRO-${createdHome.id.substring(5, 11).toUpperCase()}`;
    }
    return "ASTRO-HOGAR-CONNECT";
  };

  const [copied, setCopied] = useState(false);
  const copyCode = () => {
    navigator.clipboard.writeText(getMockInviteCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Submission handler - Create Home
  const handleCreateHome = async () => {
    if (!homeName || !userName || !birthDate) {
      setErrorMsg("Por favor, llena todos los campos cósmicos ✨");
      return;
    }
    setIsProcessing(true);
    setErrorMsg("");
    try {
      const result = await createHomeOnboarding({
        homeName,
        userName,
        email: userEmail,
        birthDate,
        birthTime,
        birthPlace,
        emoji: selectedEmoji
      });
      setCreatedHome(result.home);
      setCreatedUser(result.user);
      // Advance to activation display (step 4)
      setStep(4);
    } catch (err: any) {
      setErrorMsg(err.message || "Ocurrió un error al alinear los astros. Inténtalo de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Submission handler - Join Home
  const handleJoinHome = async () => {
    if (!inviteCode || !joinUserName || !joinBirthDate) {
      setErrorMsg("Por favor, llena todos los campos para la sintonización ✨");
      return;
    }
    setIsProcessing(true);
    setErrorMsg("");
    try {
      const result = await joinHomeOnboarding({
        inviteCode,
        userName: joinUserName,
        email: joinUserEmail,
        birthDate: joinBirthDate,
        birthTime: joinBirthTime,
        birthPlace: joinBirthPlace,
        emoji: joinSelectedEmoji
      });
      setCreatedHome(result.home);
      setCreatedUser(result.user);
      // Go to Step 4 (alignment animation)
      setStep(4);
    } catch (err: any) {
      setErrorMsg(err.message || "El código de invitación no se pudo sintonizar. Verifica los datos miau.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Submission handler - Enter/Login Existing Home
  const handleEnterHome = async () => {
    if (!loginCode.trim()) {
      setErrorMsg("Por favor, ingresa el código del hogar ✨");
      return;
    }
    setIsProcessing(true);
    setErrorMsg("");
    try {
      const result = await enterHomeByCode(loginCode);
      setLoginHome(result.home);
      setLoginUsers(result.users);
      // Advance to Step 2 (Select profile)
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || "No se pudo sintonizar ese hogar. Verifica que el código sea correcto.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Login click handler per user profile card
  const handleProfileLoginSelect = (user: UserProfile) => {
    if (loginHome && user) {
      onCompleted(loginHome, user);
    }
  };

  // Complete onboarding wizard
  const handleFinishedAll = () => {
    if (createdHome && createdUser) {
      onCompleted(createdHome, createdUser);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF7F2] text-[#2C2723] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Dynamic ambient star background */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-10 left-10 w-2 h-2 bg-[#D1A153] rounded-full animate-ping" />
        <div className="absolute top-1/4 right-20 w-3 h-3 bg-[#EAA1AD] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 left-32 w-2 h-2 bg-[#6E9E8E] rounded-full animate-pulse" />
        <div className="absolute bottom-10 right-1/4 w-3.5 h-3.5 bg-[#8E7CC3] rounded-full animate-ping" style={{ animationDuration: "3s" }} />
      </div>

      <AnimatePresence mode="wait">
        
        {/* FLOW SELECTION SCREEN */}
        {flow === "choose" && (
          <motion.div
            key="choose-nido"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            transition={{ duration: 0.4 }}
            className="z-10 bg-white/90 backdrop-blur-md rounded-[2.5rem] border-4 border-[#F3EFE6] max-w-sm w-full p-8 shadow-2xl text-center space-y-6 relative"
          >
            <div className="space-y-3">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-3xl shadow-xs mx-auto animate-bounce">
                🌌
              </div>
              <h1 className="text-2xl font-black tracking-tight text-[#2C2723] font-sans">
                Bienvenido a <span className="text-amber-500">AstroHogar</span>
              </h1>
              <p className="text-[11px] md:text-xs text-[#625B57] max-w-xs mx-auto leading-relaxed">
                Tu nido no es un gestor gris. Es un <span className="font-bold text-[#2C2723]">ecosistema vivo compartido</span>, guiado por la energía armónica de sus almas.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 max-w-xs mx-auto pt-2">
              <button
                onClick={() => {
                  setFlow("create");
                  setStep(1);
                  setErrorMsg("");
                }}
                className="w-full bg-[#DF5E00] hover:bg-[#B84E00] text-white py-2.5 px-4 rounded-xl font-black text-[11px] uppercase tracking-wide transition-all cursor-pointer shadow-sm text-center flex items-center justify-center gap-1.5"
              >
                ✨ Fundar mi nido
              </button>

              <button
                onClick={() => {
                  setFlow("enter");
                  setStep(1);
                  setErrorMsg("");
                }}
                className="w-full bg-[#FCFAF7] hover:bg-[#F3EFE6] text-[#2C2723] py-2.5 px-4 rounded-xl font-black text-[11px] uppercase tracking-wide border border-[#E7E2D5] transition-all cursor-pointer shadow-2xs text-center flex items-center justify-center gap-1.5"
              >
                🔑 Volver a mi nido
              </button>

              <button
                onClick={() => {
                  setFlow("join");
                  setStep(1);
                  setErrorMsg("");
                }}
                className="w-full bg-[#FCFAF7] hover:bg-[#F3EFE6] text-[#2C2723] py-2.5 px-4 rounded-xl font-black text-[11px] uppercase tracking-wide border border-[#E7E2D5] transition-all cursor-pointer shadow-2xs text-center flex items-center justify-center gap-1.5"
              >
                🔗 Unirme con código
              </button>
            </div>
            
            <div className="text-[9px] text-gray-400">
              AstroHogar requiere al menos una consciencia para despertar miau🐾
            </div>
          </motion.div>
        )}

        {/* CREATE HOME FLOW */}
        {flow === "create" && (
          <motion.div
            key="create-nido"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="z-10 bg-white shadow-2xl rounded-[2.5rem] border-4 border-[#F3EFE6] max-w-xl w-full overflow-hidden"
          >
            {/* Header / Tracker */}
            <div className="bg-[#FAF7F2] p-6 border-b border-[#F3EFE6] flex justify-between items-center px-8">
              <button 
                onClick={() => {
                  if (step > 1) {
                    setStep(step - 1);
                  } else {
                    setFlow("choose");
                  }
                }}
                className="text-gray-400 hover:text-gray-900 font-bold text-xs flex items-center gap-1 bg-white px-3 py-1.5 rounded-full border border-gray-200 transition-colors"
                style={{ visibility: step > 3 ? "hidden" : "visible" }}
              >
                <ArrowLeft size={13} /> Atrás
              </button>
              <div className="text-xs font-extrabold tracking-wider text-[#8A817C] uppercase">
                Paso {step} de 6
              </div>
              <button 
                onClick={() => setFlow("choose")}
                className="text-xs text-rose-500 font-bold hover:underline"
                style={{ visibility: step > 3 ? "hidden" : "visible" }}
              >
                Salir
              </button>
            </div>

            {/* Steps views */}
            <div className="p-8 md:p-10 space-y-6">
              
              {/* STEP 1: HOME NAME */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2 text-center md:text-left">
                    <span className="text-4xl">🏡</span>
                    <h2 className="text-2xl font-black text-[#2C2723]">¿Cómo se llamará su nido?</h2>
                    <p className="text-xs text-[#8A817C]">El nombre que cobijará el nido compartido en las estrellas.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#2C2723] uppercase tracking-wider">Nombre del Hogar</label>
                    <input 
                      type="text"
                      value={homeName}
                      onChange={(e) => setHomeName(e.target.value)}
                      placeholder="Ej: Casa Luna, Nido de Selva, Nuestro Domo..."
                      className="w-full text-sm rounded-2xl border-2 border-[#E7E2D5] p-3.5 focus:border-amber-400 focus:outline-none transition-all placeholder-gray-300 font-medium"
                    />
                  </div>
                  <button
                    disabled={!homeName.trim()}
                    onClick={() => setStep(2)}
                    className="w-full flex items-center justify-center gap-2 bg-[#2C2723] text-white p-4 rounded-2xl font-bold text-sm tracking-wide shadow-lg cursor-pointer hover:bg-black transition-colors disabled:opacity-50"
                  >
                    Establecer Nombre <ArrowRight size={15} />
                  </button>
                </div>
              )}

              {/* STEP 2: USER PROFILE */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="space-y-2 text-center md:text-left">
                    <span className="text-4xl">👤</span>
                    <h2 className="text-2xl font-black text-[#2C2723]">Háblame de ti</h2>
                    <p className="text-xs text-[#8A817C]">Ingresa tus datos reales. Nos servirán para calcular tu signo solar y tu personalidad cósmica diaria.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#2C2723] uppercase tracking-wider flex items-center justify-between">
                        <span>Tu Avatar Cósmico</span>
                        <span className="text-xs text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                          {CUSTOM_AVATARS.find(a => a.id === selectedEmoji)?.name || "Gatito Astral"}
                        </span>
                      </label>
                      
                      <div className="grid grid-cols-5 gap-2 p-3 bg-[#FAF7F2] rounded-2xl border-2 border-[#E7E2D5] max-h-[220px] overflow-y-auto">
                        {CUSTOM_AVATARS.map(av => (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => setSelectedEmoji(av.id)}
                            title={av.name}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                              selectedEmoji === av.id 
                                ? "bg-amber-100 border-2 border-amber-500 scale-105 shadow-xs" 
                                : "bg-white hover:bg-amber-105/50 border border-[#E7E2D5]"
                            }`}
                          >
                            <Avatar emoji={av.id} className="w-10 h-10" />
                            <span className="text-[8px] font-extrabold text-amber-900 mt-1 truncate max-w-full leading-none">
                              {av.name.split(" ")[0]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#2C2723] uppercase tracking-wider">Tu Nombre</label>
                      <input 
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Ej: Mafe, Natalia, Benja..."
                        className="w-full text-sm rounded-2xl border-2 border-[#E7E2D5] p-3 focus:border-amber-400 focus:outline-none transition-all placeholder-gray-300 font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#2C2723] uppercase tracking-wider">Tu Correo Electrónico</label>
                      <input 
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="ejemplo@correo.com"
                        className="w-full text-sm rounded-2xl border-2 border-[#E7E2D5] p-3 focus:border-amber-400 focus:outline-none transition-all placeholder-gray-300 font-mediumCode"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#2C2723] uppercase tracking-wider">Fecha de Nacimiento</label>
                      <input 
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full text-sm rounded-2xl border-2 border-[#E7E2D5] p-3 focus:border-amber-400 focus:outline-none transition-all font-medium text-gray-600"
                      />
                    </div>
                  </div>

                  <button
                    disabled={!userName || !birthDate}
                    onClick={() => setStep(3)}
                    className="w-full flex items-center justify-center gap-2 bg-[#2C2723] text-white p-4 rounded-2xl font-bold text-sm tracking-wide shadow-lg cursor-pointer hover:bg-black transition-colors disabled:opacity-50"
                  >
                    Confirmar Mis Datos <ArrowRight size={15} />
                  </button>
                </div>
              )}

              {/* STEP 3: CONFIRM SYSTEM LAUNCH */}
              {step === 3 && (
                <div className="space-y-6 text-center py-4">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner mx-auto animate-pulse">
                    ✨
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-[#2C2723]">Activar Matriz Astral</h2>
                    <p className="text-sm text-[#625B57] max-w-sm mx-auto">
                      Al fundar <span className="font-bold text-[#2C2723]">{homeName}</span>, calcularemos tu signo solar basándonos en tu fecha de nacimiento miau.
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  <button
                    disabled={isProcessing}
                    onClick={handleCreateHome}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 rounded-2xl font-extrabold text-sm tracking-wide shadow-lg hover:brightness-105 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessing ? "Alineando planetas... 🐾" : "🌌 Crear e Inaugurar Hogar"}
                  </button>
                </div>
              )}

              {/* STEP 4: ASTROLOGICAL VIEW FROM COMPUTATION */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <div className="inline-block px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-full animate-bounce">
                      ✨ Alineación Completa ✨
                    </div>
                    <h2 className="text-2xl font-black text-[#2C2723]">¡Tu Mapa Natal!</h2>
                    <p className="text-xs text-[#8A817C]">Hemos leído el cielo en tu momento exacto.</p>
                  </div>

                  <div className="p-5 bg-[#FCFAF7] border-2 border-[#F3EFE6] rounded-3xl flex justify-center">
                    <div className="bg-white p-6 rounded-2xl text-center border border-[#FAF7F2] space-y-1 shadow-sm w-full max-w-xs">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Sol central (Solar)</p>
                      <p className="text-xl font-black text-gray-800">{createdUser?.zodiacSign}</p>
                      <p className="text-xs text-gray-400">Esencia de tu alma</p>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 text-xs text-amber-900 leading-relaxed text-center">
                    ☀️ <span className="font-bold">Energía del Hogar:</span> Introspección y Calma. Ideal para nutrir la confianza recíproca.
                  </div>

                  <button
                    onClick={() => setStep(5)}
                    className="w-full flex items-center justify-center gap-2 bg-[#2C2723] text-white p-4 rounded-2xl font-bold text-sm tracking-wide shadow-lg cursor-pointer hover:bg-black transition-colors"
                  >
                    Establecer Código De Invitación <ArrowRight size={15} />
                  </button>
                </div>
              )}

              {/* STEP 5: HOME INVISIBLE STATE / CODE ENCOURAGE */}
              {step === 5 && (
                <div className="space-y-6">
                  <div className="space-y-2 text-center">
                    <span className="text-4xl text-center block">🔗</span>
                    <h2 className="text-2xl font-black text-[#2C2723]">Invita a tu persona</h2>
                    <p className="text-xs text-[#8A817C] max-w-sm mx-auto">
                      AstroHogar es un espacio compartido. La otra consciencia debe enlazarse para completar el canal emocional.
                    </p>
                  </div>

                  <div className="p-5 bg-[#FAF7F2] border-2 border-[#E7E2D5] rounded-3xl space-y-3">
                    <p className="text-[11px] font-bold text-[#625B57] uppercase tracking-wider text-center">Tu Código Cósmico</p>
                    <div className="bg-white rounded-2xl p-4 border border-[#E7E2D5] flex items-center justify-between shadow-sm">
                      <span className="font-mono text-base font-black text-amber-600 tracking-wider">
                        {getMockInviteCode()}
                      </span>
                      <button 
                        onClick={copyCode}
                        className="text-cute text-xs bg-[#FAF7F2] hover:bg-[#E7E2D5] p-2 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Copy size={13} /> {copied ? "Copiado!" : "Copiar"}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-[11px] text-blue-900 flex items-start gap-2.5 leading-relaxed">
                    <span>💡</span>
                    <span>No te preocupes: puedes ver y compartir este enlace o código cósmico en cualquier momento ingresando a la sección de Ajustes / Hogar en tu menú.</span>
                  </div>

                  <button
                    onClick={() => setStep(6)}
                    className="w-full flex items-center justify-center gap-2 bg-[#2C2723] text-white p-4 rounded-2xl font-bold text-sm tracking-wide shadow-lg cursor-pointer hover:bg-black transition-colors"
                  >
                    Activar Gatito Milo 🐾 <ArrowRight size={15} />
                  </button>
                </div>
              )}

              {/* STEP 6: MILO ASISTENTE */}
              {step === 6 && (
                <div className="space-y-6 text-center py-2">
                  <div className="w-24 h-24 bg-gradient-to-tr from-amber-100 to-pink-100 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-inner mx-auto animate-pulse">
                    🐱
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-[#2C2723]">¡Miau! Hola, soy Milo</h2>
                    <p className="text-xs text-[#8A817C] max-w-sm mx-auto">
                      Seré el guardián de su nido cósmico, ayudándoles a calcular alertas de riego de plantas, predicciones diarias y cuidando con amor.
                    </p>
                  </div>

                  <div className="bg-[#FAF7F2] rounded-3xl p-5 border-2 border-[#FAF7F2] text-left space-y-3.5">
                    <div className="flex items-start gap-3">
                      <span className="text-base text-amber-500">🪴</span>
                      <p className="text-xs text-gray-600 leading-normal font-medium">
                        <strong className="text-[#2C2723]">Sintonía Botánica:</strong> Te alertaré cariñosamente cuando tus plantitas requieran agua o abono miau.
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-base text-pink-500">💞</span>
                      <p className="text-xs text-gray-600 leading-normal font-medium">
                        <strong className="text-[#2C2723]">Pulso de Conexión:</strong> Evaluaré el estado emocional consolidado de su amor basándome en el clima y las tareas pendientes.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleFinishedAll}
                    className="w-full flex items-center justify-center gap-2 bg-[#2C2723] text-white p-4 rounded-2xl font-extrabold text-sm tracking-wide shadow-lg cursor-pointer hover:bg-black transition-colors"
                  >
                    ¡Entrar a AstroHogar! 🌌🏡
                  </button>
                </div>
              )}

            </div>
          </motion.div>
        )}

        {/* JOINING / SYNC FLOW WITH CODE */}
        {flow === "join" && (
          <motion.div
            key="join-nido"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            className="z-10 bg-white shadow-2xl rounded-[2.5rem] border-4 border-[#F3EFE6] max-w-xl w-full overflow-hidden"
          >
            {/* Header Track */}
            <div className="bg-[#FAF7F2] p-6 border-b border-[#F3EFE6] flex justify-between items-center px-8">
              <button 
                onClick={() => {
                  if (step > 1) {
                    setStep(step - 1);
                  } else {
                    setFlow("choose");
                  }
                }}
                className="text-gray-400 hover:text-gray-900 font-bold text-xs flex items-center gap-1 bg-white px-3 py-1.5 rounded-full border border-gray-200 transition-colors"
                style={{ visibility: step > 3 ? "hidden" : "visible" }}
              >
                <ArrowLeft size={13} /> Atrás
              </button>
              <div className="text-xs font-extrabold tracking-wider text-[#8A817C] uppercase">
                Paso {step} de 5
              </div>
              <button 
                onClick={() => setFlow("choose")}
                className="text-xs text-rose-500 font-bold hover:underline"
                style={{ visibility: step > 3 ? "hidden" : "visible" }}
              >
                Cancelar
              </button>
            </div>

            {/* Step frames */}
            <div className="p-8 md:p-10 space-y-6">

              {/* STEP 1: INVITE CODE */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2 text-center md:text-left">
                    <span className="text-4xl text-center block md:inline">🔗</span>
                    <h2 className="text-2xl font-black text-[#2C2723]">Ingresa el Código Cósmico</h2>
                    <p className="text-xs text-[#8A817C]">Escribe el código compartido por tu persona favorita para enlazarse.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#2C2723] uppercase tracking-wider">Código de Invitación</label>
                    <input 
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="Ej: ASTRO-F12E6B"
                      className="w-full text-sm font-mono text-center rounded-2xl border-2 border-[#E7E2D5] p-3.5 focus:border-amber-400 focus:outline-none transition-all placeholder-gray-300 tracking-wider text-amber-600 font-black"
                    />
                  </div>

                  <button
                    disabled={!inviteCode.trim() || inviteCode.length < 5}
                    onClick={() => setStep(2)}
                    className="w-full flex items-center justify-center gap-2 bg-[#2C2723] text-white p-4 rounded-2xl font-bold text-sm tracking-wide shadow-lg cursor-pointer hover:bg-black transition-colors disabled:opacity-50"
                  >
                    Establecer Código <ArrowRight size={15} />
                  </button>
                </div>
              )}

              {/* STEP 2: USER PROFILE INFO */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="space-y-2 text-center md:text-left">
                    <span className="text-4xl">⭐</span>
                    <h2 className="text-2xl font-black text-[#2C2723]">Sintoniza tu alma</h2>
                    <p className="text-xs text-[#8A817C]">Ingresa tus datos celestiales para fundar el mapa de compatibilidad.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#2C2723] uppercase tracking-wider flex items-center justify-between">
                        <span>Tu Avatar Cósmico</span>
                        <span className="text-xs text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                          {CUSTOM_AVATARS.find(a => a.id === joinSelectedEmoji)?.name || "Milo El Sabio"}
                        </span>
                      </label>
                      
                      <div className="grid grid-cols-5 gap-2 p-3 bg-[#FAF7F2] rounded-2xl border-2 border-[#E7E2D5] max-h-[220px] overflow-y-auto">
                        {CUSTOM_AVATARS.map(av => (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => setJoinSelectedEmoji(av.id)}
                            title={av.name}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                              joinSelectedEmoji === av.id 
                                ? "bg-amber-100 border-2 border-amber-500 scale-105 shadow-xs" 
                                : "bg-white hover:bg-amber-105/50 border border-[#E7E2D5]"
                            }`}
                          >
                            <Avatar emoji={av.id} className="w-10 h-10" />
                            <span className="text-[8px] font-extrabold text-amber-900 mt-1 truncate max-w-full leading-none">
                              {av.name.split(" ")[0]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#2C2723] uppercase tracking-wider">Tu Nombre</label>
                      <input 
                        type="text"
                        value={joinUserName}
                        onChange={(e) => setJoinUserName(e.target.value)}
                        placeholder="Ej: Benja, Mafe..."
                        className="w-full text-sm rounded-2xl border-2 border-[#E7E2D5] p-3 focus:border-amber-400 focus:outline-none transition-all placeholder-gray-300 font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#2C2723] uppercase tracking-wider">Tu Correo Electrónico</label>
                      <input 
                        type="email"
                        value={joinUserEmail}
                        onChange={(e) => setJoinUserEmail(e.target.value)}
                        placeholder="correo@ejemplo.com"
                        className="w-full text-sm rounded-2xl border-2 border-[#E7E2D5] p-3 focus:border-amber-400 focus:outline-none transition-all placeholder-gray-300 font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#2C2723] uppercase tracking-wider">Fecha de Nacimiento</label>
                      <input 
                        type="date"
                        value={joinBirthDate}
                        onChange={(e) => setJoinBirthDate(e.target.value)}
                        className="w-full text-sm rounded-2xl border-2 border-[#E7E2D5] p-3 focus:border-amber-400 focus:outline-none transition-all font-medium text-gray-600"
                      />
                    </div>
                  </div>

                  <button
                    disabled={!joinUserName || !joinBirthDate}
                    onClick={() => setStep(3)}
                    className="w-full flex items-center justify-center gap-2 bg-[#2C2723] text-white p-4 rounded-2xl font-bold text-sm tracking-wide shadow-lg cursor-pointer hover:bg-black transition-colors disabled:opacity-50"
                  >
                    Confirmar Mis Datos <ArrowRight size={15} />
                  </button>
                </div>
              )}

              {/* STEP 3: EXECUTE CONNECTION */}
              {step === 3 && (
                <div className="space-y-6 text-center py-4">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner mx-auto animate-pulse">
                    💞
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-[#2C2723]">Sintonización Cósmica</h2>
                    <p className="text-sm text-[#625B57] max-w-sm mx-auto">
                      Estamos listos para sincronizar tu mapa astral con el de tu pareja. El nido digital se consolidará miau de inmediato.
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  <button
                    disabled={isProcessing}
                    onClick={handleJoinHome}
                    className="w-full flex items-center justify-center gap-2 bg-[#2C2723] text-white p-4 rounded-2xl font-extrabold text-sm tracking-wide shadow-lg cursor-pointer hover:bg-black transition-all disabled:opacity-50"
                  >
                    {isProcessing ? "Fundiendo campos de energía miau..." : "🌌 Sincronizar y Completar Hogar"}
                  </button>
                </div>
              )}

              {/* STEP 4: REDUCED ASTRO MAP NATAL */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <div className="inline-block px-3 py-1.5 bg-green-50 border border-green-200 text-green-800 text-xs font-bold rounded-full animate-bounce">
                      ✨ Sintonizado con éxito miau ✨
                    </div>
                    <h2 className="text-2xl font-black text-[#2C2723]">¡Tu Perfil Astral!</h2>
                    <p className="text-xs text-[#8A817C]">Tu firma astrológica registrada.</p>
                  </div>

                  <div className="p-5 bg-[#FCFAF7] border-2 border-[#F3EFE6] rounded-3xl flex justify-center">
                    <div className="bg-white p-6 rounded-2xl text-center border border-[#FAF7F2] space-y-1 shadow-sm w-full max-w-xs">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Sol de Esencia</p>
                      <p className="text-xl font-black text-gray-800">{createdUser?.zodiacSign}</p>
                      <p className="text-xs text-gray-400">Tu núcleo interior</p>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-900 leading-relaxed text-center">
                    🏡 <span className="font-bold">Momento Mágico:</span> ¡Vuestros campos astrólogos se han fusionado! El AstroHogar ha despertado por completo.
                  </div>

                  <button
                    onClick={() => setStep(5)}
                    className="w-full flex items-center justify-center gap-2 bg-[#2C2723] text-white p-4 rounded-2xl font-bold text-sm tracking-wide shadow-lg cursor-pointer hover:bg-black transition-colors"
                  >
                    Establecer Guardianía de Milo 🐾 <ArrowRight size={15} />
                  </button>
                </div>
              )}

              {/* STEP 5: MOMENTO MAGICO FINAL */}
              {step === 5 && (
                <div className="space-y-6 text-center py-2">
                  <div className="w-24 h-24 bg-gradient-to-tr from-green-100 to-amber-100 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-inner mx-auto animate-bounce">
                    😻
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-[#2C2723]">¡Nido Sincronizado!</h2>
                    <p className="text-xs text-[#8A817C] max-w-sm mx-auto">
                      ¡Miau! Bienvenid@ a bordo. Milo reporta que el nido digital ya tiene sus dos almas fundidas en paz.
                    </p>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-xs text-amber-900 font-medium leading-relaxed">
                    🌟 <strong className="block text-sm mb-0.5">Vínculo Sincronizado</strong>
                    Ahora todas las tareas, plantas, recuerdos y finanzas son compartidos de forma instantánea entre ambos.
                  </div>

                  <button
                    onClick={handleFinishedAll}
                    className="w-full flex items-center justify-center gap-2 bg-[#2C2723] text-white p-4 rounded-2xl font-extrabold text-sm tracking-wide shadow-lg cursor-pointer hover:bg-black transition-colors"
                  >
                    ¡Entrar a AstroHogar! 🌌✨
                  </button>
                </div>
              )}

            </div>
          </motion.div>
        )}

        {/* ENTER HOME FLOW (LOGIN WITH CODE) */}
        {flow === "enter" && (
          <motion.div
            key="enter-nido"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            className="z-10 bg-white shadow-2xl rounded-[2.5rem] border-4 border-[#F3EFE6] max-w-xl w-full overflow-hidden text-[#2C2723]"
          >
            {/* Header Track */}
            <div className="bg-[#FAF7F2] p-6 border-b border-[#F3EFE6] flex justify-between items-center px-8">
              <button 
                onClick={() => {
                  if (step > 1) {
                    setStep(1);
                  } else {
                    setFlow("choose");
                  }
                }}
                className="text-gray-400 hover:text-gray-900 font-bold text-xs flex items-center gap-1 bg-white px-3 py-1.5 rounded-full border border-gray-200 transition-colors"
              >
                <ArrowLeft size={13} /> Atrás
              </button>
              <div className="text-xs font-extrabold tracking-wider text-[#8A817C] uppercase">
                {step === 1 ? "Paso 1: Código" : "Paso 2: Conexión"}
              </div>
              <button 
                onClick={() => setFlow("choose")}
                className="text-xs text-rose-500 font-bold hover:underline"
              >
                Cancelar
              </button>
            </div>

            <div className="p-8 md:p-10 space-y-6">
              {/* STEP 1: ENTER CODE */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      Reconexión Estelar 🪐
                    </div>
                    <h2 className="text-2xl font-black">Volver a mi nido</h2>
                    <p className="text-xs text-[#8A817C]">
                      Ingresa el código único de tu nido para reactivar la sintonía.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 block">Código del Hogar (ej. NIDO-G3F8K)</label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          value={loginCode}
                          onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                          placeholder="NIDO-XXXXX"
                          className="w-full pl-11 pr-4 py-3.5 bg-[#FCFAF7] border-2 border-[#E7E2D5] focus:border-emerald-500 focus:bg-white rounded-2xl outline-none text-sm font-extrabold tracking-wider uppercase transition-all"
                        />
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold leading-relaxed">
                        ⚠️ {errorMsg}
                      </div>
                    )}

                    <button
                      disabled={isProcessing}
                      onClick={handleEnterHome}
                      className="w-full flex items-center justify-center gap-2 bg-[#2C2723] text-white p-4 rounded-2xl font-extrabold text-sm tracking-wide shadow-lg cursor-pointer hover:bg-black transition-all disabled:opacity-50"
                    >
                      {isProcessing ? "Buscando nido en el cosmos..." : "Sintonizar Nido 🔑"}
                    </button>
                  </div>

                  <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 text-xs text-amber-900 leading-relaxed">
                    🌟 <strong>¿No recuerdas tu código?</strong> Pregúntaselo a tu compañero que ya esté dentro del hogar. Se encuentra en la barra de Ajustes en la parte superior.
                  </div>
                </div>
              )}

              {/* STEP 2: PROFILE SELECTOR */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <div className="inline-block px-3 py-1 bg-green-50 text-green-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      Ubicación de Consciencia 🌌
                    </div>
                    <h2 className="text-2xl font-black text-gray-900">¿Quién eres tú miau?</h2>
                    <p className="text-xs text-[#8A817C]">
                      Selecciona tu perfil en <span className="font-extrabold text-amber-600 uppercase">{loginHome?.name}</span> para sincronizar tus astros:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {loginUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleProfileLoginSelect(user)}
                        className="group p-5 bg-[#FCFAF7] rounded-3xl border-2 border-[#E7E2D5] hover:border-emerald-500 hover:bg-white hover:shadow-lg transition-all text-center flex flex-col items-center justify-center space-y-3 cursor-pointer"
                      >
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                          <Avatar emoji={user.emoji} className="w-10 h-10" />
                        </div>
                        <div>
                          <p className="font-extrabold text-sm text-gray-800 uppercase tracking-tight">{user.name}</p>
                          <span className="inline-block mt-1 text-[10px] px-2.5 py-0.5 bg-amber-50 text-amber-800 rounded-full font-bold">
                            ☀️ {user.zodiacSign}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-400">
                      ¿Tu perfil no aparece? Pídele a tu compañero que te envíe una invitación cósmica para unirte.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
