import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Copy, Sparkles, Wand2 } from "lucide-react";
import { createHomeOnboarding, joinHomeOnboarding, enterHomeByCode } from "../api";
import { Home, UserProfile } from "../types";
import { Avatar } from "./Avatar";

type Flow = "choose" | "create" | "join" | "enter";
interface OnboardingWizardProps { onCompleted: (home: Home, user: UserProfile) => void; }

// Keep the existing visual avatars already designed in the app until AI artwork is available.
const AVATARS = [
  { id: "gamer_girl", name: "Luna", trait: "Creativa" },
  { id: "gamer_boy", name: "Nox", trait: "Curioso" },
  { id: "cyber_hacker", name: "Pixel", trait: "Intenso" },
  { id: "cosmic_wizard", name: "Cosmo", trait: "Soñador" },
  { id: "space_pilot", name: "Orbit", trait: "Aventurero" },
  { id: "retro_pixel", name: "Milo", trait: "Juguetón" },
  { id: "cat_cosmic", name: "Astro", trait: "Sereno" },
  { id: "cat_ginger", name: "Sol", trait: "Cálido" },
];

export default function OnboardingWizard({ onCompleted }: OnboardingWizardProps) {
  const [flow, setFlow] = useState<Flow>("choose");
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [userName, setUserName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [occupation, setOccupation] = useState("");
  const [about, setAbout] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [createdHome, setCreatedHome] = useState<Home | null>(null);
  const [createdUser, setCreatedUser] = useState<UserProfile | null>(null);
  const [copied, setCopied] = useState(false);

  const [inviteCode, setInviteCode] = useState("");
  const [joinUserName, setJoinUserName] = useState("");
  const [joinBirthDate, setJoinBirthDate] = useState("");
  const [joinOccupation, setJoinOccupation] = useState("");
  const [joinAbout, setJoinAbout] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [loginHome, setLoginHome] = useState<Home | null>(null);
  const [loginUsers, setLoginUsers] = useState<UserProfile[]>([]);

  const avatar = AVATARS[selectedAvatar];
  const resetError = () => setErrorMsg("");
  const goChoose = () => { setFlow("choose"); setStep(1); resetError(); };
  const remixAvatar = () => setSelectedAvatar(Math.floor(Math.random() * AVATARS.length));

  const clearCreateState = () => {
    setUserName(""); setBirthDate(""); setOccupation(""); setAbout("");
    setSelectedAvatar(0); setCreatedHome(null); setCreatedUser(null); resetError();
    // New nest starts clean. Do not delete authentication identity.
    try { ["astro_home_code", "astro_user_id"].forEach(k => localStorage.removeItem(k)); } catch {}
  };

  const createHome = async () => {
    if (!userName.trim() || !birthDate) { setErrorMsg("Completa tu nombre y fecha de nacimiento para que Milo pueda conocerte. 🐾"); return; }
    setIsProcessing(true); resetError();
    try {
      const authEmail = localStorage.getItem("astro_auth_email") || "";
      const res = await fetch("/api/onboarding/create-home", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeName: "AstroHogar", userName: userName.trim(), email: authEmail,
          birthDate, birthTime: "", birthPlace: "",
          occupation: occupation.trim(), about: about.trim(), emoji: avatar.id,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || "No pudimos inaugurar tu hogar.");
      setCreatedHome(result.home); setCreatedUser(result.user); setStep(2);
    } catch (err: any) { setErrorMsg(err?.message || "No pudimos inaugurar tu hogar."); }
    finally { setIsProcessing(false); }
  };

  const joinHome = async () => {
    if (!inviteCode.trim() || !joinUserName.trim() || !joinBirthDate) { setErrorMsg("Necesitamos el código, tu nombre y tu fecha de nacimiento. ✨"); return; }
    setIsProcessing(true); resetError();
    try {
      const result = await joinHomeOnboarding({ inviteCode: inviteCode.trim(), userName: joinUserName.trim(), email: localStorage.getItem("astro_auth_email") || "", birthDate: joinBirthDate, birthTime: "", birthPlace: "", emoji: "cat_ginger" });
      onCompleted(result.home, result.user);
    } catch (err: any) { setErrorMsg(err?.message || "No pudimos unir esta cuenta al hogar."); }
    finally { setIsProcessing(false); }
  };

  const enterHome = async () => {
    if (!loginCode.trim()) { setErrorMsg("Ingresa el código del hogar."); return; }
    setIsProcessing(true); resetError();
    try { const result = await enterHomeByCode(loginCode.trim()); setLoginHome(result.home); setLoginUsers(result.users); setStep(2); }
    catch (err: any) { setErrorMsg(err?.message || "No encontramos ese hogar."); }
    finally { setIsProcessing(false); }
  };

  const finishCreate = () => { if (createdHome && createdUser) onCompleted(createdHome, createdUser); };
  const copyCode = async () => { if (!createdHome?.code) return; await navigator.clipboard.writeText(createdHome.code); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  const back = () => { resetError(); if (step > 1) setStep(v => v - 1); else goChoose(); };

  if (flow === "choose") return (
    <div className="min-h-screen w-full relative overflow-hidden bg-[#FAF7F2] flex items-center justify-center p-4 text-[#2C2723]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.12),transparent_34%),radial-gradient(circle_at_80%_80%,rgba(236,72,153,0.10),transparent_32%)]" />
      <div className="relative z-10 w-full max-w-md rounded-[2.7rem] border-4 border-[#F3EFE6] bg-white/90 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="mx-auto mb-5 h-20 w-20 rounded-[1.7rem] bg-gradient-to-br from-amber-100 to-pink-100 flex items-center justify-center text-4xl shadow-inner">🐱</div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">AstroHogar</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Vamos a despertar tu nido.</h1>
        <p className="mt-3 text-sm leading-6 text-[#776e67]">Tu identidad entra primero. Milo aprende de ti y después empieza a entender tu hogar.</p>
        <div className="mt-7 space-y-2.5">
          <button onClick={() => { clearCreateState(); setFlow("create"); setStep(1); }} className="w-full rounded-2xl bg-[#2C2723] text-white px-5 py-4 text-sm font-black shadow-lg">✨ Fundar mi nido</button>
          <button onClick={() => { setFlow("enter"); setStep(1); resetError(); }} className="w-full rounded-2xl bg-[#FCFAF7] border border-[#E6DED2] px-5 py-4 text-sm font-black">🔑 Volver a mi nido</button>
          <button onClick={() => { setFlow("join"); setStep(1); resetError(); }} className="w-full rounded-2xl bg-[#FCFAF7] border border-[#E6DED2] px-5 py-4 text-sm font-black">🔗 Unirme con código</button>
        </div>
      </div>
    </div>
  );

  if (flow === "enter") return <Shell back={back}>{step === 1 ? <div className="space-y-6"><Header icon="🔑" title="Volver a mi nido" text="Ingresa el código que ya tienes."/><input value={loginCode} onChange={e=>setLoginCode(e.target.value.toUpperCase())} placeholder="NIDO-XXXXX" className={input}/>{errorMsg&&<ErrorBox message={errorMsg}/>}<button onClick={enterHome} disabled={isProcessing} className={primary}>{isProcessing?"Buscando tu nido...":"Sintonizar nido ✨"}</button></div> : <div className="space-y-6"><Header icon="🏡" title="¿Quién eres?" text={`Selecciona tu perfil en ${loginHome?.name || "tu nido"}.`}/><div className="grid sm:grid-cols-2 gap-3">{loginUsers.map(user=><button key={user.id} onClick={()=>onCompleted(loginHome!,user)} className="rounded-3xl border-2 border-[#E7E2D5] bg-[#FCFAF7] p-5 hover:border-amber-400"><div className="mx-auto mb-2"><Avatar emoji={user.emoji} className="w-16 h-16"/></div><p className="font-black">{user.name}</p><p className="text-[10px] text-amber-700 font-bold">☀️ {user.zodiacSign}</p></button>)}</div></div>}</Shell>;

  if (flow === "join") return <Shell back={back}>{step===1 ? <div className="space-y-6"><Header icon="🔗" title="Conectar con un hogar" text="Usa el código de invitación de la otra persona."/><input value={inviteCode} onChange={e=>setInviteCode(e.target.value.toUpperCase())} placeholder="NIDO-XXXXX" className={input}/><button onClick={()=>{resetError();setStep(2)}} disabled={inviteCode.trim().length<5} className={primary}>Continuar <ArrowRight size={15} className="inline"/></button></div> : <div className="space-y-5"><Header icon="⭐" title="Háblame de ti" text="Milo aprende de ti para personalizar cómo acompaña el hogar."/><input value={joinUserName} onChange={e=>setJoinUserName(e.target.value)} placeholder="Tu nombre" className={input}/><input type="date" value={joinBirthDate} onChange={e=>setJoinBirthDate(e.target.value)} className={input}/><input value={joinOccupation} onChange={e=>setJoinOccupation(e.target.value)} placeholder="¿A qué te dedicas actualmente?" className={input}/><textarea value={joinAbout} onChange={e=>setJoinAbout(e.target.value)} placeholder="Cuéntale a Milo un poco sobre ti: gustos, rutinas, proyectos, cosas importantes..." rows={4} className={input}/>{errorMsg&&<ErrorBox message={errorMsg}/>}<button onClick={joinHome} disabled={isProcessing} className={primary}>{isProcessing?"Uniendo almas...":"Unirme al hogar 💞"}</button></div>}</Shell>;

  return <Shell back={back} wide>{step===1 ? <div className="space-y-8">
    <Header icon="✨" title="Háblame de ti." text="No necesitamos nombre del hogar, hora ni ciudad. Queremos conocerte a ti."/>
    <div className="grid lg:grid-cols-[1fr_300px] gap-7">
      <div className="space-y-5">
        <Field label="Nombre"><input value={userName} onChange={e=>setUserName(e.target.value)} placeholder="¿Cómo quieres que te llamemos?" className={input}/></Field>
        <Field label="Fecha de nacimiento"><input type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)} className={input}/></Field>
        <Field label="¿A qué te dedicas actualmente?"><input value={occupation} onChange={e=>setOccupation(e.target.value)} placeholder="Trabajo, estudio, proyecto personal, emprendimiento..." className={input}/></Field>
        <Field label="Cuéntame sobre ti"><textarea value={about} onChange={e=>setAbout(e.target.value)} rows={6} placeholder="Lo que quieras que Milo vaya aprendiendo de ti: gustos, rutinas, metas, cosas que te importan, cómo es tu día a día..." className={input}/></Field>
      </div>
      <div className="rounded-[2rem] bg-[#FCFAF7] border-2 border-[#EEE5D8] p-6 text-center h-fit">
        <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Tu avatar</p>
        <div className="mx-auto mt-4 flex h-36 w-36 items-center justify-center rounded-[2rem] bg-white shadow-inner"><Avatar emoji={avatar.id} className="w-32 h-32"/></div>
        <p className="mt-4 font-black">{avatar.name}</p><p className="mt-1 text-xs text-[#8A817C]">{avatar.trait}</p>
        <button onClick={remixAvatar} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white border border-[#E7E2D5] px-4 py-2.5 text-xs font-black"><Wand2 size={14}/> Cambiar avatar</button>
        <p className="mt-4 text-[10px] leading-5 text-[#8A817C]">Son los avatares visuales que ya existían en AstroHogar. Después podremos evolucionarlos a personajes generados con IA.</p>
      </div>
    </div>
    {errorMsg&&<ErrorBox message={errorMsg}/>}<button onClick={createHome} disabled={isProcessing} className={primary}>{isProcessing?"Milo está conociéndote... 🐾":"Conocerme y despertar a Milo →"}</button>
  </div> : <div className="space-y-7 text-center"><div className="mx-auto h-20 w-20 rounded-[1.7rem] bg-emerald-50 border border-emerald-100 flex items-center justify-center text-4xl">🏡</div><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">Inauguración</p><h2 className="mt-2 text-3xl sm:text-4xl font-black">Bienvenido{createdUser?.name?`, ${createdUser.name}`:""}.</h2><p className="mt-3 mx-auto max-w-xl text-sm leading-6 text-[#786f68]">Milo ya tiene una primera capa de contexto personal. A partir de ahora irá conectando lo que registres en el hogar para darte recomendaciones basadas en tus propios datos.</p></div><div className="mx-auto max-w-lg rounded-3xl bg-[#FCFAF7] border-2 border-[#EEE5D8] p-5"><p className="text-[10px] font-black uppercase tracking-wider text-[#8A817C]">Código de tu nido</p><div className="mt-3 flex items-center gap-2 rounded-2xl bg-white border border-[#E7E2D5] p-3"><code className="flex-1 font-mono font-black tracking-wider text-amber-700">{createdHome?.code}</code><button onClick={copyCode} className="rounded-xl bg-[#FAF7F2] px-3 py-2 text-xs font-black inline-flex items-center gap-1"><Copy size={13}/>{copied?"Copiado":"Copiar"}</button></div></div><div className="grid sm:grid-cols-3 gap-3"><MiniCard icon="🐱" title="Milo" text="IA central"/><MiniCard icon="🧠" title="Contexto" text="Aprende de ti"/><MiniCard icon="🔔" title="Avisos" text="Listos para activar"/></div><button onClick={finishCreate} className={primary}>Entrar a AstroHogar 🌌</button></div>}</Shell>;
}

const input = "w-full rounded-2xl border-2 border-[#E7E2D5] p-4 outline-none focus:border-amber-400 bg-white";
const primary = "w-full rounded-2xl bg-[#2C2723] text-white p-4 font-black shadow-lg disabled:opacity-50";
function Shell({children,back,wide=false}:{children:React.ReactNode;back:()=>void;wide?:boolean}){return <div className="min-h-screen w-full bg-[#FAF7F2] flex items-center justify-center p-4 text-[#2C2723]"><div className={`w-full ${wide?"max-w-4xl":"max-w-xl"} rounded-[2.7rem] border-4 border-[#F3EFE6] bg-white shadow-2xl overflow-hidden`}><div className="px-8 py-5 border-b border-[#F1EBE2] flex items-center justify-between bg-[#FCFAF7]"><button onClick={back} className="inline-flex items-center gap-1 text-xs font-black text-[#8A817C]"><ArrowLeft size={14}/> Atrás</button><span className="text-[10px] uppercase tracking-[0.2em] font-black text-amber-700">AstroHogar</span></div><div className="p-8 md:p-10">{children}</div></div></div>}
function Header({icon,title,text}:{icon:string;title:string;text:string}){return <div><span className="text-4xl">{icon}</span><h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">{title}</h2><p className="mt-2 text-sm leading-6 text-[#786f68]">{text}</p></div>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <div><label className="text-[10px] font-black uppercase tracking-wider text-[#625B57]">{label}</label><div className="mt-1.5">{children}</div></div>}
function ErrorBox({message}:{message:string}){return <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-left text-xs text-rose-700 font-semibold">⚠️ {message}</div>}
function MiniCard({icon,title,text}:{icon:string;title:string;text:string}){return <div className="rounded-2xl bg-[#FCFAF7] border border-[#EEE5D8] p-4"><div className="text-xl">{icon}</div><p className="mt-2 text-xs font-black">{title}</p><p className="mt-1 text-[10px] text-[#8A817C]">{text}</p></div>}
