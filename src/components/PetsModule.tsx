import React, { useState } from "react";
import { createPortal } from "react-dom";
import { PawPrint, Calendar, Plus, Shield, Weight, Pill, AlertOctagon, Heart, ChevronRight, FileText, Trash2, Edit2, Save, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Pet, Vaccination, Medication } from "../types";
import { addPetVaccine, addPetMedication, logPetWeight, deletePet, updatePet } from "../api";

interface PetsModuleProps {
  pets: Pet[];
  onRefreshData: () => void;
  onOpenCreateModal?: () => void;
}

export default function PetsModule({ pets, onRefreshData, onOpenCreateModal }: PetsModuleProps) {
  const [selectedPetId, setSelectedPetId] = useState<string>("pet-luna");
  
  // Weights tracker form
  const [newWeight, setNewWeight] = useState("");
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);

  // Vaccines tracker form
  const [newVaxName, setNewVaxName] = useState("");
  const [newVaxDate, setNewVaxDate] = useState("");
  const [newVaxDueDate, setNewVaxDueDate] = useState("");
  const [newVaxNotes, setNewVaxNotes] = useState("");
  const [isVaxModalOpen, setIsVaxModalOpen] = useState(false);

  // Medications tracker form
  const [newMedName, setNewMedName] = useState("");
  const [newMedDosage, setNewMedDosage] = useState("");
  const [newMedSchedule, setNewMedSchedule] = useState("");
  const [newMedStart, setNewMedStart] = useState("");
  const [newMedEnd, setNewMedEnd] = useState("");
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);

  // Custom Confirm Dialogue state to bypass sandboxed iFrame blocking of alert/confirm
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const askConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      visible: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      }
    });
  };

  React.useEffect(() => {
    if (pets && pets.length > 0) {
      const exists = pets.some(p => p.id === selectedPetId);
      if (!exists) {
        setSelectedPetId(pets[0].id);
      }
    } else {
      setSelectedPetId("");
    }
  }, [pets, selectedPetId]);

  const activePet = pets.find(p => p.id === selectedPetId) || pets[0];

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBreed, setEditBreed] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [editWeight, setEditWeight] = useState("");

  const startEditPet = () => {
    if (!activePet) return;
    setEditName(activePet.name);
    setEditBreed(activePet.breed || "");
    setEditBirthDate(activePet.birthDate || "");
    setEditPhotoUrl(activePet.photoUrl);
    setEditWeight(activePet.weight.toString());
    setIsEditing(true);
  };

  const handleSavePetEdit = async () => {
    if (!activePet) return;
    const w = parseFloat(editWeight);
    await updatePet(activePet.id, {
      name: editName,
      breed: editBreed,
      birthDate: editBirthDate,
      photoUrl: editPhotoUrl,
      weight: isNaN(w) ? activePet.weight : w
    });
    setIsEditing(false);
    onRefreshData();
  };

  const handleDeletePetClick = async () => {
    if (!activePet) return;
    if (typeof window !== "undefined" && (window as any).requestDeleteWithConfirm) {
      (window as any).requestDeleteWithConfirm(
        "Eliminar Mascota 🐾",
        `¿Estás seguro de que deseas eliminar a ${activePet.name} del perfil de mascotas de tu hogar? 🐾`,
        async () => {
          await deletePet(activePet.id);
          onRefreshData();
        },
        activePet.name
      );
    } else {
      askConfirmation(
        "Eliminar Mascota 🐾",
        `¿Estás seguro de que quieres eliminar a ${activePet.name} de la familia? 🐾🥺`,
        async () => {
          await deletePet(activePet.id);
          onRefreshData();
        }
      );
    }
  };

  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(newWeight);
    if (isNaN(w) || w <= 0) return;
    
    await logPetWeight(activePet.id, w);
    setNewWeight("");
    setIsWeightModalOpen(false);
    onRefreshData();
  };

  const handleSaveVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVaxName || !newVaxDate) return;

    await addPetVaccine(activePet.id, {
      name: newVaxName,
      date: newVaxDate,
      nextDueDate: newVaxDueDate || undefined,
      notes: newVaxNotes || undefined
    });

    setNewVaxName("");
    setNewVaxDate("");
    setNewVaxDueDate("");
    setNewVaxNotes("");
    setIsVaxModalOpen(false);
    onRefreshData();
  };

  const handleSaveMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName || !newMedDosage || !newMedSchedule || !newMedStart) return;

    await addPetMedication(activePet.id, {
      name: newMedName,
      dosage: newMedDosage,
      schedule: newMedSchedule,
      startDate: newMedStart,
      endDate: newMedEnd || undefined
    });

    setNewMedName("");
    setNewMedDosage("");
    setNewMedSchedule("");
    setNewMedStart("");
    setNewMedEnd("");
    setIsMedModalOpen(false);
    onRefreshData();
  };

  // Calculate age helper
  const calculateAge = (birthDateStr?: string) => {
    if (!birthDateStr) return "Desconocida";
    const birth = new Date(birthDateStr);
    const diff = new Date().getTime() - birth.getTime();
    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    if (years < 1) {
      const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.4));
      return `${months} meses`;
    }
    return `${years} años`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border-4 border-[#F3EFE6] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-xl shadow-inner shrink-0 leading-none text-purple-600">
            🐶
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold text-cute text-[#2C2723]">Mascotas del Hogar</h2>
              {onOpenCreateModal && (
                <button
                  id="btn-add-pet"
                  onClick={onOpenCreateModal}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer shadow-2xs"
                >
                  <Plus size={10} strokeWidth={3} /> Nueva Mascota
                </button>
              )}
            </div>
            <p className="text-xs text-[#8A817C]">Control de salud, vacunas y recordatorios para nuestros peludos</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Pets selectors array in left column */}
        <div className="md:col-span-4 space-y-4">
          <h3 className="font-bold text-cute text-xs text-[#8A817C] uppercase tracking-wider px-1">
            Nuestros Compañeros
          </h3>
          
          <div className="space-y-3">
            {pets.map((pet) => {
              const isSelected = pet.id === selectedPetId;
              const age = calculateAge(pet.birthDate);
              
              return (
                <button
                  key={pet.id}
                  onClick={() => setSelectedPetId(pet.id)}
                  className={`w-full p-4 rounded-3xl border-2 hover:border-purple-300 transition-all text-left flex items-center gap-4 cursor-pointer bg-white relative overflow-hidden ${
                    isSelected ? "border-purple-500 ring-2 ring-purple-100" : "border-[#EAE5D9]"
                  }`}
                >
                  <img 
                    src={pet.photoUrl} 
                    alt={pet.name} 
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm shrink-0"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-extrabold text-[#2C2723] text-sm text-cute tracking-tight truncate">
                      {pet.name}
                    </h4>
                    <p className="text-xs text-[#625B57] mt-0.5">{age} · {pet.breed || "Mestiza"}</p>
                    <p className="text-[10px] text-purple-600 font-semibold mt-1 flex items-center gap-1">
                      <Weight size={10} /> {pet.weight} kg
                    </p>
                  </div>
                  
                  <ChevronRight size={18} className="text-[#8A817C]" />
                </button>
              );
            })}
          </div>

          {/* Quick Info Alerts Card wrapper */}
          {activePet && (
            <div className="bg-purple-50 rounded-3xl p-5 border-2 border-purple-100 space-y-3">
              <h4 className="font-extrabold text-cute text-xs text-purple-800 flex items-center gap-1.5">
                <AlertOctagon size={14} className="text-purple-600" /> Notas de Salud Especiales
              </h4>
              {activePet.medical.allergies && activePet.medical.allergies.length > 0 ? (
                <div className="space-y-1">
                  {activePet.medical.allergies.map((al, id) => (
                    <div key={id} className="text-xs text-purple-900 bg-white/70 p-2 rounded-xl flex gap-1 items-start leading-relaxed border border-purple-100">
                      <span>⚠️</span>
                      <span>{al}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#625B57] italic">Sin alergias críticas registradas en su carnet.</p>
              )}
            </div>
          )}
        </div>

        {/* Right side detail sheet card of Pet */}
        {activePet && (
          <div className="md:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border-4 border-[#F3EFE6] shadow-sm space-y-6">
            {isEditing ? (
              <div className="flex flex-col gap-4 pb-6 border-b border-[#FAF7F2]">
                <h4 className="font-extrabold text-sm text-[#2C2723] uppercase tracking-wider">Editar Mascota 🐾</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#625B57]">Nombre:</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-[#FAF7F2] rounded-xl px-3 py-1.5 text-xs border border-[#EAE5D9] focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#625B57]">Raza:</label>
                    <input 
                      type="text" 
                      value={editBreed}
                      onChange={(e) => setEditBreed(e.target.value)}
                      className="w-full bg-[#FAF7F2] rounded-xl px-3 py-1.5 text-xs border border-[#EAE5D9] focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#625B57]">Nació el:</label>
                    <input 
                      type="date" 
                      value={editBirthDate}
                      onChange={(e) => setEditBirthDate(e.target.value)}
                      className="w-full bg-[#FAF7F2] rounded-xl px-3 py-1.5 text-xs border border-[#EAE5D9] focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-[#625B57]">URL Foto:</label>
                    <input 
                      type="text" 
                      value={editPhotoUrl}
                      onChange={(e) => setEditPhotoUrl(e.target.value)}
                      className="w-full bg-[#FAF7F2] rounded-xl px-3 py-1.5 text-xs border border-[#EAE5D9] focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#625B57]">Peso (kg):</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={editWeight}
                      onChange={(e) => setEditWeight(e.target.value)}
                      className="w-full bg-[#FAF7F2] rounded-xl px-3 py-1.5 text-xs border border-[#EAE5D9] focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer hover:bg-gray-200"
                  >
                    <X size={12} /> Cancelar
                  </button>
                  <button 
                    onClick={handleSavePetEdit}
                    className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer hover:bg-purple-700"
                  >
                    <Save size={12} /> Guardar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-5 items-center pb-6 border-b border-[#FAF7F2]">
                <img 
                  src={activePet.photoUrl} 
                  alt={activePet.name} 
                  className="w-24 h-24 rounded-3xl object-cover border-4 border-[#F3EFE6] shadow-md shrink-0" 
                />
                <div className="flex-1 text-center sm:text-left space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <h3 className="text-2xl font-extrabold text-[#2C2723] text-cute">{activePet.name}</h3>
                    <div className="flex gap-1.5 justify-center sm:justify-start">
                      <button 
                        onClick={startEditPet}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                        title="Editar mascota"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={handleDeletePetClick}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        title="Eliminar mascota"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-[#625B57] font-medium">
                    {activePet.breed || "Raza desconocida"} · Nació el {activePet.birthDate ? new Date(activePet.birthDate + "T00:00:00").toLocaleDateString("es-ES", { day: 'numeric', month: 'long', year: 'numeric' }) : "Desconocido"}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1.5 justify-center sm:justify-start">
                    <span className="text-xs font-mono font-bold bg-[#FAF7F2] text-[#2C2723] px-2.5 py-1 rounded-full border border-[#EAE5D9] flex items-center gap-1">
                      🎂 {calculateAge(activePet.birthDate)}
                    </span>
                    <span className="text-xs font-mono font-bold bg-[#FAF7F2] text-[#2C2723] px-2.5 py-1 rounded-full border border-[#EAE5D9] flex items-center gap-1">
                      ⚖️ {activePet.weight} kg
                    </span>
                  </div>
                </div>

                {/* Log actions control dropdown */}
                <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => setIsWeightModalOpen(true)}
                    className="bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold px-4 py-2.5 rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Weight size={14} /> Registrar Peso
                  </button>
                </div>
              </div>
            )}

            {/* Health detail sheet split cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* VACCINATIONS BLOCK */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-cute text-sm text-[#2C2723] flex items-center gap-1.5">
                    <Shield size={16} className="text-indigo-500" /> Vacunación
                  </h4>
                  <button
                    onClick={() => setIsVaxModalOpen(true)}
                    className="p-1 hover:bg-[#FAF7F2] rounded-lg border border-[#EAE5D9] text-indigo-600 transition-colors cursor-pointer"
                    title="Agregar vacuna"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {activePet.medical.vaccinations.length === 0 ? (
                  <p className="text-xs text-[#8A817C] italic p-3 bg-[#FCFAF7] rounded-2xl text-center">Sin vacunas registradas.</p>
                ) : (
                  <div className="space-y-2">
                    {activePet.medical.vaccinations.map((vax, index) => (
                      <div key={index} className="p-3 bg-indigo-50/40 rounded-2xl border border-indigo-50/80 text-xs flex justify-between items-start">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-[#2C2723]">{vax.name}</p>
                          <p className="text-[10px] text-gray-400">Dosis: {new Date(vax.date + "T00:00:00").toLocaleDateString("es-ES")}</p>
                          {vax.notes && <p className="text-[10px] italic text-[#625B57] mt-1">"{vax.notes}"</p>}
                        </div>
                        {vax.nextDueDate && (
                          <div className="text-right shrink-0">
                            <span className="text-[9px] font-bold bg-[#E8F1F5] text-blue-700 px-1.5 py-0.5 rounded-full border border-blue-200">
                              Próx: {new Date(vax.nextDueDate + "T00:00:00").toLocaleDateString("es-ES", { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* MEDICATIONS BLOCK */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-cute text-sm text-[#2C2723] flex items-center gap-1.5">
                    <Pill size={16} className="text-rose-500" /> Medicación actual
                  </h4>
                  <button
                    onClick={() => setIsMedModalOpen(true)}
                    className="p-1 hover:bg-[#FAF7F2] rounded-lg border border-[#EAE5D9] text-rose-600 transition-colors cursor-pointer"
                    title="Agregar fármaco"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {activePet.medical.medications.length === 0 ? (
                  <div className="p-4 bg-rose-50/10 rounded-2xl border-2 border-dashed border-rose-100 text-center text-xs text-[#8A817C] italic">
                    Sin medicamentos activos hoy miau. ✨
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activePet.medical.medications.map((med, index) => (
                      <div key={index} className="p-3 bg-rose-50/40 rounded-2xl border border-rose-50/80 text-xs space-y-1">
                        <div className="flex justify-between items-start">
                          <p className="font-extrabold text-[#2C2723] flex items-center gap-1"><span>💊</span> {med.name}</p>
                          <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 font-mono">
                            {med.dosage}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#625B57]">Horario: <span className="font-semibold">{med.schedule}</span></p>
                        <p className="text-[9px] text-gray-400">Inicio: {new Date(med.startDate + "T00:00:00").toLocaleDateString("es-ES")} {med.endDate ? `· Fin: ${new Date(med.endDate + "T00:00:00").toLocaleDateString("es-ES")}` : ''}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* WEIGHT RECORD GRAPH/LOG ELEMENT */}
            <div className="pt-4 border-t border-[#FAF7F2] space-y-3">
              <h4 className="font-extrabold text-cute text-sm text-[#2C2723] flex items-center gap-1.5">
                <Weight size={16} className="text-purple-500" /> Historial de peso
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {activePet.weightHistory?.slice(-4).map((h, i) => (
                  <div key={i} className="p-2.5 bg-purple-50/30 rounded-2xl border border-purple-50 text-center">
                    <p className="text-[10px] text-gray-400 font-mono">{new Date(h.date + "T00:00:00").toLocaleDateString("es-ES", { month: 'short', day: 'numeric' })}</p>
                    <p className="text-sm font-bold text-[#2C2723] font-mono mt-0.5">{h.weight} kg</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* POPUP MODALS INLINE FOR MASCOTAS */}
      
      {/* 1. Modal Weight */}
      {isWeightModalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[999] bg-black/35 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 transition-all animate-in fade-in duration-200">
          <div className="bg-[#FAF8F5] rounded-[28px] max-w-sm w-full p-6 border-2 border-[#E8E2D2] space-y-4 shadow-2xl shadow-stone-900/15 relative overflow-hidden text-[#2C2723]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-[#E2D8C3] rounded-b-lg opacity-80" />
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D2]">
              <h3 className="font-extrabold text-cute text-base text-[#2C2723] flex items-center gap-1.5">
                <span>⚖️</span> Peso de {activePet?.name}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsWeightModalOpen(false)}
                className="text-stone-400 hover:text-stone-800 font-extrabold text-xs cursor-pointer rounded-full p-1 hover:bg-stone-200/50 transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveWeight} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#625B57]">Peso actual (en kg):</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  placeholder="ej: 12.5"
                  className="w-full bg-white focus:ring-purple-200 focus:outline-none rounded-2xl px-3.5 py-2.5 border border-[#E3DAC8] text-cute text-sm"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setIsWeightModalOpen(false)} className="px-4 py-2 border border-[#EAE5D9] rounded-xl text-xs font-bold cursor-pointer hover:bg-stone-100 text-[#8A817C]">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-purple-700 shadow-sm">Guardar peso</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 2. Modal Vaccine */}
      {isVaxModalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[999] bg-black/35 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 transition-all animate-in fade-in duration-200">
          <div className="bg-[#FAF8F5] rounded-[28px] max-w-md w-full p-6 border-2 border-[#E8E2D2] space-y-4 shadow-2xl shadow-stone-900/15 relative overflow-hidden text-[#2C2723]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-1.5 bg-[#E2D8C3] rounded-b-lg opacity-80" />
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D2]">
              <h3 className="font-extrabold text-cute text-base text-[#2C2723] flex items-center gap-2">
                <span className="p-1 bg-purple-100/70 rounded-xl text-purple-800 text-sm">💉</span>
                <span>Registrar Vacuna para {activePet?.name}</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setIsVaxModalOpen(false)}
                className="text-stone-400 hover:text-stone-800 font-extrabold text-xs cursor-pointer rounded-full p-1 hover:bg-stone-200/50 transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveVaccine} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#625B57]">Nombre de la Vacuna:</label>
                <input 
                  type="text" 
                  required
                  value={newVaxName}
                  onChange={(e) => setNewVaxName(e.target.value)}
                  placeholder="ej: Antirrábica miau"
                  className="w-full bg-white focus:ring-purple-200 focus:outline-none rounded-2xl px-3.5 py-2.5 border border-[#E3DAC8] text-cute text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#625B57]">Fecha aplicación:</label>
                  <input 
                    type="date" 
                    required
                    value={newVaxDate}
                    onChange={(e) => setNewVaxDate(e.target.value)}
                    className="w-full bg-white focus:ring-purple-200 focus:outline-none rounded-2xl px-3 py-2 border border-[#E3DAC8] font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#625B57]">Siguiente dosis (Opcional):</label>
                  <input 
                    type="date" 
                    value={newVaxDueDate}
                    onChange={(e) => setNewVaxDueDate(e.target.value)}
                    className="w-full bg-white focus:ring-purple-200 focus:outline-none rounded-2xl px-3 py-2 border border-[#E3DAC8] font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#625B57]">Notas / Fabricante:</label>
                <input 
                  type="text" 
                  value={newVaxNotes}
                  onChange={(e) => setNewVaxNotes(e.target.value)}
                  placeholder="ej: Lote Pfizer, aplicado en Veterinaria Amor"
                  className="w-full bg-white focus:ring-purple-200 focus:outline-none rounded-2xl px-3.5 py-2.5 border border-[#E3DAC8] text-cute text-sm"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setIsVaxModalOpen(false)} className="px-4 py-2 border border-[#EAE5D9] rounded-xl text-xs font-bold cursor-pointer hover:bg-stone-100 text-[#8A817C]">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-indigo-700 shadow-sm">Registrar Vacuna</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 3. Modal Medication */}
      {isMedModalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[999] bg-black/35 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 transition-all animate-in fade-in duration-200">
          <div className="bg-[#FAF8F5] rounded-[28px] max-w-md w-full p-6 border-2 border-[#E8E2D2] space-y-4 shadow-2xl shadow-stone-900/15 relative overflow-hidden text-[#2C2723]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-1.5 bg-[#E2D8C3] rounded-b-lg opacity-80" />
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D2]">
              <h3 className="font-extrabold text-cute text-base text-[#2C2723] flex items-center gap-2">
                <span className="p-1 bg-amber-100/70 rounded-xl text-amber-800 text-sm">💊</span>
                <span>Recetar Medicamento para {activePet?.name}</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setIsMedModalOpen(false)}
                className="text-stone-400 hover:text-stone-800 font-extrabold text-xs cursor-pointer rounded-full p-1 hover:bg-stone-200/50 transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveMedication} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#625B57]">Nombre del Fármaco:</label>
                <input 
                  type="text" 
                  required
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  placeholder="ej: Amoxicilina miau"
                  className="w-full bg-[#FAF7F2] focus:ring-purple-200 focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] text-cute text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#625B57]">Dosis:</label>
                  <input 
                    type="text" 
                    required
                    value={newMedDosage}
                    onChange={(e) => setNewMedDosage(e.target.value)}
                    placeholder="ej: 1 pastilla"
                    className="w-full bg-[#FAF7F2] focus:ring-purple-200 focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] text-cute text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#625B57]">Horario / Frecuencia:</label>
                  <input 
                    type="text" 
                    required
                    value={newMedSchedule}
                    onChange={(e) => setNewMedSchedule(e.target.value)}
                    placeholder="ej: Cada 12 horas"
                    className="w-full bg-[#FAF7F2] focus:ring-purple-200 focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] text-cute text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#625B57]">Fecha Inicio:</label>
                  <input 
                    type="date" 
                    required
                    value={newMedStart}
                    onChange={(e) => setNewMedStart(e.target.value)}
                    className="w-full bg-[#FAF7F2] focus:ring-purple-200 focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#625B57]">Fecha Término (Opcional):</label>
                  <input 
                    type="date" 
                    value={newMedEnd}
                    onChange={(e) => setNewMedEnd(e.target.value)}
                    className="w-full bg-[#FAF7F2] focus:ring-purple-200 focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] font-mono text-xs"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setIsMedModalOpen(false)} className="px-4 py-2 border border-[#EAE5D9] rounded-xl text-xs font-bold cursor-pointer hover:bg-gray-50 text-[#8A817C]">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-rose-700 shadow-sm">Recetar</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Confirm Modal System */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {confirmDialog?.visible && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[999] backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FCFAF7] border-4 border-[#F3EFE6] rounded-[24px] p-6 max-w-sm w-full shadow-2xl relative text-center"
            >
              <span className="inline-block text-3xl mb-2">🐾❤️</span>
              <h4 className="text-sm font-black text-[#2C2723] uppercase tracking-wider mb-2">
                {confirmDialog.title}
              </h4>
              <p className="text-xs text-[#625B57] leading-relaxed mb-5 font-semibold font-sans">
                {confirmDialog.message}
              </p>

              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-all shadow-xs"
                >
                  Confirmar miau🐾
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
      )}

    </div>
  );
}
