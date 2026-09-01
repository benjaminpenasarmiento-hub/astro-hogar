import React, { useState } from "react";
import { AlertTriangle, Trash2, RotateCcw, X, Loader2 } from "lucide-react";
import { collection, doc, getDocs, query, where, writeBatch, deleteDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";

const HOME_SCOPED_COLLECTIONS = [
  "milo_daily_updates",
  "notifications",
  "audit_logs",
  "error_logs",
  "plantas",
  "plants",
  "closet",
  "closetGarments",
  "closet_garments",
  "prendas",
  "metas",
  "wishes",
  "goals",
];

async function deleteMatchingDocuments(collectionName: string, homeCode: string) {
  const snapshot = await getDocs(query(collection(db, collectionName), where("homeCode", "==", homeCode)));
  let deleted = 0;
  let batch = writeBatch(db);
  let pending = 0;

  for (const item of snapshot.docs) {
    batch.delete(item.ref);
    pending += 1;
    deleted += 1;
    if (pending >= 450) {
      await batch.commit();
      batch = writeBatch(db);
      pending = 0;
    }
  }

  if (pending > 0) await batch.commit();
  return deleted;
}

async function purgeHomeData(homeCode: string, uid: string) {
  const cleanCode = homeCode.trim().toUpperCase();
  if (!cleanCode) throw new Error("No hay un nido activo para borrar.");

  let deleted = 0;

  for (const collectionName of HOME_SCOPED_COLLECTIONS) {
    deleted += await deleteMatchingDocuments(collectionName, cleanCode);
  }

  const historySnapshot = await getDocs(collection(db, "nests", cleanCode, "history"));
  if (historySnapshot.size > 0) {
    let batch = writeBatch(db);
    let pending = 0;
    for (const item of historySnapshot.docs) {
      batch.delete(item.ref);
      pending += 1;
      deleted += 1;
      if (pending >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        pending = 0;
      }
    }
    if (pending > 0) await batch.commit();
  }

  await deleteDoc(doc(db, "nests", cleanCode));
  deleted += 1;

  if (uid.trim()) {
    await deleteDoc(doc(db, "account_homes", uid.trim()));
  }

  return deleted;
}

async function clearClientState() {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}

  try {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
    }
  } catch {}

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
    }
  } catch {}

  try {
    const databases = typeof indexedDB.databases === "function" ? await indexedDB.databases() : [];
    await Promise.all(
      databases
        .map(info => info.name)
        .filter((name): name is string => Boolean(name))
        .map(name => new Promise<void>(resolve => {
          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = request.onerror = request.onblocked = () => resolve();
        }))
    );
  } catch {}
}

export default function AccountDataControls({ homeCode, onComplete }: { homeCode?: string; onComplete?: () => void }) {
  const [mode, setMode] = useState<"reset" | "delete" | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setMode(null);
    setConfirmText("");
    setError(null);
  };

  const execute = async () => {
    const expected = mode === "delete" ? "ELIMINAR" : "REINICIAR";
    if (confirmText.trim().toUpperCase() !== expected) return;

    const user = auth.currentUser;
    if (!user) {
      setError("No hay una sesión de Google activa.");
      return;
    }

    const code = (homeCode || localStorage.getItem("astro_home_code") || "").trim().toUpperCase();
    if (!code) {
      setError("No se encontró el nido activo.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      // The AstroHogar account is represented by the user's app data and account_homes
      // record. Do not call Firebase client-side deleteUser(): Google OAuth identities
      // commonly require recent credentials, which can fail with auth/request-had-invalid-
      // authentication-credentials and leave the deletion half-completed.
      await purgeHomeData(code, user.uid);

      await signOut(auth).catch(() => {});
      await clearClientState();
      onComplete?.();
      window.location.assign("/");
    } catch (err: any) {
      console.error("[AccountDataControls] Error:", err);
      setError(err?.message || "No se pudieron borrar los datos de AstroHogar.");
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border-2 border-red-100 bg-red-50/50 p-5 space-y-4">
      <div>
        <h3 className="font-black text-sm text-[#2C2723] flex items-center gap-2"><AlertTriangle size={16} className="text-red-600" /> Cuenta y datos</h3>
        <p className="text-[11px] text-[#6F6660] mt-1 leading-relaxed">Desde aquí puedes vaciar el nido para empezar de nuevo o eliminar definitivamente tus datos y cuenta de AstroHogar.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button type="button" onClick={() => { setMode("reset"); setError(null); setConfirmText(""); }} className="rounded-2xl border-2 border-amber-200 bg-white px-4 py-3 text-left hover:bg-amber-50 transition-colors">
          <div className="flex items-center gap-2 text-sm font-black text-amber-800"><RotateCcw size={16} /> Borrar datos y empezar de nuevo</div>
          <p className="text-[10px] text-[#766E67] mt-1">Borra el nido y sus datos. Tu cuenta de Google permanece.</p>
        </button>

        <button type="button" onClick={() => { setMode("delete"); setError(null); setConfirmText(""); }} className="rounded-2xl border-2 border-red-200 bg-white px-4 py-3 text-left hover:bg-red-50 transition-colors">
          <div className="flex items-center gap-2 text-sm font-black text-red-700"><Trash2 size={16} /> Eliminar cuenta de AstroHogar</div>
          <p className="text-[10px] text-[#766E67] mt-1">Borra los datos del nido y la cuenta de AstroHogar. No elimina ni modifica tu cuenta de Google.</p>
        </button>
      </div>

      {mode && (
        <div className="rounded-2xl border-2 border-red-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="font-black text-sm text-[#2C2723]">{mode === "delete" ? "Eliminar cuenta definitivamente" : "Reiniciar el nido"}</h4>
              <p className="text-[10px] text-[#766E67] mt-1">{mode === "delete" ? "Esta acción elimina los datos de AstroHogar y cierra la sesión." : "Al terminar volverás al inicio para crear o unirte a un nido."}</p>
            </div>
            <button type="button" disabled={busy} onClick={close} className="p-1 rounded-lg hover:bg-gray-100"><X size={16} /></button>
          </div>

          <label className="block text-[11px] font-bold text-[#625B57]">Escribe <span className="font-black">{mode === "delete" ? "ELIMINAR" : "REINICIAR"}</span> para confirmar:</label>
          <input value={confirmText} onChange={e => setConfirmText(e.target.value)} disabled={busy} className="w-full rounded-xl border border-[#E7E2D5] bg-[#FAF7F2] px-3 py-2 text-sm font-black tracking-wider uppercase outline-none" placeholder={mode === "delete" ? "ELIMINAR" : "REINICIAR"} />

          {error && <p className="text-[11px] font-bold text-red-700">⚠️ {error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" disabled={busy} onClick={close} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-[11px] font-bold">Cancelar</button>
            <button type="button" disabled={busy || confirmText.trim().toUpperCase() !== expectedLabel(mode)} onClick={execute} className="rounded-xl bg-red-600 px-4 py-2 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
              {busy ? <span className="inline-flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Procesando...</span> : mode === "delete" ? "Eliminar definitivamente" : "Reiniciar ahora"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function expectedLabel(mode: "reset" | "delete") {
  return mode === "delete" ? "ELIMINAR" : "REINICIAR";
}
