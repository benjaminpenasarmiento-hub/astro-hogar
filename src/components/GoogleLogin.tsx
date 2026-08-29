import React, { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "../auth";
import astroHogarBg from "../assets/images/astro_hogar_bg_1783417893352.jpg";

export default function GoogleLogin() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setBusy(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (err: any) {
      const code = String(err?.code || "");
      if (code === "auth/popup-closed-by-user") return;
      if (code === "auth/popup-blocked") {
        setError("El navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.");
      } else {
        setError("No pudimos iniciar sesión con Google. Inténtalo nuevamente.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#FAF7F2] text-[#2C2723] flex items-center justify-center p-5">
      <div
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{ backgroundImage: `url(${astroHogarBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1d1720]/65 via-[#241b21]/45 to-[#f8f2e9]/90" />

      <section className="relative z-10 w-full max-w-5xl grid lg:grid-cols-[1.15fr_.85fr] gap-6 items-stretch">
        <div className="hidden lg:flex min-h-[620px] rounded-[2.7rem] border border-white/25 bg-white/10 backdrop-blur-md p-10 text-white shadow-2xl flex-col justify-end overflow-hidden">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider mb-5">
              <Sparkles size={13} /> Un hogar vivo, no una app fría
            </div>
            <h2 className="text-5xl font-black tracking-tight leading-[0.95]">Bienvenido a tu<br />AstroHogar.</h2>
            <p className="mt-5 text-sm leading-7 text-white/80 max-w-md">
              Tus personas, tus rutinas, tus plantas, tus finanzas, tus recuerdos y todo lo que hace hogar, conectados en un solo lugar.
            </p>
            <p className="mt-6 text-xs font-bold text-white/65">🐾 Y desde el primer momento, Milo empieza a conocerte.</p>
          </div>
        </div>

        <div className="rounded-[2.7rem] border-4 border-white/70 bg-[#FFFDF9]/95 backdrop-blur-xl p-7 sm:p-9 shadow-2xl flex flex-col justify-center">
          <div className="w-16 h-16 rounded-[1.4rem] bg-amber-50 border border-amber-100 flex items-center justify-center text-3xl shadow-sm mb-5">🏡</div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">Primer despertar</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">Entra con Google</h1>
          <p className="mt-4 text-sm leading-6 text-[#746b64]">
            Tu cuenta de Google es la identidad que usaremos para proteger tu hogar y conectar tus datos personales con Milo.
          </p>

          <button
            type="button"
            onClick={handleLogin}
            disabled={busy}
            className="mt-8 w-full rounded-2xl bg-[#2C2723] text-white px-5 py-4 font-black text-sm shadow-lg hover:bg-black transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy ? "Abriendo tu portal... ✨" : "Continuar con Google"}
            {!busy && <ArrowRight size={17} />}
          </button>

          {error && (
            <p className="mt-4 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 font-semibold">
              ⚠️ {error}
            </p>
          )}

          <div className="mt-7 grid grid-cols-3 gap-2.5 text-center">
            <div className="rounded-2xl bg-[#FAF7F2] border border-[#EEE5D8] p-3"><span className="text-lg">💰</span><p className="mt-1 text-[9px] font-black uppercase text-[#796f66]">Hogar</p></div>
            <div className="rounded-2xl bg-[#FAF7F2] border border-[#EEE5D8] p-3"><span className="text-lg">🌿</span><p className="mt-1 text-[9px] font-black uppercase text-[#796f66]">Vida</p></div>
            <div className="rounded-2xl bg-[#FAF7F2] border border-[#EEE5D8] p-3"><span className="text-lg">🐱</span><p className="mt-1 text-[9px] font-black uppercase text-[#796f66]">Milo</p></div>
          </div>
        </div>
      </section>
    </main>
  );
}
