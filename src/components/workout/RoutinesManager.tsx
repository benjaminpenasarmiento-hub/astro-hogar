import React, { useState } from "react";
import { Plus, Edit2, Trash2, Dumbbell, Sparkles, X, Check, Layers, ChevronUp, ChevronDown } from "lucide-react";
import { Routine, MovementPattern, Exercise, RoutinePatternItem } from "../../types/workout";

interface RoutinesManagerProps {
  routines: Routine[];
  allMovementPatterns: MovementPattern[];
  allExercises: Exercise[];
  onSaveRoutine: (routine: Routine) => Promise<void>;
  onDeleteRoutine: (routineId: string) => Promise<void>;
  onStartRoutine: (routine: Routine) => void;
}

export default function RoutinesManager({
  routines,
  allMovementPatterns,
  allExercises,
  onSaveRoutine,
  onDeleteRoutine,
  onStartRoutine
}: RoutinesManagerProps) {
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formColor, setFormColor] = useState("#10B981");
  const [formPatterns, setFormPatterns] = useState<RoutinePatternItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startCreateNew = () => {
    setEditingRoutine(null);
    setFormName("");
    setFormDesc("");
    setFormColor("#10B981");
    // Pre-populate with 3 default movement patterns
    setFormPatterns([
      {
        movementPatternId: "empuje_horizontal",
        preferredExerciseId: "press_pecho_maquina_hammer",
        targetSets: 3,
        targetRepsRange: "6-8"
      },
      {
        movementPatternId: "empuje_inclinado",
        preferredExerciseId: "press_inclinado_mancuernas",
        targetSets: 3,
        targetRepsRange: "6-8"
      },
      {
        movementPatternId: "empuje_vertical",
        preferredExerciseId: "press_militar_mancuernas",
        targetSets: 3,
        targetRepsRange: "6-8"
      }
    ]);
    setIsCreatingNew(true);
  };

  const startEditRoutine = (routine: Routine) => {
    setEditingRoutine(routine);
    setFormName(routine.name);
    setFormDesc(routine.description || "");
    setFormColor(routine.color || "#10B981");
    setFormPatterns(routine.patterns || []);
    setIsCreatingNew(true);
  };

  const handleAddPatternToForm = (patternId: string) => {
    const pattern = allMovementPatterns.find(p => p.id === patternId);
    if (!pattern) return;

    const defaultEx = allExercises.find(e => e.id === pattern.defaultExerciseId) ||
      allExercises.find(e => e.movementPatternId === pattern.id);

    setFormPatterns(prev => [
      ...prev,
      {
        movementPatternId: pattern.id,
        preferredExerciseId: defaultEx?.id || "",
        targetSets: 3,
        targetRepsRange: "6-8"
      }
    ]);
  };

  const handleRemovePatternFromForm = (index: number) => {
    setFormPatterns(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleMovePatternInForm = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === formPatterns.length - 1) return;

    const updated = [...formPatterns];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setFormPatterns(updated);
  };

  const handleUpdatePatternItem = (index: number, field: keyof RoutinePatternItem, val: any) => {
    setFormPatterns(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formPatterns.length === 0) return;

    setIsSubmitting(true);
    try {
      const routineToSave: Routine = {
        id: editingRoutine ? editingRoutine.id : `routine-${Date.now()}`,
        name: formName.trim(),
        description: formDesc.trim() || undefined,
        color: formColor,
        patterns: formPatterns,
        createdAt: editingRoutine ? editingRoutine.createdAt : new Date().toISOString()
      };

      await onSaveRoutine(routineToSave);
      setIsCreatingNew(false);
      setEditingRoutine(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-[#2C2723] max-w-5xl mx-auto">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white border-2 border-[#E7E2D5] p-5 rounded-3xl shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
              Constructor de Rutinas
            </span>
          </div>
          <h2 className="text-xl font-black text-[#2C2723] mt-1">Gestor de Rutinas por Movimiento</h2>
          <p className="text-xs text-[#625B57]">
            Rutinas organizadas por patrones biomecánicos para fácil intercambio en casa o gimnasio.
          </p>
        </div>

        <button
          onClick={startCreateNew}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Nueva Rutina Custom</span>
        </button>
      </div>

      {/* ROUTINES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {routines.map(r => {
          const totalSets = r.patterns.reduce((acc, p) => acc + (p.targetSets || 3), 0);

          return (
            <div 
              key={r.id}
              className="bg-white border-2 border-[#E7E2D5] hover:border-amber-300 rounded-3xl p-5 space-y-4 shadow-2xs transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-4 h-4 rounded-full border border-black/10"
                      style={{ backgroundColor: r.color || "#F59E0B" }}
                    />
                    <h3 className="font-extrabold text-[#2C2723] text-base">{r.name}</h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditRoutine(r)}
                      className="p-1.5 text-[#625B57] hover:text-[#2C2723] rounded-xl hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                      title="Editar Rutina"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteRoutine(r.id)}
                      className="p-1.5 text-[#625B57] hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                      title="Eliminar Rutina"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {r.description && (
                  <p className="text-xs text-[#625B57]">{r.description}</p>
                )}

                {/* PATTERNS TAGS */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-black uppercase text-[#625B57]">Patrones Incluidos ({r.patterns.length}):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {r.patterns.map((item, idx) => {
                      const pattern = allMovementPatterns.find(p => p.id === item.movementPatternId);
                      const exercise = allExercises.find(e => e.id === item.preferredExerciseId);

                      return (
                        <div 
                          key={idx}
                          className="bg-[#FAF7F2] border border-[#E7E2D5] px-2.5 py-1 rounded-xl text-[11px] font-bold text-[#2C2723] flex items-center gap-1.5"
                        >
                          <span>{pattern?.icon || "🏋️‍♂️"}</span>
                          <span>{pattern?.name || item.movementPatternId}</span>
                          <span className="text-amber-700 text-[10px]">({exercise?.name || "Efectivo"})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ROUTINE FOOTER & START BUTTON */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E7E2D5]">
                <span className="text-xs text-[#625B57] font-semibold">
                  {totalSets} Series Efectivas totales
                </span>

                <button
                  onClick={() => onStartRoutine(r)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <Dumbbell size={14} />
                  <span>Entrenar Esta Rutina</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT ROUTINE MODAL */}
      {isCreatingNew && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border-2 border-[#E7E2D5] rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto custom-scrollbar text-[#2C2723]">
            <div className="flex justify-between items-center pb-3 border-b border-[#E7E2D5]">
              <div className="flex items-center gap-2">
                <span className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl">
                  <Sparkles size={20} />
                </span>
                <div>
                  <h3 className="font-extrabold text-[#2C2723] text-base">
                    {editingRoutine ? "Editar Rutina" : "Nueva Rutina Custom"}
                  </h3>
                  <p className="text-xs text-[#625B57]">Selecciona los patrones de movimiento y ejercicios preferidos.</p>
                </div>
              </div>

              <button
                onClick={() => setIsCreatingNew(false)}
                className="p-1.5 text-[#625B57] hover:text-[#2C2723] rounded-xl hover:bg-[#FAF7F2] cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-[#625B57] mb-1">Nombre de la Rutina:</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Día 1: Empuje (Pecho, Hombro, Tríceps)"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#FAF7F2] border-2 border-[#E7E2D5] rounded-xl px-3 py-2 text-xs font-bold text-[#2C2723] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-[#625B57] mb-1">Descripción:</label>
                  <input
                    type="text"
                    placeholder="Enfoque hipertrofia o tono"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="w-full bg-[#FAF7F2] border-2 border-[#E7E2D5] rounded-xl px-3 py-2 text-xs font-bold text-[#2C2723] focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-[#625B57] mb-1">Color Distintivo:</label>
                  <div className="flex items-center gap-2">
                    {["#10B981", "#06B6D4", "#8B5CF6", "#F59E0B", "#EC4899"].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormColor(c)}
                        className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                          formColor === c ? "border-[#2C2723] scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* PATTERNS SELECTOR FORM */}
              <div className="space-y-3 border-t border-[#E7E2D5] pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase text-[#625B57]">Patrones de Movimiento ({formPatterns.length}):</span>
                  
                  {/* Dropdown to Add Pattern */}
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddPatternToForm(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="bg-[#FAF7F2] border-2 border-[#E7E2D5] rounded-xl px-3 py-1.5 text-xs font-bold text-amber-800 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">+ Añadir Patrón de Movimiento</option>
                    {allMovementPatterns.map(p => (
                      <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  {formPatterns.map((item, idx) => {
                    const pattern = allMovementPatterns.find(p => p.id === item.movementPatternId);
                    const compatibleExs = allExercises.filter(e => e.movementPatternId === item.movementPatternId);

                    return (
                      <div 
                        key={idx}
                        className="bg-[#FAF7F2] border-2 border-[#E7E2D5] p-3 rounded-2xl flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-lg">{pattern?.icon || "🏋️‍♂️"}</span>
                          <div className="space-y-0.5 flex-1">
                            <p className="text-xs font-extrabold text-[#2C2723]">{pattern?.name || item.movementPatternId}</p>
                            
                            {/* Select Preferred Exercise for this pattern */}
                            <select
                              value={item.preferredExerciseId}
                              onChange={(e) => handleUpdatePatternItem(idx, "preferredExerciseId", e.target.value)}
                              className="w-full bg-white border border-[#E7E2D5] rounded-lg px-2 py-1 text-[11px] font-semibold text-[#2C2723]"
                            >
                              {compatibleExs.map(e => (
                                <option key={e.id} value={e.id}>{e.name} ({e.equipment})</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Reorder and Delete controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMovePatternInForm(idx, "up")}
                            className="p-1 text-[#625B57] hover:text-[#2C2723]"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMovePatternInForm(idx, "down")}
                            className="p-1 text-[#625B57] hover:text-[#2C2723]"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePatternFromForm(idx)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-[#E7E2D5]">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-4 py-2 bg-[#FAF7F2] hover:bg-[#E7E2D5] text-[#2C2723] font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || formPatterns.length === 0}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl text-xs shadow-2xs cursor-pointer"
                >
                  {isSubmitting ? "Guardando..." : "Guardar Rutina"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
