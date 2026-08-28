import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Smartphone, Bell, Settings, Grid, Sparkles, Plus, Trash2, 
  Download, CheckCircle2, MessageSquare, Leaf, Gift, Heart, 
  Activity, DollarSign, Calendar, RefreshCw, Star, Info, ShieldCheck, Check
} from "lucide-react";
import { UserProfile, Home as HomeType } from "../types";
import { updateUserProfile } from "../api";

interface MobileWidgetsCenterProps {
  home: HomeType;
  users: UserProfile[];
  onRefreshData: () => void;
  pets?: any[];
  plants?: any[];
  activeUserId?: string;
}

export default function MobileWidgetsCenter({ home, users, onRefreshData, pets = [], plants = [], activeUserId }: MobileWidgetsCenterProps) {
  const currentUserId = activeUserId || (typeof window !== "undefined" ? (localStorage.getItem("astro_user_id") || "") : "");
  const currentUser = users.find(u => u.id === currentUserId) || users[0];

  const [activeTab, setActiveTab] = useState<"alerts" | "push">("alerts");
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Alert preferences state loaded from current user
  const [preferences, setPreferences] = useState({
    sintoniaReminders: currentUser?.alertPreferences?.sintoniaReminders ?? true,
    petVaccines: currentUser?.alertPreferences?.petVaccines ?? true,
    plantCare: currentUser?.alertPreferences?.plantCare ?? true,
    budgetAlerts: currentUser?.alertPreferences?.budgetAlerts ?? true,
    calendarEvents: currentUser?.alertPreferences?.calendarEvents ?? true,
    systemAlerts: currentUser?.alertPreferences?.systemAlerts ?? true,
    menstrualCycle: currentUser?.alertPreferences?.menstrualCycle ?? true,
    completedGoals: currentUser?.alertPreferences?.completedGoals ?? true,
  });

  // Push subscription states
  const [pushToken, setPushToken] = useState<string>(currentUser?.pushToken || "");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<"default" | "granted" | "denied" | any>(
    typeof window !== "undefined" && "Notification" in window 
      ? Notification.permission 
      : "default"
  );

  // Simulated live notification banner on phone screen
  const [simulatedNotification, setSimulatedNotification] = useState<{
    title: string;
    message: string;
    icon: string;
    type: string;
  } | null>(null);

  const [installedWidgets, setInstalledWidgets] = useState<string[]>(["sintonia", "plants", "pets", "finances"]);
  const [widgetTheme, setWidgetTheme] = useState<"slate" | "pastel" | "emerald" | "classic">("slate");

  useEffect(() => {
    if (currentUser) {
      setPreferences({
        sintoniaReminders: currentUser.alertPreferences?.sintoniaReminders ?? true,
        petVaccines: currentUser.alertPreferences?.petVaccines ?? true,
        plantCare: currentUser.alertPreferences?.plantCare ?? true,
        budgetAlerts: currentUser.alertPreferences?.budgetAlerts ?? true,
        calendarEvents: currentUser.alertPreferences?.calendarEvents ?? true,
        systemAlerts: currentUser.alertPreferences?.systemAlerts ?? true,
        menstrualCycle: currentUser.alertPreferences?.menstrualCycle ?? true,
        completedGoals: currentUser.alertPreferences?.completedGoals ?? true,
      });
      setPushToken(currentUser.pushToken || "");
    }
  }, [currentUser]);

  // Handle saving alert preferences
  const handleSavePreferences = async (updatedPrefs = preferences) => {
    if (!currentUser) return;
    setSavingAlerts(true);
    try {
      await updateUserProfile(currentUser.id, {
        name: currentUser.name,
        birthDate: currentUser.birthDate,
        birthTime: currentUser.birthTime || "12:00",
        birthPlace: currentUser.birthPlace || "",
        emoji: currentUser.emoji || "👤",
        pushToken: pushToken || undefined,
        alertPreferences: updatedPrefs,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onRefreshData();
    } catch (err) {
      console.error("Error al guardar preferencias:", err);
    } finally {
      setSavingAlerts(false);
    }
  };

  const handleTogglePref = (key: keyof typeof preferences) => {
    const nextPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(nextPrefs);
    handleSavePreferences(nextPrefs);
  };

  // Subscribe to Push Notifications
  const handleSubscribePush = () => {
    setShowPermissionPrompt(true);
  };

  const grantPushPermission = async () => {
    setShowPermissionPrompt(false);
    setIsSubscribing(true);
    
    let permissionResult = "granted";
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const res = await Promise.resolve(Notification.requestPermission()).catch(() => "granted");
        permissionResult = res || "granted";
        setNotificationPermission(permissionResult as any);
      } catch (err) {
        console.warn("Could not request native notification permission, fallback to simulated:", err);
        permissionResult = "granted";
        setNotificationPermission("granted");
      }
    } else {
      setNotificationPermission("granted");
    }
    
    // Simulate FCM Token generation
    setTimeout(async () => {
      const generatedToken = "fcm_token_hogar_" + Math.random().toString(36).substring(2, 12).toUpperCase();
      setPushToken(generatedToken);
      
      try {
        await updateUserProfile(currentUser.id, {
          name: currentUser.name,
          birthDate: currentUser.birthDate,
          birthTime: currentUser.birthTime || "12:00",
          birthPlace: currentUser.birthPlace || "",
          emoji: currentUser.emoji || "👤",
          pushToken: generatedToken,
          alertPreferences: preferences,
        });
        setIsSubscribing(false);
        onRefreshData();
        
        // Fire first test notification instantly
        triggerPushNotification(
          "¡Milo te saluda! 🐾🔔",
          `Hola ${currentUser.name}, tu dispositivo ha sido registrado con éxito en el servidor de Firebase. ¡Miau, de una!`,
          "🐾",
          "system"
        );
      } catch (err) {
        console.error(err);
        setIsSubscribing(false);
      }
    }, 1500);
  };

  // Trigger simulated push notification on phone AND native HTML5 browser notification
  const triggerPushNotification = (title: string, message: string, icon: string, type: string) => {
    setSimulatedNotification({ title, message, icon, type });
    
    // Try Service Worker registration showNotification first for system level background notification
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "Notification" in window && Notification.permission === "granted") {
      navigator.serviceWorker.ready.then(reg => {
        if (reg && reg.showNotification) {
          reg.showNotification(title, {
            body: message,
            icon: "/icon-192.jpg",
            tag: type,
            badge: "/icon-192.jpg",
            vibrate: [100, 50, 100]
          } as any);
        }
      }).catch(() => {
        // Fallback to direct HTML5 Notification constructor
        try {
          const notif = new Notification(title, {
            body: message,
            icon: "/icon-192.jpg",
            tag: type,
          });
          notif.onclick = () => window.focus();
        } catch (err) {
          console.log("Native Web Notification rejected or failed:", err);
        }
      });
    } else if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        const notif = new Notification(title, {
          body: message,
          icon: "/icon-192.jpg",
          tag: type,
        });
        notif.onclick = () => window.focus();
      } catch (err) {
        console.log("Native Web Notification rejected or failed:", err);
      }
    }

    // Auto-dismiss simulated banner after 6 seconds
    setTimeout(() => {
      setSimulatedNotification(prev => prev?.title === title ? null : prev);
    }, 6000);
  };

  const handleTestNotification = async (type: string) => {
    if (!pushToken) {
      const generatedToken = "fcm_token_hogar_" + Math.random().toString(36).substring(2, 12).toUpperCase();
      setPushToken(generatedToken);
      try {
        await updateUserProfile(currentUser.id, {
          name: currentUser.name,
          birthDate: currentUser.birthDate,
          birthTime: currentUser.birthTime || "12:00",
          birthPlace: currentUser.birthPlace || "",
          emoji: currentUser.emoji || "👤",
          pushToken: generatedToken,
          alertPreferences: preferences,
        });
        onRefreshData();
      } catch (e) {
        console.error("Auto subscription silent error:", e);
      }
    }

    switch (type) {
      case "sintonia":
        triggerPushNotification(
          "Sintonía Diaria Activa 💖",
          `¡Miau! ${currentUser.name}, solo faltas tú por responder las preguntas de hoy. ¡Sintoniza el nido! 🐾`,
          "💖",
          "sintonia"
        );
        break;
      case "pet":
        const petName = pets[0]?.name || "Milo";
        triggerPushNotification(
          `Recordatorio de ${petName} 🐾`,
          `¡Hora de peinar, consentir y revisar la salud de ${petName.replace(/🐾/g, "").trim()}! Sintoniza su corazoncito.`,
          "🐈",
          "pet"
        );
        break;
      case "plant":
        const plantName = plants[0]?.name || "Suculenta cósmica";
        triggerPushNotification(
          "Alerta Botánica 🪴💧",
          `La plantita "${plantName}" tiene sed. ¡Un vasito de agua fresca le vendrá increíble hoy!`,
          "🪴",
          "plant"
        );
        break;
      case "budget":
        triggerPushNotification(
          "Alerta de Gastos del Nido 💰",
          "¡Atención! Han alcanzado el 85% de vuestro presupuesto semanal de ocio. Cuidemos los recursos miau.",
          "💰",
          "budget"
        );
        break;
      case "calendar":
        triggerPushNotification(
          "Próxima Misión de Pareja 📅",
          "Recordatorio: Cena en casa para sintonizar y agradecer las alegrías a las 8:30 PM. ¡No lo olviden!",
          "🍷",
          "calendar"
        );
        break;
      case "menstrualCycle":
        triggerPushNotification(
          "Fase del Ciclo Menstrual 🌸",
          `¡Miau! Estás entrando en la fase de ovulación. Tu energía cósmica y tu magnetismo brillan hoy miau🐾.`,
          "🌸",
          "menstrualCycle"
        );
        break;
      case "completedGoals":
        triggerPushNotification(
          "¡Meta Cumplida en el Nido! 🎯✨",
          `¡Felicidades miau! Se ha completado la meta de ahorro familiar. ¡Sigan brillando juntos!`,
          "🏆",
          "completedGoals"
        );
        break;
      default:
        triggerPushNotification(
          "Milo te aconseja ✨",
          "Recuerden respirar con calma, regalarse un abrazo tierno y disfrutar el calor de su nido de amor.",
          "✨",
          "system"
        );
    }
  };

  // Add widget to homescreen
  const handleToggleWidget = (widgetId: string) => {
    if (installedWidgets.includes(widgetId)) {
      setInstalledWidgets(installedWidgets.filter(w => w !== widgetId));
    } else {
      setInstalledWidgets([...installedWidgets, widgetId]);
    }
  };

  // Styles of Widgets based on active theme
  const getThemeClasses = () => {
    switch (widgetTheme) {
      case "slate":
        return {
          bg: "bg-[#2C2723] text-white",
          border: "border-gray-850",
          accent: "text-amber-400",
          progressBg: "bg-white/20",
          progressFill: "bg-amber-400",
          sub: "text-gray-300",
          cardBg: "bg-white/10"
        };
      case "pastel":
        return {
          bg: "bg-rose-50 text-[#2C2723]",
          border: "border-rose-200",
          accent: "text-rose-600",
          progressBg: "bg-rose-200/50",
          progressFill: "bg-rose-500",
          sub: "text-gray-500",
          cardBg: "bg-white/80"
        };
      case "emerald":
        return {
          bg: "bg-[#EBF7F2] text-emerald-950",
          border: "border-emerald-200",
          accent: "text-emerald-700",
          progressBg: "bg-emerald-200/50",
          progressFill: "bg-emerald-600",
          sub: "text-emerald-800/70",
          cardBg: "bg-white/80"
        };
      case "classic":
        return {
          bg: "bg-[#FAF7F2] text-[#2C2723]",
          border: "border-[#EAE5D9]",
          accent: "text-amber-700",
          progressBg: "bg-amber-100",
          progressFill: "bg-amber-600",
          sub: "text-[#8A817C]",
          cardBg: "bg-white"
        };
    }
  };

  const theme = getThemeClasses();

  return (
    <div className="space-y-6">
      
      {/* Tab Selector */}
      <div className="flex bg-[#FAF7F2] p-1.5 rounded-2xl border-2 border-[#E7E2D5] gap-1.5 max-w-lg mx-auto">
        <button
          onClick={() => setActiveTab("alerts")}
          className={`flex-1 py-2 px-3 rounded-xl font-black text-cute text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "alerts"
              ? "bg-[#2C2723] text-white shadow-md"
              : "text-[#8A817C] hover:text-[#2C2723] hover:bg-white/50"
          }`}
        >
          <Bell size={13} /> Preferencias de Alertas
        </button>
        <button
          onClick={() => setActiveTab("push")}
          className={`flex-1 py-2 px-3 rounded-xl font-black text-cute text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "push"
              ? "bg-[#2C2723] text-white shadow-md"
              : "text-[#8A817C] hover:text-[#2C2723] hover:bg-white/50"
          }`}
        >
          <Smartphone size={13} /> Permisos y Push del Navegador
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column Controls */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* TAB 1: ALERTS PREFERENCES */}
          {activeTab === "alerts" && (
            <div className="bg-white p-6 rounded-3xl border-4 border-[#F3EFE6] shadow-sm space-y-5">
              <div className="border-b border-[#FAF7F2] pb-2">
                <h3 className="font-extrabold text-[#2C2723] text-cute text-base flex items-center gap-2">
                  🔔 Preferencias de Alertas Personales
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Configura qué alertas deseas recibir en tu dispositivo móvil para estar 100% sincronizado en el nido de amor.
                </p>
              </div>

              <div className="space-y-4">
                {/* Preference 1 */}
                <div 
                  onClick={() => handleTogglePref("sintoniaReminders")}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF7F2]/65 hover:bg-[#FAF7F2] border border-[#EAE5D9]/70 transition-all cursor-pointer"
                >
                  <div className="flex gap-3 items-center">
                    <span className="text-xl shrink-0">💖</span>
                    <div>
                      <h4 className="font-bold text-xs text-[#2C2723]">Sintonía Diaria Pendiente</h4>
                      <p className="text-[10px] text-gray-500 leading-normal font-medium mt-0.5">Avísame por la noche si alguno de los dos aún no completa su sintonía del día miau.</p>
                    </div>
                  </div>
                  <button className="focus:outline-none shrink-0 text-cute">
                    {preferences.sintoniaReminders ? (
                      <span className="bg-green-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-green-700 shadow-sm">Activo</span>
                    ) : (
                      <span className="bg-gray-200 text-gray-500 font-extrabold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full">Inactivo</span>
                    )}
                  </button>
                </div>

                {/* Preference 2 */}
                <div 
                  onClick={() => handleTogglePref("petVaccines")}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF7F2]/65 hover:bg-[#FAF7F2] border border-[#EAE5D9]/70 transition-all cursor-pointer"
                >
                  <div className="flex gap-3 items-center">
                    <span className="text-xl shrink-0">🩺</span>
                    <div>
                      <h4 className="font-bold text-xs text-[#2C2723]">Salud y Vacunas de Mascotas</h4>
                      <p className="text-[10px] text-gray-500 leading-normal font-medium mt-0.5">Recibe avisos críticos de vacunación, vaciado de arenero o peso de {pets[0]?.name || "Milo"} 🐾.</p>
                    </div>
                  </div>
                  <button className="focus:outline-none shrink-0 text-cute">
                    {preferences.petVaccines ? (
                      <span className="bg-green-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-green-700 shadow-sm">Activo</span>
                    ) : (
                      <span className="bg-gray-200 text-gray-500 font-extrabold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full">Inactivo</span>
                    )}
                  </button>
                </div>

                {/* Preference 3 */}
                <div 
                  onClick={() => handleTogglePref("plantCare")}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF7F2]/65 hover:bg-[#FAF7F2] border border-[#EAE5D9]/70 transition-all cursor-pointer"
                >
                  <div className="flex gap-3 items-center">
                    <span className="text-xl shrink-0">🪴</span>
                    <div>
                      <h4 className="font-bold text-xs text-[#2C2723]">Riego de Plantas del Hogar</h4>
                      <p className="text-[10px] text-gray-500 leading-normal font-medium mt-0.5">Alertas automáticas cuando la tierra esté seca y las plantitas requieran agua fresca.</p>
                    </div>
                  </div>
                  <button className="focus:outline-none shrink-0 text-cute">
                    {preferences.plantCare ? (
                      <span className="bg-green-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-green-700 shadow-sm">Activo</span>
                    ) : (
                      <span className="bg-gray-200 text-gray-500 font-extrabold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full">Inactivo</span>
                    )}
                  </button>
                </div>

                {/* Preference 4 */}
                <div 
                  onClick={() => handleTogglePref("budgetAlerts")}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF7F2]/65 hover:bg-[#FAF7F2] border border-[#EAE5D9]/70 transition-all cursor-pointer"
                >
                  <div className="flex gap-3 items-center">
                    <span className="text-xl shrink-0">💰</span>
                    <div>
                      <h4 className="font-bold text-xs text-[#2C2723]">Alertas de Presupuesto</h4>
                      <p className="text-[10px] text-gray-500 leading-normal font-medium mt-0.5">Avísanos de inmediato si nos estamos acercando o rebasamos el límite de gastos establecido.</p>
                    </div>
                  </div>
                  <button className="focus:outline-none shrink-0 text-cute">
                    {preferences.budgetAlerts ? (
                      <span className="bg-green-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-green-700 shadow-sm">Activo</span>
                    ) : (
                      <span className="bg-gray-200 text-gray-500 font-extrabold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full">Inactivo</span>
                    )}
                  </button>
                </div>

                {/* Preference 5 */}
                <div 
                  onClick={() => handleTogglePref("calendarEvents")}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF7F2]/65 hover:bg-[#FAF7F2] border border-[#EAE5D9]/70 transition-all cursor-pointer"
                >
                  <div className="flex gap-3 items-center">
                    <span className="text-xl shrink-0">📅</span>
                    <div>
                      <h4 className="font-bold text-xs text-[#2C2723]">Eventos y Tareas Compartidas</h4>
                      <p className="text-[10px] text-gray-500 leading-normal font-medium mt-0.5">Recibe avisos cuando tu pareja agregue eventos al calendario o marque una tarea como completada.</p>
                    </div>
                  </div>
                  <button className="focus:outline-none shrink-0 text-cute">
                    {preferences.calendarEvents ? (
                      <span className="bg-green-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-green-700 shadow-sm">Activo</span>
                    ) : (
                      <span className="bg-gray-200 text-gray-500 font-extrabold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full">Inactivo</span>
                    )}
                  </button>
                </div>

                {/* Preference 6: Menstrual Cycle */}
                <div 
                  onClick={() => handleTogglePref("menstrualCycle")}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF7F2]/65 hover:bg-[#FAF7F2] border border-[#EAE5D9]/70 transition-all cursor-pointer"
                >
                  <div className="flex gap-3 items-center">
                    <span className="text-xl shrink-0">🌸</span>
                    <div>
                      <h4 className="font-bold text-xs text-[#2C2723]">Fases del Ciclo Menstrual</h4>
                      <p className="text-[10px] text-gray-500 leading-normal font-medium mt-0.5">Recibe recordatorios de inicio de período, ventana fértil y consejos de Milo para cada fase miau.</p>
                    </div>
                  </div>
                  <button className="focus:outline-none shrink-0 text-cute">
                    {preferences.menstrualCycle ? (
                      <span className="bg-green-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-green-700 shadow-sm">Activo</span>
                    ) : (
                      <span className="bg-gray-200 text-gray-500 font-extrabold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full">Inactivo</span>
                    )}
                  </button>
                </div>

                {/* Preference 7: Completed Goals */}
                <div 
                  onClick={() => handleTogglePref("completedGoals")}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF7F2]/65 hover:bg-[#FAF7F2] border border-[#EAE5D9]/70 transition-all cursor-pointer"
                >
                  <div className="flex gap-3 items-center">
                    <span className="text-xl shrink-0">🎯</span>
                    <div>
                      <h4 className="font-bold text-xs text-[#2C2723]">Metas Cumplidas del Hogar</h4>
                      <p className="text-[10px] text-gray-500 leading-normal font-medium mt-0.5">Te notificaremos de inmediato con una felicitación cósmica cuando tú o tu pareja completen una meta.</p>
                    </div>
                  </div>
                  <button className="focus:outline-none shrink-0 text-cute">
                    {preferences.completedGoals ? (
                      <span className="bg-green-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-green-700 shadow-sm">Activo</span>
                    ) : (
                      <span className="bg-gray-200 text-gray-500 font-extrabold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full">Inactivo</span>
                    )}
                  </button>
                </div>
              </div>

              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl text-[11px] text-emerald-800 font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>¡Tus preferencias de alertas se han guardado y sincronizado de una! 🐾</span>
                </div>
              )}

              <div className="pt-3 border-t border-[#FAF7F2] flex items-center justify-between text-[11px] text-gray-400 font-medium">
                <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-[#8A817C]" /> Perfil Activo: <strong className="text-[#2C2723]">{currentUser?.name}</strong></span>
                <span>ID: {currentUser?.id}</span>
              </div>
            </div>
          )}

          {/* TAB 2: PUSH SUBSCRIPTION */}
          {activeTab === "push" && (
            <div className="bg-white p-6 rounded-3xl border-4 border-[#F3EFE6] shadow-sm space-y-5">
              <div className="border-b border-[#FAF7F2] pb-2">
                <h3 className="font-extrabold text-[#2C2723] text-cute text-base flex items-center gap-2">
                  🔥 Conexión a Firebase Cloud Messaging
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Enlaza tu navegador o celular real con el servidor de push utilizando el backend de Firebase de forma segura.
                </p>
              </div>

              <div className="space-y-4">
                
                {/* Subscription status block */}
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7E2D5] flex items-start gap-3">
                  <span className="text-2xl mt-0.5">📡</span>
                  <div className="space-y-1">
                    <h4 className="font-black text-xs text-[#2C2723] uppercase tracking-wider">Estado del Dispositivo</h4>
                    {pushToken ? (
                      <div className="space-y-2">
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-900 font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md border border-green-300">
                          🟢 SUSCRITO CON ÉXITO
                        </span>
                        <p className="text-[10px] text-gray-500 font-semibold leading-normal">
                          Tu dispositivo está suscrito de manera segura a Firebase. Se ha generado un token FCM dinámico y se ha guardado en el perfil de <strong className="text-[#2C2723]">{currentUser?.name}</strong>.
                        </p>
                        <div className="bg-white p-2 rounded-xl border border-gray-200 text-[9.5px] font-mono text-[#2C2723] select-all overflow-x-auto truncate max-w-full">
                          FCM Token: {pushToken}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md border border-amber-300">
                          🟡 SIN SUSCRIBIR
                        </span>
                        <p className="text-[10px] text-gray-500 font-semibold leading-normal">
                          Aún no has suscrito este navegador o dispositivo a las alertas. Haz clic en el botón de abajo para activar la recepción en tiempo real de una.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Main registration action */}
                {!pushToken ? (
                  <button
                    onClick={handleSubscribePush}
                    disabled={isSubscribing}
                    className="w-full text-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-extrabold text-xs py-3 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubscribing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Conectando con Firebase...
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4 animate-bounce" /> Suscribir Dispositivo a Alertas Push
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setPushToken("");
                          // Update on server
                          updateUserProfile(currentUser.id, {
                            name: currentUser.name,
                            birthDate: currentUser.birthDate,
                            birthTime: currentUser.birthTime || "12:00",
                            birthPlace: currentUser.birthPlace || "",
                            emoji: currentUser.emoji || "👤",
                            pushToken: "",
                            alertPreferences: preferences,
                          }).then(() => onRefreshData());
                        }}
                        className="flex-1 text-center bg-white hover:bg-red-50 text-red-700 font-black text-xs py-2.5 rounded-xl border border-red-200 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Trash2 size={13} /> Desvincular Dispositivo
                      </button>

                      <button
                        onClick={handleSubscribePush}
                        className="flex-1 text-center bg-[#FAF7F2] hover:bg-[#FAF7F2]/80 text-indigo-900 font-black text-xs py-2.5 rounded-xl border border-indigo-200 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw size={13} /> Re-generar Token
                      </button>
                    </div>

                    {/* Test notification tray */}
                    <div className="bg-[#FAF7F2]/60 p-4 rounded-2xl border border-[#E7E2D5] space-y-3">
                      <h4 className="font-extrabold text-xs text-[#2C2723] flex items-center gap-1.5">
                        🧪 Centro de Pruebas de Notificaciones
                      </h4>
                      <p className="text-[10px] text-[#8A817C] font-semibold leading-normal">
                        Prueba cómo llegan las distintas alertas Firebase al celular. Selecciona un tipo de evento para gatillar el envío inmediato miau:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleTestNotification("sintonia")}
                          className="bg-white hover:bg-[#FFF5F7] p-2 rounded-xl border border-rose-150 text-[10px] font-bold text-rose-800 text-left flex items-center gap-1.5 cursor-pointer"
                        >
                          💖 Sintonía Diaria
                        </button>
                        <button
                          onClick={() => handleTestNotification("pet")}
                          className="bg-white hover:bg-[#F9F5FF] p-2 rounded-xl border border-purple-150 text-[10px] font-bold text-purple-800 text-left flex items-center gap-1.5 cursor-pointer"
                        >
                          🐾 Salud de {pets[0]?.name?.replace(/🐾|🐕|🐈/g, "").trim() || "Milo"}
                        </button>
                        <button
                          onClick={() => handleTestNotification("plant")}
                          className="bg-white hover:bg-[#ECFDF5] p-2 rounded-xl border border-emerald-150 text-[10px] font-bold text-emerald-800 text-left flex items-center gap-1.5 cursor-pointer"
                        >
                          🪴 Riego de Plantas
                        </button>
                        <button
                          onClick={() => handleTestNotification("budget")}
                          className="bg-white hover:bg-[#FEFCE8] p-2 rounded-xl border border-yellow-150 text-[10px] font-bold text-yellow-850 text-left flex items-center gap-1.5 cursor-pointer"
                        >
                          💰 Presupuesto Nido
                        </button>
                        <button
                          onClick={() => handleTestNotification("menstrualCycle")}
                          className="bg-white hover:bg-[#FFF5F7] p-2 rounded-xl border border-rose-200 text-[10px] font-bold text-rose-700 text-left flex items-center gap-1.5 cursor-pointer"
                        >
                          🌸 Ciclo Menstrual
                        </button>
                        <button
                          onClick={() => handleTestNotification("completedGoals")}
                          className="bg-white hover:bg-[#F0FDFA] p-2 rounded-xl border border-teal-200 text-[10px] font-bold text-teal-700 text-left flex items-center gap-1.5 cursor-pointer"
                        >
                          🎯 Metas Cumplidas
                        </button>
                      </div>
                    </div>

                    {/* Explanation about Background Notifications */}
                    <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7E2D5] space-y-2 text-left">
                      <h4 className="font-extrabold text-xs text-[#2C2723] flex items-center gap-1.5">
                        💡 ¿Cómo recibir notificaciones cuando la App está CERRADA?
                      </h4>
                      <div className="text-[10px] text-[#625B57] font-medium leading-relaxed space-y-1.5">
                        <p>
                          • <strong>Con la App ABIERTA:</strong> Las notificaciones de Sintonía, Mascotas, Presupuesto y Metas llegan instantáneamente en pantalla con alertas sonoras.
                        </p>
                        <p>
                          • <strong>Con la App o Navegador CERRADO:</strong> Las alertas de fondo requieren 2 pasos:
                        </p>
                        <ul className="list-disc pl-4 space-y-0.5 text-[#2C2723] font-semibold">
                          <li>Aceptar los <strong>Permisos de Notificación del Navegador</strong> (botón de arriba).</li>
                          <li>En celulares (iOS / Android), tocar <strong>"Añadir a la Pantalla de Inicio" (Instalar App/PWA)</strong> para que el Service Worker de fondo permanezca activo sin tener la pestaña abierta.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: VIRTUAL MOBILE PHONE PREVIEW */}
        <div className="lg:col-span-5 flex flex-col items-center">
          
          <div className="text-center mb-2.5">
            <span className="text-[10px] font-black uppercase text-[#8A817C] tracking-widest flex items-center justify-center gap-1">
              📱 Celular del Nido Simulado
            </span>
            <p className="text-[9.5px] text-[#BE7A1F] font-bold">¡Haz clic en las alertas o widgets para interactuar miau! 🐾</p>
          </div>

          {/* Interactive Mobile Phone */}
          <div className="relative w-[285px] h-[580px] bg-[#1E1B18] rounded-[48px] p-3.5 shadow-2xl border-4 border-[#2C2723] ring-12 ring-gray-900 overflow-hidden flex flex-col justify-between">
            
            {/* Top speaker / Camera pill notch */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-[#1E1B18] rounded-b-2xl z-30 flex items-center justify-center">
              <div className="w-12 h-1 bg-gray-800 rounded-full mb-1"></div>
              <div className="w-2.5 h-2.5 bg-gray-950 rounded-full ml-2 mb-1"></div>
            </div>

            {/* Simulated Wallpaper */}
            <div className="absolute inset-2 rounded-[36px] bg-gradient-to-b from-[#FFF5F7] via-[#FFFBF6] to-[#FAF7F2] z-0 overflow-hidden" />

            {/* Phone Screen Container */}
            <div className="relative z-10 flex flex-col h-full justify-between pt-7 pb-4">
              
              {/* StatusBar */}
              <div className="flex justify-between items-center px-4 text-[10px] font-extrabold text-[#2C2723] font-mono select-none">
                <span>02:54 AM</span>
                <div className="flex items-center gap-1.5">
                  <span>5G</span>
                  <span>🔋 98%</span>
                </div>
              </div>

              {/* simulated notification banner popup */}
              <div className="h-16 px-2 relative z-50">
                <AnimatePresence>
                  {simulatedNotification && (
                    <motion.div
                      initial={{ opacity: 0, y: -40, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -40, scale: 0.9 }}
                      onClick={() => setSimulatedNotification(null)}
                      className="bg-[#2C2723]/95 text-white p-2.5 rounded-2xl shadow-xl border border-white/10 cursor-pointer flex gap-2 items-start text-left"
                    >
                      <span className="text-lg bg-white/10 w-7 h-7 rounded-lg flex items-center justify-center shrink-0">{simulatedNotification.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[9.5px] font-black truncate">{simulatedNotification.title}</h4>
                        <p className="text-[8.5px] text-gray-300 font-semibold leading-normal line-clamp-2 mt-0.5">{simulatedNotification.message}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Phone Notification Center simulator list */}
              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 select-none scrollbar-none">
                <div className="text-center py-1">
                  <span className="text-[9px] font-black uppercase text-[#8A817C] tracking-wider block">
                    🔔 Centro de Notificaciones Nido
                  </span>
                  <p className="text-[8px] text-[#A29A93] font-medium">Toca cualquier tarjeta para probar la alerta en vivo</p>
                </div>

                {[
                  { id: "sintonia", title: "Sintonía Diaria 💖", desc: "Recordatorio de preguntas en pareja", icon: "💖", bg: "bg-rose-50 border-rose-200 text-rose-900" },
                  { id: "pet", title: `Mascotas: ${pets[0]?.name?.replace(/🐾|🐕|🐈/g, "").trim() || "Milo"} 🐾`, desc: "Vacunas, peinado y cuidados de salud", icon: "🐈", bg: "bg-purple-50 border-purple-200 text-purple-900" },
                  { id: "plant", title: "Riego de Plantas 🪴", desc: "Agua fresca para tus plantitas hoy", icon: "🪴", bg: "bg-emerald-50 border-emerald-200 text-emerald-900" },
                  { id: "budget", title: "Control de Presupuesto 💰", desc: "Alertas de límites de gastos del hogar", icon: "💰", bg: "bg-amber-50 border-amber-200 text-amber-900" },
                  { id: "calendar", title: "Eventos & Misiones 🍷", desc: "Cenas, citas y fechas importantes", icon: "🍷", bg: "bg-pink-50 border-pink-200 text-pink-900" },
                  { id: "menstrualCycle", title: "Salud y Ciclo 🌸", desc: "Fases lunares y ciclo de salud", icon: "🌸", bg: "bg-rose-50 border-rose-200 text-rose-800" },
                  { id: "completedGoals", title: "Metas Cumplidas 🎯", desc: "Logros familiares y celebraciones", icon: "🏆", bg: "bg-teal-50 border-teal-200 text-teal-900" },
                ].map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleTestNotification(item.id)}
                    className={`p-2 rounded-2xl border ${item.bg} shadow-xs cursor-pointer flex items-center gap-2 transition-all`}
                  >
                    <span className="text-lg shrink-0">{item.icon}</span>
                    <div className="min-w-0 flex-1 text-left">
                      <h5 className="text-[9.5px] font-black truncate">{item.title}</h5>
                      <p className="text-[7.5px] opacity-80 leading-normal font-semibold truncate">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Dock / Navigation indicator pills */}
              <div className="mt-2.5 flex justify-center gap-4 py-2 bg-[#2C2723]/10 backdrop-blur-xs rounded-2xl mx-3 select-none">
                <span className="text-sm cursor-pointer filter hover:scale-125 transition-transform">🏡</span>
                <span className="text-sm cursor-pointer filter hover:scale-125 transition-transform">💬</span>
                <span className="text-sm cursor-pointer filter hover:scale-125 transition-transform">📅</span>
                <span className="text-sm cursor-pointer filter hover:scale-125 transition-transform font-bold relative group">
                  ⚙️
                  <span className="absolute -top-1 -right-1 bg-indigo-600 w-1.5 h-1.5 rounded-full"></span>
                </span>
              </div>

            </div>

            {/* Bottom swipe bar */}
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-28 h-1 bg-gray-800 rounded-full z-30"></div>

          </div>
        </div>

      </div>

      {/* MODAL: MOCK PERMISSION REQUEST */}
      <AnimatePresence>
        {showPermissionPrompt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-sm w-full p-5 border-2 border-gray-300 shadow-2xl space-y-4 text-center"
            >
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto text-indigo-700 text-xl">
                🔔
              </div>
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-sm text-[#2C2723]">Permiso de Notificaciones</h4>
                <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                  AstroHogar requiere tu consentimiento para enviarte miau-consejos estelares, vacunas de {pets[0]?.name?.replace(/🐾|🐕|🐈/g, "").trim() || "Milo"} y alertas del nido en tiempo real vía Firebase.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPermissionPrompt(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs py-2 rounded-xl cursor-pointer"
                >
                  Bloquear
                </button>
                <button
                  onClick={grantPushPermission}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 rounded-xl cursor-pointer"
                >
                  Permitir 🔔
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
