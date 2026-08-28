import React, { useState } from "react";
import { X, RefreshCw, Plus, Check, Search, Dumbbell, Sparkles } from "lucide-react";
import { MovementPattern, Exercise, EquipmentType } from "../../types/workout";

interface ExerciseSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  movementPattern: MovementPattern;
  currentExerciseId: string;
  allExercises: Exercise[];
  onSelectExercise: (exercise: Exercise) => void;
  onCreateCustomExercise: (newEx: Omit<Exercise, "id">) => Promise<Exercise>;
}

export default function ExerciseSwapModal({
  isOpen,
  onClose,
  movementPattern,
  currentExerciseId,
  allExercises,
  onSelectExercise,
  onCreateCustomExercise
}: ExerciseSwapModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // New Custom Exercise Form State
  const [newName, setNewName] = useState("");
  const [newEquipment, setNewEquipment] = useState<EquipmentType>("Máquina Hammer");
  const [newTargetReps, setNewTargetReps] = useState("6-8");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Filter exercises compatible with this movement pattern
  const compatibleExercises = allExercises.filter(
    ex => ex.movementPatternId === movementPattern.id &&
    ex.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await onCreateCustomExercise({
        movementPatternId: movementPattern.id,
        name: newName.trim(),
        equipment: newEquipment,
        defaultTargetReps: newTargetReps,
        defaultTargetSets: 3,
        incrementKg: 2.5,
        isCustom: true
      });
      onSelectExercise(created);
      setShowCreateForm(false);
      setNewName("");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEquipmentBadgeColor = (equipment: EquipmentType) => {
    switch (equipment) {
      case "Máquina Hammer": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Barra": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "Mancuernas": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Polea": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "Máquina Smith": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "Peso Corporal": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Banda de Resistencia": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default: return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-[#111827] rounded-3xl border border-gray-800 max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-gray-100 max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex justify-between items-start pb-3 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl text-2xl border border-emerald-500/20">
              {movementPattern.icon}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
                  Gimnasio Lleno / Alternativa
                </span>
              </div>
              <h3 className="font-extrabold text-white text-lg mt-0.5">
                {movementPattern.name}
              </h3>
              <p className="text-xs text-gray-400">
                Selecciona otro ejercicio compatible sin romper tu rutina.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar & Create Toggle */}
        {!showCreateForm && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar máquina o ejercicio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1A2234] border border-gray-800 rounded-2xl pl-9 pr-3 py-2 text-xs font-semibold text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus size={15} />
              <span>Nuevo</span>
            </button>
          </div>
        )}

        {/* List of Compatible Exercises or Custom Form */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {showCreateForm ? (
            <form onSubmit={handleCreateExercise} className="bg-[#1A2234] p-4 rounded-2xl border border-emerald-500/30 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles size={14} /> Añadir Ejercicio Personalizado
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Nombre del Ejercicio:</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Press Pecho Convergente en Polea Alta"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#111827] border border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Equipamiento:</label>
                  <select
                    value={newEquipment}
                    onChange={(e) => setNewEquipment(e.target.value as EquipmentType)}
                    className="w-full bg-[#111827] border border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Máquina Hammer">Máquina Hammer</option>
                    <option value="Máquina Guiada / Selector">Máquina Guiada / Selector</option>
                    <option value="Barra">Barra</option>
                    <option value="Mancuernas">Mancuernas</option>
                    <option value="Polea">Polea</option>
                    <option value="Máquina Smith">Máquina Smith</option>
                    <option value="Peso Corporal">Peso Corporal</option>
                    <option value="Banda de Resistencia">Banda de Resistencia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Rango Objetivo Reps:</label>
                  <input
                    type="text"
                    value={newTargetReps}
                    onChange={(e) => setNewTargetReps(e.target.value)}
                    placeholder="6-8"
                    className="w-full bg-[#111827] border border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-1.5 bg-gray-800 text-gray-300 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  {isSubmitting ? "Guardando..." : "Guardar y Usar"}
                </button>
              </div>
            </form>
          ) : compatibleExercises.length === 0 ? (
            <div className="text-center py-8 bg-[#1A2234]/50 rounded-2xl border border-dashed border-gray-800">
              <Dumbbell className="mx-auto text-gray-600 mb-2" size={28} />
              <p className="text-xs text-gray-400 font-semibold">No se encontraron otros ejercicios para este patrón.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-3 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold"
              >
                + Crear Ejercicio Personalizado
              </button>
            </div>
          ) : (
            compatibleExercises.map(ex => {
              const isSelected = ex.id === currentExerciseId;
              return (
                <div
                  key={ex.id}
                  onClick={() => {
                    onSelectExercise(ex);
                    onClose();
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${
                    isSelected
                      ? "bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-500/10"
                      : "bg-[#1A2234] border-gray-800/80 text-gray-200 hover:border-gray-700 hover:bg-[#222B40]"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-white group-hover:text-emerald-400 transition-colors">
                        {ex.name}
                      </span>
                      {isSelected && (
                        <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-md flex items-center gap-1">
                          <Check size={12} /> Activo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${getEquipmentBadgeColor(ex.equipment)}`}>
                        {ex.equipment}
                      </span>
                      <span className="text-[11px] text-gray-400 font-medium">
                        Objetivo: {ex.defaultTargetReps} reps ({ex.defaultTargetSets} series efectivas)
                      </span>
                    </div>
                  </div>

                  <div className="text-gray-500 group-hover:text-emerald-400 transition-colors">
                    <RefreshCw size={16} />
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
