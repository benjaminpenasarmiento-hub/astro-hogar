import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { doc, collection, query, where, onSnapshot, getDocs, getDoc, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import Sidebar from "./components/Sidebar";
import GatitoAiChat from "./components/GatitoAiChat";
import OnboardingWizard from "./components/OnboardingWizardV2";
import AstroProfileModal from "./components/AstroProfileModal";
import { compressImage } from "./utils/imageCompressor";
import MobileInstallModal from "./components/MobileInstallModal";
import { Avatar, getAvatarEmojiChar } from "./components/Avatar";
import { SyncStatusIndicator } from "./components/SyncStatusIndicator";
import { useCalendarNotifications } from "./hooks/useCalendarNotifications";
import { 
  Home as HomeIcon, 
  Calendar as CalendarIcon, 
  Wallet as WalletIcon, 
  Settings as SettingsIcon, 
  Grid, 
  Download, 
  X, 
  Sparkles, 
  Dumbbell,
  PawPrint,
  Leaf,
  Target,
  Heart,
  Activity,
  Folder,
  Bell,
  Trash2,
  Check,
  RefreshCw,
  Shirt,
  AlertTriangle
} from "lucide-react";

// Modules
import HomeDashboard from "./components/HomeDashboard";
import CosmosModule from "./components/CosmosModule";
import CalendarModule from "./components/CalendarModule";
import PetsModule from "./components/PetsModule";
import PlantsModule from "./components/PlantsModule";
import MetasModule from "./components/MetasModule";
import MemoriesModule from "./components/MemoriesModule";
import SettingsModule from "./components/SettingsModule";
import SaludModule from "./components/SaludModule";
import PresupuestoModule from "./components/PresupuestoModule";
import EjercicioModule from "./components/EjercicioModule";
import ClosetModule from "./components/ClosetModule";

import astroHogarBg from "./assets/images/astro_hogar_bg_1783417893352.jpg";

import { 
  fetchHomeData, 
  fetchCheckins,
  fetchSintoniaCheckins,
  fetchCustomEmotions,
  fetchBudgetStore,
  fetchWorkoutLogs,
  fetchWorkoutRoutines,
  fetchWorkoutDetailedLogs,
  fetchBodyMetrics,
  fetchPersonalRecords,
  fetchCustomExercises,
  fetchSaludHogarData,
  createCalendarItem, 
  createPet, 
  createPlant, 
  createWish, 
  createMemory, 
  createDocument,
  reportErrorLog,
  markNotificationsAsRead,
  clearNotifications,
  saveClosetGarment
} from "./api";
import { 
  Home, 
  UserProfile, 
  CalendarItem, 
  Pet, 
  Plant, 
  Wish, 
  Memory, 
  HomeDocument,
  HomeNotification,
  ClosetGarment
} from "./types";

const ALL_MODULES = [
  { id: "inicio", label: "Inicio", icon: HomeIcon, emoji: "🏡" },
  { id: "calendario", label: "Agenda", icon: CalendarIcon, emoji: "📅" },
  { id: "presupuesto", label: "Finanzas", icon: WalletIcon, emoji: "💰" },
  { id: "cosmos", label: "Cosmos", icon: Sparkles, emoji: "🌌" },
  { id: "mascotas", label: "Mascotas", icon: PawPrint, emoji: "🐶" },
  { id: "plantas", label: "Plantas", icon: Leaf, emoji: "🌿" },
  { id: "metas", label: "Metas", icon: Target, emoji: "🎯" },
  { id: "recuerdos", label: "Recuerdos", icon: Heart, emoji: "❤️" },
  { id: "salud", label: "Salud", icon: Activity, emoji: "🌸" },
  { id: "ejercicio", label: "Templo", icon: Dumbbell, emoji: "🏛️" },
  { id: "closet", label: "Closet", icon: Shirt, emoji: "👔" },
];

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>("inicio");
  
  // Master data states
  const [home, setHome] = useState<Home | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);

  // Automatic Background Push Notifications (1 hour before calendar events)
  useCalendarNotifications(calendarItems);
  const [pets, setPets] = useState<Pet[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [documents, setDocuments] = useState<HomeDocument[]>([]);
  const [notifications, setNotifications] = useState<HomeNotification[]>([]);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const cosmicBgEnabled = true;
  const [isLoading, setIsLoading] = useState(true);

  // Mobile customizable navigation states
  const [activeUserId, setActiveUserId] = useState<string>("");
  const [userNavItems, setUserNavItems] = useState<Record<string, string[]>>({});
  const [userToCustomizeShortcuts, setUserToCustomizeShortcuts] = useState<string>("");

  const loadUserNavItems = () => {
    const saved: Record<string, string[]> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("astro_mobile_nav_items_")) {
          const userId = key.replace("astro_mobile_nav_items_", "");
          const items = JSON.parse(localStorage.getItem(key) || "[]");
          if (Array.isArray(items) && items.length === 4) {
            saved[userId] = items;
          }
        }
      }
    } catch (e) {
      console.error("Error loading user mobile nav items:", e);
    }
    setUserNavItems(saved);
  };

  useEffect(() => {
    loadUserNavItems();
  }, [users]);

  useEffect(() => {
    const savedUserId = localStorage.getItem("astro_user_id");
    if (savedUserId) {
      setActiveUserId(savedUserId);
    } else if (users.length > 0) {
      setActiveUserId(users[0].id);
    }
  }, [users]);

  useEffect(() => {
    if (users.length > 0 && !userToCustomizeShortcuts) {
      setUserToCustomizeShortcuts(users[0].id);
    }
  }, [users, userToCustomizeShortcuts]);

  useEffect(() => {
    if (activeUserId) {
      setUserToCustomizeShortcuts(activeUserId);
    }
  }, [activeUserId]);

  const getMobileNavForUser = (userId: string): string[] => {
    if (userNavItems[userId] && userNavItems[userId].length === 4) {
      return userNavItems[userId];
    }
    return ["inicio", "calendario", "presupuesto", "cosmos"];
  };

  const handleSaveUserNavItems = (userId: string, newItems: string[]) => {
    if (newItems.length !== 4) return;
    localStorage.setItem(`astro_mobile_nav_items_${userId}`, JSON.stringify(newItems));
    setUserNavItems(prev => ({
      ...prev,
      [userId]: newItems
    }));
  };

  // Core dialog state controllers
  const [activeModalType, setActiveModalType] = useState<"event" | "task" | "pet" | "plant" | "wish" | "memory" | "document" | null>(null);
  const [selectedUserForAstro, setSelectedUserForAstro] = useState<UserProfile | null>(null);
  const [astroProfileInitialTab, setAstroProfileInitialTab] = useState<"natal" | "edit" | "synastry" | "settings">("natal");
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleOpenProfile = (user: UserProfile, tab: "natal" | "edit" | "synastry" | "settings" = "natal") => {
    setSelectedUserForAstro(user);
    setAstroProfileInitialTab(tab);
  };

  const unreadCount = notifications.filter(
    (n) => n.userId !== activeUserId && !n.readBy.includes(activeUserId)
  ).length;

  // Form states inside master dialog
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formTime, setFormTime] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formAssigned, setFormAssigned] = useState<string>("home");
  const [formRecurrence, setFormRecurrence] = useState("none");
  const [formSpecificRepeatDate, setFormSpecificRepeatDate] = useState("");
  const [formExtra, setFormExtra] = useState(""); // used for notes, species, breeds etc.
  const [formPhotoUrl, setFormPhotoUrl] = useState("");
  const [formPhotoUrls, setFormPhotoUrls] = useState<string[]>([]);
  const [formEmoji, setFormEmoji] = useState("🎉");
  const [formNotify1Hour, setFormNotify1Hour] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Diálogo de Confirmación de Borrado con Permisos y Aislamiento por HomeId
  const [deleteConfirmModalState, setDeleteConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemName?: string;
    isDeleting: boolean;
    error: string | null;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    isDeleting: false,
    error: null,
    onConfirm: async () => {}
  });

  const validateDeletePermissions = (): { valid: boolean; reason?: string } => {
    const currentCode = home?.code || localStorage.getItem("astro_home_code");

    if (!currentCode) {
      return { valid: false, reason: "Aislamiento por homeId no configurado. Falta el código de hogar activo." };
    }
    return { valid: true };
  };

  const requestDeleteWithConfirm = (
    title: string,
    message: string,
    deleteFn: () => Promise<void | { success: boolean }>,
    itemName?: string
  ) => {
    const perm = validateDeletePermissions();
    if (!perm.valid) {
      setDeleteConfirmModalState({
        isOpen: true,
        title: "Error de Permisos de Hogar",
        message: perm.reason || "No tienes permisos para realizar eliminaciones en este hogar.",
        itemName,
        isDeleting: false,
        error: perm.reason || "Permisos denegados",
        onConfirm: async () => {
          setDeleteConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      });
      return;
    }

    setDeleteConfirmModalState({
      isOpen: true,
      title: title || "Confirmar Eliminación 🗑️",
      message: message || "¿Estás seguro de que deseas eliminar este elemento del hogar? Esta acción no se puede deshacer.",
      itemName,
      isDeleting: false,
      error: null,
      onConfirm: async () => {
        try {
          setDeleteConfirmModalState(prev => ({ ...prev, isDeleting: true, error: null }));
          const check = validateDeletePermissions();
          if (!check.valid) {
            throw new Error(check.reason);
          }
          await deleteFn();
          setDeleteConfirmModalState({
            isOpen: false,
            title: "",
            message: "",
            isDeleting: false,
            error: null,
            onConfirm: async () => {}
          });
          await refreshAllData();
        } catch (err: any) {
          console.error("Error ejecutando borrado:", err);
          setDeleteConfirmModalState(prev => ({
            ...prev,
            isDeleting: false,
            error: err?.message || "Error al eliminar el elemento. Revisa tu conexión y permisos."
          }));
        }
      }
    });
  };

  useEffect(() => {
    const handleDeleteEvent = (e: any) => {
      if (e.detail) {
        const { title, message, deleteFn, itemName } = e.detail;
        requestDeleteWithConfirm(title, message, deleteFn, itemName);
      }
    };

    window.addEventListener("astro-request-delete", handleDeleteEvent as EventListener);
    (window as any).requestDeleteWithConfirm = requestDeleteWithConfirm;

    return () => {
      window.removeEventListener("astro-request-delete", handleDeleteEvent as EventListener);
      delete (window as any).requestDeleteWithConfirm;
    };
  }, [home?.code, activeUserId, users]);

  // Auto reset form fields when modal closes or opens
  useEffect(() => {
    if (activeModalType) {
      setFormTitle("");
      setFormDescription("");
      setFormDate(new Date().toISOString().split("T")[0]);
      setFormTime("");
      setFormEndDate("");
      setFormEndTime("");
      setFormAssigned("home");
      setFormRecurrence("none");
      setFormSpecificRepeatDate("");
      setFormExtra("");
      setFormPhotoUrl("");
      setFormPhotoUrls([]);
      setFormEmoji("🎉");
      setFormNotify1Hour(true);
      setIsSubmitting(false);
      setFormError(null);
    }
  }, [activeModalType]);

  // Load house state
  const refreshAllData = async () => {
    const code = localStorage.getItem("astro_home_code");
    if (!code) {
      setHome(null);
      setUsers([]);
      setIsLoading(false);
      return;
    }
    try {
      const data = await fetchHomeData();
      setHome(data.home);
      setUsers(data.users);
      setCalendarItems(data.calendarItems);
      setPets(data.pets);
      setPlants(data.plants);
      setWishes(data.wishes);
      setMemories(data.memories);
      setDocuments(data.documents);
      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err: any) {
      console.error("No se pudo sintonizar o refrescar los datos del nido", err);
      reportErrorLog(
        err?.message || "Error al refrescar los datos del nido",
        err?.stack,
        { action: "refreshAllData", homeCode: code }
      ).catch(e => console.error("Secondary error reporting failure", e));
      // DO NOT clear user storage on general network connection or fetch errors (e.g. during dev server boot or temporary downtime).
      // This prevents logging out the user to the default HOGARPELUDO partition with pre-loaded data.
    } finally {
      setIsLoading(false);
    }
  };

  // Función de rescate profundo de datos desde colecciones de Firestore (plantas, closet, metas)
  const rescueFirestoreData = async () => {
    const code = home?.code || localStorage.getItem("astro_home_code") || "";
    if (!code) return;

    try {
      console.log(`🔎 Escaneando Firestore buscando documentos de 'plantas', 'closet' y 'metas' para el nido: ${code}...`);

      const rescuedPlants: Plant[] = [];
      const rescuedWishes: Wish[] = [];
      const rescuedGarments: ClosetGarment[] = [];

      try {
        // 1. Verificar documento de nido en Firestore: nests/{code}
        const nestRef = doc(db, "nests", code);
        const nestSnap = await getDoc(nestRef).catch(() => null);
        if (nestSnap && nestSnap.exists()) {
          const d = nestSnap.data();
          const dataObj = d?.data || d || {};
          
          if (Array.isArray(dataObj.plants)) {
            rescuedPlants.push(...dataObj.plants);
          }
          if (Array.isArray(dataObj.wishes)) {
            rescuedWishes.push(...dataObj.wishes);
          }
          if (Array.isArray(dataObj.closetGarments)) {
            rescuedGarments.push(...dataObj.closetGarments);
          }
        }
      } catch (e) {
        console.warn("No se pudo leer nests en Firestore:", e);
      }

    // 2. Escanear colecciones de plantas ('plantas', 'plants')
    for (const colName of ["plantas", "plants"]) {
      try {
        const snap = await getDocs(collection(db, colName));
        snap.docs.forEach(docSnap => {
          const itemData = docSnap.data();
          const docCode = itemData.homeCode || itemData.code || itemData.nestCode;
          if (!docCode || docCode === code) {
            const p: Plant = {
              id: docSnap.id || itemData.id || `plant-${Date.now()}-${Math.random()}`,
              name: itemData.name || itemData.nombre || "Planta Rescatada",
              species: itemData.species || itemData.especie || "Planta de Interior",
              photoUrl: itemData.photoUrl || itemData.imagen || itemData.imageUrl || "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&q=80&w=400",
              photoUrls: itemData.photoUrls || [itemData.photoUrl || "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&q=80&w=400"],
              recommendedWatering: itemData.recommendedWatering || itemData.riego || "Riego regular según su especie.",
              idealLocation: itemData.idealLocation || itemData.ubicacion || "Luz indirecta cerca de la ventana.",
              currentStateDesc: itemData.currentStateDesc || itemData.estado || "Planta rescatada.",
              careHistory: itemData.careHistory || [],
              aiDiagnoses: itemData.aiDiagnoses || []
            };
            rescuedPlants.push(p);
          }
        });
      } catch (err) {
        // collection standard ignore
      }
    }

    // 3. Escanear colecciones de closet ('closet', 'closetGarments', 'closet_garments', 'prendas')
    for (const colName of ["closet", "closetGarments", "closet_garments", "prendas"]) {
      try {
        const snap = await getDocs(collection(db, colName));
        snap.docs.forEach(docSnap => {
          const itemData = docSnap.data();
          const docCode = itemData.homeCode || itemData.code || itemData.nestCode;
          if (!docCode || docCode === code) {
            const g: ClosetGarment = {
              id: docSnap.id || itemData.id || `garment-${Date.now()}-${Math.random()}`,
              name: itemData.name || itemData.nombre || itemData.title || "Prenda Rescatada",
              category: itemData.category || itemData.categoria || "Superior",
              subcategory: itemData.subcategory || itemData.subcategoria || "Camisetas",
              color: itemData.color || "Blanco",
              ownerId: itemData.ownerId || itemData.usuarioId || "mafe",
              isFavorite: Boolean(itemData.isFavorite),
              usageCount: itemData.usageCount || 0,
              createdAt: itemData.createdAt || new Date().toISOString(),
              tags: itemData.tags || ["Rescatado"],
              originalImageUrl: itemData.originalImageUrl || itemData.photoUrl || itemData.imageUrl || "",
              whiteBgImageUrl: itemData.whiteBgImageUrl || ""
            };
            rescuedGarments.push(g);
          }
        });
      } catch (err) {
        // ignore
      }
    }

    // 4. Escanear colecciones de metas ('metas', 'wishes', 'goals')
    for (const colName of ["metas", "wishes", "goals"]) {
      try {
        const snap = await getDocs(collection(db, colName));
        snap.docs.forEach(docSnap => {
          const itemData = docSnap.data();
          const docCode = itemData.homeCode || itemData.code || itemData.nestCode;
          if (!docCode || docCode === code) {
            const w: Wish = {
              id: docSnap.id || itemData.id || `wish-${Date.now()}-${Math.random()}`,
              name: itemData.name || itemData.nombre || itemData.title || "Meta Rescatada",
              category: itemData.category || itemData.categoria || "Hogar",
              owner: itemData.owner || itemData.propietario || "Hogar",
              status: itemData.status || itemData.estado || "desired",
              notes: itemData.notes || itemData.descripcion || itemData.notas || "",
              link: itemData.link || ""
            };
            rescuedWishes.push(w);
          }
        });
      } catch (err) {
        // ignore
      }
    }

    // Unificar y eliminar duplicados
    const uniquePlantsMap = new Map<string, Plant>();
    rescuedPlants.forEach(p => {
      const k = p.id || p.name.toLowerCase().trim();
      if (!uniquePlantsMap.has(k)) uniquePlantsMap.set(k, p);
    });

    const uniqueWishesMap = new Map<string, Wish>();
    rescuedWishes.forEach(w => {
      const k = w.id || w.name.toLowerCase().trim();
      if (!uniqueWishesMap.has(k)) uniqueWishesMap.set(k, w);
    });

    const uniqueGarmentsMap = new Map<string, ClosetGarment>();
    rescuedGarments.forEach(g => {
      const k = g.id || g.name.toLowerCase().trim();
      if (!uniqueGarmentsMap.has(k)) uniqueGarmentsMap.set(k, g);
    });

    const MOCK_NAMES = [
      'monstera del nido 🪴', 'galaxia purpúrea 🌌', 'monstera del nido',
      'nintendo switch oled 🎮', 'cafetera de espresso moderna ☕', 'cafetera de espresso italiana ☕',
      'chaqueta abrigada de invierno', 'camisa formal azul cielo', 'milo 🐾', 'milo'
    ];

    // Actualizar estado local de App.tsx inmediatamente para Plantas
    setPlants(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const existingNames = new Set(prev.map(p => p.name.toLowerCase().trim()));
      const missing = Array.from(uniquePlantsMap.values()).filter(p => 
        !existingIds.has(p.id) && 
        !existingNames.has(p.name.toLowerCase().trim()) && 
        !MOCK_NAMES.includes(p.name.toLowerCase().trim())
      );
      if (missing.length > 0) {
        console.log(`🪴 ¡Restaurando ${missing.length} plantas rescatadas desde Firestore!`, missing);
        missing.forEach(m => createPlant(m as any).catch(() => {}));
        return [...prev, ...missing];
      }
      return prev;
    });

    // Actualizar estado local de App.tsx inmediatamente para Metas (wishes)
    setWishes(prev => {
      const existingIds = new Set(prev.map(w => w.id));
      const existingNames = new Set(prev.map(w => w.name.toLowerCase().trim()));
      const missing = Array.from(uniqueWishesMap.values()).filter(w => 
        !existingIds.has(w.id) && 
        !existingNames.has(w.name.toLowerCase().trim()) && 
        !MOCK_NAMES.includes(w.name.toLowerCase().trim())
      );
      if (missing.length > 0) {
        console.log(`🎯 ¡Restaurando ${missing.length} metas rescatadas desde Firestore!`, missing);
        missing.forEach(m => createWish(m).catch(() => {}));
        return [...prev, ...missing];
      }
      return prev;
    });

    // Restaurar closet garments
    const garmentsList = Array.from(uniqueGarmentsMap.values()).filter(g => !MOCK_NAMES.includes(g.name.toLowerCase().trim()));
    if (garmentsList.length > 0) {
      console.log(`👔 Rescatando ${garmentsList.length} prendas de Closet...`);
      for (const g of garmentsList) {
        saveClosetGarment(g).catch(() => {});
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("astro-closet-rescued", { detail: garmentsList }));
      }
    }
    } catch (err: any) {
      console.warn("Rescate de colecciones de Firestore omitido (cuota excedida o modo offline activo):", err?.message || err);
    }
  };

  // Función explícita para recargar toda la aplicación desde Firebase Firestore y recuperar datos pendientes de ayer
  const forceFullDataRefresh = async () => {
    setIsLoading(true);
    try {
      console.log("Forzando la recarga completa de toda la aplicación desde Firebase Firestore...");
      // 1. Forzar al servidor a sincronizar y restaurar todas las particiones desde Firebase Firestore
      await fetch("/api/force-firestore-sync", { method: "POST" }).catch(() => {});

      // 2. Refrescar datos generales del hogar
      await refreshAllData();

      // 3. Ejecutar rescate profundo de colecciones de Firestore para plantas, closet y metas
      await rescueFirestoreData();

      // 4. Llamar a todos los endpoints de obtención de datos nuevamente
      await Promise.all([
        fetchCheckins().catch(() => {}),
        fetchSintoniaCheckins().catch(() => {}),
        fetchCustomEmotions().catch(() => {}),
        fetchBudgetStore().catch(() => {}),
        fetchWorkoutLogs().catch(() => {}),
        fetchWorkoutRoutines().catch(() => {}),
        fetchWorkoutDetailedLogs().catch(() => {}),
        fetchBodyMetrics().catch(() => {}),
        fetchPersonalRecords().catch(() => {}),
        fetchCustomExercises().catch(() => {}),
        fetchSaludHogarData().catch(() => {})
      ]);
      console.log("Recarga completa de datos terminada con éxito desde Firestore.");
    } catch (err) {
      console.error("Error en forceFullDataRefresh:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    forceFullDataRefresh();
    (window as any).forceFullDataRefresh = forceFullDataRefresh;
    (window as any).rescueFirestoreData = rescueFirestoreData;
  }, []);

  // Sistema de captura y reporte silencioso de errores de red y WebSockets hacia Firestore
  useEffect(() => {
    const recentReportedErrors = new Set<string>();

    const reportErrorToFirestoreSilently = async (type: string, message: string, details?: any) => {
      const code = localStorage.getItem("astro_home_code") || home?.code || "HOGARPELUDO";
      const errorKey = `${type}:${message.slice(0, 100)}`;

      // Evitar saturación de reportes duplicados dentro de un intervalo de 15 segundos
      if (recentReportedErrors.has(errorKey)) return;
      recentReportedErrors.add(errorKey);
      setTimeout(() => recentReportedErrors.delete(errorKey), 15000);

      try {
        if (db) {
          await addDoc(collection(db, "error_logs"), {
            type,
            message,
            details: details ? String(details) : null,
            homeCode: code,
            timestamp: new Date().toISOString(),
            url: typeof window !== "undefined" ? window.location.href : "",
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
            handledSilently: true
          });
        }
      } catch {
        // Intercepción completamente silenciosa
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason ? String(event.reason) : "";
      const isWebSocketErr = reason.includes("WebSocket") || reason.includes("vite") || reason.includes("ws://") || reason.includes("wss://");
      const isNetworkErr = reason.includes("Failed to fetch") || reason.includes("NetworkError") || reason.includes("ERR_") || reason.includes("Network request failed");

      if (isWebSocketErr || isNetworkErr) {
        event.preventDefault();
        event.stopPropagation();
        reportErrorToFirestoreSilently(
          isWebSocketErr ? "websocket_silent_capture" : "network_silent_capture",
          reason
        );
      }
    };

    const handleWindowError = (event: ErrorEvent) => {
      const message = event.message ? String(event.message) : "";
      const isWebSocketErr = message.includes("WebSocket") || message.includes("vite") || message.includes("ws://") || message.includes("wss://");
      const isNetworkErr = message.includes("Failed to fetch") || message.includes("NetworkError") || message.includes("ERR_") || message.includes("Script error");

      if (isWebSocketErr || isNetworkErr) {
        event.preventDefault();
        event.stopPropagation();
        reportErrorToFirestoreSilently(
          isWebSocketErr ? "websocket_silent_capture" : "network_silent_capture",
          message,
          event.filename ? `${event.filename}:${event.lineno}` : null
        );
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleWindowError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleWindowError);
    };
  }, [home?.code]);

  // Real-time synchronization of widgets and notifications based on Firestore changes
  useEffect(() => {
    const code = home?.code || localStorage.getItem("astro_home_code");
    if (!code) return;

    let unsubNest: (() => void) | null = null;
    let unsubNotifications: (() => void) | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    const startHttpPollingFallback = () => {
      if (fallbackInterval) return;
      console.warn("[Firestore Realtime] Usando modo de sondeo HTTP local seguro vía servidor.");
      fallbackInterval = setInterval(() => {
        refreshAllData().catch(() => {});
      }, 15000);
    };

    const handleListenerError = (err: any, source: string) => {
      if (db) {
        addDoc(collection(db, "error_logs"), {
          type: "firestore_listener_silent_fallback",
          source,
          message: err?.message || String(err),
          homeCode: code,
          timestamp: new Date().toISOString(),
          handledSilently: true
        }).catch(() => {});
      }
      if (unsubNest) { unsubNest(); unsubNest = null; }
      if (unsubNotifications) { unsubNotifications(); unsubNotifications = null; }
      startHttpPollingFallback();
    };

    try {
      // 1. Listen to the entire nest document for widgets/data changes in real-time
      const nestDocRef = doc(db, "nests", code);
      unsubNest = onSnapshot(nestDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const docData = snapshot.data();
          if (docData && docData.data) {
            const data = docData.data;
            if (data.home) setHome(data.home);
            if (data.users) setUsers(data.users);
            if (data.calendarItems) setCalendarItems(data.calendarItems);
            if (data.pets) setPets(data.pets);
            if (data.plants) setPlants(data.plants);
            if (data.wishes) setWishes(data.wishes);
            if (data.memories) setMemories(data.memories);
            if (data.documents) setDocuments(data.documents);

            // Broadcast real-time update event so active modules refresh data instantly without page reload
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("astro-nest-remote-update", { detail: data }));
            }
          }
        }
      }, (error) => {
        handleListenerError(error, "Nido");
      });

      // 2. Listen to the dedicated notifications collection in real-time
      const q = query(collection(db, "notifications"), where("homeCode", "==", code));
      unsubNotifications = onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => doc.data() as HomeNotification);
        // Sort notifications by timestamp in descending order
        notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setNotifications(notifs);

        // Process newly added notifications for native push notifications
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const notif = change.doc.data() as HomeNotification;
            const diffMs = Date.now() - new Date(notif.timestamp).getTime();
            // If the notification was created within the last 15 seconds, and was not created by the active user themselves
            if (diffMs < 15000 && notif.userId !== activeUserId) {
              if (typeof window !== "undefined" && "serviceWorker" in navigator) {
                navigator.serviceWorker.ready.then((reg) => {
                  reg.showNotification(notif.title, {
                    body: notif.message,
                    icon: "/icon-192.jpg",
                    badge: "/icon-192.jpg",
                    tag: notif.type || "astrohogar-notif",
                    vibrate: [100, 50, 100],
                  } as any);
                }).catch(() => {
                  if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                      type: "SHOW_PUSH_NOTIFICATION",
                      title: notif.title,
                      body: notif.message,
                      tag: notif.type || "astrohogar-notif"
                    });
                  }
                });
              } else if (typeof window !== "undefined" && "Notification" in window) {
                if (Notification.permission === "granted") {
                  try {
                    new Notification(notif.title, {
                      body: notif.message,
                      icon: "/icon-192.jpg",
                      tag: notif.type || "astrohogar-notif",
                    });
                  } catch (e) {
                    console.error("Fallback native notification creation failed", e);
                  }
                }
              }
            }
          }
        });
      }, (error) => {
        handleListenerError(error, "Notificaciones");
      });
    } catch (err) {
      console.error("Error setting up real-time Firestore listeners:", err);
      startHttpPollingFallback();
    }

    return () => {
      if (unsubNest) unsubNest();
      if (unsubNotifications) unsubNotifications();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [home?.code, activeUserId]);

  const handleOpenNotificationCenter = async () => {
    setShowNotificationCenter(true);
    const unreadIds = notifications
      .filter((n) => n.userId !== activeUserId && !n.readBy.includes(activeUserId))
      .map((n) => n.id);
    
    if (unreadIds.length > 0) {
      try {
        const result = await markNotificationsAsRead(unreadIds);
        if (result.success && result.notifications) {
          setNotifications(result.notifications);
        }
      } catch (e) {
        console.error("Error marking notifications as read:", e);
      }
    }
  };

  const handleClearNotifications = async () => {
    try {
      const result = await clearNotifications();
      if (result.success) {
        setNotifications([]);
      }
    } catch (e) {
      console.error("Error clearing notifications:", e);
    }
  };

  // Save item from dynamic modal
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formTitle.trim()) {
      setFormError(
        activeModalType === "plant"
          ? "Por favor, ingresa el nombre de la planta miau."
          : "El título o nombre es requerido miau."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (activeModalType === "event") {
        if (formEndDate && formEndDate < formDate) {
          setFormError("La fecha de finalización no puede ser anterior a la fecha de inicio miau.");
          setIsSubmitting(false);
          return;
        }
        await createCalendarItem({
          type: "event",
          title: formTitle,
          description: formDescription || undefined,
          date: formDate,
          time: formTime || undefined,
          endDate: formEndDate || undefined,
          endTime: formEndTime || undefined,
          emoji: formEmoji || "🎉",
          assignedTo: formAssigned,
          status: "pending",
          notify1HourBefore: formNotify1Hour,
          recurrence: formRecurrence !== "none" ? {
            type: formRecurrence,
            specificDate: formRecurrence === "specific" ? formSpecificRepeatDate : undefined
          } : undefined,
        });
        setCurrentTab("calendario");
      } 
      else if (activeModalType === "task") {
        await createCalendarItem({
          type: "task",
          title: formTitle,
          description: formDescription || undefined,
          date: formDate,
          time: formTime || undefined,
          assignedTo: formAssigned,
          notify1HourBefore: formNotify1Hour,
          recurrence: formRecurrence !== "none" ? {
            type: formRecurrence,
            specificDate: formRecurrence === "specific" ? formSpecificRepeatDate : undefined
          } : undefined,
          status: "pending"
        });
        setCurrentTab("calendario");
      } 
      else if (activeModalType === "pet") {
        await createPet({
          name: formTitle,
          breed: formDescription || "Mestiza",
          weight: parseFloat(formExtra) || 5.0,
          photoUrl: formPhotoUrl || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=200", // beautiful fallback pup
          birthDate: formDate
        });
        setCurrentTab("mascotas");
      } 
      else if (activeModalType === "plant") {
        const primaryPhoto = formPhotoUrls[0] || "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&q=80&w=200";
        let autoSpecies = formDescription.trim();
        if (!autoSpecies) {
          const lowerTitle = formTitle.toLowerCase();
          if (lowerTitle.includes("monstera") || lowerTitle.includes("costilla")) autoSpecies = "Monstera Deliciosa";
          else if (lowerTitle.includes("poto") || lowerTitle.includes("pothos") || lowerTitle.includes("milo")) autoSpecies = "Pothos Dorado";
          else if (lowerTitle.includes("sansevieria") || lowerTitle.includes("lengua")) autoSpecies = "Sansevieria (Lengua de Suegra)";
          else if (lowerTitle.includes("suculenta") || lowerTitle.includes("echeveria")) autoSpecies = "Echeveria (Suculenta)";
          else if (lowerTitle.includes("helecho")) autoSpecies = "Helecho Rizado";
          else if (lowerTitle.includes("ficus")) autoSpecies = "Ficus Lyrata";
          else if (lowerTitle.includes("aloe") || lowerTitle.includes("sabila")) autoSpecies = "Aloe Vera";
          else autoSpecies = "Planta de Interior";
        }
        await createPlant({
          name: formTitle,
          species: autoSpecies,
          photoUrl: primaryPhoto,
          photoUrls: formPhotoUrls
        } as any);
        setCurrentTab("plantas");
      } 
      else if (activeModalType === "wish") {
        const foundUser = users.find(u => u.id === formAssigned);
        await createWish({
          name: formTitle,
          category: formExtra || "Hogar ☕",
          owner: formAssigned === "home" ? "Hogar" : (foundUser ? foundUser.name : formAssigned),
          status: "desired",
          notes: formDescription || undefined
        });
        setCurrentTab("metas");
      } 
      else if (activeModalType === "memory") {
        await createMemory({
          title: formTitle,
          type: "custom",
          date: formDate,
          location: formExtra || "Bogotá D.C.",
          description: formDescription || undefined,
          people: formAssigned === "home" ? users.map(u => u.id) : [formAssigned],
          media: formPhotoUrl ? [formPhotoUrl] : ["https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400"]
        });
        setCurrentTab("recuerdos");
      } 
      else if (activeModalType === "document") {
        await createDocument({
          title: formTitle,
          category: "other",
          fileType: "pdf",
          type: (formExtra as any) || "other",
          notes: formDescription || undefined,
          fileUrl: formPhotoUrl || "https://example.com/mock-doc-preview.pdf"
        });
        setCurrentTab("documentos");
      }

      // Reset form variables only on success
      setFormTitle("");
      setFormDescription("");
      setFormDate(new Date().toISOString().split("T")[0]);
      setFormTime("");
      setFormEndDate("");
      setFormEndTime("");
      setFormAssigned("home");
      setFormRecurrence("none");
      setFormExtra("");
      setFormPhotoUrl("");
      setFormPhotoUrls([]);
      setFormError(null);
      setActiveModalType(null);
      refreshAllData();
    } catch (err: any) {
      console.error("Error al registrar:", err);
      reportErrorLog(
        err?.message || `Error al registrar ${activeModalType}`,
        err?.stack,
        { 
          action: "handleFormSubmit", 
          modalType: activeModalType, 
          formTitle, 
          formDescription,
          formExtra
        }
      ).catch(e => console.error("Secondary error reporting failure", e));

      setFormError(
        activeModalType === "plant"
          ? "No se pudo registrar la planta. Por favor, verifica la conexión o vuelve a intentarlo miau."
          : "Hubo un problema registrando el elemento miau..."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick launch helper triggered from GatitoChat or Dashboard alerts
  const handleRaiseCustomModal = (type: string) => {
    setActiveModalType(type as any);
  };

  const renderActiveTab = () => {
    if (!home) return null;
    
    switch (currentTab) {
      case "inicio":
        return (
          <HomeDashboard 
            home={home} 
            users={users} 
            calendarItems={calendarItems} 
            pets={pets} 
            plants={plants} 
            memories={memories}
            onRefreshAll={refreshAllData}
            onChangeTab={setCurrentTab}
            onOpenInstallModal={() => setShowInstallModal(true)}
            onOpenCreateModal={(type) => handleRaiseCustomModal(type)}
            activeUserId={activeUserId}
          />
        );
      case "cosmos":
        return (
          <CosmosModule 
            users={users} 
            onRefreshAll={refreshAllData}
          />
        );
      case "calendario":
        return (
          <CalendarModule 
            calendarItems={calendarItems} 
            onRefreshData={refreshAllData} 
            onOpenCreateModal={(type) => handleRaiseCustomModal(type)}
            users={users}
            pets={pets}
          />
        );
      case "mascotas":
        return (
          <PetsModule 
            pets={pets} 
            onRefreshData={refreshAllData} 
            onOpenCreateModal={() => handleRaiseCustomModal("pet")}
          />
        );
      case "plantas":
        return (
          <PlantsModule 
            plants={plants} 
            onRefreshData={refreshAllData} 
            onOpenCreateModal={() => handleRaiseCustomModal("plant")}
            users={users}
          />
        );
      case "metas":
        return (
          <MetasModule 
            wishes={wishes} 
            onRefreshData={refreshAllData} 
            users={users}
          />
        );
      case "recuerdos":
        return (
          <MemoriesModule 
            memories={memories} 
            onRefreshData={refreshAllData} 
            users={users}
          />
        );
      case "hogar":
        return (
          <SettingsModule 
            home={home} 
            users={users} 
            onRefreshData={refreshAllData} 
            onOpenInstallModal={() => setShowInstallModal(true)}
            pets={pets}
            plants={plants}
            activeUserId={activeUserId}
          />
        );
      case "salud":
        return (
          <SaludModule 
            users={users} 
            onRefreshData={refreshAllData} 
            activeUserId={activeUserId}
          />
        );
      case "presupuesto":
        return (
          <PresupuestoModule />
        );
      case "ejercicio":
        return (
          <EjercicioModule 
            userId={activeUserId || "mafe"} 
            users={users}
          />
        );
      case "closet":
        return (
          <ClosetModule 
            users={users} 
            activeUserId={activeUserId}
          />
        );
      default:
        return <div>Módulo en desarrollo miau...</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#FAF7F2] flex flex-col items-center justify-center space-y-4">
        <span className="text-6xl animate-bounce">🏡</span>
        <div className="space-y-1.5 text-center">
          <p className="text-cute text-sm font-bold text-[#2C2723]">Abriendo el nido inteligente...</p>
          <p className="text-xs text-[#8A817C] animate-pulse">Sincronizando el ronroneo del servidor miau 🐾</p>
        </div>
      </div>
    );
  }

  if (!home || users.length === 0) {
    return (
      <OnboardingWizard 
        onCompleted={(newHome, newUser) => {
          localStorage.setItem("astro_home_code", newHome.code || "");
          localStorage.setItem("astro_user_id", newUser.id);
          setHome(newHome);
          setUsers([newUser]);
          refreshAllData();
        }}
      />
    );
  }

  return (
    <div 
      className="flex flex-col md:flex-row h-screen text-[#2C2723] overflow-hidden relative transition-all duration-500"
      style={{
        backgroundImage: cosmicBgEnabled ? `url(${astroHogarBg})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: cosmicBgEnabled ? "#1E1B18" : "#FAF7F2"
      }}
    >
      
      {/* MOBILE TOP HEADER */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b-2 border-[#F3EFE6] shrink-0 select-none shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#FFE5D9] rounded-xl flex items-center justify-center text-base shadow-inner leading-none">
            🏡
          </div>
          <div>
            <h1 className="font-bold text-cute text-xs text-[#2C2723] leading-none truncate max-w-[150px]">{home?.name}</h1>
            <p className="text-[9px] text-amber-700 font-bold flex items-center gap-1 mt-0.5">
              <span className="w-1 h-1 bg-green-500 rounded-full inline-block animate-pulse"></span>
              Sesión: <strong className="text-[#2C2723] font-black">{users.find(u => u.id === activeUserId)?.name || "Milo"}</strong> 🐾
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active profiles mini trigger with active user indicator */}
          <div className="flex -space-x-1">
            {users.map((u) => {
              const isActive = activeUserId === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    setActiveUserId(u.id);
                    localStorage.setItem("astro_user_id", u.id);
                    setSelectedUserForAstro(u);
                  }}
                  className={`w-8 h-8 rounded-full border-2 transition-all shadow-xs overflow-hidden bg-white shrink-0 relative ${
                    isActive ? "border-amber-500 scale-110 z-10" : "border-white opacity-70"
                  }`}
                  title={`Cambiar a sesión de ${u.name} miau ✨`}
                >
                  <div className="w-full h-full scale-105">
                    <Avatar emoji={u.emoji} className="w-full h-full" />
                  </div>
                  {isActive && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Indicador visual de estado de sincronización de Firestore (esquina superior móvil) */}
          <SyncStatusIndicator 
            showLabel={false} 
            onForceRefresh={forceFullDataRefresh} 
            className="p-1.5"
          />

          {/* Notification Bell Icon */}
          <button
            onClick={handleOpenNotificationCenter}
            className="p-1.5 bg-[#FAF7F2] hover:bg-amber-100 rounded-lg text-amber-900 border border-[#E7E2D5] transition-all cursor-pointer relative mr-0.5 shrink-0"
            title="Ver notificaciones miau 🔔"
          >
            <Bell size={14} className={unreadCount > 0 ? "animate-bounce" : ""} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-extrabold text-[8px] px-1 rounded-full border border-white flex items-center justify-center min-w-[14px] h-[14px]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Quick install trigger */}
          <button
            onClick={() => setShowInstallModal(true)}
            className="p-1.5 bg-[#FAF7F2] hover:bg-amber-100 rounded-lg text-amber-900 border border-[#E7E2D5] transition-all cursor-pointer"
            title="Instalar App en Celular"
          >
            <Download size={14} />
          </button>
        </div>
      </header>

      {/* Sidebar navigation */}
      <Sidebar 
        currentTab={currentTab} 
        onChangeTab={setCurrentTab} 
        homeName={home?.name}
        users={users}
        onSelectUser={(u, tab) => handleOpenProfile(u, tab || "natal")}
        activeUserId={activeUserId}
        onSwitchActiveUser={(uid) => {
          setActiveUserId(uid);
          localStorage.setItem("astro_user_id", uid);
          const u = users.find(x => x.id === uid);
          if (u) handleOpenProfile(u, "natal");
        }}
      />

      {/* Main scrolling viewport container */}
      <main className={`flex-1 overflow-y-auto px-6 py-8 max-md:px-3 max-md:pt-4 max-md:pb-24 transition-all duration-500 ${
        cosmicBgEnabled ? "bg-[#FAF7F2]/82 backdrop-blur-xs" : ""
      }`}>
        {renderActiveTab()}
      </main>

      {/* Persistent floating triggers */}
      <GatitoAiChat 
        onRefreshData={refreshAllData} 
        onRequestCreate={handleRaiseCustomModal} 
        users={users}
      />

      {/* MOBILE STICKY BOTTOM TAB NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t-2 border-[#F3EFE6] px-2 py-1.5 z-40 flex items-center justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.03)] select-none">
        {getMobileNavForUser(activeUserId).map((mid) => {
          const item = ALL_MODULES.find(m => m.id === mid) || ALL_MODULES[0];
          const IconComponent = item.icon;
          const isActive = currentTab === item.id;
          
          let activeStyle = "text-amber-600 bg-[#FAF7F2]";
          if (item.id === "calendario") activeStyle = "text-blue-600 bg-blue-50/50";
          else if (item.id === "presupuesto") activeStyle = "text-emerald-700 bg-emerald-50/50";
          else if (item.id === "hogar") activeStyle = "text-[#9A3412] bg-[#FFFBEB]";
          else if (item.id === "cosmos") activeStyle = "text-purple-600 bg-purple-50/50";
          else if (item.id === "mascotas") activeStyle = "text-purple-600 bg-indigo-50/50";
          else if (item.id === "plantas") activeStyle = "text-emerald-700 bg-emerald-50/50";
          else if (item.id === "metas") activeStyle = "text-rose-600 bg-rose-50/50";
          else if (item.id === "recuerdos") activeStyle = "text-rose-600 bg-pink-50/50";
          else if (item.id === "salud") activeStyle = "text-teal-700 bg-teal-50/50";
          else if (item.id === "ejercicio") activeStyle = "text-orange-600 bg-orange-50/50";
          else if (item.id === "closet") activeStyle = "text-purple-600 bg-purple-50/50";
          else if (item.id === "documentos") activeStyle = "text-indigo-600 bg-indigo-50/50";

          return (
            <button
              key={item.id}
              onClick={() => { setCurrentTab(item.id); setShowMobileMenu(false); }}
              className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                isActive ? `${activeStyle} font-black scale-105` : "text-[#625B57] font-semibold"
              }`}
            >
              <IconComponent size={18} className={isActive ? "animate-pulse" : ""} />
              <span className="text-[9.5px]">{item.label}</span>
            </button>
          );
        })}

        <button
          onClick={() => setShowMobileMenu(prev => !prev)}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            showMobileMenu ? "text-purple-600 bg-purple-50 font-black scale-105" : "text-[#625B57] font-semibold"
          }`}
        >
          <Grid size={18} className={showMobileMenu ? "text-purple-600 rotate-45 duration-300" : "duration-300"} />
          <span className="text-[9.5px]">Módulos</span>
        </button>
      </nav>

      {/* MOBILE SLIDING BOTTOM DRAWER FOR THE REST OF THE FEATURES */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            {/* Backdrop */}
            <div 
              className="md:hidden fixed inset-0 z-45 bg-black/30 backdrop-blur-xs transition-opacity"
              onClick={() => setShowMobileMenu(false)}
            />
            
            {/* Sliding Panel */}
            <div 
              className="md:hidden fixed bottom-[58px] left-0 right-0 bg-white rounded-t-[32px] border-t-4 border-[#F3EFE6] px-5 pt-4 pb-6 z-45 shadow-xl max-h-[75vh] overflow-y-auto space-y-4"
            >
              {/* Drag Handle Bar Indicator */}
              <div className="w-12 h-1.5 bg-[#E7E2D5] rounded-full mx-auto mb-2" />

              <div className="flex justify-between items-center pb-2 border-b border-[#FAF7F2]">
                <div>
                  <h3 className="font-extrabold text-cute text-sm text-[#2C2723]">Categorías del Hogar 🏡</h3>
                  <p className="text-[10px] text-gray-500 font-semibold leading-none mt-1">Explora el resto de tus herramientas astrológicas miau🐾</p>
                </div>
                <button 
                  onClick={() => setShowMobileMenu(false)}
                  className="text-gray-400 hover:text-gray-800 font-extrabold text-xs cursor-pointer rounded-full p-1.5 hover:bg-[#FAF7F2]"
                >
                  ✕
                </button>
              </div>

              {/* Grid of remaining categories */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: "cosmos", label: "Cosmos 🌌", desc: "Astrología y Sinastría", color: "from-purple-50 to-indigo-50 border-purple-100 hover:border-purple-300" },
                  { id: "mascotas", label: "Mascotas 🐶", desc: "Cuidado de tus mimados", color: "from-purple-50 to-pink-50 border-purple-100 hover:border-purple-300" },
                  { id: "plantas", label: "Plantas 🌿", desc: "Riego y botánica", color: "from-emerald-50 to-green-50 border-emerald-100 hover:border-emerald-300" },
                  { id: "metas", label: "Metas 🎯", desc: "Vision Board de deseos", color: "from-rose-50 to-red-50 border-rose-100 hover:border-rose-300" },
                  { id: "recuerdos", label: "Recuerdos ❤️", desc: "Galería del nido de amor", color: "from-pink-50 to-rose-50 border-pink-100 hover:border-pink-300" },
                  { id: "salud", label: "Salud 🌸", desc: "Registros y controles", color: "from-teal-50 to-emerald-50 border-teal-100 hover:border-teal-300" },
                  { id: "ejercicio", label: "Templo 🏛️", desc: "Metas y rutinas", color: "from-orange-50 to-amber-50 border-orange-100 hover:border-orange-300" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setShowMobileMenu(false);
                    }}
                    className={`bg-gradient-to-br ${item.color} p-3 rounded-2xl border-2 text-left transition-all active:scale-98 cursor-pointer`}
                  >
                    <h4 className="font-extrabold text-xs text-[#2C2723] truncate leading-none mb-0.5">{item.label}</h4>
                    <p className="text-[9.5px] text-[#625B57] font-semibold truncate leading-tight">{item.desc}</p>
                  </button>
                ))}
              </div>

              {/* View all profile summaries */}
              <div className="bg-[#FAF7F2] p-3 rounded-2xl border-2 border-[#E7E2D5] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5 shrink-0 select-none">
                    {users.map((u) => (
                      <div key={u.id} className="w-8 h-8 rounded-full border border-white bg-white">
                        <Avatar emoji={u.emoji} className="w-full h-full" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#2C2723] leading-none">{home?.name}</h4>
                    <p className="text-[9px] text-[#8A817C] font-semibold mt-0.5">Sintonía cósmica compartida</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (users.length > 0) setSelectedUserForAstro(users[0]);
                    setShowMobileMenu(false);
                  }}
                  className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-black px-3 py-1.5 rounded-xl transition-all shadow-sm"
                >
                  Perfil Astral ✨
                </button>
              </div>

              {/* Customizable Shortcut Bar Control for each user different */}
              <div className="bg-[#FCFAF7] p-4 rounded-3xl border-2 border-[#F3EFE6] space-y-3 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🔧</span>
                  <h4 className="font-extrabold text-cute text-xs text-[#2C2723]">Barra de Accesos Personalizada</h4>
                </div>
                <p className="text-[10px] text-[#625B57] font-semibold leading-normal">
                  Miau🐾 Selecciona un usuario para cambiar y ordenar los 4 iconos principales que más usa en la barra inferior móvil:
                </p>

                {/* User Selector for Shortcuts */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {users.map((u) => {
                    const isActive = userToCustomizeShortcuts === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setUserToCustomizeShortcuts(u.id)}
                        className={`px-3 py-1.5 rounded-xl text-[10.5px] font-black transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                          isActive 
                            ? "bg-amber-600 text-white shadow-3xs" 
                            : "bg-white hover:bg-amber-50 text-[#625B57] border border-[#E7E2D5]"
                        }`}
                      >
                        <span>{getAvatarEmojiChar(u.emoji)}</span>
                        <span>{u.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Slots Config */}
                {userToCustomizeShortcuts && (
                  <div className="space-y-2 pt-2 border-t border-[#FAF7F2]">
                    <p className="text-[9.5px] font-black text-[#8A817C] uppercase tracking-wider">
                      Los 4 módulos preferidos de {users.find(u => u.id === userToCustomizeShortcuts)?.name || "este usuario"}:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[0, 1, 2, 3].map((index) => {
                        const currentShortcuts = getMobileNavForUser(userToCustomizeShortcuts);
                        const currentModuleId = currentShortcuts[index] || "inicio";
                        
                        return (
                          <div key={index} className="bg-white p-2 rounded-2xl border border-[#E7E2D5] flex flex-col gap-1">
                            <span className="text-[8px] font-black text-[#8A817C] uppercase tracking-wider pl-1">
                              Botón #{index + 1}
                            </span>
                            <select
                              value={currentModuleId}
                              onChange={(e) => {
                                const newModuleId = e.target.value;
                                const updated = [...currentShortcuts];
                                updated[index] = newModuleId;
                                handleSaveUserNavItems(userToCustomizeShortcuts, updated);
                              }}
                              className="bg-transparent text-xs font-bold text-[#2C2723] focus:outline-none w-full cursor-pointer p-0.5"
                            >
                              {ALL_MODULES.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.emoji} {m.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* UNIVERSAL MASTER FORM CREATOR DIALOG DIALOG */}
      {activeModalType && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 transition-all animate-in fade-in duration-200">
          <div className="bg-[#FAF8F5] rounded-[28px] max-w-md w-full p-6 sm:p-7 border-2 border-[#E8E2D2] space-y-4 shadow-2xl shadow-stone-900/15 relative overflow-hidden text-[#2C2723]">
            {/* Note-card subtle top decorative tape/accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-1.5 bg-[#E2D8C3] rounded-b-lg opacity-80" />

            <div className="flex justify-between items-center pb-3 border-b border-[#E8E2D2]">
              <h3 className="font-extrabold text-cute text-base capitalize flex items-center gap-2 text-[#2C2723]">
                <span className="p-1 bg-amber-100/70 rounded-xl text-amber-900 text-sm">➕</span> 
                <span>
                  {
                    activeModalType === "event" ? "Nuevo Evento Especial" :
                    activeModalType === "task" ? "Nueva Tarea del Hogar" :
                    activeModalType === "pet" ? "Nueva Mascota" :
                    activeModalType === "plant" ? "Agregar Planta" :
                    activeModalType === "wish" ? "Nuevo Deseo" :
                    activeModalType === "memory" ? "Nuevo Recuerdo de Pareja" :
                    "Registrar Papel / Documento"
                  }
                </span>
              </h3>
              <button 
                onClick={() => setActiveModalType(null)}
                className="text-stone-400 hover:text-stone-800 font-extrabold text-xs cursor-pointer rounded-full p-1.5 hover:bg-stone-200/50 transition-colors"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              
              {formError && (
                <div id="form-error-banner" className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-3 flex items-start gap-2">
                  <span className="text-sm">⚠️</span>
                  <p className="font-semibold leading-relaxed">{formError}</p>
                </div>
              )}

              {/* Core Text Input name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#625B57]">
                  {
                    activeModalType === "pet" || activeModalType === "plant" ? "Nombre / Apodo:" :
                    activeModalType === "wish" ? "Deseo / Objeto especial:" :
                    activeModalType === "document" ? "Título de archivo:" :
                    "Nombre / Tarea principal:"
                  }
                </label>
                <input 
                  type="text" 
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Escribe el nombre principal miau..."
                  className="w-full bg-[#FAF7F2] focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] text-cute text-sm"
                />
              </div>

              {/* Description Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#625B57]">
                  {
                    activeModalType === "pet" ? "Raza / Especie:" :
                    activeModalType === "plant" ? "Especie / Tipo de planta (opcional):" :
                    "Descripción / Notas:"
                  }
                </label>
                <input 
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={
                    activeModalType === "pet" ? "ej: Criollo, Labrador, Siamés..." :
                    activeModalType === "plant" ? "ej: Sansevieria, Monstera, Poto... (O vacío para que Milo la identifique)" :
                    "ej: Notas adicionales..."
                  }
                  className="w-full bg-[#FAF7F2] focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] text-cute text-xs"
                />
              </div>

              {/* Context variables based on active selection */}
              
              {/* 1. Date select details */}
              {activeModalType === "event" && (
                <div className="space-y-3 bg-[#FAF7F2]/50 p-3 rounded-2xl border border-[#EAE5D9]">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#625B57]">📅 Fecha de inicio:</label>
                      <input 
                        type="date"
                        required
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full bg-white focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] font-mono text-xs text-[#2C2723]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#625B57]">⏰ Hora de inicio:</label>
                      <input 
                        type="time" 
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        className="w-full bg-white focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] font-mono text-xs text-[#2C2723]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#625B57]">📅 Fecha fin (Opcional):</label>
                      <input 
                        type="date"
                        value={formEndDate}
                        onChange={(e) => setFormEndDate(e.target.value)}
                        className="w-full bg-white focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] font-mono text-xs text-[#2C2723]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#625B57]">⏰ Hora fin (Opcional):</label>
                      <input 
                        type="time" 
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        className="w-full bg-white focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] font-mono text-xs text-[#2C2723]"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 pt-1.5 border-t border-[#EAE5D9]">
                    <label className="block text-xs font-bold text-[#625B57]">✨ Selecciona un Emoji para destacar este evento:</label>
                    <div className="flex flex-wrap gap-1.5 py-0.5">
                      {["🎉", "🎂", "✈️", "🍽️", "🛍️", "🏥", "🍿", "🐾", "🪴", "💖", "🏠", "🧹", "🚗", "💼", "🧘", "🎵", "🎨", "⚽"].map(em => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setFormEmoji(em)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all border ${
                            formEmoji === em 
                              ? "bg-amber-100 border-amber-300 scale-110 shadow-sm font-bold" 
                              : "bg-white hover:bg-amber-50/50 border-[#EAE5D9]"
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] text-[#8A817C] font-semibold">¿Otro emoji?:</span>
                      <input 
                        type="text"
                        value={formEmoji}
                        onChange={(e) => setFormEmoji(e.target.value)}
                        placeholder="Ingresa uno..."
                        className="w-28 bg-white focus:outline-none rounded-lg px-2 py-1 border border-[#EAE5D9] text-center text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeModalType !== "event" && (activeModalType === "task" || activeModalType === "memory" || activeModalType === "pet") && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-[#625B57]">
                      {activeModalType === "pet" ? "Fecha Nacimiento:" : "Fecha programada:"}
                    </label>
                    <input 
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-[#FAF7F2] focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] font-mono text-xs text-[#2C2723]"
                    />
                  </div>
                  
                  {activeModalType !== "pet" && activeModalType !== "memory" && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#625B57]">Hora:</label>
                      <input 
                        type="time" 
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        className="w-full bg-[#FAF7F2] focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] font-mono text-xs text-[#2C2723]"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 2. Responsable / Dueño options */}
              {(activeModalType === "event" || activeModalType === "task" || activeModalType === "wish" || activeModalType === "memory") && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#625B57]">Asignar Responsabilidad / Dueño:</label>
                  <select
                    value={formAssigned}
                    onChange={(e) => setFormAssigned(e.target.value as any)}
                    className="w-full bg-[#FAF7F2] focus:outline-none rounded-xl px-3 py-1.5 border border-[#EAE5D9] text-cute text-xs font-bold"
                  >
                    <option value="home">Ambos miembros (Hogar completo) 🏠</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>Asignar solo a {u.name} ✨</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 3. Recurrences for tasks or events */}
              {(activeModalType === "task" || activeModalType === "event") && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#625B57]">¿Cómo debe repetirse?</label>
                  <select
                    value={formRecurrence}
                    onChange={(e) => {
                      setFormRecurrence(e.target.value);
                      if (e.target.value !== "specific") {
                        setFormSpecificRepeatDate("");
                      }
                    }}
                    className="w-full bg-[#FAF7F2] focus:outline-none rounded-xl px-3 py-1.5 border border-[#EAE5D9] text-cute text-xs font-bold text-[#2C2723]"
                  >
                    <option value="none">No se repite (Único) 🔹</option>
                    <option value="daily">Periódico - Todos los días 📆</option>
                    <option value="weekly">Periódico - Semanalmente (Mismo día de la semana) 🔄</option>
                    <option value="monthly">Periódico - Mensualmente (Mismo día del mes) 📅</option>
                    <option value="specific">Repetir en una fecha específica adicional... 📍</option>
                  </select>

                  {formRecurrence === "specific" && (
                    <div className="space-y-1.5 mt-2 p-2.5 bg-amber-50/50 rounded-xl border border-amber-200">
                      <label className="block text-[10px] font-black text-amber-950 uppercase tracking-wider">Fecha específica adicional de repetición:</label>
                      <input 
                        type="date"
                        required
                        value={formSpecificRepeatDate}
                        onChange={(e) => setFormSpecificRepeatDate(e.target.value)}
                        className="w-full bg-white focus:outline-none rounded-lg px-3 py-1.5 border border-[#EAE5D9] font-mono text-xs text-[#2C2723]"
                      />
                      <p className="text-[9px] text-[#8A817C] font-semibold leading-normal">
                        El evento se guardará y también se mostrará en esta fecha específica adicional.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 🔔 Push Notification 1 Hour Before Toggle */}
              {(activeModalType === "event" || activeModalType === "task") && (
                <div className="flex items-center gap-2.5 p-2.5 bg-blue-50/70 rounded-2xl border border-blue-100/90">
                  <input 
                    type="checkbox"
                    id="form-notify-1h"
                    checked={formNotify1Hour}
                    onChange={(e) => setFormNotify1Hour(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded-md border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="form-notify-1h" className="text-xs font-bold text-[#2C2723] cursor-pointer flex items-center gap-1.5">
                    <span>🔔 Avisar por Notificación Push 1 hora antes del inicio</span>
                  </label>
                </div>
              )}

              {/* 4. Categoría inputs fallback tags */}
              {activeModalType === "wish" && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#625B57]">Categoría / Emoji:</label>
                  <input 
                    type="text" 
                    value={formExtra}
                    onChange={(e) => setFormExtra(e.target.value)}
                    placeholder="ej: Tecnología 🎮 o Hogar ☕"
                    className="w-full bg-[#FAF7F2] focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] text-cute text-xs"
                  />
                </div>
              )}

              {activeModalType === "pet" && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#625B57]">Peso Inicial (kg):</label>
                  <input 
                    type="number"
                    step="0.01" 
                    value={formExtra}
                    onChange={(e) => setFormExtra(e.target.value)}
                    placeholder="ej: 3.5"
                    className="w-full bg-[#FAF7F2] focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] text-cute text-xs font-mono"
                  />
                </div>
              )}

              {activeModalType === "document" && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#625B57]">Clasificación Papel:</label>
                  <select
                    value={formExtra}
                    onChange={(e) => setFormExtra(e.target.value)}
                    className="w-full bg-[#FAF7F2] focus:outline-none rounded-xl px-3 py-1.5 border border-[#EAE5D9] text-cute text-xs"
                  >
                    <option value="invoice">Servicio / Recibo Cuenta 🧾</option>
                    <option value="contract">Arriendo o Contrato Legal 🏠</option>
                    <option value="medical">Salud / Carnet Clínica 🐾</option>
                    <option value="other">Papelería general 📄</option>
                  </select>
                </div>
              )}

              {/* 📸 ADJUNTAR IMAGEN / ARCHIVO (Para Mascotas, Plantas, Recuerdos, Documentos) */}
              {activeModalType === "plant" ? (
                <div className="space-y-2 p-3.5 bg-emerald-50/40 rounded-2xl border border-emerald-100">
                  <label className="block text-xs font-black text-emerald-950 uppercase tracking-wider">
                    📸 SUBIR FOTOS DE TU PLANTA (Agrega 2 o más miau):
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    {formPhotoUrls.map((url, index) => (
                      <div key={index} className="relative group border border-emerald-200 rounded-xl overflow-hidden aspect-square bg-white flex items-center justify-center">
                        <img src={url} alt={`Muestra ${index+1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormPhotoUrls(prev => prev.filter((_, i) => i !== index))}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full border border-red-600 transition-all cursor-pointer flex items-center justify-center w-5 h-5 text-[10px] font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    <label className="border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-white rounded-xl cursor-pointer flex flex-col items-center justify-center aspect-square transition-all hover:bg-emerald-50/20">
                      <span className="text-xl text-emerald-600 font-extrabold">+</span>
                      <span className="text-[9px] font-bold text-[#625B57] mt-0.5">Sube otra</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              const compressed = await compressImage(reader.result as string);
                              setFormPhotoUrls(prev => [...prev, compressed]);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {formPhotoUrls.length < 2 && (
                    <p className="text-[10px] text-amber-600 font-bold">💡 Se recomienda subir 2 o más fotos para una mejor precisión miau.</p>
                  )}
                  {formPhotoUrls.length >= 2 && (
                    <p className="text-[10px] text-emerald-700 font-bold">✓ ¡Tienes {formPhotoUrls.length} fotos listas para que Milo las examine!</p>
                  )}
                </div>
              ) : (
                (activeModalType === "pet" || activeModalType === "memory" || activeModalType === "document") && (
                  <div className="space-y-1.5 p-3.5 bg-indigo-50/40 rounded-2xl border border-indigo-100/40">
                    <label className="block text-xs font-black text-indigo-950 uppercase tracking-wider">
                      📸 ADJUNTAR FOTO O DOCUMENTO REAL:
                    </label>
                    
                    {formPhotoUrl ? (
                      <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-indigo-200">
                        <img 
                          src={formPhotoUrl} 
                          alt="Adjunto cargado" 
                          className="w-12 h-12 object-cover rounded-lg border shadow-2xs" 
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-emerald-800 font-bold leading-none">✓ ¡Archivo adjuntado correctamente!</p>
                          <p className="text-[9px] text-gray-400 mt-0.5 truncate uppercase">Formato base64 guardado</p>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setFormPhotoUrl("")}
                          className="text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline px-2.5 py-1 bg-rose-50 rounded-lg cursor-pointer"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <label className="flex-1 flex flex-col items-center justify-center p-3 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-white rounded-xl cursor-pointer transition-all hover:bg-indigo-50/30">
                            <span className="text-lg">📁</span>
                            <span className="text-[10.5px] font-bold text-indigo-950">Subir Archivo Local</span>
                            <span className="text-[9px] text-gray-400 mt-0.5">Drag & Drop o Explorar</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = async () => {
                                    const compressed = await compressImage(reader.result as string);
                                    setFormPhotoUrl(compressed);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          
                          <div className="flex flex-col justify-center text-center text-[10px] text-gray-400 font-bold px-1.5">
                            Ó
                          </div>
                          
                          <div className="flex-1 flex flex-col justify-center space-y-1">
                            <span className="text-[9.5px] font-bold text-gray-500">Pegar enlace (URL):</span>
                            <input 
                              type="text" 
                              placeholder="https://..." 
                              value={formPhotoUrl}
                              onChange={(e) => setFormPhotoUrl(e.target.value)}
                              className="w-full bg-[#FAF7F2] focus:outline-none rounded-xl px-2 py-1.5 border border-[#EAE5D9] text-[11px] font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}

              {/* Action options */}
              <div className="flex gap-2 justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => setActiveModalType(null)} 
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-[#EAE5D9] rounded-xl text-xs font-bold cursor-pointer hover:bg-gray-50 text-[#8A817C] disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 disabled:opacity-75 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-indigo-700 shadow-sm flex items-center gap-1.5"
                >
                  {isSubmitting && <span className="animate-spin text-sm">🪴</span>}
                  <span>
                    {isSubmitting 
                      ? (activeModalType === "plant" ? "Analizando y plantando..." : "Guardando miau...") 
                      : "Crear en el Hogar"}
                  </span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {selectedUserForAstro && (
        <AstroProfileModal 
          user={selectedUserForAstro} 
          allUsers={users}
          onClose={() => setSelectedUserForAstro(null)} 
          onRefreshData={refreshAllData} 
          home={home}
          onOpenInstallModal={() => setShowInstallModal(true)}
          pets={pets}
          plants={plants}
          activeUserId={activeUserId}
          initialTab={astroProfileInitialTab}
        />
      )}

      <AnimatePresence>
        {showInstallModal && (
          <MobileInstallModal 
            homeName={home?.name}
            onClose={() => setShowInstallModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop Notification floating dock */}
      <div className="hidden md:flex items-center gap-2 fixed top-4 right-4 z-35 bg-white/90 backdrop-blur-md p-1.5 rounded-full shadow-md border-2 border-[#F3EFE6] transition-all hover:scale-105 duration-200">
        {/* Indicador visual de estado de sincronización de Firestore (esquina superior escritorio) */}
        <SyncStatusIndicator 
          showLabel={true} 
          onForceRefresh={forceFullDataRefresh} 
        />
        {/* Floating Bell Button */}
        <button
          onClick={handleOpenNotificationCenter}
          className="p-2 hover:bg-amber-50 rounded-full text-amber-900 transition-all cursor-pointer w-8 h-8 relative flex items-center justify-center"
          title="Ver notificaciones miau 🔔"
        >
          <Bell size={16} className={unreadCount > 0 ? "animate-bounce text-amber-600" : "text-[#625B57]"} />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 bg-rose-500 text-white font-extrabold text-[8px] px-1 rounded-full border border-white flex items-center justify-center min-w-[14px] h-[14px] shadow-sm animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* NOTIFICATION CENTER DRAWER */}
      <AnimatePresence>
        {showNotificationCenter && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 cursor-pointer"
              onClick={() => setShowNotificationCenter(false)}
            />
            
            {/* Right Side Drawer */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l-4 border-[#F3EFE6] shadow-2xl z-50 flex flex-col h-full overflow-hidden"
            >
              
              {/* Drawer Header */}
              <div className="p-6 bg-[#FCFAF7] border-b-2 border-[#F3EFE6] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔔</span>
                  <div>
                    <h3 className="font-extrabold text-cute text-base text-[#2C2723]">Notificaciones del Nido</h3>
                    <p className="text-xs text-[#8A817C] font-semibold leading-none mt-1">Sintonía de actividades en tiempo real miau 🐾</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotificationCenter(false)}
                  className="p-1.5 hover:bg-[#FAF7F2] rounded-full transition-all text-[#8A817C] hover:text-[#2C2723] cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Body - Notification List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF7F2]/30">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2">
                    <span className="text-4xl animate-bounce">🐱💤</span>
                    <p className="font-bold text-[#625B57] text-sm">Todo silencioso por aquí...</p>
                    <p className="text-xs text-[#8A817C]">No hay actividades registradas en el nido todavía. miau.</p>
                  </div>
                ) : (
                  [...notifications].reverse().map((notif) => {
                    const isOwn = notif.userId === activeUserId;
                    const isUnread = !isOwn && !notif.readBy.includes(activeUserId);
                    const perfName = users.find(u => u.id === notif.userId)?.name || notif.userId;
                    
                    let timeText = "";
                    try {
                      const date = new Date(notif.timestamp);
                      timeText = date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ", " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    } catch (e) {
                      timeText = notif.timestamp;
                    }
                    
                    // Emoji / Color mapping based on notification type
                    let typeEmoji = "📝";
                    let typeBg = "bg-amber-100 text-amber-800";
                    
                    if (notif.type === "calendar") {
                      typeEmoji = "📅";
                      typeBg = "bg-blue-100 text-blue-800";
                    } else if (notif.type === "pet") {
                      typeEmoji = "🐾";
                      typeBg = "bg-purple-100 text-purple-800";
                    } else if (notif.type === "plant") {
                      typeEmoji = "🌿";
                      typeBg = "bg-emerald-100 text-emerald-800";
                    } else if (notif.type === "wish") {
                      typeEmoji = "✨";
                      typeBg = "bg-rose-100 text-rose-800";
                    } else if (notif.type === "memory") {
                      typeEmoji = "📸";
                      typeBg = "bg-sky-100 text-sky-800";
                    } else if (notif.type === "document") {
                      typeEmoji = "📄";
                      typeBg = "bg-zinc-100 text-zinc-800";
                    } else if (notif.type === "budget") {
                      typeEmoji = "💰";
                      typeBg = "bg-green-100 text-green-800";
                    } else if (notif.type === "salud") {
                      typeEmoji = "🌸";
                      typeBg = "bg-rose-100 text-rose-800";
                    } else if (notif.type === "workout") {
                      typeEmoji = "💪";
                      typeBg = "bg-orange-100 text-orange-800";
                    }

                    return (
                      <div 
                        key={notif.id}
                        className={`p-4 rounded-2xl border-2 transition-all flex gap-3 relative overflow-hidden ${
                          isUnread 
                            ? "bg-white border-amber-300 shadow-xs ring-1 ring-amber-200/50" 
                            : "bg-white/85 border-[#F3EFE6] text-gray-700"
                        }`}
                      >
                        {isUnread && (
                          <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500" />
                        )}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${typeBg}`}>
                          {typeEmoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-[#2C2723] truncate">
                              {notif.title}
                            </span>
                            <span className="text-[10px] text-gray-400 font-semibold shrink-0">
                              {timeText}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                            {notif.message}
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#FAF7F2]">
                            <span className="text-[10px] text-gray-400">
                              Realizado por: <span className="font-bold text-[#625B57]">{perfName}</span>
                            </span>
                            {isOwn && (
                              <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-1.5 py-0.5 rounded">
                                Tú
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer Actions */}
              {notifications.length > 0 && (
                <div className="p-4 bg-[#FCFAF7] border-t-2 border-[#F3EFE6] flex gap-3">
                  <button
                    onClick={handleClearNotifications}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border-2 border-[#E7E2D5] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 rounded-xl font-bold text-xs text-[#625B57] transition-all cursor-pointer"
                  >
                    <Trash2 size={14} />
                    Limpiar Todo
                  </button>
                  <button
                    onClick={() => setShowNotificationCenter(false)}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 border-2 border-amber-600 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    Entendido
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal Global de Confirmación de Borrado y Validación de Permisos */}
      {deleteConfirmModalState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border-2 border-[#F3EFE6] shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-50 rounded-2xl border border-red-100">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-[#2C2723]">{deleteConfirmModalState.title}</h3>
                <p className="text-[11px] text-[#8A817C] font-semibold">Hogar: <span className="text-amber-800 font-bold">{home?.code}</span> • Sesión: <span className="text-amber-800 font-bold">{activeUserId || 'Miembro'}</span></p>
              </div>
            </div>

            <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#EAE5D9]">
              <p className="text-xs font-medium text-[#2C2723] leading-relaxed">
                {deleteConfirmModalState.message}
              </p>
              {deleteConfirmModalState.itemName && (
                <p className="text-xs font-bold text-red-700 mt-2.5 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 inline-block">
                  Elemento: "{deleteConfirmModalState.itemName}"
                </p>
              )}
            </div>

            {deleteConfirmModalState.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{deleteConfirmModalState.error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleteConfirmModalState.isDeleting}
                onClick={() => setDeleteConfirmModalState(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 rounded-xl border border-[#DCD6CD] text-xs font-bold text-[#625B57] hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-50"
              >
                {deleteConfirmModalState.error ? "Entendido" : "Cancelar"}
              </button>
              {!deleteConfirmModalState.error && (
                <button
                  type="button"
                  disabled={deleteConfirmModalState.isDeleting}
                  onClick={() => deleteConfirmModalState.onConfirm()}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {deleteConfirmModalState.isDeleting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      Confirmar Borrado
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
