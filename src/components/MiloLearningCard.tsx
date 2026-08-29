import React, { useEffect, useState } from "react";
import { Brain, Save, Sparkles } from "lucide-react";
import { Home } from "../types";
import { updateHomeSettings } from "../api";

export default function MiloLearningCard({ home, onRefreshAll }: { home: Home; onRefreshAll?: () => void }) {
  const [notes, setNotes] = useState(home.settings?.miloLearningNotes || "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNotes(home.settings?.miloLearningNotes || "");
  }, [home.settings?.miloLearningNotes]);

  const save = async () => {
    setSaving(true);
    try {
      await updateHomeSettings({ settings: { ...home.settings, miloLearningNotes: notes.trim() } } as any);
      setSaved(true);
      onRefreshAll?.();
      window.setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      console.warn("No se pudieron guardar los aprendizajes de Milo:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/80 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700"><Brain size={20}/></div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider font-black text-indigo-700">🧠 Milo aprende del hogar</p>
          <h3 className="text-base font-black text-[#2C2723] mt-0.5">Enséñale las cosas que hacen único vuestro nido.</h3>
          <p className="text-[11px] text-[#625B57] mt-1 leading-relaxed">Puedes contarle rutinas, gustos, horarios, lugares favoritos, cómo prefieren recibir recordatorios o cualquier regla útil. Milo usará esta información como contexto para sus recomendaciones.</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej.: Los domingos desayunamos juntos; Mafe prefiere recordatorios suaves; a Benja le gusta entrenar por la noche..." className="mt-3 w-full min-h-24 rounded-2xl border border-indigo-100 bg-white px-3 py-2.5 text-xs text-[#2C2723] outline-none focus:ring-2 focus:ring-indigo-200 resize-y" />
          <div className="flex items-center justify-between gap-3 mt-3">
            <span className="text-[10px] text-[#8A817C] flex items-center gap-1"><Sparkles size={11}/> Milo también aprende de acciones, agenda, mascotas, plantas, finanzas y sintonía.</span>
            <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-[#2C2723] text-white px-3 py-2 text-[11px] font-black disabled:opacity-50"><Save size={13}/>{saving ? "Guardando..." : saved ? "Guardado ✓" : "Guardar aprendizaje"}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
