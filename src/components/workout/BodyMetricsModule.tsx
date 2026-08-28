import React, { useState } from "react";
import { Scale, Plus, Calendar, Camera, Trash2, TrendingUp, Sparkles, X, ChevronRight } from "lucide-react";
import { BodyMetric } from "../../types/workout";

interface BodyMetricsModuleProps {
  metrics: BodyMetric[];
  onSaveMetric: (metric: BodyMetric) => Promise<void>;
  onDeleteMetric: (id: string) => Promise<void>;
}

export default function BodyMetricsModule({
  metrics,
  onSaveMetric,
  onDeleteMetric
}: BodyMetricsModuleProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [weightKg, setWeightKg] = useState<number>(75.0);
  const [chestCm, setChestCm] = useState<number | undefined>(undefined);
  const [waistCm, setWaistCm] = useState<number | undefined>(undefined);
  const [armCm, setArmCm] = useState<number | undefined>(undefined);
  const [thighCm, setThighCm] = useState<number | undefined>(undefined);
  const [photoUrl, setPhotoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sorted metrics newest first
  const sortedMetrics = [...metrics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latestMetric = sortedMetrics[0];

  const handleCreateMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newMetric: BodyMetric = {
        id: `metric-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        weightKg: Number(weightKg),
        chestCm: chestCm ? Number(chestCm) : undefined,
        waistCm: waistCm ? Number(waistCm) : undefined,
        armCm: armCm ? Number(armCm) : undefined,
        thighCm: thighCm ? Number(thighCm) : undefined,
        photoUrl: photoUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString()
      };

      await onSaveMetric(newMetric);
      setShowAddModal(false);
      setPhotoUrl("");
      setNotes("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // SVG weight chart coordinates generator
  const renderChart = () => {
    if (metrics.length < 2) return null;
    const chronological = [...metrics].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const weights = chronological.map(m => m.weightKg);
    const minW = Math.min(...weights) - 1;
    const maxW = Math.max(...weights) + 1;
    const range = maxW - minW || 1;

    const width = 500;
    const height = 120;

    const points = chronological.map((m, idx) => {
      const x = (idx / (chronological.length - 1)) * (width - 40) + 20;
      const y = height - 20 - ((m.weightKg - minW) / range) * (height - 40);
      return `${x},${y}`;
    }).join(" ");

    return (
      <div className="bg-[#1A2234] border border-gray-800 p-4 rounded-2xl space-y-2">
        <div className="flex justify-between items-center text-xs text-gray-400 font-bold">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <TrendingUp size={14} /> Evolución del Peso Corporal (kg)
          </span>
          <span>{chronological[0].date} ➔ {chronological[chronological.length - 1].date}</span>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 overflow-visible">
          <polyline
            fill="none"
            stroke="#10B981"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          {chronological.map((m, idx) => {
            const x = (idx / (chronological.length - 1)) * (width - 40) + 20;
            const y = height - 20 - ((m.weightKg - minW) / range) * (height - 40);
            return (
              <g key={m.id} className="group cursor-pointer">
                <circle cx={x} cy={y} r="5" fill="#10B981" className="hover:scale-125 transition-transform" />
                <text x={x} y={y - 10} textAnchor="middle" fill="#9CA3AF" fontSize="10" fontWeight="bold">
                  {m.weightKg}kg
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6 text-gray-100 max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-[#111827] border border-gray-800 p-5 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/40">
              Bitácora Corporal & Medidas
            </span>
          </div>
          <h2 className="text-xl font-black text-white mt-1">Medidas y Registro de Peso</h2>
          <p className="text-xs text-gray-400">
            Seguimiento de composición corporal, perímetros y fotos de progreso.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Registrar Peso / Medidas</span>
        </button>
      </div>

      {/* LATEST METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#111827] border border-gray-800 p-4 rounded-2xl">
          <p className="text-[10px] font-black uppercase text-gray-400">Peso Actual</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            {latestMetric ? `${latestMetric.weightKg} kg` : "--"}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">
            {latestMetric ? `Último: ${latestMetric.date}` : "Sin registros"}
          </p>
        </div>

        <div className="bg-[#111827] border border-gray-800 p-4 rounded-2xl">
          <p className="text-[10px] font-black uppercase text-gray-400">Pecho</p>
          <p className="text-xl font-black text-white mt-1">
            {latestMetric?.chestCm ? `${latestMetric.chestCm} cm` : "--"}
          </p>
        </div>

        <div className="bg-[#111827] border border-gray-800 p-4 rounded-2xl">
          <p className="text-[10px] font-black uppercase text-gray-400">Cintura</p>
          <p className="text-xl font-black text-white mt-1">
            {latestMetric?.waistCm ? `${latestMetric.waistCm} cm` : "--"}
          </p>
        </div>

        <div className="bg-[#111827] border border-gray-800 p-4 rounded-2xl">
          <p className="text-[10px] font-black uppercase text-gray-400">Brazo / Bíceps</p>
          <p className="text-xl font-black text-white mt-1">
            {latestMetric?.armCm ? `${latestMetric.armCm} cm` : "--"}
          </p>
        </div>
      </div>

      {/* CHART */}
      {renderChart()}

      {/* HISTORY TABLE */}
      <div className="bg-[#111827] border border-gray-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <h3 className="font-black text-white text-base">Historial de Medidas</h3>

        {sortedMetrics.length === 0 ? (
          <p className="text-xs text-gray-500 py-6 text-center">Aún no has registrado medidas corporales.</p>
        ) : (
          <div className="space-y-2">
            {sortedMetrics.map(m => (
              <div 
                key={m.id}
                className="bg-[#1A2234] border border-gray-800/80 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                    <Scale size={18} />
                  </div>
                  <div>
                    <span className="font-extrabold text-white text-sm">{m.weightKg} kg</span>
                    <span className="text-gray-400 text-xs ml-2">({m.date})</span>
                    
                    <div className="flex flex-wrap gap-2 text-[11px] text-gray-400 mt-0.5">
                      {m.chestCm && <span>Pecho: <strong>{m.chestCm}cm</strong></span>}
                      {m.waistCm && <span>Cintura: <strong>{m.waistCm}cm</strong></span>}
                      {m.armCm && <span>Brazo: <strong>{m.armCm}cm</strong></span>}
                      {m.thighCm && <span>Muslo: <strong>{m.thighCm}cm</strong></span>}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteMetric(m.id)}
                  className="p-2 text-gray-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL ADD */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border border-gray-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-gray-100">
            <div className="flex justify-between items-center pb-2 border-b border-gray-800">
              <h3 className="font-extrabold text-white text-base">Registrar Medida Corporal</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateMetric} className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Peso Corporal (kg):</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={weightKg}
                  onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1A2234] border border-gray-800 rounded-xl px-3 py-2 text-sm font-black text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Pecho (cm):</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Opcional"
                    value={chestCm || ""}
                    onChange={(e) => setChestCm(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full bg-[#1A2234] border border-gray-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Cintura (cm):</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Opcional"
                    value={waistCm || ""}
                    onChange={(e) => setWaistCm(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full bg-[#1A2234] border border-gray-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Brazo (cm):</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Opcional"
                    value={armCm || ""}
                    onChange={(e) => setArmCm(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full bg-[#1A2234] border border-gray-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Muslo (cm):</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Opcional"
                    value={thighCm || ""}
                    onChange={(e) => setThighCm(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full bg-[#1A2234] border border-gray-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-800 text-gray-300 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs"
                >
                  {isSubmitting ? "Guardando..." : "Guardar Registro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
