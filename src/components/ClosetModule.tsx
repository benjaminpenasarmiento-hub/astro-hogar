import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shirt,
  Sparkles,
  Plus,
  Search,
  Heart,
  Calendar,
  Tag,
  Filter,
  Trash2,
  Edit3,
  Camera,
  Upload,
  Check,
  ShoppingBag,
  Layers,
  Sun,
  CloudRain,
  Briefcase,
  Glasses,
  Footprints,
  User,
  FolderPlus,
  X,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Star,
  Flame,
  Award,
  Sparkles as SparklesIcon,
  Eye,
  Info,
  Sliders,
  UserCheck,
  Smartphone,
  RefreshCw
} from "lucide-react";
import { ClosetGarment, ClosetCategory, SavedOutfit, WornOutfitLog, UserProfile } from "../types";
import {
  fetchClosetGarments,
  saveClosetGarment,
  deleteClosetGarment,
  fetchClosetCategories,
  saveClosetCategory,
  deleteClosetCategory,
  fetchSavedOutfits,
  saveSavedOutfit,
  deleteSavedOutfit,
  fetchWornOutfitLogs,
  recordWornOutfit,
  processClosetImageWithAI,
  generateOutfitWithAI,
  cleanGarmentBackground,
  generateVirtualTryOnImage
} from "../api";
import { compressImage, makeWhiteStudioCatalogImage } from "../utils/imageCompressor";

interface ClosetModuleProps {
  users?: UserProfile[];
  activeUserId?: string;
}

export default function ClosetModule({ users = [], activeUserId = "mafe" }: ClosetModuleProps) {
  // Navigation tabs within Closet
  const [closetTab, setClosetTab] = useState<"catalog" | "generator" | "analytics" | "journal">("catalog");

  // Filter state
  const [ownerFilter, setOwnerFilter] = useState<string>("todos"); // "todos" | "mafe" | "benja" | "ambos"
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [colorFilter, setColorFilter] = useState<string>("");
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false);

  // Data states
  const [garments, setGarments] = useState<ClosetGarment[]>([]);
  const [categories, setCategories] = useState<ClosetCategory[]>([]);
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
  const [wornLogs, setWornLogs] = useState<WornOutfitLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [selectedGarmentForDetail, setSelectedGarmentForDetail] = useState<ClosetGarment | null>(null);
  const [editingGarment, setEditingGarment] = useState<ClosetGarment | null>(null);

  // Add garment form state
  const [uploadImageBase64, setUploadImageBase64] = useState<string>("");
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [formName, setFormName] = useState<string>("");
  const [formOwnerId, setFormOwnerId] = useState<string>(activeUserId || "mafe");
  const [formCategory, setFormCategory] = useState<string>("Camisetas");
  const [formSubcategory, setFormSubcategory] = useState<string>("");
  const [formColor, setFormColor] = useState<string>("Negro");
  const [formTags, setFormTags] = useState<string[]>(["Casual"]);
  const [tagInput, setTagInput] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");
  const [formWhiteBgImage, setFormWhiteBgImage] = useState<string>("");
  const [formOriginalImage, setFormOriginalImage] = useState<string>("");
  const [formStyleDesc, setFormStyleDesc] = useState<string>("");
  const [isSavingGarment, setIsSavingGarment] = useState<boolean>(false);

  // New Category form state
  const [catNameInput, setCatNameInput] = useState<string>("");
  const [catIconInput, setCatIconInput] = useState<string>("Shirt");
  const [catColorInput, setCatColorInput] = useState<string>("#FFECEC");

  // Outfit Generator state
  const [genUser, setGenUser] = useState<string>(activeUserId || "mafe");
  const [genMode, setGenMode] = useState<"random" | "occasion" | "weather" | "style" | "baseGarment">("occasion");
  const [genOccasion, setGenOccasion] = useState<string>("Trabajo");
  const [genWeather, setGenWeather] = useState<string>("Templado");
  const [genStyle, setGenStyle] = useState<string>("Casual Chic");
  const [genBaseGarmentId, setGenBaseGarmentId] = useState<string>("");
  const [isGeneratingOutfit, setIsGeneratingOutfit] = useState<boolean>(false);
  const [generatedOutfit, setGeneratedOutfit] = useState<SavedOutfit | null>(null);
  const [hasLoggedToday, setHasLoggedToday] = useState<boolean>(false);

  // Virtual Try-On & Swiper state
  const [generatorSubTab, setGeneratorSubTab] = useState<"ai" | "tryon">("tryon");
  const [tryOnModel, setTryOnModel] = useState<"mafe" | "benja">(activeUserId === "benja" ? "benja" : "mafe");
  const [customModelPhoto, setCustomModelPhoto] = useState<string>("");
  const [selectedTopIndex, setSelectedTopIndex] = useState<number>(0);
  const [selectedBottomIndex, setSelectedBottomIndex] = useState<number>(0);
  const [selectedShoesIndex, setSelectedShoesIndex] = useState<number>(0);
  const [selectedAccessoryIndex, setSelectedAccessoryIndex] = useState<number>(0);
  const [isGeneratingTryOn, setIsGeneratingTryOn] = useState<boolean>(false);
  const [generatedTryOnImage, setGeneratedTryOnImage] = useState<string>("");
  const [isCleaningBg, setIsCleaningBg] = useState<boolean>(false);

  // Derived Virtual Try-On selections
  const userTryOnGarments = garments.filter(g => g.ownerId === tryOnModel || g.ownerId === "ambos");
  const tops = userTryOnGarments.filter(g => ["Camisetas", "Camisas", "Tops", "Buzos y sacos", "Chaquetas", "Vestidos"].includes(g.category));
  const bottoms = userTryOnGarments.filter(g => ["Pantalones", "Jeans", "Shorts", "Faldas", "Sudaderas"].includes(g.category));
  const shoesList = userTryOnGarments.filter(g => g.category === "Zapatos");
  const accs = userTryOnGarments.filter(g => g.category === "Accesorios");

  const activeTop = tops.length > 0 ? tops[Math.abs(selectedTopIndex) % tops.length] : null;
  const activeBottom = bottoms.length > 0 ? bottoms[Math.abs(selectedBottomIndex) % bottoms.length] : null;
  const activeShoes = shoesList.length > 0 ? shoesList[Math.abs(selectedShoesIndex) % shoesList.length] : null;
  const activeAcc = accs.length > 0 ? accs[Math.abs(selectedAccessoryIndex) % accs.length] : null;

  const handleShuffleTryOn = (t: ClosetGarment[], b: ClosetGarment[], s: ClosetGarment[], a: ClosetGarment[]) => {
    if (t.length > 0) setSelectedTopIndex(Math.floor(Math.random() * t.length));
    if (b.length > 0) setSelectedBottomIndex(Math.floor(Math.random() * b.length));
    if (s.length > 0) setSelectedShoesIndex(Math.floor(Math.random() * s.length));
    if (a.length > 0) setSelectedAccessoryIndex(Math.floor(Math.random() * a.length));
    setGeneratedTryOnImage("");
  };

  const handleTryOnPhotoClick = () => {
    const gIds: string[] = [];
    if (activeTop) gIds.push(activeTop.id);
    if (activeBottom) gIds.push(activeBottom.id);
    if (activeShoes) gIds.push(activeShoes.id);
    if (activeAcc) gIds.push(activeAcc.id);

    if (gIds.length === 0) {
      alert("Selecciona al menos una prenda para el probador.");
      return;
    }

    setIsGeneratingTryOn(true);
    generateVirtualTryOnImage({
      userModel: tryOnModel,
      garmentIds: gIds
    }).then(res => {
      if (res && res.imageUrl) {
        setGeneratedTryOnImage(res.imageUrl);
      }
    }).catch(err => {
      console.error("Error generating try-on photo:", err);
    }).finally(() => {
      setIsGeneratingTryOn(false);
    });
  };

  const handleSaveCurrentCombo = () => {
    const topIds = activeTop ? [activeTop.id] : [];
    const botId = activeBottom ? activeBottom.id : undefined;
    const shoeId = activeShoes ? activeShoes.id : undefined;
    const accIds = activeAcc ? [activeAcc.id] : [];

    const outfitPayload: SavedOutfit = {
      id: `outfit-${Date.now()}`,
      userId: tryOnModel,
      title: `Outfit ${tryOnModel === 'mafe' ? 'Mafe' : 'Benja'} - ${activeTop?.name || 'Combinación'}`,
      topGarmentIds: topIds,
      bottomGarmentId: botId,
      shoesGarmentId: shoeId,
      accessoryGarmentIds: accIds,
      explanation: `Combinación personalizada probada en Probador Virtual por ${tryOnModel === 'mafe' ? 'Mafe' : 'Benja'}.`,
      occasion: "Casual",
      isFavorite: true,
      createdAt: new Date().toISOString()
    };

    handleSaveOutfitToFavorites(outfitPayload);
  };

  // Load initial data
  const loadClosetData = async () => {
    setIsLoading(true);
    try {
      const [gData, cData, oData, lData] = await Promise.all([
        fetchClosetGarments(),
        fetchClosetCategories(),
        fetchSavedOutfits(),
        fetchWornOutfitLogs()
      ]);
      setGarments(gData || []);
      setCategories(cData || []);
      setSavedOutfits(oData || []);
      setWornLogs(lData || []);
    } catch (err) {
      console.error("Error loading closet data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClosetData();

    const handleRescued = (e: any) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setGarments(prev => {
          const existingIds = new Set(prev.map(g => g.id));
          const existingNames = new Set(prev.map(g => g.name.toLowerCase().trim()));
          const newGarments = (e.detail as ClosetGarment[]).filter(
            g => !existingIds.has(g.id) && !existingNames.has(g.name.toLowerCase().trim())
          );
          if (newGarments.length > 0) {
            return [...prev, ...newGarments];
          }
          return prev;
        });
      }
      loadClosetData();
    };

    window.addEventListener("astro-closet-rescued", handleRescued);
    window.addEventListener("astro-nest-remote-update", handleRescued);
    return () => {
      window.removeEventListener("astro-closet-rescued", handleRescued);
      window.removeEventListener("astro-nest-remote-update", handleRescued);
    };
  }, []);

  // Update formOwnerId when activeUserId changes
  useEffect(() => {
    if (activeUserId) {
      setFormOwnerId(activeUserId);
      setGenUser(activeUserId);
      setTryOnModel(activeUserId === "benja" ? "benja" : "mafe");
    }
  }, [activeUserId]);

  // Handle image upload and auto-processing with Milo AI
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImage(true);
      const rawBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });

      const compressed = await compressImage(rawBase64, 800, 800, 0.85);
      const studioWhiteImage = await makeWhiteStudioCatalogImage(compressed);

      setUploadImageBase64(compressed);
      setFormOriginalImage(compressed);
      setFormWhiteBgImage(studioWhiteImage);

      // Call AI to remove background & classify
      const aiResult = await processClosetImageWithAI(compressed);
      if (aiResult) {
        if (aiResult.category) setFormCategory(aiResult.category);
        if (aiResult.subcategory) setFormSubcategory(aiResult.subcategory);
        if (aiResult.color) setFormColor(aiResult.color);
        if (aiResult.tags && aiResult.tags.length > 0) setFormTags(aiResult.tags);
        if (aiResult.styleDescription) setFormStyleDesc(aiResult.styleDescription);
        
        if (aiResult.whiteBgImageUrl) {
          const finalStudioImg = await makeWhiteStudioCatalogImage(aiResult.whiteBgImageUrl);
          setFormWhiteBgImage(finalStudioImg);
        }
        if (!formName) {
          setFormName(`${aiResult.category} ${aiResult.color}`);
        }
      }
    } catch (err) {
      console.error("Error processing closet image:", err);
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Force clean background to studio white
  const handleForceCleanBg = async () => {
    if (!selectedGarmentForDetail) return;
    setIsCleaningBg(true);
    try {
      const srcImg = selectedGarmentForDetail.originalImageUrl || selectedGarmentForDetail.whiteBgImageUrl;
      const res = await cleanGarmentBackground(srcImg);
      if (res && res.whiteBgImageUrl) {
        const studioImg = await makeWhiteStudioCatalogImage(res.whiteBgImageUrl);
        const updated = { ...selectedGarmentForDetail, whiteBgImageUrl: studioImg };
        await saveClosetGarment(updated);
        setGarments(garments.map(g => g.id === updated.id ? updated : g));
        setSelectedGarmentForDetail(updated);
        alert("✨ Fondo blanco de estudio generado correctamente.");
      }
    } catch (err) {
      console.error("Error cleaning background:", err);
      alert("No se pudo limpiar el fondo automáticamente. Se mantendrá la imagen actual.");
    } finally {
      setIsCleaningBg(false);
    }
  };

  // Upload custom model body photo
  const handleCustomModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rawBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });
      const compressed = await compressImage(rawBase64, 800, 1000, 0.85);
      setCustomModelPhoto(compressed);
    } catch (err) {
      console.error("Error loading custom model photo:", err);
    }
  };

  // Add tag
  const handleAddTag = () => {
    if (tagInput.trim() && !formTags.includes(tagInput.trim())) {
      setFormTags([...formTags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormTags(formTags.filter(t => t !== tag));
  };

  // Save new or edited garment
  const handleSaveGarment = async () => {
    if (!formName.trim() || !formWhiteBgImage) return;

    setIsSavingGarment(true);
    try {
      const payload: Partial<ClosetGarment> = {
        id: editingGarment ? editingGarment.id : undefined,
        name: formName.trim(),
        ownerId: formOwnerId,
        category: formCategory,
        subcategory: formSubcategory,
        color: formColor,
        tags: formTags,
        originalImageUrl: formOriginalImage || formWhiteBgImage,
        whiteBgImageUrl: formWhiteBgImage,
        notes: formNotes,
        styleDescription: formStyleDesc,
        usageCount: editingGarment ? editingGarment.usageCount : 0,
        isFavorite: editingGarment ? editingGarment.isFavorite : false
      };

      const res = await saveClosetGarment(payload);
      if (res.success) {
        await loadClosetData();
        resetForm();
        setShowAddModal(false);
        setEditingGarment(null);
      }
    } catch (err) {
      console.error("Error saving garment:", err);
    } finally {
      setIsSavingGarment(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setUploadImageBase64("");
    setFormWhiteBgImage("");
    setFormOriginalImage("");
    setFormCategory("Camisetas");
    setFormSubcategory("");
    setFormColor("Negro");
    setFormTags(["Casual"]);
    setFormNotes("");
    setFormStyleDesc("");
    setTagInput("");
  };

  // Edit existing garment
  const handleEditClick = (garment: ClosetGarment) => {
    setEditingGarment(garment);
    setFormName(garment.name);
    setFormOwnerId(garment.ownerId);
    setFormCategory(garment.category);
    setFormSubcategory(garment.subcategory || "");
    setFormColor(garment.color);
    setFormTags(garment.tags || []);
    setFormNotes(garment.notes || "");
    setFormStyleDesc(garment.styleDescription || "");
    setFormOriginalImage(garment.originalImageUrl);
    setFormWhiteBgImage(garment.whiteBgImageUrl);
    setShowAddModal(true);
    setSelectedGarmentForDetail(null);
  };

  // Delete garment
  const handleDeleteGarment = async (id: string, name?: string) => {
    if (typeof window !== "undefined" && (window as any).requestDeleteWithConfirm) {
      (window as any).requestDeleteWithConfirm(
        "Eliminar Prenda del Closet 👔",
        "¿Seguro que deseas eliminar esta prenda del closet de tu hogar?",
        async () => {
          await deleteClosetGarment(id);
          setSelectedGarmentForDetail(null);
          await loadClosetData();
        },
        name || selectedGarmentForDetail?.name
      );
    } else {
      if (!confirm("¿Seguro que deseas eliminar esta prenda del closet?")) return;
      try {
        await deleteClosetGarment(id);
        setSelectedGarmentForDetail(null);
        await loadClosetData();
      } catch (err) {
        console.error("Error deleting garment:", err);
      }
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (garment: ClosetGarment) => {
    try {
      const updated = { ...garment, isFavorite: !garment.isFavorite };
      await saveClosetGarment(updated);
      setGarments(garments.map(g => g.id === garment.id ? updated : g));
      if (selectedGarmentForDetail?.id === garment.id) {
        setSelectedGarmentForDetail(updated);
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  // Create custom category
  const handleCreateCategory = async () => {
    if (!catNameInput.trim()) return;
    try {
      await saveClosetCategory({
        name: catNameInput.trim(),
        icon: catIconInput,
        color: catColorInput,
        isCustom: true
      });
      setCatNameInput("");
      setShowCategoryModal(false);
      await loadClosetData();
    } catch (err) {
      console.error("Error creating category:", err);
    }
  };

  // Generate Outfit with AI
  const handleGenerateOutfit = async () => {
    setIsGeneratingOutfit(true);
    setHasLoggedToday(false);
    try {
      const res = await generateOutfitWithAI({
        userId: genUser,
        mode: genMode,
        occasion: genMode === "occasion" ? genOccasion : undefined,
        weather: genMode === "weather" ? genWeather : undefined,
        style: genMode === "style" ? genStyle : undefined,
        baseGarmentId: genMode === "baseGarment" ? genBaseGarmentId : undefined
      });

      if (res.success && res.outfit) {
        setGeneratedOutfit({
          id: `outfit-${Date.now()}`,
          userId: genUser,
          title: res.outfit.title,
          occasion: res.outfit.occasion || genOccasion,
          weather: res.outfit.weather || genWeather,
          style: res.outfit.style || genStyle,
          topGarmentIds: res.outfit.topGarmentIds || [],
          bottomGarmentId: res.outfit.bottomGarmentId || undefined,
          shoesGarmentId: res.outfit.shoesGarmentId || undefined,
          accessoryGarmentIds: res.outfit.accessoryGarmentIds || [],
          explanation: res.outfit.explanation,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Error generating outfit:", err);
    } finally {
      setIsGeneratingOutfit(false);
    }
  };

  // Save Outfit to Favorites
  const handleSaveOutfitToFavorites = async (outfit: SavedOutfit) => {
    try {
      const res = await saveSavedOutfit({ ...outfit, isFavorite: true });
      if (res.success) {
        await loadClosetData();
        alert("✨ Outfit guardado en tus combinaciones favoritas.");
      }
    } catch (err) {
      console.error("Error saving outfit:", err);
    }
  };

  // Log Outfit as worn today
  const handleLogOutfitAsWorn = async (outfit: SavedOutfit) => {
    try {
      const allIds = [
        ...outfit.topGarmentIds,
        ...(outfit.bottomGarmentId ? [outfit.bottomGarmentId] : []),
        ...(outfit.shoesGarmentId ? [outfit.shoesGarmentId] : []),
        ...(outfit.accessoryGarmentIds || [])
      ];

      await recordWornOutfit({
        userId: outfit.userId || activeUserId,
        date: new Date().toISOString().split("T")[0],
        garmentIds: allIds,
        occasion: outfit.occasion,
        outfitTitle: outfit.title
      });

      setHasLoggedToday(true);
      await loadClosetData();
    } catch (err) {
      console.error("Error logging worn outfit:", err);
    }
  };

  // Filtered Garments Calculation
  const filteredGarments = garments.filter(g => {
    // Owner filter
    if (ownerFilter !== "todos" && g.ownerId !== ownerFilter && g.ownerId !== "ambos") {
      return false;
    }
    // Category filter
    if (selectedCategoryName && g.category.toLowerCase() !== selectedCategoryName.toLowerCase()) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = g.name.toLowerCase().includes(q);
      const matchCat = g.category.toLowerCase().includes(q);
      const matchSub = g.subcategory?.toLowerCase().includes(q);
      const matchColor = g.color.toLowerCase().includes(q);
      const matchTags = g.tags?.some(t => t.toLowerCase().includes(q));
      if (!matchName && !matchCat && !matchSub && !matchColor && !matchTags) {
        return false;
      }
    }
    // Color filter
    if (colorFilter && !g.color.toLowerCase().includes(colorFilter.toLowerCase())) {
      return false;
    }
    // Favorites only
    if (favoritesOnly && !g.isFavorite) {
      return false;
    }
    return true;
  });

  // Calculate stats
  const totalGarments = garments.length;
  const mafeCount = garments.filter(g => g.ownerId === "mafe").length;
  const benjaCount = garments.filter(g => g.ownerId === "benja").length;
  const sharedCount = garments.filter(g => g.ownerId === "ambos").length;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 pb-24">
      {/* HEADER BAR */}
      <div className="bg-white border-2 border-[#E7E2D5] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#FAF0E6] border-2 border-[#E7E2D5] rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-inner">
            👔
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                Armario Boutique Digital
              </span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <SparklesIcon className="w-3 h-3 text-amber-600" /> Estilista Milo IA
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#2C2723] mt-1 flex items-center gap-2">
              Closet Inteligente del Nido
            </h1>
            <p className="text-xs text-[#8A817C] font-medium">
              Sube tus prendas, elimina el fondo automáticamente y recibe combinaciones armónicas para cada día.
            </p>
          </div>
        </div>

        {/* OWNER SWITCHER & ADD BUTTON */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className="bg-[#FAF7F2] p-1.5 rounded-2xl border border-[#E7E2D5] flex items-center gap-1 text-xs">
            <span className="text-[10px] font-black uppercase text-[#8A817C] px-2">Ver Closet de:</span>
            <button
              onClick={() => setOwnerFilter("todos")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                ownerFilter === "todos" ? "bg-white text-[#2C2723] shadow-sm border border-[#E7E2D5]" : "text-[#8A817C] hover:text-[#2C2723]"
              }`}
            >
              🏡 Todos ({totalGarments})
            </button>
            <button
              onClick={() => setOwnerFilter("mafe")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                ownerFilter === "mafe" ? "bg-pink-500 text-white shadow-sm" : "text-[#8A817C] hover:text-[#2C2723]"
              }`}
            >
              💖 Mafe ({mafeCount})
            </button>
            <button
              onClick={() => setOwnerFilter("benja")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                ownerFilter === "benja" ? "bg-blue-600 text-white shadow-sm" : "text-[#8A817C] hover:text-[#2C2723]"
              }`}
            >
              💙 Benja ({benjaCount})
            </button>
          </div>

          <button
            onClick={() => {
              resetForm();
              setEditingGarment(null);
              setShowAddModal(true);
            }}
            className="bg-[#2C2723] hover:bg-[#423B36] text-white px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            Agregar Prenda
          </button>
        </div>
      </div>

      {/* CLOSET NAVIGATION TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setClosetTab("catalog")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs whitespace-nowrap transition-all border-2 ${
            closetTab === "catalog"
              ? "bg-[#2C2723] text-white border-[#2C2723] shadow-md"
              : "bg-white text-[#625B57] border-[#E7E2D5] hover:border-[#2C2723]"
          }`}
        >
          <Shirt className="w-4 h-4 text-purple-400" />
          Mi Armario ({filteredGarments.length})
        </button>

        <button
          onClick={() => setClosetTab("generator")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs whitespace-nowrap transition-all border-2 ${
            closetTab === "generator"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600 shadow-md"
              : "bg-white text-[#625B57] border-[#E7E2D5] hover:border-purple-500"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          Outfit del Día con Milo IA
        </button>

        <button
          onClick={() => setClosetTab("analytics")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs whitespace-nowrap transition-all border-2 ${
            closetTab === "analytics"
              ? "bg-[#2C2723] text-white border-[#2C2723] shadow-md"
              : "bg-white text-[#625B57] border-[#E7E2D5] hover:border-[#2C2723]"
          }`}
        >
          <Star className="w-4 h-4 text-amber-500" />
          Favoritos y Análisis de Uso
        </button>

        <button
          onClick={() => setClosetTab("journal")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs whitespace-nowrap transition-all border-2 ${
            closetTab === "journal"
              ? "bg-[#2C2723] text-white border-[#2C2723] shadow-md"
              : "bg-white text-[#625B57] border-[#E7E2D5] hover:border-[#2C2723]"
          }`}
        >
          <Calendar className="w-4 h-4 text-rose-500" />
          Diario de Outfits
        </button>
      </div>

      {/* TAB 1: MI ARMARIO CATALOG */}
      {closetTab === "catalog" && (
        <div className="space-y-6">
          {/* CATEGORIES BANNER OVERVIEW */}
          <div className="bg-[#FAF7F2] border-2 border-[#E7E2D5] rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#8A817C] flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                Categorías de prendas
              </h2>
              <div className="flex items-center gap-2">
                {selectedCategoryName && (
                  <button
                    onClick={() => setSelectedCategoryName(null)}
                    className="text-xs text-rose-600 hover:underline font-bold flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Ver todas
                  </button>
                )}
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="text-xs text-purple-700 bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> + Categoría Personalizada
                </button>
              </div>
            </div>

            {/* CATEGORY CHIPS */}
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => setSelectedCategoryName(null)}
                className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all border-2 flex items-center gap-2 ${
                  selectedCategoryName === null
                    ? "bg-[#2C2723] text-white border-[#2C2723] shadow-sm"
                    : "bg-white text-[#2C2723] border-[#E7E2D5] hover:border-[#2C2723]"
                }`}
              >
                <span>👗</span> Todos los tipos ({garments.length})
              </button>

              {categories.map(cat => {
                const count = garments.filter(g => g.category.toLowerCase() === cat.name.toLowerCase()).length;
                const isSelected = selectedCategoryName?.toLowerCase() === cat.name.toLowerCase();
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryName(isSelected ? null : cat.name)}
                    className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all border-2 flex items-center gap-2 ${
                      isSelected
                        ? "bg-purple-700 text-white border-purple-700 shadow-md scale-105"
                        : "bg-white text-[#2C2723] border-[#E7E2D5] hover:border-purple-300"
                    }`}
                  >
                    <span>{cat.icon === "Shirt" ? "👕" : cat.icon === "Sparkles" ? "✨" : cat.icon === "Layers" ? "🧥" : cat.icon === "ShoppingBag" ? "👖" : cat.icon === "Sun" ? "🩳" : cat.icon === "Footprints" ? "👟" : cat.icon === "Glasses" ? "🕶️" : "🏷️"}</span>
                    <span>{cat.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isSelected ? "bg-white/20 text-white" : "bg-[#FAF7F2] text-[#8A817C]"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SEARCH AND FILTER BAR */}
          <div className="bg-white border-2 border-[#E7E2D5] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 text-[#8A817C] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre, color, tipo o etiqueta..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#E7E2D5] rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-[#2C2723]"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFavoritesOnly(!favoritesOnly)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  favoritesOnly
                    ? "bg-rose-50 border-rose-300 text-rose-700 font-extrabold"
                    : "bg-[#FAF7F2] border-[#E7E2D5] text-[#625B57] hover:text-[#2C2723]"
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${favoritesOnly ? "fill-rose-500 text-rose-500" : ""}`} />
                Favoritas
              </button>
            </div>
          </div>

          {/* GARMENTS CATALOG GALLERY */}
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold text-[#8A817C]">Abriendo el closet del nido...</p>
            </div>
          ) : filteredGarments.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-[#E7E2D5] rounded-3xl p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-[#FAF0E6] rounded-full flex items-center justify-center text-3xl mx-auto">
                👚
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="font-bold text-base text-[#2C2723]">No hay prendas con estos filtros</h3>
                <p className="text-xs text-[#8A817C] mt-1">
                  Añade una nueva prenda con foto o ajusta los criterios de búsqueda.
                </p>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="bg-[#2C2723] text-white px-5 py-2.5 rounded-2xl font-bold text-xs inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-amber-400" /> Tomar foto o Subir Prenda
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredGarments.map(garment => (
                <motion.div
                  key={garment.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -4 }}
                  onClick={() => setSelectedGarmentForDetail(garment)}
                  className="bg-white border-2 border-[#E7E2D5] hover:border-purple-400 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col"
                >
                  {/* STUDIO CATALOG WHITE BACKGROUND IMAGE CONTAINER */}
                  <div className="aspect-square bg-white relative p-4 flex items-center justify-center border-b border-[#F3EFE6] group-hover:bg-[#FAF9F6] transition-colors">
                    <img
                      src={garment.whiteBgImageUrl || garment.originalImageUrl}
                      alt={garment.name}
                      className="max-h-full max-w-full object-contain filter drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />

                    {/* OWNER BADGE */}
                    <div className="absolute top-2 left-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-white shadow-xs ${
                        garment.ownerId === "mafe" ? "bg-pink-500" : garment.ownerId === "benja" ? "bg-blue-600" : "bg-purple-600"
                      }`}>
                        {garment.ownerId === "mafe" ? "Mafe" : garment.ownerId === "benja" ? "Benja" : "Ambos"}
                      </span>
                    </div>

                    {/* FAVORITE TOGGLE */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleToggleFavorite(garment);
                      }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs border border-[#E7E2D5] flex items-center justify-center shadow-xs hover:scale-110 transition-transform"
                    >
                      <Heart className={`w-4 h-4 ${garment.isFavorite ? "fill-rose-500 text-rose-500" : "text-[#8A817C]"}`} />
                    </button>

                    {/* USAGE BADGE */}
                    {garment.usageCount > 0 && (
                      <div className="absolute bottom-2 right-2 bg-[#2C2723]/80 backdrop-blur-xs text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {garment.usageCount}
                      </div>
                    )}
                  </div>

                  {/* GARMENT METADATA FOOTER */}
                  <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[9.5px] font-black text-purple-700 uppercase tracking-wider block">
                        {garment.category} {garment.subcategory ? `• ${garment.subcategory}` : ''}
                      </span>
                      <h4 className="font-bold text-xs text-[#2C2723] line-clamp-1 leading-snug">
                        {garment.name}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#8A817C] pt-1 border-t border-[#F3EFE6]">
                      <span className="font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full inline-block border border-black/10" style={{ backgroundColor: garment.color.toLowerCase() === 'blanco' ? '#ffffff' : garment.color.toLowerCase() === 'negro' ? '#000000' : garment.color.toLowerCase() === 'rojo' ? '#ef4444' : garment.color.toLowerCase() === 'azul' ? '#3b82f6' : '#a855f7' }}></span>
                        {garment.color}
                      </span>
                      {garment.lastWornDate ? (
                        <span className="text-[9px] text-emerald-700 font-semibold">
                          Usada {garment.lastWornDate.split('-').slice(1).join('/')}
                        </span>
                      ) : (
                        <span className="text-[9px] text-[#A09893]">Nueva</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OUTFIT DEL DÍA & PROBADOR VIRTUAL */}
      {closetTab === "generator" && (
        <div className="space-y-6">
          {/* SUB-NAV BETWEEN PROBADOR VIRTUAL & ASISTENTE MILO */}
          <div className="flex flex-col md:flex-row items-center justify-between bg-white border-2 border-[#E7E2D5] rounded-2xl p-2 shadow-xs gap-2">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setGeneratorSubTab("tryon")}
                className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                  generatorSubTab === "tryon"
                    ? "bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-md"
                    : "bg-[#FAF7F2] text-[#625B57] hover:text-[#2C2723]"
                }`}
              >
                <Sliders className="w-4 h-4 text-amber-300" />
                👗 Probador Virtual & Modelo Interactivo
              </button>

              <button
                onClick={() => setGeneratorSubTab("ai")}
                className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                  generatorSubTab === "ai"
                    ? "bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-md"
                    : "bg-[#FAF7F2] text-[#625B57] hover:text-[#2C2723]"
                }`}
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                ✨ Asistente de Outfits Milo IA
              </button>
            </div>

            {/* MODEL PROFILE TOGGLE */}
            <div className="flex items-center gap-2 bg-[#FAF7F2] p-1.5 rounded-xl border border-[#E7E2D5] w-full md:w-auto justify-end">
              <span className="text-[11px] font-bold text-[#8A817C] px-1">Modelo:</span>
              <button
                onClick={() => {
                  setTryOnModel("mafe");
                  setSelectedTopIndex(0);
                  setSelectedBottomIndex(0);
                  setSelectedShoesIndex(0);
                  setSelectedAccessoryIndex(0);
                  setGeneratedTryOnImage("");
                }}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  tryOnModel === "mafe" ? "bg-pink-500 text-white shadow-xs" : "text-[#8A817C]"
                }`}
              >
                💖 Mafe
              </button>
              <button
                onClick={() => {
                  setTryOnModel("benja");
                  setSelectedTopIndex(0);
                  setSelectedBottomIndex(0);
                  setSelectedShoesIndex(0);
                  setSelectedAccessoryIndex(0);
                  setGeneratedTryOnImage("");
                }}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  tryOnModel === "benja" ? "bg-blue-600 text-white shadow-xs" : "text-[#8A817C]"
                }`}
              >
                💙 Benja
              </button>
            </div>
          </div>

          {/* SUB-VIEW 1: PROBADOR VIRTUAL & DESLIZADORES */}
          {generatorSubTab === "tryon" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN: INTERACTIVE VIRTUAL MODEL CANVAS */}
                <div className="lg:col-span-5 bg-gradient-to-b from-[#FAF7F2] to-white border-2 border-[#E7E2D5] rounded-3xl p-5 shadow-sm space-y-4 text-center">
                  <div className="flex items-center justify-between border-b border-[#E7E2D5] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs">
                        {tryOnModel === 'mafe' ? '💖' : '💙'}
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-sm text-[#2C2723]">
                          Modelo Maniquí - {tryOnModel === 'mafe' ? 'Mafe' : 'Benja'}
                        </h3>
                        <p className="text-[10px] text-[#8A817C]">Vista previa interactiva en tiempo real</p>
                      </div>
                    </div>

                    <label className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-xl cursor-pointer transition-all flex items-center gap-1">
                      <Camera className="w-3 h-3" /> Custom Foto
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCustomModelUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* MANNEQUIN / AI GENERATED PHOTO STAGE */}
                  <div className="relative min-h-[420px] bg-white border-2 border-dashed border-[#E7E2D5] rounded-2xl p-4 flex flex-col items-center justify-center overflow-hidden shadow-inner">
                    {generatedTryOnImage ? (
                      <div className="relative w-full h-full flex flex-col items-center">
                        <img
                          src={generatedTryOnImage}
                          alt="Lookbook Fotográfico Realista IA"
                          className="max-h-[380px] w-auto object-contain rounded-xl shadow-md"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          onClick={() => setGeneratedTryOnImage("")}
                          className="mt-3 text-[10px] text-purple-700 bg-purple-100 px-3 py-1 rounded-full font-bold hover:underline"
                        >
                          ← Volver al Maniquí Interactivo
                        </button>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col items-center justify-center space-y-3 py-2">
                        {customModelPhoto ? (
                          <div className="relative max-w-[220px] mx-auto rounded-xl overflow-hidden border border-[#E7E2D5] shadow-xs">
                            <img src={customModelPhoto} alt="Tu foto avatar" className="w-full h-auto opacity-40 blur-xs" />
                            <div className="absolute inset-0 flex flex-col items-center justify-between p-2">
                              {activeTop && (
                                <img src={activeTop.whiteBgImageUrl || activeTop.originalImageUrl} className="h-24 object-contain filter drop-shadow-md" />
                              )}
                              {activeBottom && (
                                <img src={activeBottom.whiteBgImageUrl || activeBottom.originalImageUrl} className="h-24 object-contain filter drop-shadow-md" />
                              )}
                              {activeShoes && (
                                <img src={activeShoes.whiteBgImageUrl || activeShoes.originalImageUrl} className="h-16 object-contain filter drop-shadow-md" />
                              )}
                            </div>
                          </div>
                        ) : (
                          /* STYLIZED 2D MANNEQUIN / CLOSET FLATLAY COLLAGE STAGE */
                          <div className="w-full max-w-[280px] space-y-2 py-1">
                            <div className="text-center space-y-1">
                              <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-3 py-0.5 rounded-full inline-block">
                                Maniquí 2D Interactivo
                              </span>
                            </div>

                            {/* TOP PIECE STAGE */}
                            <div className="bg-[#FAF9F6] border-2 border-purple-200 rounded-2xl p-3 text-center transition-all hover:shadow-xs min-h-[110px] flex flex-col items-center justify-center relative">
                              <span className="absolute top-1.5 left-2 text-[8px] font-bold text-purple-600 uppercase">1. Superior</span>
                              {activeTop ? (
                                <div className="space-y-1">
                                  <img
                                    src={activeTop.whiteBgImageUrl || activeTop.originalImageUrl}
                                    alt={activeTop.name}
                                    className="h-20 w-auto object-contain mx-auto filter drop-shadow-md transition-transform duration-200 hover:scale-105"
                                    referrerPolicy="no-referrer"
                                  />
                                  <p className="text-[10px] font-bold text-[#2C2723] truncate max-w-[200px]">{activeTop.name}</p>
                                </div>
                              ) : (
                                <span className="text-xs text-[#8A817C] font-bold">Sin prenda superior</span>
                              )}
                            </div>

                            {/* BOTTOM PIECE STAGE */}
                            <div className="bg-[#FAF9F6] border-2 border-sky-200 rounded-2xl p-3 text-center transition-all hover:shadow-xs min-h-[110px] flex flex-col items-center justify-center relative">
                              <span className="absolute top-1.5 left-2 text-[8px] font-bold text-sky-600 uppercase">2. Inferior</span>
                              {activeBottom ? (
                                <div className="space-y-1">
                                  <img
                                    src={activeBottom.whiteBgImageUrl || activeBottom.originalImageUrl}
                                    alt={activeBottom.name}
                                    className="h-20 w-auto object-contain mx-auto filter drop-shadow-md transition-transform duration-200 hover:scale-105"
                                    referrerPolicy="no-referrer"
                                  />
                                  <p className="text-[10px] font-bold text-[#2C2723] truncate max-w-[200px]">{activeBottom.name}</p>
                                </div>
                              ) : (
                                <span className="text-xs text-[#8A817C] font-bold">Sin prenda inferior</span>
                              )}
                            </div>

                            {/* SHOES & ACCESSORIES STAGE */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-[#FAF9F6] border-2 border-amber-200 rounded-2xl p-2 text-center min-h-[85px] flex flex-col items-center justify-center relative">
                                <span className="absolute top-1 left-1.5 text-[7.5px] font-bold text-amber-700 uppercase">3. Calzado</span>
                                {activeShoes ? (
                                  <img
                                    src={activeShoes.whiteBgImageUrl || activeShoes.originalImageUrl}
                                    alt={activeShoes.name}
                                    className="h-14 w-auto object-contain mx-auto filter drop-shadow-sm mt-2"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="text-[10px] text-[#8A817C]">Zapatos</span>
                                )}
                              </div>

                              <div className="bg-[#FAF9F6] border-2 border-pink-200 rounded-2xl p-2 text-center min-h-[85px] flex flex-col items-center justify-center relative">
                                <span className="absolute top-1 left-1.5 text-[7.5px] font-bold text-pink-700 uppercase">4. Accesorio</span>
                                {activeAcc ? (
                                  <img
                                    src={activeAcc.whiteBgImageUrl || activeAcc.originalImageUrl}
                                    alt={activeAcc.name}
                                    className="h-14 w-auto object-contain mx-auto filter drop-shadow-sm mt-2"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="text-[10px] text-[#8A817C]">Accesorios</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ACTION BUTTON TO GENERATE AI REALISTIC TRY-ON PHOTO */}
                  <button
                    onClick={handleTryOnPhotoClick}
                    disabled={isGeneratingTryOn}
                    className="w-full bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-800 text-white font-bold text-xs py-3.5 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isGeneratingTryOn ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Milo generando foto en modelo AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                        📸 Generar Foto Realista en Modelo IA
                      </>
                    )}
                  </button>
                </div>

                {/* RIGHT COLUMN: DESLIZADORES / SWIPER CAROUSELS BY GARMENT LAYER */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between bg-white border border-[#E7E2D5] rounded-2xl p-3 shadow-xs">
                    <div>
                      <h3 className="font-bold text-xs text-[#2C2723] flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-purple-600" />
                        Deslizadores de Prendas del Armario
                      </h3>
                      <p className="text-[10px] text-[#8A817C]">Desliza lateralmente cada capa para combinar al instante</p>
                    </div>

                    <button
                      onClick={() => handleShuffleTryOn(tops, bottoms, shoesList, accs)}
                      className="bg-[#FAF7F2] hover:bg-[#FAF0E6] text-[#2C2723] border border-[#E7E2D5] px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
                      🔀 Mezclar
                    </button>
                  </div>

                  {/* SWIPER 1: TOPS */}
                  <div className="bg-white border-2 border-[#E7E2D5] rounded-3xl p-4 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[#2C2723]">
                      <span className="flex items-center gap-1.5">
                        <Shirt className="w-4 h-4 text-purple-600" />
                        Partes Superiores / Tops ({tops.length})
                      </span>
                      <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-black">
                        {tops.length > 0 ? `${(Math.abs(selectedTopIndex) % tops.length) + 1} de ${tops.length}` : '0'}
                      </span>
                    </div>

                    {tops.length === 0 ? (
                      <p className="text-xs text-[#8A817C] py-3 text-center">No hay prendas superiores en el armario de {tryOnModel}</p>
                    ) : (
                      <div className="flex items-center justify-between gap-3 bg-[#FAF9F6] border border-[#E7E2D5] rounded-2xl p-3">
                        <button
                          onClick={() => {
                            setSelectedTopIndex(prev => (prev - 1 + tops.length) % tops.length);
                            setGeneratedTryOnImage("");
                          }}
                          className="w-9 h-9 rounded-full bg-white border border-[#E7E2D5] shadow-xs flex items-center justify-center hover:bg-purple-50 transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5 text-[#2C2723]" />
                        </button>

                        <div className="flex-1 flex items-center gap-3 justify-center">
                          <div className="w-20 h-20 bg-white border border-[#E7E2D5] rounded-xl p-2 flex items-center justify-center shrink-0 shadow-xs">
                            <img
                              src={activeTop?.whiteBgImageUrl || activeTop?.originalImageUrl}
                              alt={activeTop?.name}
                              className="max-h-full max-w-full object-contain filter drop-shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-[#2C2723]">{activeTop?.name}</h4>
                            <p className="text-[10px] text-[#8A817C]">{activeTop?.color} • {activeTop?.subcategory || activeTop?.category}</p>
                            {activeTop?.styleDescription && (
                              <p className="text-[9.5px] text-purple-700 italic mt-0.5 line-clamp-1">"{activeTop.styleDescription}"</p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedTopIndex(prev => (prev + 1) % tops.length);
                            setGeneratedTryOnImage("");
                          }}
                          className="w-9 h-9 rounded-full bg-white border border-[#E7E2D5] shadow-xs flex items-center justify-center hover:bg-purple-50 transition-colors"
                        >
                          <ChevronRight className="w-5 h-5 text-[#2C2723]" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SWIPER 2: BOTTOMS */}
                  <div className="bg-white border-2 border-[#E7E2D5] rounded-3xl p-4 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[#2C2723]">
                      <span className="flex items-center gap-1.5">
                        <ShoppingBag className="w-4 h-4 text-sky-600" />
                        Partes Inferiores / Pantalones ({bottoms.length})
                      </span>
                      <span className="text-[10px] text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full font-black">
                        {bottoms.length > 0 ? `${(Math.abs(selectedBottomIndex) % bottoms.length) + 1} de ${bottoms.length}` : '0'}
                      </span>
                    </div>

                    {bottoms.length === 0 ? (
                      <p className="text-xs text-[#8A817C] py-3 text-center">No hay pantalones ni faldas registrados</p>
                    ) : (
                      <div className="flex items-center justify-between gap-3 bg-[#FAF9F6] border border-[#E7E2D5] rounded-2xl p-3">
                        <button
                          onClick={() => {
                            setSelectedBottomIndex(prev => (prev - 1 + bottoms.length) % bottoms.length);
                            setGeneratedTryOnImage("");
                          }}
                          className="w-9 h-9 rounded-full bg-white border border-[#E7E2D5] shadow-xs flex items-center justify-center hover:bg-sky-50 transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5 text-[#2C2723]" />
                        </button>

                        <div className="flex-1 flex items-center gap-3 justify-center">
                          <div className="w-20 h-20 bg-white border border-[#E7E2D5] rounded-xl p-2 flex items-center justify-center shrink-0 shadow-xs">
                            <img
                              src={activeBottom?.whiteBgImageUrl || activeBottom?.originalImageUrl}
                              alt={activeBottom?.name}
                              className="max-h-full max-w-full object-contain filter drop-shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-[#2C2723]">{activeBottom?.name}</h4>
                            <p className="text-[10px] text-[#8A817C]">{activeBottom?.color} • {activeBottom?.subcategory || activeBottom?.category}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedBottomIndex(prev => (prev + 1) % bottoms.length);
                            setGeneratedTryOnImage("");
                          }}
                          className="w-9 h-9 rounded-full bg-white border border-[#E7E2D5] shadow-xs flex items-center justify-center hover:bg-sky-50 transition-colors"
                        >
                          <ChevronRight className="w-5 h-5 text-[#2C2723]" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SWIPER 3: SHOES */}
                  <div className="bg-white border-2 border-[#E7E2D5] rounded-3xl p-4 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[#2C2723]">
                      <span className="flex items-center gap-1.5">
                        <Footprints className="w-4 h-4 text-amber-600" />
                        Calzado / Zapatos ({shoesList.length})
                      </span>
                      <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-black">
                        {shoesList.length > 0 ? `${(Math.abs(selectedShoesIndex) % shoesList.length) + 1} de ${shoesList.length}` : '0'}
                      </span>
                    </div>

                    {shoesList.length === 0 ? (
                      <p className="text-xs text-[#8A817C] py-3 text-center">No hay zapatos registrados</p>
                    ) : (
                      <div className="flex items-center justify-between gap-3 bg-[#FAF9F6] border border-[#E7E2D5] rounded-2xl p-3">
                        <button
                          onClick={() => {
                            setSelectedShoesIndex(prev => (prev - 1 + shoesList.length) % shoesList.length);
                            setGeneratedTryOnImage("");
                          }}
                          className="w-9 h-9 rounded-full bg-white border border-[#E7E2D5] shadow-xs flex items-center justify-center hover:bg-amber-50 transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5 text-[#2C2723]" />
                        </button>

                        <div className="flex-1 flex items-center gap-3 justify-center">
                          <div className="w-20 h-20 bg-white border border-[#E7E2D5] rounded-xl p-2 flex items-center justify-center shrink-0 shadow-xs">
                            <img
                              src={activeShoes?.whiteBgImageUrl || activeShoes?.originalImageUrl}
                              alt={activeShoes?.name}
                              className="max-h-full max-w-full object-contain filter drop-shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-[#2C2723]">{activeShoes?.name}</h4>
                            <p className="text-[10px] text-[#8A817C]">{activeShoes?.color} • {activeShoes?.category}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedShoesIndex(prev => (prev + 1) % shoesList.length);
                            setGeneratedTryOnImage("");
                          }}
                          className="w-9 h-9 rounded-full bg-white border border-[#E7E2D5] shadow-xs flex items-center justify-center hover:bg-amber-50 transition-colors"
                        >
                          <ChevronRight className="w-5 h-5 text-[#2C2723]" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ACTION BAR */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={handleSaveCurrentCombo}
                      className="bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs px-5 py-2.5 rounded-2xl flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                      Guardar en Favoritos
                    </button>
                  </div>
                </div>
              </div>
            )}

          {/* SUB-VIEW 2: ASISTENTE MILO IA (EXISTING GENERATOR MODE) */}
          {generatorSubTab === "ai" && (
            <div className="bg-gradient-to-br from-[#FAF0E6] via-white to-purple-50 border-2 border-[#E7E2D5] rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#E7E2D5] pb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                    ✨
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#2C2723]">Generador de Outfits con Milo IA</h2>
                    <p className="text-xs text-[#8A817C]">
                      Milo analiza todo tu armario digital para crear la mejor combinación según la ocasión, el clima o tus preferencias.
                    </p>
                  </div>
                </div>

                {/* USER DESTINATION SWITCHER */}
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-[#E7E2D5]">
                  <span className="text-xs font-bold text-[#8A817C] px-2">Para quién:</span>
                  <button
                    onClick={() => setGenUser("mafe")}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                      genUser === "mafe" ? "bg-pink-500 text-white shadow-sm" : "text-[#8A817C]"
                    }`}
                  >
                    💖 Mafe
                  </button>
                  <button
                    onClick={() => setGenUser("benja")}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                      genUser === "benja" ? "bg-blue-600 text-white shadow-sm" : "text-[#8A817C]"
                    }`}
                  >
                    💙 Benja
                  </button>
                </div>
              </div>

              {/* GENERATION MODES SELECTOR */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <button
                  onClick={() => setGenMode("occasion")}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    genMode === "occasion"
                      ? "bg-white border-purple-600 shadow-md ring-2 ring-purple-100"
                      : "bg-white/60 border-[#E7E2D5] hover:border-purple-300"
                  }`}
                >
                  <Briefcase className="w-5 h-5 text-purple-600 mb-2" />
                  <h4 className="font-bold text-xs text-[#2C2723]">Por Ocasión</h4>
                  <p className="text-[10px] text-[#8A817C]">Trabajo, cita, salida casual...</p>
                </button>

                <button
                  onClick={() => setGenMode("weather")}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    genMode === "weather"
                      ? "bg-white border-purple-600 shadow-md ring-2 ring-purple-100"
                      : "bg-white/60 border-[#E7E2D5] hover:border-purple-300"
                  }`}
                >
                  <Sun className="w-5 h-5 text-amber-500 mb-2" />
                  <h4 className="font-bold text-xs text-[#2C2723]">Por Clima</h4>
                  <p className="text-[10px] text-[#8A817C]">Soleado, frío, lluvia...</p>
                </button>

                <button
                  onClick={() => setGenMode("style")}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    genMode === "style"
                      ? "bg-white border-purple-600 shadow-md ring-2 ring-purple-100"
                      : "bg-white/60 border-[#E7E2D5] hover:border-purple-300"
                  }`}
                >
                  <Sparkles className="w-5 h-5 text-indigo-600 mb-2" />
                  <h4 className="font-bold text-xs text-[#2C2723]">Por Estilo</h4>
                  <p className="text-[10px] text-[#8A817C]">Chic, deportivo, minimalista...</p>
                </button>

                <button
                  onClick={() => setGenMode("baseGarment")}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    genMode === "baseGarment"
                      ? "bg-white border-purple-600 shadow-md ring-2 ring-purple-100"
                      : "bg-white/60 border-[#E7E2D5] hover:border-purple-300"
                  }`}
                >
                  <Shirt className="w-5 h-5 text-rose-500 mb-2" />
                  <h4 className="font-bold text-xs text-[#2C2723]">Prenda Específica</h4>
                  <p className="text-[10px] text-[#8A817C]">Combina esta chaqueta o pantalón...</p>
                </button>

                <button
                  onClick={() => setGenMode("random")}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    genMode === "random"
                      ? "bg-white border-purple-600 shadow-md ring-2 ring-purple-100"
                      : "bg-white/60 border-[#E7E2D5] hover:border-purple-300"
                  }`}
                >
                  <RotateCcw className="w-5 h-5 text-emerald-600 mb-2" />
                  <h4 className="font-bold text-xs text-[#2C2723]">Sorpréndeme</h4>
                  <p className="text-[10px] text-[#8A817C]">Combinación creativa aleatoria</p>
                </button>
              </div>

              {/* OPTIONS DETAILS PANEL */}
              <div className="bg-white border border-[#E7E2D5] rounded-2xl p-4 flex flex-wrap items-center gap-4">
                {genMode === "occasion" && (
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-[11px] font-bold text-[#8A817C] block mb-1">Selecciona la ocasión:</label>
                    <select
                      value={genOccasion}
                      onChange={e => setGenOccasion(e.target.value)}
                      className="w-full bg-[#FAF7F2] border border-[#E7E2D5] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                    >
                      <option value="Trabajo / Oficina">💼 Trabajo / Oficina</option>
                      <option value="Salida Casual / Paseo">☕ Salida Casual / Cafe</option>
                      <option value="Cita Romántica en Pareja">💖 Cita Romántica</option>
                      <option value="Fiesta / Evento Nocturno">✨ Fiesta / Evento Especial</option>
                      <option value="Ejercicio / Deporte">👟 Ejercicio / Deporte</option>
                      <option value="Estar en Casa / Relax">🏡 Relax en Casa</option>
                      <option value="Viaje / Exploración">✈️ Viaje</option>
                    </select>
                  </div>
                )}

                {genMode === "weather" && (
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-[11px] font-bold text-[#8A817C] block mb-1">Clima actual:</label>
                    <select
                      value={genWeather}
                      onChange={e => setGenWeather(e.target.value)}
                      className="w-full bg-[#FAF7F2] border border-[#E7E2D5] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                    >
                      <option value="Cálido y Soleado">☀️ Cálido y Soleado</option>
                      <option value="Templado / Fresco">🌤️ Templado / Fresco</option>
                      <option value="Frío / Invierno">❄️ Frío / Abrigado</option>
                      <option value="Lluvia">🌧️ Lluvia / Impermeable</option>
                    </select>
                  </div>
                )}

              {genMode === "style" && (
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[11px] font-bold text-[#8A817C] block mb-1">Estilo deseado:</label>
                  <select
                    value={genStyle}
                    onChange={e => setGenStyle(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#E7E2D5] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  >
                    <option value="Casual Chic">✨ Casual Chic</option>
                    <option value="Minimalista Elegante">🖤 Minimalista Elegante</option>
                    <option value="Urbano / Streetwear">🛹 Urbano / Streetwear</option>
                    <option value="Deportivo Cómodo">👟 Deportivo Cómodo</option>
                    <option value="Vintage / Bohemio">🎨 Vintage / Bohemio</option>
                  </select>
                </div>
              )}

              {genMode === "baseGarment" && (
                <div className="flex-1 min-w-[220px]">
                  <label className="text-[11px] font-bold text-[#8A817C] block mb-1">Selecciona la prenda base:</label>
                  <select
                    value={genBaseGarmentId}
                    onChange={e => setGenBaseGarmentId(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#E7E2D5] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  >
                    <option value="">-- Elige una prenda de tu closet --</option>
                    {garments.filter(g => g.ownerId === genUser || g.ownerId === "ambos").map(g => (
                      <option key={g.id} value={g.id}>
                        [{g.category}] {g.name} ({g.color})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleGenerateOutfit}
                disabled={isGeneratingOutfit || garments.length === 0}
                className="w-full md:w-auto bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                {isGeneratingOutfit ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Milo diseñando outfit...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    ✨ Crear Outfit con Milo
                  </>
                )}
              </button>
            </div>

            {/* RESULT OUTFIT DISPLAY */}
            {generatedOutfit && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border-2 border-purple-200 rounded-3xl p-6 shadow-md space-y-6"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#F3EFE6] pb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                      Recomendación Especial de Milo
                    </span>
                    <h3 className="text-xl font-bold text-[#2C2723] mt-2 flex items-center gap-2">
                      {generatedOutfit.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveOutfitToFavorites(generatedOutfit)}
                      className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                      Guardar en Favoritos
                    </button>

                    <button
                      onClick={() => handleLogOutfitAsWorn(generatedOutfit)}
                      disabled={hasLoggedToday}
                      className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                        hasLoggedToday
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-[#2C2723] text-white hover:bg-[#423B36]"
                      }`}
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      {hasLoggedToday ? "✓ Usado hoy registrado!" : "✅ Registrar como Usado Hoy"}
                    </button>
                  </div>
                </div>

                {/* MILO RATIONALE */}
                <div className="bg-[#FAF7F2] border border-[#E7E2D5] rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FFE5D9] border border-[#E7E2D5] flex items-center justify-center text-base shrink-0">
                    🐱
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#2C2723]">Por qué Milo eligió esta combinación:</h4>
                    <p className="text-xs text-[#625B57] mt-1 leading-relaxed">
                      "{generatedOutfit.explanation}"
                    </p>
                  </div>
                </div>

                {/* GARMENTS IN OUTFIT GALLERY */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Top Garments */}
                  {generatedOutfit.topGarmentIds.map(id => {
                    const item = garments.find(g => g.id === id);
                    if (!item) return null;
                    return (
                      <div key={id} className="bg-[#FAF9F6] border border-[#E7E2D5] rounded-2xl p-3 text-center space-y-2">
                        <span className="text-[9px] font-black uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                          Parte Superior
                        </span>
                        <div className="h-32 flex items-center justify-center">
                          <img
                            src={item.whiteBgImageUrl || item.originalImageUrl}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain filter drop-shadow-sm"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <p className="font-bold text-xs text-[#2C2723] truncate">{item.name}</p>
                        <p className="text-[10px] text-[#8A817C]">{item.color}</p>
                      </div>
                    );
                  })}

                  {/* Bottom Garment */}
                  {generatedOutfit.bottomGarmentId && (() => {
                    const item = garments.find(g => g.id === generatedOutfit.bottomGarmentId);
                    if (!item) return null;
                    return (
                      <div className="bg-[#FAF9F6] border border-[#E7E2D5] rounded-2xl p-3 text-center space-y-2">
                        <span className="text-[9px] font-black uppercase text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                          Parte Inferior
                        </span>
                        <div className="h-32 flex items-center justify-center">
                          <img
                            src={item.whiteBgImageUrl || item.originalImageUrl}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain filter drop-shadow-sm"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <p className="font-bold text-xs text-[#2C2723] truncate">{item.name}</p>
                        <p className="text-[10px] text-[#8A817C]">{item.color}</p>
                      </div>
                    );
                  })()}

                  {/* Shoes Garment */}
                  {generatedOutfit.shoesGarmentId && (() => {
                    const item = garments.find(g => g.id === generatedOutfit.shoesGarmentId);
                    if (!item) return null;
                    return (
                      <div className="bg-[#FAF9F6] border border-[#E7E2D5] rounded-2xl p-3 text-center space-y-2">
                        <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          Calzado
                        </span>
                        <div className="h-32 flex items-center justify-center">
                          <img
                            src={item.whiteBgImageUrl || item.originalImageUrl}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain filter drop-shadow-sm"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <p className="font-bold text-xs text-[#2C2723] truncate">{item.name}</p>
                        <p className="text-[10px] text-[#8A817C]">{item.color}</p>
                      </div>
                    );
                  })()}

                  {/* Accessory Garment */}
                  {generatedOutfit.accessoryGarmentIds?.map(id => {
                    const item = garments.find(g => g.id === id);
                    if (!item) return null;
                    return (
                      <div key={id} className="bg-[#FAF9F6] border border-[#E7E2D5] rounded-2xl p-3 text-center space-y-2">
                        <span className="text-[9px] font-black uppercase text-pink-700 bg-pink-100 px-2 py-0.5 rounded-full">
                          Accesorio
                        </span>
                        <div className="h-32 flex items-center justify-center">
                          <img
                            src={item.whiteBgImageUrl || item.originalImageUrl}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain filter drop-shadow-sm"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <p className="font-bold text-xs text-[#2C2723] truncate">{item.name}</p>
                        <p className="text-[10px] text-[#8A817C]">{item.color}</p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    )}

      {/* TAB 3: FAVORITOS Y ANÁLISIS */}
      {closetTab === "analytics" && (
        <div className="space-y-6">
          {/* TOP CARDS USAGE STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border-2 border-[#E7E2D5] rounded-3xl p-5 space-y-2">
              <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full flex items-center gap-1 w-max">
                <Star className="w-3 h-3 fill-amber-400 text-amber-500" /> Prendas Favoritas
              </span>
              <h3 className="text-2xl font-extrabold text-[#2C2723]">
                {garments.filter(g => g.isFavorite).length}
              </h3>
              <p className="text-xs text-[#8A817C]">Prendas marcadas con corazón</p>
            </div>

            <div className="bg-white border-2 border-[#E7E2D5] rounded-3xl p-5 space-y-2">
              <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full flex items-center gap-1 w-max">
                <Flame className="w-3 h-3 fill-rose-500 text-rose-500" /> La Más Usada
              </span>
              {(() => {
                const mostWorn = [...garments].sort((a, b) => b.usageCount - a.usageCount)[0];
                if (!mostWorn || mostWorn.usageCount === 0) {
                  return <p className="text-xs text-[#8A817C] py-2">Sin usos aún</p>;
                }
                return (
                  <div>
                    <h3 className="text-sm font-bold text-[#2C2723] truncate">{mostWorn.name}</h3>
                    <p className="text-xs text-rose-600 font-bold">Usada {mostWorn.usageCount} veces</p>
                  </div>
                );
              })()}
            </div>

            <div className="bg-white border-2 border-[#E7E2D5] rounded-3xl p-5 space-y-2">
              <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full flex items-center gap-1 w-max">
                <RotateCcw className="w-3 h-3 text-indigo-600" /> Hace más tiempo no usas
              </span>
              {(() => {
                const leastWorn = [...garments].filter(g => g.usageCount === 0 || !g.lastWornDate)[0];
                if (!leastWorn) return <p className="text-xs text-[#8A817C] py-2">Todas tus prendas tienen uso</p>;
                return (
                  <div>
                    <h3 className="text-sm font-bold text-[#2C2723] truncate">{leastWorn.name}</h3>
                    <p className="text-xs text-indigo-600 font-bold">Sin registrar uso en diario</p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* FAVORITES GALLERY */}
          <div className="bg-white border-2 border-[#E7E2D5] rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#2C2723] flex items-center gap-2">
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              Colección de Prendas Favoritas
            </h3>

            {garments.filter(g => g.isFavorite).length === 0 ? (
              <p className="text-xs text-[#8A817C] py-4">No has marcado prendas como favoritas todavía. Presiona el corazón en cualquier prenda para agregarla aquí.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {garments.filter(g => g.isFavorite).map(g => (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGarmentForDetail(g)}
                    className="bg-[#FAF9F6] border border-[#E7E2D5] hover:border-purple-400 rounded-2xl p-3 text-center space-y-2 cursor-pointer transition-all"
                  >
                    <div className="h-28 flex items-center justify-center">
                      <img
                        src={g.whiteBgImageUrl || g.originalImageUrl}
                        alt={g.name}
                        className="max-h-full max-w-full object-contain filter drop-shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <p className="font-bold text-xs text-[#2C2723] truncate">{g.name}</p>
                    <span className="text-[9px] font-black text-pink-600 uppercase bg-pink-50 px-2 py-0.5 rounded-full">
                      {g.ownerId === 'mafe' ? 'Mafe' : g.ownerId === 'benja' ? 'Benja' : 'Ambos'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DIARIO DE OUTFITS */}
      {closetTab === "journal" && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-[#E7E2D5] rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#F3EFE6] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#2C2723] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-rose-500" />
                  Historial de Outfits Usados
                </h3>
                <p className="text-xs text-[#8A817C]">
                  Registro cronológico de lo que has vestido día a día en el nido.
                </p>
              </div>
            </div>

            {wornLogs.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <p className="text-xs text-[#8A817C]">Aún no has registrado ningún outfit usado.</p>
                <button
                  onClick={() => setClosetTab("generator")}
                  className="bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Ir a Generar Outfit de Hoy
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {wornLogs.map(log => (
                  <div key={log.id} className="bg-[#FAF7F2] border border-[#E7E2D5] rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                        {log.date} • {log.userId === 'mafe' ? 'Mafe' : log.userId === 'benja' ? 'Benja' : 'Hogar'}
                      </span>
                      <h4 className="font-bold text-sm text-[#2C2723]">
                        {log.outfitTitle || `Outfit del ${log.date}`}
                      </h4>
                      <p className="text-xs text-[#8A817C]">
                        Ocasión: <span className="font-semibold text-[#2C2723]">{log.occasion}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto">
                      {log.garmentIds.map(gId => {
                        const item = garments.find(g => g.id === gId);
                        if (!item) return null;
                        return (
                          <div key={gId} className="w-14 h-14 bg-white border border-[#E7E2D5] rounded-xl p-1 flex items-center justify-center shrink-0" title={item.name}>
                            <img
                              src={item.whiteBgImageUrl || item.originalImageUrl}
                              alt={item.name}
                              className="max-h-full max-w-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT GARMENT */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white border-2 border-[#E7E2D5] rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[#F3EFE6] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FAF0E6] rounded-xl flex items-center justify-center text-xl">
                    👕
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#2C2723]">
                      {editingGarment ? "Editar Prenda" : "Agregar Nueva Prenda"}
                    </h3>
                    <p className="text-xs text-[#8A817C]">
                      Milo IA clasificará tu prenda y removerá el fondo automáticamente.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingGarment(null);
                  }}
                  className="p-2 text-[#8A817C] hover:text-[#2C2723] rounded-full hover:bg-[#FAF7F2]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* IMAGE UPLOAD / CAPTURE ZONE */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#2C2723] block">Foto de la prenda:</label>
                <div className="bg-[#FAF7F2] border-2 border-dashed border-[#E7E2D5] hover:border-purple-400 rounded-2xl p-4 text-center space-y-3 transition-colors">
                  {formWhiteBgImage ? (
                    <div className="relative inline-block">
                      <div className="w-48 h-48 bg-white border border-[#E7E2D5] rounded-2xl p-2 flex items-center justify-center mx-auto shadow-inner">
                        <img
                          src={formWhiteBgImage}
                          alt="Preview white background catalog"
                          className="max-h-full max-w-full object-contain filter drop-shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full mt-2 inline-block">
                        ✓ Catálogo Blanco Generado por Milo IA
                      </span>
                    </div>
                  ) : (
                    <div className="py-6 space-y-2">
                      <div className="w-12 h-12 bg-white rounded-2xl border border-[#E7E2D5] flex items-center justify-center text-purple-600 mx-auto shadow-xs">
                        <Camera className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-[#2C2723]">
                        Toma una foto con la cámara o sube desde el dispositivo
                      </p>
                      <p className="text-[10px] text-[#8A817C]">
                        JPG, PNG o WEBP. Milo la procesará al instante.
                      </p>
                    </div>
                  )}

                  <label className="inline-flex items-center gap-2 bg-[#2C2723] hover:bg-[#423B36] text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    {formWhiteBgImage ? "Cambiar foto" : "Seleccionar Imagen"}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                {isProcessingImage && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-bold text-purple-900">
                      Milo IA analizando prenda, eliminando fondo y clasificando estilo...
                    </p>
                  </div>
                )}
              </div>

              {/* FORM FIELDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#8A817C] block mb-1">Propietario / Dueño:</label>
                  <select
                    value={formOwnerId}
                    onChange={e => setFormOwnerId(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#E7E2D5] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  >
                    <option value="mafe">💖 Mafe</option>
                    <option value="benja">💙 Benja</option>
                    <option value="ambos">🏡 Compartida / Ambos</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#8A817C] block mb-1">Nombre de la prenda:</label>
                  <input
                    type="text"
                    placeholder="Ej: Camiseta Oversize Negra"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#E7E2D5] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#8A817C] block mb-1">Categoría:</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#E7E2D5] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#8A817C] block mb-1">Subcategoría / Corte:</label>
                  <input
                    type="text"
                    placeholder="Ej: Cuello redondo, Slim, Oversize"
                    value={formSubcategory}
                    onChange={e => setFormSubcategory(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#E7E2D5] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#8A817C] block mb-1">Color principal:</label>
                  <input
                    type="text"
                    placeholder="Ej: Negro, Azul marino, Blanco, Beige"
                    value={formColor}
                    onChange={e => setFormColor(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#E7E2D5] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#8A817C] block mb-1">Etiquetas (Tags de estilo):</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Ej: Algodón, Invierno"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1 bg-[#FAF7F2] border border-[#E7E2D5] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-xl text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formTags.map(t => (
                      <span key={t} className="bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        #{t}
                        <button type="button" onClick={() => handleRemoveTag(t)} className="hover:text-rose-600">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#8A817C] block mb-1">Notas especiales o cuidados:</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Lavar a mano, planchar a temperatura media..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#E7E2D5] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#F3EFE6] pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingGarment(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#8A817C] hover:text-[#2C2723]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveGarment}
                  disabled={isSavingGarment || !formName || !formWhiteBgImage}
                  className="bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2"
                >
                  {isSavingGarment ? "Guardando..." : "Guardar Prenda en Closet"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: CREATE CUSTOM CATEGORY */}
      <AnimatePresence>
        {showCategoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white border-2 border-[#E7E2D5] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#F3EFE6] pb-3">
                <h3 className="font-bold text-base text-[#2C2723]">Nueva Categoría Personalizada</h3>
                <button onClick={() => setShowCategoryModal(false)} className="text-[#8A817C] hover:text-[#2C2723]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-[#8A817C] block mb-1">Nombre de la categoría:</label>
                  <input
                    type="text"
                    placeholder="Ej: Abrigos de Nieve, Trajes de Baño"
                    value={catNameInput}
                    onChange={e => setCatNameInput(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#E7E2D5] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#8A817C] block mb-1">Ícono:</label>
                  <select
                    value={catIconInput}
                    onChange={e => setCatIconInput(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#E7E2D5] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  >
                    <option value="Shirt">👕 Camisa / Prenda</option>
                    <option value="Sparkles">✨ Especial / Destacado</option>
                    <option value="Layers">🧥 Capa / Abrigo</option>
                    <option value="Sun">🩳 Verano / Sol</option>
                    <option value="Footprints">👟 Calzado</option>
                    <option value="Glasses">🕶️ Accesorio</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#8A817C]"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateCategory}
                  disabled={!catNameInput.trim()}
                  className="bg-[#2C2723] text-white px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Guardar Categoría
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: GARMENT DETAILS & EDIT */}
      <AnimatePresence>
        {selectedGarmentForDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white border-2 border-[#E7E2D5] rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative"
            >
              <button
                onClick={() => setSelectedGarmentForDetail(null)}
                className="absolute top-4 right-4 p-2 text-[#8A817C] hover:text-[#2C2723] rounded-full hover:bg-[#FAF7F2]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="aspect-square bg-white border border-[#E7E2D5] rounded-2xl p-6 flex flex-col items-center justify-center relative shadow-inner">
                <img
                  src={selectedGarmentForDetail.whiteBgImageUrl || selectedGarmentForDetail.originalImageUrl}
                  alt={selectedGarmentForDetail.name}
                  className="max-h-full max-w-full object-contain filter drop-shadow-md"
                  referrerPolicy="no-referrer"
                />
                <button
                  onClick={() => handleToggleFavorite(selectedGarmentForDetail)}
                  className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white border border-[#E7E2D5] flex items-center justify-center shadow-xs"
                >
                  <Heart className={`w-5 h-5 ${selectedGarmentForDetail.isFavorite ? "fill-rose-500 text-rose-500" : "text-[#8A817C]"}`} />
                </button>
              </div>

              {/* FORCE STUDIO WHITE BACKGROUND BUTTON */}
              <button
                onClick={handleForceCleanBg}
                disabled={isCleaningBg}
                className="w-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-2xs disabled:opacity-50"
              >
                {isCleaningBg ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    Milo aislando prenda en fondo blanco estudio...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    ✨ Perfeccionar Fondo Blanco de Estudio
                  </>
                )}
              </button>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                    {selectedGarmentForDetail.category} {selectedGarmentForDetail.subcategory ? `• ${selectedGarmentForDetail.subcategory}` : ''}
                  </span>
                  <span className="text-xs font-bold text-[#8A817C]">
                    Propietario: <strong className="text-[#2C2723]">{selectedGarmentForDetail.ownerId === 'mafe' ? '💖 Mafe' : selectedGarmentForDetail.ownerId === 'benja' ? '💙 Benja' : '🏡 Compartida'}</strong>
                  </span>
                </div>

                <h2 className="text-xl font-bold text-[#2C2723]">{selectedGarmentForDetail.name}</h2>

                <div className="grid grid-cols-2 gap-2 text-xs bg-[#FAF7F2] p-3 rounded-xl border border-[#E7E2D5]">
                  <div>
                    <span className="text-[#8A817C] block text-[10px] font-bold">Color principal:</span>
                    <strong className="text-[#2C2723]">{selectedGarmentForDetail.color}</strong>
                  </div>
                  <div>
                    <span className="text-[#8A817C] block text-[10px] font-bold">Veces usada:</span>
                    <strong className="text-amber-700">{selectedGarmentForDetail.usageCount} veces</strong>
                  </div>
                </div>

                {selectedGarmentForDetail.styleDescription && (
                  <p className="text-xs text-[#625B57] italic bg-purple-50/50 p-2.5 rounded-xl border border-purple-100">
                    "{selectedGarmentForDetail.styleDescription}"
                  </p>
                )}

                {selectedGarmentForDetail.tags && selectedGarmentForDetail.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedGarmentForDetail.tags.map(t => (
                      <span key={t} className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-between pt-4 border-t border-[#F3EFE6]">
                <button
                  onClick={() => handleDeleteGarment(selectedGarmentForDetail.id)}
                  className="text-rose-600 hover:text-rose-800 text-xs font-bold flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditClick(selectedGarmentForDetail)}
                    className="bg-[#2C2723] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
