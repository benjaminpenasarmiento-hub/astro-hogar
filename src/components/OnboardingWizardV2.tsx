import React, { useMemo, useState } from "react";
import { ArrowRight, Check, Copy, Link2, Sparkles, Wand2 } from "lucide-react";
import { createHomeOnboarding, joinHomeOnboarding } from "../api";
import { Home, UserProfile } from "../types";
import { Avatar } from "./Avatar";

interface OnboardingWizardV2Props {
  onCompleted: (home: Home, user: UserProfile) => void;
}

type Mode = "profile" | "invitation" | "welcome";

// Keep the existing visual avatars that already belong to AstroHogar.
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

const inputClass =
  "w-full rounded-2xl border border-[#E6DED2] bg-white px-4 py-3.5 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100";
const primaryClass =
  "w-full rounded-2xl bg-[#2C2723] px-5 py-4 text-sm font-black text-white shadow-lg transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-50";

export default function OnboardingWizardV2({ onCompleted }: OnboardingWizardV2Props) {
  const [mode, setMode] = useState<Mode>("profile");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [occupation, setOccupation] = useState("");
  const [about, setAbout] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [createdHome, setCreatedHome] = useState<Home | null>(null);
  const [createdUser, setCreatedUser] = useState<UserProfile | null>(null);
  const [copied, setCopied] = useState(false);

  const avatar = AVATARS[avatarIndex];
  const authEmail = useMemo(() => {
    try {
      return window.localStorage.getItem("astro_auth_email") || "";
    } catch {
      return "";
    }
  }, []);

  const clearError = () => setError("");
  const remixAvatar = () => setAvatarIndex(Math.floor(Math.random() * AVATARS.length));

  const submitProfile = async () => {
    clearError();
    if (!name.trim() || !birthDate) {
      setError("Necesitamos tu nombre y fecha de nacimiento para que Milo pueda conocerte. 🐾");
      return;
    }

    setIsProcessing(true);
    try {
      if (inviteCode.trim()) {
        const result = await joinHomeOnboarding({
          inviteCode: inviteCode.trim().toUpperCase(),
          userName: name.trim(),
          email: authEmail,
          birthDate,
          birthTime: "",
          birthPlace: "",
          emoji: avatar.id,
          occupation: occupation.trim(),
          about: about.trim(),
        } as any);
        onCompleted(result.home, result.user);
        return;
      }

      const result = await createHomeOnboarding({
        homeName: "AstroHogar",
        userName: name.trim(),
        email: authEmail,
        birthDate,
        birthTime: "",
        birthPlace: "",
        occupation: occupation.trim(),
        about: about.trim(),
        emoji: avatar.id,
      } as any);

      setCreatedHome(result.home);
      setCreatedUser(result.user);
      setMode("welcome");
    } catch (err: any) {
      setError(err?.message || "No pudimos completar tu entrada a AstroHogar.");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyCode = async () => {
    if (!createdHome?.code) return;
    try {
      await navigator.clipboard.writeText(createdHome.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const finish = () => {
    if (createdHome && createdUser) onCompleted(createdHome, createdUser);
  };

  if (mode === "welcome") {
    return (
      <div className="min-h-screen w-full overflow-hidden bg-[#FAF7F2] px-4 py-8 text-[#2C2723] sm:flex sm:items-center sm:justify-center">
        <div className="w-full max-w-xl rounded-[2rem] border border-[#EEE5D8] bg-white/95 p-6 shadow-2xl sm:p-9">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-emerald-50 text-4xl">🏡</div>
          <p className="mt-6 text-center text-[10px] font-black uppercase tracking-[0.25em] text-emerald-700">AstroHogar despierta</p>
          <h1 className="mt-2 text-center text-3xl font-black tracking-tight sm:text-4xl">Bienvenido{createdUser?.name ? `, ${createdUser.name}` : ""}.</h1>
          <p className="mx-auto mt-4 max-w-lg text-center text-sm leading-6 text-[#786F68]">
            Milo ya tiene tu primera capa de contexto. Desde ahora irá construyendo memoria a partir de lo que tú y tu hogar registren.
          </p>

          <div className="mt-7 rounded-3xl border border-[#E7E2D5] bg-[#FCFAF7] p-5">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#8A817C]">Código de tu hogar</p>
            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white p-2.5">
              <code className="min-w-0 flex-1 truncate px-2 font-mono text-sm font-black tracking-wider text-amber-700">{createdHome?.code}</code>
              <button onClick={copyCode} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#E7E2D5] px-3 py-2 text-xs font-black">
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#8A817C]">Comparte este código con la persona con la que quieras conectar tu hogar.</p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <InfoCard icon="🐱" title="Milo" text="IA central" />
            <InfoCard icon="🧠" title="Memoria" text="Aprende de tus datos" />
            <InfoCard icon="🔔" title="Avisos" text="Te acompaña" />
          </div>

          <button onClick={finish} className={`${primaryClass} mt-6`}>Entrar a mi hogar <ArrowRight className="ml-2 inline" size={16} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-hidden bg-[#FAF7F2] px-4 py-6 text-[#2C2723] sm:flex sm:items-center sm:justify-center">
      <div className="w-full max-w-4xl rounded-[2rem] border border-[#EEE5D8] bg-white/95 p-5 shadow-2xl sm:p-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl">✨</div>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.25em] text-amber-700">Tu cuenta ya está conectada</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Háblame de ti.</h1>
          <p className="mt-3 text-sm leading-6 text-[#786F68]">Milo usará lo que compartas para entenderte mejor y personalizar AstroHogar para ti.</p>
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <label className="block"><span className="mb-2 block text-xs font-black">Nombre</span><input autoComplete="off" value={name} onChange={e => setName(e.target.value)} placeholder="¿Cómo quieres que te llamemos?" className={inputClass} /></label>
            <label className="block"><span className="mb-2 block text-xs font-black">Fecha de nacimiento</span><input autoComplete="off" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inputClass} /></label>
            <label className="block"><span className="mb-2 block text-xs font-black">¿A qué te dedicas actualmente?</span><input autoComplete="off" value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="Trabajo, estudio, emprendimiento, proyecto personal..." className={inputClass} /></label>
            <label className="block"><span className="mb-2 block text-xs font-black">Cuéntame sobre ti</span><textarea autoComplete="off" rows={6} value={about} onChange={e => setAbout(e.target.value)} placeholder="Gustos, rutinas, metas, proyectos, cosas importantes, cómo es tu día a día..." className={inputClass} /></label>

            <div className="rounded-2xl border border-dashed border-[#DCCFBF] bg-[#FCFAF7] p-4">
              <div className="flex items-center gap-2 text-xs font-black"><Link2 size={15} /> ¿Te invitaron a un hogar?</div>
              <p className="mt-1 text-xs leading-5 text-[#8A817C]">Escribe el código que te compartieron y tu cuenta quedará anclada al mismo hogar. Déjalo vacío para iniciar un hogar nuevo automáticamente.</p>
              <input autoComplete="off" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} placeholder="NIDO-XXXXX (opcional)" className={`${inputClass} mt-3`} />
            </div>
          </div>

          <div className="h-fit rounded-[2rem] border border-[#EEE5D8] bg-[#FCFAF7] p-5 text-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Tu avatar</p>
            <div className="mx-auto mt-4 flex h-36 w-36 items-center justify-center rounded-[2rem] bg-white shadow-inner">
              <Avatar emoji={avatar.id} className="h-32 w-32" />
            </div>
            <p className="mt-4 font-black">{avatar.name}</p>
            <p className="mt-1 text-xs text-[#8A817C]">{avatar.trait}</p>
            <button onClick={remixAvatar} type="button" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#E7E2D5] bg-white px-4 py-2.5 text-xs font-black"><Wand2 size={14} /> Cambiar avatar</button>
            <p className="mt-4 text-[10px] leading-5 text-[#8A817C]">Mantenemos los avatares visuales originales de AstroHogar por ahora.</p>
          </div>
        </div>

        {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">⚠️ {error}</div>}

        <button onClick={submitProfile} disabled={isProcessing} className={`${primaryClass} mt-6`}>
          {isProcessing ? "Milo está preparando tu hogar... 🐾" : inviteCode.trim() ? "Unirme a este hogar →" : "Continuar con Milo →"}
        </button>
      </div>
    </div>
  );
}

function InfoCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <div className="rounded-2xl border border-[#EEE5D8] bg-[#FCFAF7] p-4"><div className="text-xl">{icon}</div><p className="mt-2 text-xs font-black">{title}</p><p className="mt-1 text-[10px] leading-4 text-[#8A817C]">{text}</p></div>;
}
