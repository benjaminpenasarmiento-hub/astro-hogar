import React, { useState } from "react";
import { LogIn } from "lucide-react";
import { useAuth } from "../auth";

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
    <div className="min-h-screen flex items-center justify-center px-6 bg-slate-950 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center shadow-2xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl">🏡</div>
        <h1 className="text-3xl font-bold tracking-tight">Astro Hogar</h1>
        <p className="mt-3 text-sm leading-6 text-white/65">
          Tu nido empieza con tu identidad de Google. Después podrás fundar un hogar o unirte a uno.
        </p>

        <button
          type="button"
          onClick={handleLogin}
          disabled={busy}
          className="mt-8 w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <LogIn size={18} />
            {busy ? "Conectando con Google..." : "Continuar con Google"}
          </span>
        </button>

        {error && (
          <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
