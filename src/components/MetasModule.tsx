import React, { useState } from "react";
import { createPortal } from "react-dom";
import { 
  Target, 
  Plus, 
  Trash2, 
  Edit2,
  X,
  CheckCircle2, 
  Circle, 
  Image as ImageIcon,
  User, 
  Grid, 
  ListTodo,
  Sparkles,
  Link as LinkIcon,
  Calendar,
  Layers,
  Heart,
  Pin
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Wish, UserProfile } from "../types";
import { createWish, updateWish, deleteWish } from "../api";
import { getAvatarEmojiChar } from "./Avatar";

interface MetasModuleProps {
  wishes: Wish[]; // We use the backend Wishes storage as our stable "Metas" store
  onRefreshData: () => void;
  users?: UserProfile[];
}

// Helper to get corresponding emoji for a meta/goal category
const getMetaEmoji = (meta: { goalCategory?: string; link?: string }) => {
  if (meta.link && !meta.link.startsWith("http")) {
    return meta.link; // User can type a custom emoji or short text
  }
  const cat = meta.goalCategory || "Otro";
  if (cat === "Cita") return "💞";
  if (cat === "Viaje") return "✈️";
  if (cat === "Hogar") return "🏠";
  if (cat === "Mascotas") return "🐾";
  if (cat === "Finanzas") return "💰";
  if (cat === "Salud") return "🧘";
  if (cat === "Proyectos") return "💼";
  if (cat === "Aprendizaje") return "📚";
  if (cat === "Hobbies") return "🎨";
  return "🎯";
};

export default function MetasModule({ wishes, onRefreshData, users = [] }: MetasModuleProps) {
  const user1 = users[0] || { id: "mafe", name: "Miembro 1", emoji: "🌸" };
  const user2 = users[1] || { id: "benja", name: "Miembro 2", emoji: "🦊" };
  // Mode selection: "vision" (Polaroid Grid/Pinboard) vs "checklist" (Cross-out Checklist)
  const [viewMode, setViewMode] = useState<"vision" | "checklist">("vision");
  
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
  
  // Tab filters
  const [activeTab, setActiveTab] = useState<string>("all");
  const [timeframeFilter, setTimeframeFilter] = useState<"all" | "semana" | "mes" | "año" | "custom" | "citas" | "deseo">("all");
  const [selectedGoalCategory, setSelectedGoalCategory] = useState<string>("all");

  const getCategoryStyles = (gCat: string | undefined, isCompleted: boolean) => {
    const cat = gCat || "Otro";
    const schemes: Record<string, { bg: string; border: string; hover: string; text: string; badge: string; badgeText: string; completedBg: string; completedBorder: string; completedText: string }> = {
      "Cita": {
        bg: "bg-[#FFF0F2]",
        border: "border-rose-300",
        hover: "hover:bg-[#FFE1E5] hover:border-rose-450",
        text: "text-rose-950",
        badge: "bg-rose-100 border-rose-300",
        badgeText: "text-rose-900",
        completedBg: "bg-rose-100/80",
        completedBorder: "border-rose-400",
        completedText: "text-rose-950"
      },
      "Viaje": {
        bg: "bg-[#EAF5FF]",
        border: "border-sky-300",
        hover: "hover:bg-[#D6ECFF] hover:border-sky-450",
        text: "text-sky-950",
        badge: "bg-sky-100 border-sky-300",
        badgeText: "text-sky-900",
        completedBg: "bg-sky-100/80",
        completedBorder: "border-sky-400",
        completedText: "text-sky-950"
      },
      "Hogar": {
        bg: "bg-[#EEFBEF]",
        border: "border-emerald-300",
        hover: "hover:bg-[#D5F7D8] hover:border-emerald-450",
        text: "text-emerald-950",
        badge: "bg-emerald-100 border-emerald-300",
        badgeText: "text-emerald-900",
        completedBg: "bg-emerald-100/80",
        completedBorder: "border-emerald-400",
        completedText: "text-emerald-950"
      },
      "Mascotas": {
        bg: "bg-[#F6EEFF]",
        border: "border-purple-300",
        hover: "hover:bg-[#ECE0FF] hover:border-purple-450",
        text: "text-purple-950",
        badge: "bg-purple-100 border-purple-300",
        badgeText: "text-purple-900",
        completedBg: "bg-purple-100/80",
        completedBorder: "border-purple-400",
        completedText: "text-purple-950"
      },
      "Finanzas": {
        bg: "bg-[#ECFDF5]",
        border: "border-teal-300",
        hover: "hover:bg-[#D1FAE5] hover:border-teal-450",
        text: "text-teal-950",
        badge: "bg-teal-100 border-teal-300",
        badgeText: "text-teal-900",
        completedBg: "bg-teal-100/80",
        completedBorder: "border-teal-400",
        completedText: "text-teal-950"
      },
      "Salud": {
        bg: "bg-[#F0FDFA]",
        border: "border-cyan-300",
        hover: "hover:bg-[#CCFBF1] hover:border-cyan-450",
        text: "text-cyan-950",
        badge: "bg-cyan-100 border-cyan-300",
        badgeText: "text-cyan-900",
        completedBg: "bg-cyan-100/80",
        completedBorder: "border-cyan-400",
        completedText: "text-cyan-950"
      },
      "Proyectos": {
        bg: "bg-[#EEF2FF]",
        border: "border-[#C7D2FE]",
        hover: "hover:bg-[#E0E7FF]",
        text: "text-indigo-950",
        badge: "bg-indigo-100 border-indigo-300",
        badgeText: "text-indigo-900",
        completedBg: "bg-indigo-100/80",
        completedBorder: "border-indigo-400",
        completedText: "text-indigo-950"
      },
      "Aprendizaje": {
        bg: "bg-[#FFF7ED]",
        border: "border-orange-300",
        hover: "hover:bg-[#FFEDD5]",
        text: "text-orange-950",
        badge: "bg-orange-100 border-orange-300",
        badgeText: "text-orange-900",
        completedBg: "bg-orange-100/80",
        completedBorder: "border-orange-400",
        completedText: "text-orange-950"
      },
      "Hobbies": {
        bg: "bg-[#FDF2F8]",
        border: "border-pink-300",
        hover: "hover:bg-[#FCE7F3]",
        text: "text-pink-950",
        badge: "bg-pink-100 border-pink-300",
        badgeText: "text-pink-900",
        completedBg: "bg-pink-100/80",
        completedBorder: "border-pink-400",
        completedText: "text-pink-950"
      },
      "Otro": {
        bg: "bg-[#FFF9E6]",
        border: "border-amber-300",
        hover: "hover:bg-[#FFF1C2] hover:border-amber-450",
        text: "text-amber-950",
        badge: "bg-amber-100 border-amber-300",
        badgeText: "text-amber-900",
        completedBg: "bg-amber-100/80",
        completedBorder: "border-amber-400",
        completedText: "text-amber-950"
      }
    };

    const activeScheme = schemes[cat] || schemes["Otro"];

    if (isCompleted) {
      return {
        cardClass: `${activeScheme.completedBg} ${activeScheme.completedBorder} opacity-95 shadow-sm border-2`,
        badgeClass: activeScheme.badge,
        badgeTextClass: activeScheme.badgeText,
        titleClass: "line-through text-gray-500/80 font-semibold"
      };
    } else {
      return {
        cardClass: `${activeScheme.bg} ${activeScheme.border} ${activeScheme.hover} border-2 border-solid`,
        badgeClass: activeScheme.badge,
        badgeTextClass: activeScheme.badgeText,
        titleClass: `${activeScheme.text} font-extrabold`
      };
    }
  };
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Meta del Año"); // Plazo options: "1 Semana", "1 Mes", "Meta del Año", "Citas / Meta en Pareja", "Deseo General", "Personalizable"
  const [customPlazo, setCustomPlazo] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("Enero");
  const [owner, setOwner] = useState<string>("Hogar");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [goalCategory, setGoalCategory] = useState<string>("Cita");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [customCategoryEmoji, setCustomCategoryEmoji] = useState("🎯");

  // Editing Meta state
  const [editingMeta, setEditingMeta] = useState<Wish | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("Meta del Año");
  const [editCustomPlazo, setEditCustomPlazo] = useState("");
  const [editSelectedMonth, setEditSelectedMonth] = useState("Enero");
  const [editOwner, setEditOwner] = useState<string>("Hogar");
  const [editNotes, setEditNotes] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editGoalCategory, setEditGoalCategory] = useState<string>("Cita");
  const [editCustomCategoryName, setEditCustomCategoryName] = useState("");
  const [editCustomCategoryEmoji, setEditCustomCategoryEmoji] = useState("🎯");

  const startEditMeta = (meta: Wish) => {
    setEditingMeta(meta);
    setEditName(meta.name);
    
    if (meta.category && meta.category.startsWith("Meta del Mes")) {
      setEditCategory("Meta del Mes");
      const match = meta.category.match(/\(([^)]+)\)/);
      if (match) setEditSelectedMonth(match[1]);
      setEditCustomPlazo("");
    } else if (["1 Semana", "1 Mes", "Meta del Año", "Citas / Meta en Pareja", "Deseo General"].includes(meta.category)) {
      setEditCategory(meta.category);
      setEditCustomPlazo("");
    } else {
      setEditCategory("Personalizable");
      setEditCustomPlazo(meta.category || "");
    }

    setEditOwner(meta.owner || "Hogar");
    setEditNotes(meta.notes || "");
    setEditImageUrl(meta.link || "");

    const standardCats = ["Cita", "Viaje", "Hogar", "Mascotas", "Finanzas", "Salud", "Proyectos", "Aprendizaje", "Hobbies"];
    if (meta.goalCategory && !standardCats.includes(meta.goalCategory)) {
      setEditGoalCategory("custom");
      setEditCustomCategoryName(meta.goalCategory);
      setEditCustomCategoryEmoji(meta.link && !meta.link.startsWith("http") ? meta.link : "🎯");
    } else {
      setEditGoalCategory(meta.goalCategory || "Cita");
      setEditCustomCategoryName("");
      setEditCustomCategoryEmoji("🎯");
    }
  };

  const handleSaveMetaEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeta || !editName.trim()) return;

    let finalCategory = editCategory;
    if (editCategory === "Meta del Mes") {
      finalCategory = `Meta del Mes (${editSelectedMonth})`;
    } else if (editCategory === "Personalizable") {
      finalCategory = editCustomPlazo.trim() || "Plazo Personalizado";
    }

    const finalGoalCategory = editGoalCategory === "custom" 
      ? (editCustomCategoryName.trim() || "Especial")
      : editGoalCategory;

    const finalImage = editImageUrl.trim() || (editGoalCategory === "custom" ? (editCustomCategoryEmoji.trim() || "🎯") : "");

    await updateWish(editingMeta.id, {
      name: editName.trim(),
      category: finalCategory,
      owner: editOwner,
      notes: editNotes.trim() || undefined,
      link: finalImage || undefined,
      goalCategory: finalGoalCategory
    });

    setEditingMeta(null);
    onRefreshData();
  };

  const handleGoalCategoryChange = (newCat: string) => {
    setGoalCategory(newCat);
    if (newCat !== "custom") {
      setImageUrl(""); // Clear manual url if switching back
    }
  };

  // Local effect or helper for sparkles
  const [sparkleMetaId, setSparkleMetaId] = useState<string | null>(null);

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalCategory = category;
    if (category === "Meta del Mes") {
      finalCategory = `Meta del Mes (${selectedMonth})`;
    } else if (category === "Personalizable") {
      finalCategory = customPlazo.trim() || "Plazo Personalizado";
    }

    const finalGoalCategory = goalCategory === "custom" 
      ? (customCategoryName.trim() || "Especial")
      : goalCategory;

    const finalImage = imageUrl.trim() || (goalCategory === "custom" ? (customCategoryEmoji.trim() || "🎯") : "");

    // Save as wish in DB
    await createWish({
      name: name.trim(),
      category: finalCategory,
      owner,
      status: "desired", // default pending
      notes: notes.trim() || undefined,
      link: finalImage || undefined, // storing image path or page in the link property
      goalCategory: finalGoalCategory
    });

    // Reset Form
    setName("");
    setCategory("Meta del Año");
    setCustomPlazo("");
    setSelectedMonth("Enero");
    setOwner("Hogar");
    setNotes("");
    setImageUrl("");
    setGoalCategory("Cita");
    setCustomCategoryName("");
    setCustomCategoryEmoji("🎯");
    setIsCreateOpen(false);
    onRefreshData();
  };

  const handleToggleState = async (id: string, currentStatus: Wish["status"]) => {
    const newStatus = currentStatus === "purchased" ? "desired" : "purchased";
    
    if (newStatus === "purchased") {
      setSparkleMetaId(id);
      setTimeout(() => setSparkleMetaId(null), 1200);
    }
    
    await updateWish(id, { status: newStatus });
    onRefreshData();
  };

  const handleDeleteMeta = (id: string, name?: string) => {
    if (typeof window !== "undefined" && (window as any).requestDeleteWithConfirm) {
      (window as any).requestDeleteWithConfirm(
        "Eliminar Meta u Objetivo 🎯",
        "¿Estás seguro de que deseas eliminar esta meta del tablero de tu hogar?",
        async () => {
          await deleteWish(id);
          onRefreshData();
        },
        name
      );
    } else {
      deleteWish(id).then(() => onRefreshData());
    }
  };

  // Filter list
  const filteredMetas = wishes.filter(meta => {
    const matchesOwner = activeTab === "all" || meta.owner === activeTab;
    let matchesTimeframe = true;
    if (timeframeFilter === "semana") {
      matchesTimeframe = meta.category === "1 Semana" || meta.category === "Plazo 1 Semana" || (meta.category && meta.category.toLowerCase().includes("semana"));
    } else if (timeframeFilter === "mes") {
      matchesTimeframe = meta.category === "1 Mes" || meta.category === "Plazo 1 Mes" || (meta.category && meta.category.startsWith("Meta del Mes")) || (meta.category && meta.category.toLowerCase().includes("mes"));
    } else if (timeframeFilter === "año") {
      matchesTimeframe = meta.category === "Meta del Año" || (meta.category && meta.category.toLowerCase().includes("año"));
    } else if (timeframeFilter === "custom") {
      matchesTimeframe = !["1 Semana", "1 Mes", "Meta del Año"].includes(meta.category) && !meta.category?.startsWith("Meta del Mes");
    }
    
    // Support category filter
    const matchesGoalCategory = selectedGoalCategory === "all" || 
      (selectedGoalCategory === "Otro" 
        ? (!meta.goalCategory || meta.goalCategory === "Otro")
        : meta.goalCategory === selectedGoalCategory);

    return matchesOwner && matchesTimeframe && matchesGoalCategory;
  });

  // Dynamically build category filter options from default categories + custom categories in wishes
  const defaultCategories = [
    { id: "all", label: "Todas las categorías", emoji: "🌈" },
    { id: "Cita", label: "Citas / Pareja", emoji: "💞" },
    { id: "Deseo", label: "Deseos / Sueños", emoji: "🌟" },
    { id: "Viaje", label: "Viajes", emoji: "✈️" },
    { id: "Hogar", label: "Hogar", emoji: "🏠" },
    { id: "Mascotas", label: "Mascotas", emoji: "🐾" },
    { id: "Finanzas", label: "Finanzas", emoji: "💰" },
    { id: "Salud", label: "Salud", emoji: "🧘" },
    { id: "Proyectos", label: "Proyectos", emoji: "💼" },
    { id: "Aprendizaje", label: "Aprendizaje", emoji: "📚" },
    { id: "Hobbies", label: "Hobbies", emoji: "🎨" },
    { id: "Otro", label: "Otros", emoji: "✨" }
  ];

  const standardIds = defaultCategories.map(c => c.id);
  const customCategoriesFromWishes = Array.from(new Set(
    wishes
      .map(w => w.goalCategory)
      .filter((cat): cat is string => Boolean(cat) && !standardIds.includes(cat!))
  ));

  const categoryFilterOptions = [
    ...defaultCategories,
    ...customCategoriesFromWishes.map(cat => ({
      id: cat,
      label: cat,
      emoji: "✨"
    }))
  ];

  // Calculate statistics
  const totalCount = filteredMetas.length;
  const completedCount = filteredMetas.filter(m => m.status === "purchased").length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Group metas by their categories
  const getGroupedMetas = (metas: Wish[]) => {
    const groups: { [key: string]: { label: string; icon: string; items: Wish[] } } = {
      "Cita": { label: "Citas & Metas en Pareja 💞", icon: "💞", items: [] },
      "Viaje": { label: "Viajes & Aventuras ✈️", icon: "✈️", items: [] },
      "Hogar": { label: "Hogar & Proyectos 🏠", icon: "🏠", items: [] },
      "Mascotas": { label: "Mascotas & Peluditos 🐾", icon: "🐾", items: [] },
      "Finanzas": { label: "Finanzas & Ahorro 💰", icon: "💰", items: [] },
      "Salud": { label: "Salud & Bienestar 🧘", icon: "🧘", items: [] },
      "Proyectos": { label: "Proyectos & Trabajo 💼", icon: "💼", items: [] },
      "Aprendizaje": { label: "Aprendizaje & Cursos 📚", icon: "📚", items: [] },
      "Hobbies": { label: "Hobbies & Ocio 🎨", icon: "🎨", items: [] },
      "Otro": { label: "Otros Propósitos & Deseos 🌟", icon: "🌟", items: [] }
    };

    const customGroups: { [key: string]: { label: string; icon: string; items: Wish[] } } = {};

    metas.forEach(meta => {
      const gCat = meta.goalCategory || "Otro";
      if (groups[gCat]) {
        groups[gCat].items.push(meta);
      } else {
        if (!customGroups[gCat]) {
          customGroups[gCat] = { label: `${gCat} ✨`, icon: "✨", items: [] };
        }
        customGroups[gCat].items.push(meta);
      }
    });

    const resultList = Object.entries(groups).filter(([_, group]) => group.items.length > 0);
    Object.entries(customGroups).forEach(([key, group]) => {
      if (group.items.length > 0) {
        resultList.push([key, group]);
      }
    });

    return resultList;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      
      {/* 1. TITLE & SUMMARY CARD */}
      <div className="bg-gradient-to-br from-[#FEFAF4] to-[#FFFCF7] p-6 rounded-3xl border-4 border-[#F3EFE6] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-500">
              <Target className="w-6 h-6 animate-pulse" />
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#2C2723] tracking-tight">
                Tablero de Metas &amp; Vision Board 🎯
              </h2>
              <p className="text-xs sm:text-sm text-[#8A817C] font-semibold leading-relaxed">
                Nuestras intenciones, sueños y metas tachalbes para este año y mes. ¡Logrémoslo juntos!
              </p>
            </div>
          </div>
        </div>

        {/* Action controls & Stats */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Progress Tracker Widget */}
          <div className="bg-white px-4 py-2 rounded-2xl border-2 border-[#F3EFE6] min-w-[140px] shadow-xs">
            <div className="flex justify-between items-center text-[10px] uppercase font-black text-[#8A817C]">
              <span>Progreso Real</span>
              <span className="font-mono text-rose-600">{completedCount}/{totalCount}</span>
            </div>
            <div className="w-full bg-[#FAF7F2] h-2 rounded-full mt-1 overflow-hidden border border-gray-100">
              <div 
                className="bg-gradient-to-r from-rose-500 to-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[9px] font-bold text-rose-600 block mt-1 text-right">{progressPercent}% completado</span>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-black px-4 py-3.5 rounded-2xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} /> Proponer Meta
          </button>
        </div>
      </div>

      {/* 2. SUB NAVIGATION RAILS: FILTERS AND VIEW MODE */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FAF7F2] p-2 rounded-2xl border-2 border-[#F3EFE6]">
        
        {/* Filters Group */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {/* OWNER TABS */}
          <div className="bg-white p-0.5 rounded-xl border border-[#EAE5D9] flex gap-0.5 shadow-2xs">
            {[
              { id: "all", label: "Todo" },
              { id: user1.name, label: `${getAvatarEmojiChar(user1.emoji || "✨")} ${user1.name}` },
              { id: user2.name, label: `${getAvatarEmojiChar(user2.emoji || "✨")} ${user2.name}` },
              { id: "Hogar", label: "🏡 Juntos" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-1.5 px-3 rounded-lg text-[11px] font-black tracking-tight transition-all cursor-pointer ${
                  activeTab === tab.id 
                    ? "bg-rose-500 text-white shadow-sm" 
                    : "text-[#625B57] hover:text-[#2C2723]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TIMEFRAME FILTER DROPDOWN OR BUTTONS */}
          <div className="bg-white p-0.5 rounded-xl border border-[#EAE5D9] flex gap-0.5 shadow-2xs">
            {([
              { id: "all", label: "Todo Plazo" },
              { id: "semana", label: "⚡ 1 Semana" },
              { id: "mes", label: "🌙 1 Mes" },
              { id: "año", label: "🗓️ 1 Año" },
              { id: "custom", label: "✏️ Personalizado" }
            ] as const).map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeframeFilter(tf.id)}
                className={`py-1.5 px-3 rounded-lg text-[11px] font-black tracking-tight transition-all cursor-pointer ${
                  timeframeFilter === tf.id 
                    ? "bg-amber-500 text-white shadow-sm" 
                    : "text-[#625B57] hover:text-[#2C2723]"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* CATEGORY FILTER TABS */}
          <div className="bg-white p-0.5 rounded-xl border border-[#EAE5D9] flex gap-0.5 shadow-2xs overflow-x-auto max-w-full no-scrollbar">
            {categoryFilterOptions.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedGoalCategory(cat.id)}
                className={`py-1.5 px-2.5 rounded-lg text-[10px] sm:text-[11px] font-black tracking-tight transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  selectedGoalCategory === cat.id 
                    ? "bg-purple-600 text-white shadow-sm" 
                    : "text-[#625B57] hover:text-[#2C2723]"
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* VIEW MODE TOGGLE (Vision Board Pinboard vs Checklist) */}
        <div className="bg-white p-1 rounded-xl border border-[#EAE5D9] flex gap-1 self-start sm:self-auto shadow-2xs">
          <button
            onClick={() => setViewMode("vision")}
            className={`flex items-center gap-1 py-1.5 px-3 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
              viewMode === "vision" 
                ? "bg-rose-50 text-rose-700 border border-rose-200" 
                : "text-[#8A817C] hover:text-[#2C2723] border border-transparent"
            }`}
          >
            <Grid size={13} /> Vision Board
          </button>
          
          <button
            onClick={() => setViewMode("checklist")}
            className={`flex items-center gap-1 py-1.5 px-3 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
              viewMode === "checklist" 
                ? "bg-rose-50 text-rose-700 border border-rose-200" 
                : "text-[#8A817C] hover:text-[#2C2723] border border-transparent"
            }`}
          >
            <ListTodo size={13} /> Lista Tachable
          </button>
        </div>

      </div>

      {/* 3. METAS MAIN FEED */}
      {filteredMetas.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-4 border-[#F3EFE6] space-y-3 shadow-xs">
          <span className="text-5xl inline-block animate-bounce">🎯</span>
          <p className="text-sm font-black text-[#5C5551]">No hay metas agregadas con estos filtros.</p>
          <p className="text-xs text-[#8A817C] font-semibold">¡Añade metas del año u objetivos del mes para visualizar tu progreso miau!</p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-2 inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border-2 border-rose-200 rounded-xl px-4 py-2 text-xs font-bold cursor-pointer hover:bg-rose-100"
          >
            <Plus size={13} /> Crear Primera Meta
          </button>
        </div>
      ) : (
        <div className="relative">
          {viewMode === "vision" ? (
            /* BINGO BOARD VISION BOARD VIEW */
            <div className="space-y-12 animate-fade-in">
              {getGroupedMetas(filteredMetas).map(([categoryKey, group]) => (
                <div key={categoryKey} className="space-y-5 bg-[#FFFDFB] p-5 sm:p-7 rounded-3xl border-4 border-[#F3EFE6] shadow-xs relative overflow-hidden">
                  {/* Category Group Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-dashed border-[#F3EFE6] pb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl p-1.5 bg-rose-50 rounded-xl text-rose-500 font-bold border border-rose-100 flex items-center justify-center">
                        {group.icon}
                      </span>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-[#2C2723] uppercase tracking-wider">
                          {group.label}
                        </h3>
                        <p className="text-[11px] text-[#8A817C] font-semibold">Toca cualquier ficha para tacharla de tu bingo de vida 🎯</p>
                      </div>
                    </div>
                    
                    <div className="text-[10px] font-black text-rose-600 bg-[#FFF0F2] px-3.5 py-1.5 rounded-full border border-rose-100 inline-flex items-center gap-1 self-start sm:self-auto shadow-2xs">
                      <span>🎯 Logradas:</span>
                      <span className="font-mono text-xs text-rose-700">{group.items.filter(i => i.status === "purchased").length} de {group.items.length}</span>
                    </div>
                  </div>

                  {/* Bingo Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <AnimatePresence>
                      {group.items.map(meta => {
                        const isCompleted = meta.status === "purchased";
                        const hasInspirationImage = meta.link && meta.link.startsWith("http");
                        const styles = getCategoryStyles(meta.goalCategory, isCompleted);

                        return (
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            key={meta.id}
                            onClick={() => handleToggleState(meta.id, meta.status)}
                            className={`group relative aspect-square rounded-2xl flex flex-col justify-between p-3.5 cursor-pointer select-none transition-all duration-300 transform hover:-translate-y-1 hover:shadow-md overflow-hidden ${styles.cardClass}`}
                          >
                            {/* FULL BACKGROUND IMAGE (Occupies entire square) */}
                            {hasInspirationImage ? (
                              <>
                                <img 
                                  src={meta.link} 
                                  alt={meta.name} 
                                  className="absolute inset-0 w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500 z-0"
                                  referrerPolicy="no-referrer"
                                />
                                {/* Scrim / Gradient overlay for text readability */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/30 rounded-2xl pointer-events-none z-0" />
                              </>
                            ) : null}

                            {/* Little top left owner tag / emoji indicator */}
                            <div className="relative z-10 flex items-center gap-1">
                              <span 
                                className={`text-[10px] w-5.5 h-5.5 flex items-center justify-center rounded-full shadow-sm border ${
                                  meta.owner === user1.name 
                                    ? "bg-rose-50 text-rose-700 border-rose-200" 
                                    : meta.owner === user2.name 
                                    ? "bg-blue-50 text-blue-700 border-blue-200" 
                                    : "bg-purple-50 text-purple-700 border-purple-200"
                                }`}
                                title={`Asignada a: ${meta.owner === "Hogar" ? "Juntos" : meta.owner}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {meta.owner === user1.name ? getAvatarEmojiChar(user1.emoji || "🌸") :
                                 meta.owner === user2.name ? getAvatarEmojiChar(user2.emoji || "🦊") : "🏡"}
                              </span>
                            </div>

                            {/* Top right edit and delete buttons - visible on mobile / touch */}
                            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-all">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditMeta(meta);
                                }}
                                className="p-1 bg-white/90 hover:bg-blue-50 text-blue-600 hover:text-blue-800 rounded-lg cursor-pointer transition-all shadow-2xs"
                                title="Editar Meta"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // don't toggle status
                                  askConfirmation(
                                    "Eliminar Intención",
                                    `¿Quitar la meta "${meta.name}" de tus intenciones?`,
                                    () => handleDeleteMeta(meta.id)
                                  );
                                }}
                                className="p-1 bg-white/90 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg cursor-pointer transition-all shadow-2xs"
                                title="Quitar Meta"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>

                            {/* Centered Emoji when there is no background photo */}
                            {!hasInspirationImage && (
                              <div className="flex-1 flex items-center justify-center my-auto">
                                <span className="text-4xl sm:text-5xl transform group-hover:scale-110 transition-transform">
                                  {getMetaEmoji(meta)}
                                </span>
                              </div>
                            )}

                            {/* Bottom Title & Category Tag */}
                            <div className="relative z-10 text-center pt-1 mt-auto">
                              {meta.goalCategory && (
                                <span className={`text-[8px] sm:text-[9px] font-black tracking-wide border rounded-md px-1.5 py-0.5 inline-block mb-1 shadow-2xs ${
                                  hasInspirationImage 
                                    ? "bg-black/40 backdrop-blur-xs text-white border-white/30" 
                                    : `${styles.badgeClass} ${styles.badgeTextClass}`
                                }`}>
                                  {meta.goalCategory === "Cita" ? "💞 Cita" :
                                   meta.goalCategory === "Viaje" ? "✈️ Viaje" :
                                   meta.goalCategory === "Hogar" ? "🏠 Hogar" :
                                   meta.goalCategory === "Mascotas" ? "🐾 Mascotas" :
                                   `🌟 ${meta.goalCategory}`}
                                </span>
                              )}
                              <span className={`text-[10.5px] sm:text-[11.5px] font-black uppercase tracking-wide block line-clamp-2 leading-tight ${
                                hasInspirationImage 
                                  ? "text-white drop-shadow-md font-extrabold" 
                                  : styles.titleClass
                              }`}>
                                {meta.name}
                              </span>
                            </div>

                            {/* Hover info tooltip helper for notes */}
                            {meta.notes && (
                              <div className="absolute bottom-1 right-1 text-[10px] leading-none text-gray-400 group-hover:text-amber-500 transition-colors" title={meta.notes}>
                                💡
                              </div>
                            )}

                            {/* Sparkle completion animation */}
                            {sparkleMetaId === meta.id && (
                              <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-white/40 z-20">
                                <motion.div 
                                  initial={{ scale: 0.5, opacity: 1 }}
                                  animate={{ scale: 1.5, opacity: 0 }}
                                  className="bg-emerald-500 text-white rounded-full p-4"
                                >
                                  <Sparkles className="w-6 h-6 text-yellow-300" />
                                </motion.div>
                              </div>
                            )}

                            {/* BINGO TACHADO / LOGRADO OVERLAY */}
                            {isCompleted && (
                              <div className="absolute inset-0 bg-[#E91E63]/10 backdrop-blur-3xs rounded-2xl flex flex-col items-center justify-center p-1 select-none pointer-events-none">
                                {/* Diagonal transparent red line or bold stamp */}
                                <div className="border-4 border-[#E91E63] text-[#E91E63] font-black uppercase text-[10px] tracking-wider px-2 py-0.5 rounded-lg transform -rotate-12 shadow-sm scale-95 bg-white">
                                  ¡Lograda!
                                </div>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>

          ) : (
            
            /* SLICK TACHABLE CHECKLIST VIEW (Sleek List todo aesthetic) */
            <div className="bg-white rounded-3xl border-4 border-[#F3EFE6] p-6 space-y-4 shadow-sm">
              <div className="border-b border-[#FAF7F2] pb-3 flex justify-between items-center">
                <span className="text-xs uppercase font-black text-[#8A817C]">Checklist de Intenciones</span>
                <span className="text-xs text-rose-500 font-bold">{completedCount} logradas de {totalCount}</span>
              </div>

              <div className="divide-y divide-gray-100">
                {filteredMetas.map(meta => {
                  const isCompleted = meta.status === "purchased";
                  const hasInspirationImage = meta.link && meta.link.startsWith("http");
                  return (
                    <div 
                      key={meta.id} 
                      className={`py-3.5 flex items-center justify-between gap-4 group transition-colors ${
                        isCompleted ? "opacity-75 bg-slate-50/30" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleState(meta.id, meta.status)}
                          className="shrink-0 text-[#8A817C] hover:text-rose-500 cursor-pointer"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5.5 h-5.5 text-emerald-600 fill-emerald-50" />
                          ) : (
                            <Circle className="w-5.5 h-5.5 text-[#8A817C] hover:scale-105" />
                          )}
                        </button>

                        {/* Image / Emoji Thumbnail */}
                        <div className="shrink-0">
                          {hasInspirationImage ? (
                            <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#F3EFE6] bg-white p-0.5 shadow-xs">
                              <img 
                                src={meta.link} 
                                alt={meta.name} 
                                className="w-full h-full object-cover rounded-lg"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-xl border border-dashed border-[#EAE5D9] bg-[#FAF7F2] flex items-center justify-center text-lg shadow-xs">
                              {getMetaEmoji(meta)}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p onClick={() => handleToggleState(meta.id, meta.status)} className={`font-black text-xs sm:text-sm text-[#2C2723] cursor-pointer ${
                            isCompleted ? "line-through text-gray-400 font-normal" : ""
                          }`}>
                            {meta.name}
                          </p>
                          {meta.notes && (
                            <p className="text-[11px] text-[#8A817C] font-semibold truncate mt-0.5 max-w-xl">
                              💡 {meta.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Meta tags right aligned */}
                        {meta.goalCategory && (
                          <span className="text-[9px] font-black bg-[#FAF7F2] text-amber-800 border px-2 py-0.5 rounded-md hidden sm:inline">
                            {meta.goalCategory === "Cita" ? "💞 Cita" :
                             meta.goalCategory === "Viaje" ? "✈️ Viaje" :
                             meta.goalCategory === "Hogar" ? "🏠 Hogar" :
                             meta.goalCategory === "Mascotas" ? "🐾 Mascotas" :
                             `🌟 ${meta.goalCategory}`}
                          </span>
                        )}
                        
                        <span className="text-[9px] font-black bg-gray-50 text-gray-600 border px-2 py-0.5 rounded-md hidden sm:inline">
                          {meta.category}
                        </span>
                        
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                          meta.owner === user1.name ? "bg-rose-50 text-rose-700" :
                          meta.owner === user2.name ? "bg-blue-50 text-blue-700" :
                          "bg-purple-50 text-purple-700"
                        }`}>
                          {meta.owner === "Hogar" ? "🏡 Juntos" : meta.owner}
                        </span>

                        <button
                          onClick={() => startEditMeta(meta)}
                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg cursor-pointer transition-colors"
                          title="Editar Meta"
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          onClick={() => {
                            askConfirmation(
                              "Eliminar Meta",
                              `¿Estás seguro de que deseas eliminar la meta "${meta.name}"?`,
                              () => handleDeleteMeta(meta.id)
                            );
                          }}
                          className="p-1.5 hover:bg-rose-50 text-red-600 rounded-lg cursor-pointer transition-colors"
                          title="Eliminar Meta"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

          )}
        </div>
      )}

      {/* 4. MODAL FOR METAS CREATOR */}
      {isCreateOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[999] bg-black/35 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 transition-all animate-in fade-in duration-200">
          <div className="bg-[#FAF8F5] rounded-[28px] max-w-md w-full p-6 sm:p-7 border-2 border-[#E8E2D2] space-y-4 shadow-2xl shadow-stone-900/15 relative overflow-hidden text-[#2C2723]">
            {/* Note-card top decorative accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-1.5 bg-[#E2D8C3] rounded-b-lg opacity-80" />

            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D2]">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-rose-100/70 rounded-xl text-rose-700">
                  <Target size={18} />
                </span>
                <h3 className="font-extrabold text-base text-[#2C2723]">Proponer Nueva Meta</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-stone-400 hover:text-stone-800 font-extrabold text-xs cursor-pointer rounded-full p-1.5 hover:bg-stone-200/50 transition-colors"
                title="Cerrar"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSaveMeta} className="space-y-4">
              {/* Meta Description */}
              <div className="space-y-1.5 text-xs">
                <label className="block text-xs font-black uppercase tracking-wide text-[#8A817C]">¿Cuál es el Sueño o Proyecto?</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej: Aprender masa madre / Remodelar el balcón con luces"
                  className="w-full bg-[#FAF7F2] focus:ring-rose-200 focus:outline-none rounded-xl px-3 py-2.5 border-2 border-[#EAE5D9] text-xs font-bold text-[#2C2723]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Timeframe Scope */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase tracking-wide text-[#8A817C]">Plazo:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#FAF7F2] focus:outline-none rounded-xl px-3 py-2.5 border-2 border-[#EAE5D9] text-xs font-black text-[#2C2723]"
                  >
                    <option value="1 Semana">⚡ Plazo 1 Semana</option>
                    <option value="1 Mes">🌙 Plazo 1 Mes</option>
                    <option value="Meta del Año">🗓️ Plazo 1 Año (Meta del Año)</option>
                    <option value="Personalizable">✏️ Personalizable (Plazo a Medida)</option>
                  </select>
                </div>

                {/* Owner */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase tracking-wide text-[#8A817C]">Persona:</label>
                  <select
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="w-full bg-[#FAF7F2] focus:outline-none rounded-xl px-3 py-2.5 border-2 border-[#EAE5D9] text-xs font-black text-[#2C2723]"
                  >
                    <option value="Hogar">Compartida 🏡</option>
                    {users.map(u => (
                      <option key={u.id} value={u.name}>De {u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Plazo Field when Personalizable is selected */}
              {category === "Personalizable" && (
                <div className="space-y-1.5 text-xs animate-fade-in">
                  <label className="block text-xs font-black uppercase tracking-wide text-amber-700">Plazo Personalizado:</label>
                  <input
                    type="text"
                    required
                    value={customPlazo}
                    onChange={(e) => setCustomPlazo(e.target.value)}
                    placeholder="ej: 3 semanas, 6 meses, 15 días..."
                    className="w-full bg-[#FAF7F2] focus:outline-none rounded-xl px-3 py-2.5 border-2 border-[#EAE5D9] text-xs font-bold text-[#2C2723]"
                  />
                </div>
              )}

              {/* Month Selector when 1 Mes / Meta del Mes is chosen */}
              {(category === "Meta del Mes" || category === "1 Mes") && (
                <div className="space-y-1.5 text-xs animate-fade-in">
                  <label className="block text-xs font-black uppercase tracking-wide text-rose-600">¿Para qué mes del año?</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full bg-[#FAF7F2] focus:outline-none rounded-xl px-3 py-2.5 border-2 border-[#EAE5D9] text-xs font-black text-[#2C2723]"
                  >
                    {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5 text-xs">
                <label className="block text-xs font-black uppercase tracking-wide text-[#8A817C]">Notas e Inspiración (Opcional):</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ej: Comprar harina de fuerza fina, practicar cada sábado miau."
                  className="w-full bg-[#FAF7F2] focus:outline-none rounded-xl px-3 py-2 border-2 border-[#EAE5D9] text-xs font-semibold text-[#2C2723]"
                />
              </div>

              {/* Category of the Goal Selector */}
              <div className="space-y-2 text-xs border-t border-dashed border-gray-200 pt-3">
                <label className="block text-xs font-black uppercase tracking-wide text-[#8A817C]">Seleccionar Categoría:</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { id: "Cita", label: "Cita", emoji: "💖" },
                    { id: "Deseo", label: "Deseo", emoji: "🌟" },
                    { id: "Viaje", label: "Viaje", emoji: "✈️" },
                    { id: "Hogar", label: "Hogar", emoji: "🏠" },
                    { id: "Mascotas", label: "Mascotas", emoji: "🐾" },
                    { id: "Finanzas", label: "Finanzas", emoji: "💰" },
                    { id: "Salud", label: "Salud", emoji: "🧘" },
                    { id: "Proyectos", label: "Proyectos", emoji: "💼" },
                    { id: "Aprendizaje", label: "Cursos", emoji: "📚" },
                    { id: "Hobbies", label: "Hobbies", emoji: "🎨" },
                    { id: "custom", label: "+ Crear", emoji: "✨" }
                  ].map(cat => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => handleGoalCategoryChange(cat.id)}
                      className={`py-2 px-1 text-center rounded-xl font-bold border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        goalCategory === cat.id
                          ? "bg-rose-50 text-rose-950 border-rose-300 ring-2 ring-rose-200"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-[#FAF7F2]"
                      }`}
                    >
                      <span className="text-sm">{cat.emoji}</span>
                      <span className="text-[9px] font-black tracking-tight">{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Category Input Form */}
                {goalCategory === "custom" && (
                  <div className="bg-rose-50/60 p-3 rounded-2xl border-2 border-rose-200/80 space-y-2.5 mt-2 animate-in fade-in duration-150">
                    <p className="text-[11px] font-black text-rose-900">✨ Crear Categoría Personalizada:</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-rose-800">Nombre de Categoría:</label>
                        <input
                          type="text"
                          required
                          value={customCategoryName}
                          onChange={(e) => setCustomCategoryName(e.target.value)}
                          placeholder="ej: Deportes, Espiritualidad, Lecturas"
                          className="w-full bg-white focus:outline-none rounded-xl px-2.5 py-1.5 border border-rose-300 text-xs font-bold text-[#2C2723]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-rose-800">Emoji:</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={customCategoryEmoji}
                          onChange={(e) => setCustomCategoryEmoji(e.target.value)}
                          placeholder="🚴"
                          className="w-full bg-white focus:outline-none rounded-xl px-2 py-1.5 border border-rose-300 text-xs font-bold text-center text-[#2C2723]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Link de la imagen o Emoji de la Meta */}
              <div className="space-y-1.5 text-xs pt-1">
                <label className="block text-xs font-black uppercase tracking-wide text-[#8A817C] flex items-center gap-1">
                  <ImageIcon size={13} className="text-rose-600" /> Link de Imagen / URL o Emoji propio (Opcional):
                </label>
                <input 
                  type="text" 
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://... o un emoji personalizado miau 💖"
                  className="w-full bg-[#FAF7F2] focus:ring-rose-200 focus:outline-none rounded-xl px-3 py-2 border-2 border-[#EAE5D9] text-xs text-[#2C2723] font-semibold"
                />
                <p className="text-[10px] text-gray-400 font-semibold">Si no pones un link o un emoji propio, usaremos el emoji de la categoría por defecto miau. 🐾</p>
              </div>

              {/* Form buttons */}
              <div className="flex gap-2 justify-end pt-2 text-xs">
                <button 
                  type="button" 
                  onClick={() => setIsCreateOpen(false)} 
                  className="px-4 py-2 border border-[#EAE5D9] rounded-xl font-bold cursor-pointer hover:bg-gray-50 text-[#8A817C]"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-rose-500 text-white rounded-xl font-black cursor-pointer hover:bg-rose-600 shadow-sm"
                >
                  Guardar Meta 🎯
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT META MODAL */}
      {editingMeta && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999]">
          <div className="bg-white rounded-3xl border-4 border-[#F3EFE6] max-w-lg w-full p-6 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-rose-50 text-rose-600 rounded-xl text-lg font-bold">🎯</span>
                <div>
                  <h3 className="font-extrabold text-[#2C2723] text-sm sm:text-base">Editar Meta o Intención</h3>
                  <p className="text-[11px] text-[#8A817C]">Modifica los detalles de tu propósito miau 🐾</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingMeta(null)} 
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMetaEdit} className="space-y-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="block text-xs font-black uppercase tracking-wide text-[#8A817C]">Nombre de la Meta:</label>
                <input 
                  type="text" 
                  required 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ej. Comprar nuestro primer sofá juntos"
                  className="w-full bg-[#FAF7F2] focus:ring-rose-200 focus:outline-none rounded-xl px-3 py-2 border-2 border-[#EAE5D9] text-xs font-bold text-[#2C2723]"
                />
              </div>

              {/* Plazo Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-black uppercase tracking-wide text-[#8A817C]">Plazo:</label>
                  <select 
                    value={editCategory} 
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-[#FAF7F2] focus:ring-rose-200 focus:outline-none rounded-xl px-3 py-2 border-2 border-[#EAE5D9] text-xs font-bold text-[#2C2723]"
                  >
                    <option value="1 Semana">Plazo 1 Semana ⚡</option>
                    <option value="1 Mes">Plazo 1 Mes 🌙</option>
                    <option value="Meta del Año">Plazo 1 Año (Meta del Año) 🎆</option>
                    <option value="Personalizable">Personalizable ✏️</option>
                  </select>
                </div>

                {/* Specific Month selector if 1 Mes or Meta del Mes */}
                {(editCategory === "Meta del Mes" || editCategory === "1 Mes") ? (
                  <div className="space-y-1">
                    <label className="block text-xs font-black uppercase tracking-wide text-[#8A817C]">Mes Objetivo:</label>
                    <select 
                      value={editSelectedMonth} 
                      onChange={(e) => setEditSelectedMonth(e.target.value)}
                      className="w-full bg-[#FAF7F2] focus:ring-rose-200 focus:outline-none rounded-xl px-3 py-2 border-2 border-[#EAE5D9] text-xs font-bold text-[#2C2723]"
                    >
                      {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                ) : editCategory === "Personalizable" ? (
                  <div className="space-y-1">
                    <label className="block text-xs font-black uppercase tracking-wide text-amber-700">Plazo Personalizado:</label>
                    <input 
                      type="text" 
                      required 
                      value={editCustomPlazo}
                      onChange={(e) => setEditCustomPlazo(e.target.value)}
                      placeholder="ej: 3 semanas, 6 meses, 10 días..."
                      className="w-full bg-[#FAF7F2] focus:ring-amber-200 focus:outline-none rounded-xl px-3 py-2 border-2 border-[#EAE5D9] text-xs font-bold text-[#2C2723]"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="block text-xs font-black uppercase tracking-wide text-[#8A817C]">Asignado a:</label>
                    <select 
                      value={editOwner} 
                      onChange={(e) => setEditOwner(e.target.value)}
                      className="w-full bg-[#FAF7F2] focus:ring-rose-200 focus:outline-none rounded-xl px-3 py-2 border-2 border-[#EAE5D9] text-xs font-bold text-[#2C2723]"
                    >
                      <option value="Hogar">🏡 Todo el Hogar</option>
                      <option value={user1.name}>🌸 {user1.name}</option>
                      <option value={user2.name}>🦊 {user2.name}</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Goal Category selector */}
              <div className="space-y-2 text-xs border-t border-dashed border-gray-200 pt-3">
                <label className="block text-xs font-black uppercase tracking-wide text-[#8A817C]">Categoría de Meta:</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { id: "Cita", label: "Cita", emoji: "💖" },
                    { id: "Deseo", label: "Deseo", emoji: "🌟" },
                    { id: "Viaje", label: "Viaje", emoji: "✈️" },
                    { id: "Hogar", label: "Hogar", emoji: "🏠" },
                    { id: "Mascotas", label: "Mascotas", emoji: "🐾" },
                    { id: "Finanzas", label: "Finanzas", emoji: "💰" },
                    { id: "Salud", label: "Salud", emoji: "🧘" },
                    { id: "Proyectos", label: "Proyectos", emoji: "💼" },
                    { id: "Aprendizaje", label: "Cursos", emoji: "📚" },
                    { id: "Hobbies", label: "Hobbies", emoji: "🎨" },
                    { id: "custom", label: "+ Personal", emoji: "✨" }
                  ].map(cat => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setEditGoalCategory(cat.id)}
                      className={`p-1.5 rounded-xl border text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                        editGoalCategory === cat.id 
                          ? "bg-rose-500 text-white border-rose-600 shadow-2xs font-extrabold" 
                          : "bg-white border-[#EAE5D9] text-[#625B57] hover:border-rose-200"
                      }`}
                    >
                      <span>{cat.emoji}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Category Input Form */}
                {editGoalCategory === "custom" && (
                  <div className="bg-rose-50/60 p-3 rounded-2xl border-2 border-rose-200/80 space-y-2.5 mt-2 animate-in fade-in duration-150">
                    <p className="text-[11px] font-black text-rose-900">✨ Categoría Personalizada:</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-rose-800">Nombre de Categoría:</label>
                        <input
                          type="text"
                          required
                          value={editCustomCategoryName}
                          onChange={(e) => setEditCustomCategoryName(e.target.value)}
                          placeholder="ej: Deportes, Lectura"
                          className="w-full bg-white focus:outline-none rounded-xl px-2.5 py-1.5 border border-rose-300 text-xs font-bold text-[#2C2723]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-rose-800">Emoji:</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={editCustomCategoryEmoji}
                          onChange={(e) => setEditCustomCategoryEmoji(e.target.value)}
                          placeholder="🚴"
                          className="w-full bg-white focus:outline-none rounded-xl px-2 py-1.5 border border-rose-300 text-xs font-bold text-center text-[#2C2723]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Link or Emoji */}
              <div className="space-y-1.5 text-xs pt-1">
                <label className="block text-xs font-black uppercase tracking-wide text-[#8A817C] flex items-center gap-1">
                  <ImageIcon size={13} className="text-rose-600" /> Link de Imagen / URL o Emoji propio:
                </label>
                <input 
                  type="text" 
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  placeholder="https://... o emoji 💖"
                  className="w-full bg-[#FAF7F2] focus:ring-rose-200 focus:outline-none rounded-xl px-3 py-2 border-2 border-[#EAE5D9] text-xs text-[#2C2723] font-semibold"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1 text-xs">
                <label className="block text-xs font-black uppercase tracking-wide text-[#8A817C]">Notas / Detalles:</label>
                <textarea 
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Detalles sobre cómo planean cumplir esta meta..."
                  className="w-full bg-[#FAF7F2] focus:ring-rose-200 focus:outline-none rounded-xl px-3 py-2 border-2 border-[#EAE5D9] text-xs text-[#2C2723] font-semibold resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 justify-end pt-2 text-xs border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setEditingMeta(null)} 
                  className="px-4 py-2 border border-[#EAE5D9] rounded-xl font-bold cursor-pointer hover:bg-gray-50 text-[#8A817C]"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-rose-500 text-white rounded-xl font-black cursor-pointer hover:bg-rose-600 shadow-sm"
                >
                  Guardar Cambios 🎯
                </button>
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
              <span className="inline-block text-3xl mb-2">🐾🎯</span>
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
