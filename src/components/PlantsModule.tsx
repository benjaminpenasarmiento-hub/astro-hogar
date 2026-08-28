import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Leaf, 
  Plus, 
  Sparkles, 
  Droplet, 
  Layers, 
  Scissors, 
  CheckCircle, 
  Clock, 
  Trash2, 
  Camera, 
  Upload, 
  Trash, 
  Edit2, 
  Save, 
  X, 
  ChevronRight,
  Info,
  Check,
  Zap,
  Tag
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Plant, UserId } from "../types";
import { 
  deletePlant, 
  updatePlant, 
  addPlantAction, 
  bulkPlantAction, 
  diagnosePlantWithAi, 
  reportErrorLog,
  identifyPlantWithAi,
  analyzePlantsWithMilo
} from "../api";

interface PlantsModuleProps {
  plants: Plant[];
  onRefreshData: () => void;
  onOpenCreateModal?: () => void;
  users?: any[];
}

// Preset common indoor species for quick identification fixes
const COMMON_SPECIES_PRESETS = [
  { name: "Monstera Deliciosa", category: "Trepadora / Hoja Ancha", keywords: ["monstera", "costilla"] },
  { name: "Pothos Dorado (Epipremnum)", category: "Colgante de Interior", keywords: ["poto", "pothos", "milo", "enredadera"] },
  { name: "Sansevieria (Lengua de Suegra)", category: "Purificadora Resistente", keywords: ["sansevieria", "lengua"] },
  { name: "Echeveria (Suculenta)", category: "Suculenta Sol y Sombra", keywords: ["suculenta", "echeveria"] },
  { name: "Nephrolepis Exaltata (Helecho)", category: "Helecho Humedad", keywords: ["helecho", "fronda"] },
  { name: "Ficus Lyrata (Higuera)", category: "Árbol de Interior", keywords: ["ficus", "lyrata"] },
  { name: "Aloe Vera (Sábila)", category: "Medicinal / Suculenta", keywords: ["aloe", "sabila", "sábila"] },
  { name: "Spathiphyllum (Lirio de la Paz)", category: "Flor / Purificadora", keywords: ["lirio", "paz"] },
  { name: "Phalaenopsis (Orquídea)", category: "Floral de Sombra", keywords: ["orquidea", "orquídea"] },
  { name: "Cactaceae (Cactus de Interior)", category: "Desertica Poca Agua", keywords: ["cactus"] }
];

/**
 * Smartly infers species if missing or "Especie por identificar"
 */
function resolveSpeciesName(plantName: string, currentSpecies?: string): string {
  if (
    currentSpecies && 
    currentSpecies !== "Especie por identificar" && 
    currentSpecies !== "Identificando..." && 
    currentSpecies.toLowerCase() !== plantName.toLowerCase() &&
    currentSpecies.trim().length > 0
  ) {
    return currentSpecies;
  }

  const cleanName = plantName.toLowerCase();
  for (const preset of COMMON_SPECIES_PRESETS) {
    if (preset.keywords.some(k => cleanName.includes(k))) {
      return preset.name;
    }
  }

  return "Planta de Interior (Variedad Verde)";
}

export default function PlantsModule({ plants, onRefreshData, onOpenCreateModal, users = [] }: PlantsModuleProps) {
  const defaultUser = (users[0]?.id || "mafe") as UserId;
  
  // Selected plant for compact summary modal
  const [selectedPlantModal, setSelectedPlantModal] = useState<Plant | null>(null);
  
  // Editing state
  const [editingPlantId, setEditingPlantId] = useState<string>("");
  const [editName, setEditName] = useState("");
  const [editSpecies, setEditSpecies] = useState("");
  const [editEmoji, setEditEmoji] = useState("🪴");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [editWatering, setEditWatering] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  // AI Species Identification state
  const [isIdentifyingAi, setIsIdentifyingAi] = useState<string | null>(null);

  // Bulk mode
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkSelectIds, setBulkSelectIds] = useState<string[]>([]);
  const [bulkActionType, setBulkActionType] = useState<"water" | "fertilize">("water");

  // Custom Confirm Dialogue
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

  // AI Diagnosis state
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);

  // File upload state for botanical diagnosis
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string>("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync selectedPlantModal when plants change
  useEffect(() => {
    if (selectedPlantModal) {
      const updated = plants.find(p => p.id === selectedPlantModal.id);
      if (updated) setSelectedPlantModal(updated);
    }
  }, [plants]);

  const startEditPlant = (plant: Plant) => {
    setEditingPlantId(plant.id);
    setEditName(plant.name);
    setEditSpecies(resolveSpeciesName(plant.name, plant.species));
    setEditEmoji(plant.emoji || "🪴");
    setEditPhotoUrl(plant.photoUrl || "");
    setEditWatering(plant.recommendedWatering || "Cada 5-7 días");
    setEditLocation(plant.idealLocation || "Luz indirecta brillante");
    setEditError(null);
  };

  const handleSavePlantEdit = async (plantId: string) => {
    setEditError(null);
    if (!editName.trim()) {
      setEditError("El nombre de la planta no puede estar vacío.");
      return;
    }
    try {
      await updatePlant(plantId, {
        name: editName.trim(),
        species: editSpecies.trim() || "Planta de Interior",
        emoji: editEmoji,
        photoUrl: editPhotoUrl,
        recommendedWatering: editWatering,
        idealLocation: editLocation
      });
      setEditingPlantId("");
      onRefreshData();
    } catch (err: any) {
      console.error("Error al guardar cambios de la planta:", err);
      setEditError("No se pudo guardar la planta. Intenta de nuevo.");
    }
  };

  const handleIdentifyWithAi = async (plantId: string) => {
    setIsIdentifyingAi(plantId);
    try {
      const updated = await identifyPlantWithAi(plantId);
      if (selectedPlantModal?.id === plantId) {
        setSelectedPlantModal(updated);
      }
      onRefreshData();
    } catch (err) {
      console.error("Error identificando planta con IA:", err);
    } finally {
      setIsIdentifyingAi(null);
    }
  };

  const [isAnalyzingWithMilo, setIsAnalyzingWithMilo] = useState(false);
  const [miloAnalysisMsg, setMiloAnalysisMsg] = useState<string | null>(null);

  const handleRunMiloAnalysis = async () => {
    setIsAnalyzingWithMilo(true);
    setMiloAnalysisMsg(null);
    try {
      const res = await analyzePlantsWithMilo();
      setMiloAnalysisMsg(res.message);
      onRefreshData();
    } catch (err) {
      setMiloAnalysisMsg("Ocurrió un inconveniente realizando el análisis del jardín. Por favor reintenta.");
    } finally {
      setIsAnalyzingWithMilo(false);
    }
  };

  const unknownPlantsList = plants.filter(p => {
    const sp = (p.species || "").toLowerCase().trim();
    return !p.species || 
      sp.includes("desconocid") || 
      sp.includes("por identificar") || 
      sp.includes("identificando") || 
      sp.includes("sin especie") || 
      sp === "planta de interior" || 
      sp === p.name.toLowerCase().trim();
  });

  const handleQuickFixSpecies = async (plant: Plant, newSpeciesName: string) => {
    try {
      await updatePlant(plant.id, { species: newSpeciesName });
      onRefreshData();
    } catch (err) {
      console.error("Error fixing species:", err);
    }
  };

  const handleSingleAction = async (plantId: string, type: "water" | "fertilize" | "prune" | "repot", performedBy: UserId) => {
    await addPlantAction(plantId, type, performedBy);
    onRefreshData();
  };

  const handleToggleBulkSelect = (id: string) => {
    if (bulkSelectIds.includes(id)) {
      setBulkSelectIds(bulkSelectIds.filter(i => i !== id));
    } else {
      setBulkSelectIds([...bulkSelectIds, id]);
    }
  };

  const handleRunBulkAction = async () => {
    if (bulkSelectIds.length === 0) return;
    await bulkPlantAction(bulkSelectIds, bulkActionType, defaultUser);
    setBulkSelectIds([]);
    setIsBulkMode(false);
    onRefreshData();
  };

  const handleDeletePlant = async (id: string) => {
    try {
      const res = await deletePlant(id);
      if (res && res.success) {
        if (selectedPlantModal?.id === id) {
          setSelectedPlantModal(null);
        }
        onRefreshData();
      } else {
        // Fallback retry
        deletePlant(id).then(() => {
          if (selectedPlantModal?.id === id) setSelectedPlantModal(null);
          onRefreshData();
        });
      }
    } catch (err) {
      console.error("Error al eliminar la planta:", err);
    }
  };

  // Convert uploaded file to base64
  const handleFileChange = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setUploadedImageBase64(base64String);
      setImagePreviewUrl(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveUploadedFile = () => {
    setUploadedImageBase64("");
    setImagePreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Run Botanical Scan
  const handleTriggerAiDiagnosis = async (plant: Plant) => {
    setIsDiagnosing(true);
    setDiagnosticResult(null);

    try {
      const finalImageBase64 = uploadedImageBase64 || plant.photoUrl || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const res = await diagnosePlantWithAi(plant.id, finalImageBase64);
      setDiagnosticResult(res.diagnosis);
      setUploadedImageBase64("");
      setImagePreviewUrl("");
      onRefreshData();
    } catch (err: any) {
      console.error("Error en diagnóstico vegetal:", err);
      reportErrorLog(
        err?.message || "Error en el escáner vegetal con sistema botánico",
        err?.stack,
        { action: "handleTriggerAiDiagnosis", plantId: plant.id, plantName: plant.name }
      ).catch(e => console.error("Secondary error reporting failure", e));
      alert("No se pudo completar el análisis en este momento.");
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Calculate days since water
  const getDaysSinceWaterInfo = (plant: Plant) => {
    const lastWater = [...plant.careHistory].filter(h => h.type === "water")[0];
    if (!lastWater) return { label: "Sin registro", days: 999, isUrgent: true };
    const diffTime = Math.abs(new Date().getTime() - new Date(lastWater.date).getTime());
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (days === 0) return { label: "Hoy 💧", days: 0, isUrgent: false };
    if (days === 1) return { label: "Ayer", days: 1, isUrgent: false };
    if (days >= 6) return { label: `Hace ${days}d ⚠️`, days, isUrgent: true };
    return { label: `Hace ${days}d`, days, isUrgent: false };
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2 text-[#2C2723]">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-3xl border-4 border-[#F3EFE6] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center text-xl shadow-inner shrink-0 leading-none text-emerald-700">
            🌿
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-[#2C2723]">Mis Plantas del Nido</h2>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {plants.length} {plants.length === 1 ? "planta" : "plantas"}
              </span>
            </div>
            <p className="text-xs text-[#8A817C]">Control compacto de riego, nutrición y botánica en casa</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCreateModal && (
            <button
              id="btn-add-plant"
              onClick={onOpenCreateModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shrink-0 active:scale-95 transition-all cursor-pointer shadow-xs"
            >
              <Plus size={14} strokeWidth={3} /> Agregar Planta
            </button>
          )}

          <button
            onClick={() => {
              setIsBulkMode(!isBulkMode);
              setBulkSelectIds([]);
            }}
            className={`px-3 py-2 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer ${
              isBulkMode 
                ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" 
                : "bg-white border-[#E7E2D5] text-[#625B57] hover:bg-[#FAF7F2]"
            }`}
          >
            {isBulkMode ? "✕ Salir" : "⚡ Acción Masiva"}
          </button>
        </div>
      </div>

      {/* 🐾 MILO PLANT CARE & ANALYSIS BANNER */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 text-white p-4 sm:p-5 rounded-3xl shadow-sm space-y-3 relative overflow-hidden border border-emerald-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-800/80 border border-emerald-600/40 flex items-center justify-center text-xl shrink-0 shadow-inner">
              🐾
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm text-emerald-100 flex items-center gap-1.5">
                  Análisis Botánico Milo AI
                  <Sparkles size={14} className="text-amber-300" />
                </h3>
                {unknownPlantsList.length > 0 && (
                  <span className="bg-amber-400 text-amber-950 font-black text-[10px] px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                    ⚠️ {unknownPlantsList.length} por identificar
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-200/90 max-w-xl leading-relaxed mt-0.5">
                Milo analiza periódicamente si una planta ha sido registrada, sugiriendo cuidados específicos por especie y enviando una notificación si detecta plantas desconocidas por clasificar.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRunMiloAnalysis}
            disabled={isAnalyzingWithMilo || plants.length === 0}
            className="bg-amber-400 hover:bg-amber-300 active:scale-95 text-amber-950 text-xs font-extrabold px-4 py-2.5 rounded-2xl transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
          >
            {isAnalyzingWithMilo ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-amber-950 border-t-transparent rounded-full animate-spin" />
                <span>Milo analizando jardín...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Analizar Jardín con Milo</span>
              </>
            )}
          </button>
        </div>

        {miloAnalysisMsg && (
          <div className="bg-emerald-900/80 border border-emerald-600/50 p-3 rounded-2xl text-xs text-emerald-100 flex items-start gap-2 animate-fade-in">
            <Info size={15} className="text-emerald-300 shrink-0 mt-0.5" />
            <span className="flex-1 font-medium leading-normal">{miloAnalysisMsg}</span>
            <button 
              type="button"
              onClick={() => setMiloAnalysisMsg(null)}
              className="text-emerald-400 hover:text-white font-bold text-xs cursor-pointer ml-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ACCIÓN MASIVA/BULK BAR */}
      {isBulkMode && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-4 space-y-3 shadow-xs animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-2">
            <div>
              <h3 className="font-extrabold text-sm text-emerald-950">🪴 Cuidado en Grupo</h3>
              <p className="text-xs text-emerald-800">Selecciona las plantas que vas a regar o nutrir hoy:</p>
            </div>

            <div className="flex bg-white px-2 py-1 border border-emerald-200 rounded-xl gap-2 text-xs font-semibold">
              <button 
                type="button"
                onClick={() => setBulkActionType("water")}
                className={`px-3 py-1 rounded-lg transition-all ${bulkActionType === 'water' ? 'bg-blue-100 text-blue-800 font-bold' : 'text-gray-600'}`}
              >
                💧 Regar
              </button>
              <button 
                type="button"
                onClick={() => setBulkActionType("fertilize")}
                className={`px-3 py-1 rounded-lg transition-all ${bulkActionType === 'fertilize' ? 'bg-amber-100 text-amber-800 font-bold' : 'text-gray-600'}`}
              >
                🌿 Nutrir
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {plants.map(p => {
              const isSelected = bulkSelectIds.includes(p.id);
              const speciesResolved = resolveSpeciesName(p.name, p.species);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleToggleBulkSelect(p.id)}
                  className={`p-2.5 rounded-2xl border-2 text-left transition-all cursor-pointer text-xs relative flex items-center gap-2.5 ${
                    isSelected ? "bg-white border-emerald-500 shadow-sm ring-2 ring-emerald-200" : "bg-white/60 border-[#E7E2D5] text-[#625B57]"
                  }`}
                >
                  <img 
                    src={p.photoUrl || "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=150&q=80"} 
                    alt={p.name}
                    className="w-9 h-9 rounded-xl object-cover shrink-0 border border-emerald-100"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#2C2723] truncate leading-tight">{p.name}</p>
                    <p className="text-[9.5px] text-[#8A817C] truncate">{speciesResolved}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] shrink-0 ${
                    isSelected ? "bg-emerald-600 border-emerald-600 text-white font-bold" : "border-gray-300"
                  }`}>
                    {isSelected && "✓"}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button 
              type="button"
              onClick={() => setIsBulkMode(false)}
              className="px-3.5 py-1.5 bg-white border border-[#E7E2D5] rounded-xl text-xs font-bold text-[#8A817C] cursor-pointer hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRunBulkAction}
              disabled={bulkSelectIds.length === 0}
              className="px-4 py-1.5 bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer hover:bg-emerald-700 flex items-center gap-1.5"
            >
              <span>Confirmar ({bulkSelectIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* 🪴 PLANT GRID / SLEEK COMPACT CARDS */}
      {plants.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl border-4 border-[#F3EFE6] shadow-xs flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
            🪴
          </div>
          <h3 className="text-base font-extrabold text-[#2C2723]">¡Aún no hay plantas en tu nido!</h3>
          <p className="text-xs text-[#8A817C] max-w-sm">
            Registra tus plantas para darles seguimiento de riego, luz e identificar sus especies facilmente.
          </p>
          {onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Plus size={14} strokeWidth={3} /> Registrar Primera Planta
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {plants.map((plant) => {
            const waterInfo = getDaysSinceWaterInfo(plant);
            const speciesResolved = resolveSpeciesName(plant.name, plant.species);
            const spLower = (plant.species || "").toLowerCase().trim();
            const isUnknownSpecies = !plant.species || 
              spLower.includes("desconocid") || 
              spLower.includes("por identificar") || 
              spLower.includes("identificando") || 
              spLower.includes("sin especie") || 
              spLower === "planta de interior" || 
              spLower === plant.name.toLowerCase().trim();

            return (
              <div
                key={plant.id}
                className={`bg-white rounded-2xl border-2 transition-all flex flex-col justify-between overflow-hidden group relative ${
                  isUnknownSpecies ? "border-amber-300 bg-amber-50/20 shadow-2xs" : "border-[#E7E2D5] hover:border-emerald-300 shadow-2xs hover:shadow-md"
                }`}
              >
                {/* Clickable Card Body */}
                <div 
                  onClick={() => {
                    setSelectedPlantModal(plant);
                    setDiagnosticResult(null);
                  }}
                  className="p-3 cursor-pointer flex flex-col space-y-2.5 flex-1"
                >
                  {/* Small Header Avatar + Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-[#E7E2D5]">
                      <img 
                        src={plant.photoUrl || "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=200&q=80"} 
                        alt={plant.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                        waterInfo.isUrgent 
                          ? "bg-rose-100 text-rose-800 border-rose-200 animate-pulse" 
                          : waterInfo.days === 0 
                          ? "bg-blue-100 text-blue-800 border-blue-200" 
                          : "bg-emerald-50 text-emerald-800 border-emerald-200"
                      }`}>
                        {waterInfo.label}
                      </span>

                      {isUnknownSpecies && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleIdentifyWithAi(plant.id);
                          }}
                          disabled={isIdentifyingAi === plant.id}
                          className="text-[9px] font-black text-amber-950 bg-amber-200 hover:bg-amber-300 border border-amber-400 px-2 py-0.5 rounded-lg cursor-pointer transition-all flex items-center gap-1 active:scale-95 shadow-2xs"
                          title="Pedir a Milo que identifique esta especie"
                        >
                          {isIdentifyingAi === plant.id ? (
                            <span>Analizando...</span>
                          ) : (
                            <>
                              <Sparkles size={10} className="text-amber-800" />
                              <span>Identificar</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Species */}
                  <div className="space-y-0.5">
                    <h3 className="font-extrabold text-xs text-[#2C2723] leading-tight truncate group-hover:text-emerald-700 transition-colors flex items-center gap-1">
                      <span>{plant.emoji || "🪴"}</span>
                      <span className="truncate">{plant.name}</span>
                    </h3>
                    <p className="text-[10px] text-[#8A817C] italic truncate font-medium">
                      {speciesResolved}
                    </p>
                  </div>
                </div>

                {/* Direct Action Footer: Regar en 1 click */}
                <div className="px-3 pb-3 pt-1 border-t border-[#FAF7F2] flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSingleAction(plant.id, "water", defaultUser);
                    }}
                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold py-1.5 px-2 rounded-xl border border-blue-200/60 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    title="Regar hoy"
                  >
                    <Droplet size={11} /> Regar
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      askConfirmation(
                        "Eliminar Planta 🌱",
                        `¿Deseas eliminar a ${plant.name} del jardín?`,
                        () => handleDeletePlant(plant.id)
                      );
                    }}
                    className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                    title="Eliminar esta planta"
                  >
                    <Trash2 size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlantModal(plant);
                    }}
                    className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer"
                    title="Ver ficha resumida"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}


      {/* 📋 COMPACT SUMMARY MODAL (CUADRO PEQUEÑO RESUMIDO SIN FOTO GIGANTE) */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {selectedPlantModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-3xl border-4 border-[#F3EFE6] max-w-md w-full p-5 sm:p-6 shadow-2xl relative space-y-4 my-auto max-h-[90vh] flex flex-col text-[#2C2723]"
            >
              {/* MODAL HEADER: Compact thumbnail + Plant Name + Close */}
              <div className="flex items-center justify-between border-b border-[#F3EFE6] pb-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img 
                      src={selectedPlantModal.photoUrl || "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=150&q=80"} 
                      alt={selectedPlantModal.name}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-200 shadow-2xs"
                    />
                    <span className="absolute -bottom-1 -right-1 text-sm bg-white rounded-full p-0.5 shadow-2xs border border-gray-200">
                      {selectedPlantModal.emoji || "🪴"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-base text-[#2C2723] truncate flex items-center gap-1.5">
                      <span>{selectedPlantModal.name}</span>
                    </h3>
                    <p className="text-xs text-emerald-700 font-bold italic truncate">
                      {resolveSpeciesName(selectedPlantModal.name, selectedPlantModal.species)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEditPlant(selectedPlantModal)}
                    className="p-1.5 hover:bg-amber-50 text-amber-700 rounded-full cursor-pointer transition-all"
                    title="Editar datos y emoji de la planta"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedPlantModal(null);
                      setEditingPlantId("");
                    }}
                    className="p-1.5 hover:bg-[#FAF7F2] rounded-full text-gray-400 hover:text-black cursor-pointer transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* MODAL BODY CONTENT */}
              <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
                
                {/* 1. EDIT MODE FORM INSIDE MODAL */}
                {editingPlantId === selectedPlantModal.id ? (
                  <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-3">
                    <h4 className="font-extrabold text-xs text-amber-900 uppercase tracking-wider flex items-center gap-1">
                      ✏️ Modificar Datos y Emoji de la Planta
                    </h4>

                    {editError && (
                      <div className="bg-red-50 border border-red-200 text-red-800 text-[10px] p-2 rounded-xl font-bold">
                        ⚠️ {editError}
                      </div>
                    )}

                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] font-extrabold text-gray-600 block mb-1">Emoji Representativo:</label>
                        <div className="flex items-center gap-1 flex-wrap bg-white p-2 rounded-xl border border-[#E7E2D5]">
                          {["🪴", "🌿", "🌱", "🌺", "🌸", "🌵", "🍃", "🍀", "🌻", "🌾", "🌹", "🥀"].map((emo) => (
                            <button
                              key={emo}
                              type="button"
                              onClick={() => setEditEmoji(emo)}
                              className={`text-base p-1 rounded-lg transition-all cursor-pointer ${
                                editEmoji === emo ? "bg-amber-200 scale-120 border border-amber-400 font-bold" : "hover:bg-gray-100 opacity-80 hover:opacity-100"
                              }`}
                            >
                              {emo}
                            </button>
                          ))}
                          <div className="flex items-center gap-1 ml-auto bg-amber-100/60 px-2 py-0.5 rounded-lg border border-amber-200">
                            <span className="text-[9px] font-extrabold text-amber-900">Otro:</span>
                            <input
                              type="text"
                              value={editEmoji}
                              onChange={(e) => setEditEmoji(e.target.value)}
                              placeholder="emoji"
                              maxLength={4}
                              className="w-7 text-center text-xs font-extrabold bg-white border border-amber-300 rounded focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold text-gray-600 block mb-1">Nombre asignado:</label>
                        <input 
                          type="text" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-white rounded-xl p-2 text-xs border border-[#E7E2D5] font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold text-gray-600 block mb-1">Especie botánica:</label>
                        <input 
                          type="text" 
                          value={editSpecies}
                          onChange={(e) => setEditSpecies(e.target.value)}
                          className="w-full bg-white rounded-xl p-2 text-xs border border-[#E7E2D5] font-bold"
                          placeholder="ej: Monstera Deliciosa"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-extrabold text-gray-600 block mb-1">Riego recomendado:</label>
                          <input 
                            type="text" 
                            value={editWatering}
                            onChange={(e) => setEditWatering(e.target.value)}
                            className="w-full bg-white rounded-xl p-2 text-xs border border-[#E7E2D5]"
                            placeholder="ej: Cada 5 días"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-extrabold text-gray-600 block mb-1">Ubicación ideal:</label>
                          <input 
                            type="text" 
                            value={editLocation}
                            onChange={(e) => setEditLocation(e.target.value)}
                            className="w-full bg-white rounded-xl p-2 text-xs border border-[#E7E2D5]"
                            placeholder="ej: Luz indirecta"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button 
                        type="button"
                        onClick={() => setEditingPlantId("")}
                        className="px-3 py-1.5 bg-white border border-[#E7E2D5] text-gray-700 text-xs font-bold rounded-xl cursor-pointer hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleSavePlantEdit(selectedPlantModal.id)}
                        className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-emerald-700 shadow-xs flex items-center gap-1"
                      >
                        <Save size={12} /> Guardar Cambios
                      </button>
                    </div>
                  </div>
                ) : (
                  /* NORMAL MODAL VIEW: CLEAN SUMMARY CARDS */
                  <>
                    {/* Botón Destacado de Identificación / Corrección de Especie por IA */}
                    <button
                      type="button"
                      onClick={() => handleIdentifyWithAi(selectedPlantModal.id)}
                      disabled={isIdentifyingAi === selectedPlantModal.id}
                      className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs py-2.5 px-3 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
                    >
                      <Sparkles size={14} className={isIdentifyingAi === selectedPlantModal.id ? "animate-spin" : ""} />
                      <span>
                        {isIdentifyingAi === selectedPlantModal.id 
                          ? "Evaluando especie y cuidados con IA..." 
                          : "🤖 Evaluar y Corregir Especie con IA (Milo)"}
                      </span>
                    </button>

                    {/* Species Quick Fix Suggestion if needed */}
                    {(!selectedPlantModal.species || selectedPlantModal.species === "Especie por identificar" || selectedPlantModal.species === "Identificando..." || selectedPlantModal.species.toLowerCase().includes("planta de interior")) && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-black text-amber-900 flex items-center gap-1">
                            ⚡ Especie detectada para guardar:
                          </span>
                        </div>
                        <p className="text-xs font-bold text-amber-950">
                          {resolveSpeciesName(selectedPlantModal.name, selectedPlantModal.species)}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleQuickFixSpecies(selectedPlantModal, resolveSpeciesName(selectedPlantModal.name, selectedPlantModal.species))}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10.5px] px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Check size={12} /> Confirmar esta especie
                        </button>
                      </div>
                    )}

                    {/* Care Info Grid - CLEAN & UNTRUNCATED */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E7E2D5] space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1">
                          💧 Frecuencia & Riego
                        </span>
                        <p className="font-extrabold text-[#2C2723] text-xs leading-relaxed max-h-[140px] overflow-y-auto pr-1">
                          {selectedPlantModal.recommendedWatering || "Cada 5 a 7 días"}
                        </p>
                      </div>

                      <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E7E2D5] space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                          ☀️ Ubicación & Luz
                        </span>
                        <p className="font-extrabold text-[#2C2723] text-xs leading-relaxed max-h-[140px] overflow-y-auto pr-1">
                          {selectedPlantModal.idealLocation || "Luz indirecta brillante"}
                        </p>
                      </div>
                    </div>

                    {/* Quick Action Care Bar */}
                    <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100 space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950 block">
                        Registrar Cuidado Hoy:
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handleSingleAction(selectedPlantModal.id, "water", defaultUser)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Droplet size={12} /> Regar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSingleAction(selectedPlantModal.id, "fertilize", defaultUser)}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Layers size={12} /> Nutrir
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSingleAction(selectedPlantModal.id, "prune", defaultUser)}
                          className="bg-gray-700 hover:bg-gray-800 text-white font-extrabold text-xs py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Scissors size={12} /> Podar
                        </button>
                      </div>
                    </div>

                    {/* Escáner Botánico / Diagnostic Tool */}
                    <div className="bg-[#FAFDFB] p-3.5 rounded-2xl border border-emerald-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5">
                          <Sparkles size={14} className="text-emerald-500" /> Diagnóstico Botánico Milo
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTriggerAiDiagnosis(selectedPlantModal)}
                          disabled={isDiagnosing}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10.5px] font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Camera size={11} />
                          <span>{isDiagnosing ? "Analizando..." : "Escanear"}</span>
                        </button>
                      </div>

                      {/* File Upload drag area */}
                      {!isDiagnosing && (
                        <div 
                          onDragEnter={handleDrag}
                          onDragOver={handleDrag}
                          onDragLeave={handleDrag}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-xl p-2.5 text-center transition-all flex flex-col items-center justify-center gap-1 ${
                            dragActive ? "border-emerald-500 bg-emerald-50" : "border-[#E7E2D5] bg-white hover:border-emerald-300"
                          }`}
                        >
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                            accept="image/*"
                            className="hidden"
                          />
                          {imagePreviewUrl ? (
                            <div className="flex items-center gap-2">
                              <img src={imagePreviewUrl} alt="Muestra" className="w-10 h-10 rounded-lg object-cover border border-emerald-200" />
                              <span className="text-[10px] font-bold text-emerald-800">📸 Muestra cargada</span>
                              <button type="button" onClick={handleRemoveUploadedFile} className="text-red-500 hover:text-red-700 text-xs ml-1">✕</button>
                            </div>
                          ) : (
                            <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer text-[10.5px] font-semibold text-gray-500">
                              Subir foto de las hojas para diagnóstico 📷
                            </div>
                          )}
                        </div>
                      )}

                      {/* Diagnostic Result */}
                      {diagnosticResult && (
                        <div className="bg-white p-2.5 rounded-xl border border-emerald-200 space-y-1">
                          <p className="font-extrabold text-emerald-900 text-xs">
                            Resultado: {diagnosticResult.result === "healthy" ? "🟢 Saludable" : "🟡 Requiere atención"}
                          </p>
                          <p className="text-[10.5px] text-gray-600 leading-relaxed">
                            {diagnosticResult.recommendations?.join(". ")}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Care History */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">
                        Bitácora de cuidados recientes:
                      </span>
                      {selectedPlantModal.careHistory?.length === 0 ? (
                        <p className="text-[10.5px] text-gray-400 italic">No hay acciones registradas aún.</p>
                      ) : (
                        <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
                          {selectedPlantModal.careHistory?.slice(0, 4).map((action) => (
                            <div key={action.id} className="p-2 bg-[#FAF7F2] rounded-xl flex items-center justify-between text-[10.5px]">
                              <div className="flex items-center gap-1.5 font-bold">
                                <span>{action.type === 'water' ? '💧' : action.type === 'fertilize' ? '🌿' : '✂️'}</span>
                                <span className="capitalize">{action.type === 'water' ? 'Riego' : action.type === 'fertilize' ? 'Nutrición' : 'Poda'}</span>
                              </div>
                              <span className="text-gray-400 font-mono text-[9.5px]">
                                {new Date(action.date + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

              </div>

              {/* MODAL FOOTER: EDIT & DELETE BUTTONS */}
              <div className="flex items-center justify-between border-t border-[#F3EFE6] pt-3 shrink-0 text-xs">
                {editingPlantId !== selectedPlantModal.id && (
                  <>
                    <button
                      type="button"
                      onClick={() => startEditPlant(selectedPlantModal)}
                      className="text-gray-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer hover:bg-gray-50 px-2.5 py-1 rounded-xl transition-all"
                    >
                      <Edit2 size={12} /> Editar Ficha
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        askConfirmation(
                          "Eliminar Planta 🌱",
                          `¿Estás seguro de eliminar a ${selectedPlantModal.name}?`,
                          () => handleDeletePlant(selectedPlantModal.id)
                        );
                      }}
                      className="text-red-500 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer hover:bg-red-50 px-2.5 py-1 rounded-xl transition-all"
                    >
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
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
              className="bg-[#FCFAF7] border-4 border-[#F3EFE6] rounded-3xl p-6 max-w-sm w-full shadow-2xl relative text-center space-y-3"
            >
              <span className="inline-block text-3xl">🐾🌿</span>
              <h4 className="text-sm font-black text-[#2C2723] uppercase tracking-wider">
                {confirmDialog.title}
              </h4>
              <p className="text-xs text-[#625B57] leading-relaxed font-semibold">
                {confirmDialog.message}
              </p>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 py-2 rounded-xl cursor-pointer transition-all shadow-xs"
                >
                  Confirmar 🐾
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
