import React, { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, Dices, Heart, Sparkles } from "lucide-react";
import { createHomeOnboarding, joinHomeOnboarding, enterHomeByCode } from "../api";
import { Home, UserProfile } from "../types";
import { Avatar } from "./Avatar";

interface OnboardingWizardProps {
  onCompleted: (home: Home, user: UserProfile) => void;
}

type Flow = "choose" | "create" | "join" | "enter";

const CAT_AVATARS = [
  { id: "cat_cosmic", cat: "🐱", name: "Cosmic", trait: "Estelar", colors: "Violeta · estrellas" },
  { id: "cat_ginger", cat: "🐈", name: "Sabio", trait: "Dorado", colors: "Naranja · corona" },
  { id: "cat_cosmic", cat: "😺", name: "Mimado", trait: "Dulce", colors: "Melocotón · brillo" },
  { id: "cat_ginger", cat: "😻", name: "Amor", trait: "Romántico", colors: "Rosa · corazón" },
  { id: "cat_cosmic", cat: "😼", name: "Nocturno", trait: "Misterioso", colors: "Índigo · luna" },
  { id: "cat_ginger", cat: "😸", name: "Juguetón", trait: "Travieso", colors: "Ámbar · destellos" },
  { id: "cat_cosmic", cat: "🐈‍⬛", name: "Sombra", trait: "Elegante", colors: "Negro · constelación" },
  { id: "cat_ginger", cat: "🐾", name: "Mini Milo", trait: "Miau", colors: "Dorado · huellitas" },
];

const FUR_OPTIONS = ["Canela", "Crema", "Negro", "Gris", "Naranja", "Blanco"];
const ACCESSORY_OPTIONS = ["✨ Estrellas", "🌙 Luna", "💗 Corazón", "👑 Corona", "🎧 Audífonos", "🎀 Moño"];
const MOOD_OPTIONS = ["😺 Curioso", "😻 Amoroso", "😼 Seguro", "😹 Juguetón", "😴 Chill"];

export default function OnboardingWizard({ onCompleted }: OnboardingWizardProps) {
  const [flow, setFlow] = useState<Flow>("choose");
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [userName, setUserName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("12:00");
  const [birthPlace, setBirthPlace] = useState("Bogotá");
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [fur, setFur] = useState(FUR_OPTIONS[0]);
  const [accessory, setAccessory] = useState(ACCESSORY_OPTIONS[0]);
  const [mood, setMood] = useState(MOOD_OPTIONS[0]);
  const [createdHome, setCreatedHome] = useState<Home | null>(null);
  const [createdUser, setCreatedUser] = useState<UserProfile | null>(null);
  const [copied, setCopied] = useState(false);

  const [inviteCode, setInviteCode] = useState("");
  const [joinUserName, setJoinUserName] = useState("");
  const [joinBirthDate, setJoinBirthDate] = useState("");
  const [joinBirthTime, setJoinBirthTime] = useState("12:00");
  const [joinBirthPlace, setJoinBirthPlace] = useState("Bogotá");
  const [loginCode, setLoginCode] = useState("");
  const [loginHome, setLoginHome] = useState<Home | null>(null);
  const [loginUsers, setLoginUsers] = useState<UserProfile[]>([]);

  const avatar = CAT_AVATARS[selectedAvatar];
  const avatarSpark = useMemo(() => `${fur} · ${accessory} · ${mood}`, [fur, accessory, mood]);

  const resetError = () => setErrorMsg("");
  const goChoose = () => {
    setFlow("choose");
    setStep(1);
    resetError();
  };

  const remixAvatar = () => {
    setSelectedAvatar(Math.floor(Math.random() * CAT_AVATARS.length));
    setFur(FUR_OPTIONS[Math.floor(Math.random() * FUR_OPTIONS.length)]);
    setAccessory(ACCESSORY_OPTIONS[Math.floor(Math.random() * ACCESSORY_OPTIONS.length)]);
    setMood(MOOD_OPTIONS[Math.floor(Math.random() * MOOD_OPTIONS.length)]);
  };

  const createHome = async () => {
    if (!userName.trim() || !birthDate) {
      setErrorMsg("Completa tu nombre y fecha de nacimiento para despertar a Milo. 🐾");
      return;
    }
    setIsProcessing(true);
    resetError();
    try {
      const result = await createHomeOnboarding({
        homeName: "AstroHogar",
        userName: userName.trim(),
        email: "",
        birthDate,
        birthTime,
        birthPlace,
        emoji: avatar.id,
      });
      setCreatedHome(result.home);
      setCreatedUser(result.user);
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err?.message || "No pudimos inaugurar tu hogar.");
    } finally {
      setIsProcessing(false);
    }
  };

  const joinHome = async () => {
    if (!inviteCode.trim() || !joinUserName.trim() || !joinBirthDate) {
      setErrorMsg("Necesitamos el código, tu nombre y tu fecha de nacimiento. ✨");
      return;
    }
    setIsProcessing(true);
    resetError();
    try {
      const result = await joinHomeOnboarding({
        inviteCode: inviteCode.trim(),
        userName: joinUserName.trim(),
        email: "",
        birthDate: joinBirthDate,
        birthTime: joinBirthTime,
        birthPlace: joinBirthPlace,
        emoji: "cat_ginger",
      });
      onCompleted(result.home, result.user);
    } catch (err: any) {
      setErrorMsg(err?.message || "No pudimos unir esta cuenta al hogar.");
    } finally {
      setIsProcessing(false);
    }
  };

  const enterHome = async () => {
    if (!loginCode.trim()) {
      setErrorMsg("Ingresa el código del hogar.");
      return;
    }
    setIsProcessing(true);
    resetError();
    try {
      const result = await enterHomeByCode(loginCode.trim());
      setLoginHome(result.home);
      setLoginUsers(result.users);
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err?.message || "No encontramos ese hogar.");
    } finally {
      setIsProcessing(false);
    }
  };

  const finishCreate = () => {
    if (createdHome && createdUser) onCompleted(createdHome, createdUser);
  };

  const copyCode = async () => {
    if (!createdHome?.code) return;
    await navigator.clipboard.writeText(createdHome.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const back = () => {
    resetError();
    if (step > 1) setStep((value) => value - 1);
    else goChoose();
  };

  if (flow === "choose") {
    return (
      <div className="min-h-screen w-full relative overflow-hidden bg-[#FAF7F2] flex items-center justify-center p-4 text-[#2C2723]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.12),transparent_34%),radial-gradient(circle_at_80%_80%,rgba(236,72,153,0.10),transparent_32%)]" />
        <div className="relative z-10 w-full max-w-md rounded-[2.7rem] border-4 border-[#F3EFE6] bg-white/90 backdrop-blur-xl p-8 shadow-2xl text-center">
          <div className="mx-auto mb-5 h-20 w-20 rounded-[1.7rem] bg-gradient-to-br from-amber-100 to-pink-100 flex items-center justify-center text-4xl shadow-inner">🐱</div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">AstroHogar</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Vamos a despertar tu nido.</h1>
          <p className="mt-3 text-sm leading-6 text-[#776e67]">Primero tu identidad. Después, Milo se conecta con todo lo que hace especial a tu hogar.</p>
          <div className="mt-7 space-y-2.5">
            <button onClick={() => { setFlow("create"); setStep(1); resetError(); }} className="w-full rounded-2xl bg-[#2C2723] text-white px-5 py-4 text-sm font-black shadow-lg hover:bg-black transition">✨ Fundar mi nido</button>
            <button onClick={() => { setFlow("enter"); setStep(1); resetError(); }} className="w-full rounded-2xl bg-[#FCFAF7] border border-[#E6DED2] px-5 py-4 text-sm font-black hover:bg-[#F5EFE7] transition">🔑 Volver a mi nido</button>
            <button onClick={() => { setFlow("join"); setStep(1); resetError(); }} className="w-full rounded-2xl bg-[#FCFAF7] border border-[#E6DED2] px-5 py-4 text-sm font-black hover:bg-[#F5EFE7] transition">🔗 Unirme con código</button>
          </div>
        </div>
      </div>
    );
  }

  if (flow === "enter") {
    return (
      <div className="min-h-screen w-full bg-[#FAF7F2] flex items-center justify-center p-4 text-[#2C2723]">
        <div className="w-full max-w-xl rounded-[2.6rem] border-4 border-[#F3EFE6] bg-white p-8 md:p-10 shadow-2xl">
          <button onClick={back} className="mb-5 inline-flex items-center gap-1 text-xs font-black text-[#8A817C]"><ArrowLeft size={14}/> Atrás</button>
          {step === 1 ? (
            <div className="space-y-6">
              <div><span className="text-4xl">🔑</span><h2 className="mt-2 text-3xl font-black">Volver a mi nido</h2><p className="mt-2 text-sm text-[#786f68]">Ingresa el código que ya tienes.</p></div>
              <input value={loginCode} onChange={(e) => setLoginCode(e.target.value.toUpperCase())} placeholder="NIDO-XXXXX" className="w-full rounded-2xl border-2 border-[#E7E2D5] p-4 font-mono font-black tracking-wider outline-none focus:border-amber-400" />
              {errorMsg && <ErrorBox message={errorMsg}/>} 
              <button onClick={enterHome} disabled={isProcessing} className="w-full rounded-2xl bg-[#2C2723] text-white p-4 font-black disabled:opacity-50">{isProcessing ? "Buscando tu nido..." : "Sintonizar nido ✨"}</button>
            </div>
          ) : (
            <div className="space-y-6">
              <div><span className="text-4xl">🏡</span><h2 className="mt-2 text-3xl font-black">¿Quién eres?</h2><p className="mt-2 text-sm text-[#786f68]">Selecciona tu perfil en <b>{loginHome?.name}</b>.</p></div>
              <div className="grid sm:grid-cols-2 gap-3">{loginUsers.map(user => <button key={user.id} onClick={() => onCompleted(loginHome!, user)} className="rounded-3xl border-2 border-[#E7E2D5] bg-[#FCFAF7] p-5 text-center hover:border-amber-400 transition"><div className="mx-auto mb-2"><Avatar emoji={user.emoji} className="w-14 h-14"/></div><p className="font-black">{user.name}</p><p className="text-[10px] text-amber-700 font-bold">☀️ {user.zodiacSign}</p></button>)}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (flow === "join") {
    return (
      <div className="min-h-screen w-full bg-[#FAF7F2] flex items-center justify-center p-4 text-[#2C2723]">
        <div className="w-full max-w-xl rounded-[2.6rem] border-4 border-[#F3EFE6] bg-white p-8 md:p-10 shadow-2xl">
          <button onClick={back} className="mb-5 inline-flex items-center gap-1 text-xs font-black text-[#8A817C]"><ArrowLeft size={14}/> Atrás</button>
          {step === 1 ? (
            <div className="space-y-6"><div><span className="text-4xl">🔗</span><h2 className="mt-2 text-3xl font-black">Conectar con un hogar</h2><p className="mt-2 text-sm text-[#786f68]">Usa el código de invitación de la otra persona.</p></div><input value={inviteCode} onChange={(e)=>setInviteCode(e.target.value.toUpperCase())} placeholder="NIDO-XXXXX" className="w-full rounded-2xl border-2 border-[#E7E2D5] p-4 font-mono font-black tracking-wider outline-none focus:border-amber-400"/><button onClick={()=>{resetError(); setStep(2)}} disabled={inviteCode.trim().length < 5} className="w-full rounded-2xl bg-[#2C2723] text-white p-4 font-black disabled:opacity-50">Continuar <ArrowRight size={15} className="inline"/></button></div>
          ) : (
            <div className="space-y-5"><div><span className="text-4xl">⭐</span><h2 className="mt-2 text-3xl font-black">Háblame de ti</h2><p className="mt-2 text-sm text-[#786f68]">Milo necesita conocerte para personalizar su acompañamiento.</p></div><input value={joinUserName} onChange={(e)=>setJoinUserName(e.target.value)} placeholder="Tu nombre" className="w-full rounded-2xl border-2 border-[#E7E2D5] p-4 outline-none focus:border-amber-400"/><div className="grid sm:grid-cols-2 gap-3"><input type="date" value={joinBirthDate} onChange={(e)=>setJoinBirthDate(e.target.value)} className="rounded-2xl border-2 border-[#E7E2D5] p-4"/><input type="time" value={joinBirthTime} onChange={(e)=>setJoinBirthTime(e.target.value)} className="rounded-2xl border-2 border-[#E7E2D5] p-4"/></div><input value={joinBirthPlace} onChange={(e)=>setJoinBirthPlace(e.target.value)} placeholder="Ciudad de nacimiento" className="w-full rounded-2xl border-2 border-[#E7E2D5] p-4 outline-none focus:border-amber-400"/>{errorMsg && <ErrorBox message={errorMsg}/>}<button onClick={joinHome} disabled={isProcessing} className="w-full rounded-2xl bg-[#2C2723] text-white p-4 font-black disabled:opacity-50">{isProcessing ? "Uniendo almas..." : "Unirme al hogar 💞"}</button></div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#FAF7F2] flex items-center justify-center p-4 text-[#2C2723]">
      <div className="w-full max-w-3xl rounded-[2.7rem] border-4 border-[#F3EFE6] bg-white shadow-2xl overflow-hidden">
        <div className="px-8 py-5 border-b border-[#F1EBE2] flex items-center justify-between bg-[#FCFAF7]"><button onClick={back} className="inline-flex items-center gap-1 text-xs font-black text-[#8A817C]"><ArrowLeft size={14}/> Atrás</button><span className="text-[10px] uppercase tracking-[0.2em] font-black text-amber-700">{step === 1 ? "Tu identidad" : "Inauguración"}</span><span className="text-[10px] font-black text-[#9A9189]">{step}/2</span></div>
        <div className="p-8 md:p-10">
          {step === 1 ? (
            <div className="space-y-7">
              <div><div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-800"><Sparkles size={13}/> Tu despertar</div><h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">Háblame de ti.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#786f68]">No necesitamos ponerle nombre al hogar todavía. Primero conocemos a la persona que lo va a habitar.</p></div>
              <div className="grid lg:grid-cols-[1fr_280px] gap-6">
                <div className="space-y-4">
                  <div><label className="text-[10px] font-black uppercase tracking-wider text-[#625B57]">Nombre</label><input value={userName} onChange={(e)=>setUserName(e.target.value)} placeholder="¿Cómo quieres que te llamemos?" className="mt-1.5 w-full rounded-2xl border-2 border-[#E7E2D5] p-4 outline-none focus:border-amber-400"/></div>
                  <div><label className="text-[10px] font-black uppercase tracking-wider text-[#625B57]">Fecha de nacimiento</label><input type="date" value={birthDate} onChange={(e)=>setBirthDate(e.target.value)} className="mt-1.5 w-full rounded-2xl border-2 border-[#E7E2D5] p-4"/></div>
                  <div className="grid sm:grid-cols-2 gap-4"><div><label className="text-[10px] font-black uppercase tracking-wider text-[#625B57]">Hora de nacimiento</label><input type="time" value={birthTime} onChange={(e)=>setBirthTime(e.target.value)} className="mt-1.5 w-full rounded-2xl border-2 border-[#E7E2D5] p-4"/></div><div><label className="text-[10px] font-black uppercase tracking-wider text-[#625B57]">Ciudad de nacimiento</label><input value={birthPlace} onChange={(e)=>setBirthPlace(e.target.value)} className="mt-1.5 w-full rounded-2xl border-2 border-[#E7E2D5] p-4"/></div></div>
                </div>
                <div className="rounded-[2rem] bg-[#FCFAF7] border-2 border-[#EEE5D8] p-5 text-center"><p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Tu compañero astral</p><div className="mx-auto mt-3 h-28 w-28 rounded-[2rem] bg-gradient-to-br from-amber-100 to-pink-100 flex items-center justify-center text-5xl shadow-inner">{avatar.cat}</div><p className="mt-3 font-black">{avatar.name} · {avatar.trait}</p><p className="mt-1 text-[10px] text-[#8A817C]">{avatarSpark}</p><button onClick={remixAvatar} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white border border-[#E7E2D5] px-3 py-2 text-[10px] font-black"><Dices size={13}/> Milo me sorprende</button></div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3"><select value={fur} onChange={(e)=>setFur(e.target.value)} className="rounded-2xl border-2 border-[#E7E2D5] p-3 text-sm font-bold bg-white"><option>{FUR_OPTIONS[0]}</option>{FUR_OPTIONS.slice(1).map(o=><option key={o}>{o}</option>)}</select><select value={accessory} onChange={(e)=>setAccessory(e.target.value)} className="rounded-2xl border-2 border-[#E7E2D5] p-3 text-sm font-bold bg-white">{ACCESSORY_OPTIONS.map(o=><option key={o}>{o}</option>)}</select><select value={mood} onChange={(e)=>setMood(e.target.value)} className="rounded-2xl border-2 border-[#E7E2D5] p-3 text-sm font-bold bg-white">{MOOD_OPTIONS.map(o=><option key={o}>{o}</option>)}</select></div>
              {errorMsg && <ErrorBox message={errorMsg}/>}<button onClick={createHome} disabled={isProcessing} className="w-full rounded-2xl bg-[#2C2723] text-white p-4 font-black shadow-lg disabled:opacity-50">{isProcessing ? "Milo está leyendo tus datos... 🐾" : "Conocer mi mapa y despertar a Milo →"}</button>
            </div>
          ) : (
            <div className="space-y-7 text-center"><div className="mx-auto h-20 w-20 rounded-[1.7rem] bg-emerald-50 border border-emerald-100 flex items-center justify-center text-4xl">🏡</div><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">Tu hogar ha despertado</p><h2 className="mt-2 text-3xl sm:text-4xl font-black">Bienvenido{createdUser?.name ? `, ${createdUser.name}` : ""}.</h2><p className="mt-3 mx-auto max-w-xl text-sm leading-6 text-[#786f68]">Milo ya tiene una primera lectura de tu identidad. Desde aquí podrá ir conectando tus finanzas, agenda, salud, ejercicio, plantas, mascotas, recuerdos y hábitos para darte recomendaciones realmente tuyas.</p></div><div className="mx-auto max-w-lg rounded-3xl bg-[#FCFAF7] border-2 border-[#EEE5D8] p-5"><p className="text-[10px] font-black uppercase tracking-wider text-[#8A817C]">Código de tu nido</p><div className="mt-3 flex items-center gap-2 rounded-2xl bg-white border border-[#E7E2D5] p-3"><code className="flex-1 font-mono font-black tracking-wider text-amber-700">{createdHome?.code}</code><button onClick={copyCode} className="rounded-xl bg-[#FAF7F2] px-3 py-2 text-xs font-black inline-flex items-center gap-1"><Copy size={13}/>{copied ? "Copiado" : "Copiar"}</button></div></div><div className="grid sm:grid-cols-3 gap-3"><MiniCard icon="🐱" title="Milo" text="IA central del hogar"/><MiniCard icon="🧠" title="Contexto" text="Conoce tus datos"/><MiniCard icon="🔔" title="Avisos" text="Listos para activarse"/></div><button onClick={finishCreate} className="w-full rounded-2xl bg-[#2C2723] text-white p-4 font-black shadow-lg">Entrar a AstroHogar 🌌</button></div>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) { return <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-left text-xs text-rose-700 font-semibold">⚠️ {message}</div>; }
function MiniCard({ icon, title, text }: { icon: string; title: string; text: string }) { return <div className="rounded-2xl bg-[#FCFAF7] border border-[#EEE5D8] p-4"><div className="text-xl">{icon}</div><p className="mt-2 text-xs font-black">{title}</p><p className="mt-1 text-[10px] text-[#8A817C]">{text}</p></div>; }
