import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, CheckSquare, Plus, Clock, User, Filter, AlertTriangle, CheckCircle, Trash2, Edit2, X, Bell, BellRing, Sparkles } from "lucide-react";
import { CalendarItem, UserId, UserProfile, Pet } from "../types";
import { deleteCalendarItem, updateCalendarItem } from "../api";
import { useCalendarNotifications } from "../hooks/useCalendarNotifications";

export const COLOMBIAN_SPECIAL_DATES: Record<string, { name: string; isHoliday: boolean; icon: string }> = {
  "01-01": { name: "Año Nuevo 🎆", isHoliday: true, icon: "🎆" },
  "01-12": { name: "Día de los Reyes Magos 👑", isHoliday: true, icon: "👑" },
  "03-23": { name: "Día de San José ⚒️", isHoliday: true, icon: "⚒️" },
  "04-02": { name: "Jueves Santo ⛪", isHoliday: true, icon: "⛪" },
  "04-03": { name: "Viernes Santo ⛪", isHoliday: true, icon: "⛪" },
  "05-01": { name: "Día del Trabajo 🛠️", isHoliday: true, icon: "🛠️" },
  "05-10": { name: "Día de la Madre 🌸", isHoliday: false, icon: "🌸" },
  "05-18": { name: "Ascensión del Señor 🌌", isHoliday: true, icon: "🌌" },
  "06-08": { name: "Corpus Christi 🥖", isHoliday: true, icon: "🥖" },
  "06-15": { name: "Sagrado Corazón de Jesús 💕", isHoliday: true, icon: "💕" },
  "06-21": { name: "Día del Padre 👔", isHoliday: false, icon: "👔" },
  "06-29": { name: "San Pedro y San Pablo ⛵", isHoliday: true, icon: "⛵" },
  "07-20": { name: "Día de la Independencia de Colombia 🇨🇴", isHoliday: true, icon: "🇨🇴" },
  "08-07": { name: "Batalla de Boyacá ⚔️🇨🇴", isHoliday: true, icon: "⚔️" },
  "08-17": { name: "Asunción de la Virgen 👼", isHoliday: true, icon: "👼" },
  "09-19": { name: "Día del Amor y la Amistad ❤️", isHoliday: false, icon: "❤️" },
  "10-12": { name: "Día de la Raza 🌎", isHoliday: true, icon: "🌎" },
  "11-02": { name: "Día de Todos los Santos 😇", isHoliday: true, icon: "😇" },
  "11-16": { name: "Independencia de Cartagena 🏰🇨🇴", isHoliday: true, icon: "🏰" },
  "12-07": { name: "Día de las Velitas 🕯️✨", isHoliday: false, icon: "🕯️" },
  "12-08": { name: "Inmaculada Concepción 🕯️", isHoliday: true, icon: "🕯️" },
  "12-24": { name: "Nochebuena 🎄🎁", isHoliday: false, icon: "🎄" },
  "12-25": { name: "Navidad 🧑‍🎄", isHoliday: true, icon: "🎅" },
  "12-31": { name: "Fin de Año ✨🎆", isHoliday: false, icon: "✨" }
};

interface CalendarModuleProps {
  calendarItems: CalendarItem[];
  onRefreshData: () => void;
  onOpenCreateModal: (type: "event" | "task" | "reminder") => void;
  users?: UserProfile[];
  pets?: Pet[];
}

type CalendarView = "day" | "week" | "month";
type CalendarFilter = "all" | "event" | "task" | "pet" | "plant" | "reminder";

export default function CalendarModule({
  calendarItems,
  onRefreshData,
  onOpenCreateModal,
  users = [],
  pets = []
}: CalendarModuleProps) {
  const getUserName = (id: string) => {
    const user = users.find(u => u.id === id);
    return user ? user.name : id;
  };

  const isItemOnDate = (item: CalendarItem, dateStr: string) => {
    const rec = item.recurrence;
    const recType = rec ? (typeof rec === 'string' ? rec : (rec as any).type) : null;

    if (dateStr < item.date && recType !== 'yearly') return false;
    if (item.date === dateStr) return true;

    // Check recurrence if present
    if (rec) {
      if (recType && recType !== 'none') {
        const dStart = new Date(item.date + 'T00:00:00');
        const dCheck = new Date(dateStr + 'T00:00:00');
        
        if (recType === 'daily') {
          return true;
        }
        if (recType === 'weekly') {
          return dStart.getDay() === dCheck.getDay();
        }
        if (recType === 'monthly') {
          return dStart.getDate() === dCheck.getDate();
        }
        if (recType === 'yearly') {
          return dStart.getMonth() === dCheck.getMonth() && dStart.getDate() === dCheck.getDate();
        }
        if (recType === 'specific' || recType === 'custom') {
          const specDate = (rec as any).specificDate;
          if (specDate && specDate === dateStr) {
            return true;
          }
        }
      }
    }

    if (item.endDate) {
      return dateStr >= item.date && dateStr <= item.endDate;
    }
    return false;
  };

  const [activeView, setActiveView] = useState<CalendarView>("month");
  const [activeFilter, setActiveFilter] = useState<CalendarFilter>("all");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Automatic Push Notification Manager Hook (1 hour before events)
  const { 
    permission: notifPermission, 
    upcoming1HourEvents, 
    requestPermission: handleRequestNotifPermission, 
    testPushNotification: handleTestPush 
  } = useCalendarNotifications(calendarItems);

  // Editing state for calendar items
  const [editingItem, setEditingItem] = useState<CalendarItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState<string>("home");
  const [editEmoji, setEditEmoji] = useState("📅");
  const [editType, setEditType] = useState<"event" | "task" | "reminder">("event");
  const [editNotify1HourBefore, setEditNotify1HourBefore] = useState<boolean>(true);

  const startEditItem = (item: CalendarItem) => {
    if (item.id.startsWith("birthday-")) return;
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDescription(item.description || "");
    setEditDate(item.date);
    setEditTime(item.time || "");
    setEditEndDate(item.endDate || "");
    setEditEndTime(item.endTime || "");
    setEditAssignedTo(item.assignedTo || "home");
    setEditEmoji(item.emoji || "📅");
    setEditType(item.type);
    setEditNotify1HourBefore(item.notify1HourBefore !== false);
  };

  const handleSaveCalendarEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editTitle.trim() || !editDate) return;
    await updateCalendarItem(editingItem.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      date: editDate,
      time: editTime.trim() || undefined,
      endDate: editEndDate.trim() || undefined,
      endTime: editEndTime.trim() || undefined,
      assignedTo: editAssignedTo,
      emoji: editEmoji,
      type: editType,
      notify1HourBefore: editNotify1HourBefore
    });
    setEditingItem(null);
    onRefreshData();
  };

  const handleDeleteItem = (id: string, title?: string) => {
    if (typeof window !== "undefined" && (window as any).requestDeleteWithConfirm) {
      (window as any).requestDeleteWithConfirm(
        "Eliminar Evento / Tarea 📅",
        "¿Estás seguro de que deseas eliminar este elemento de la agenda del hogar? Esta acción no se puede deshacer.",
        async () => {
          const res = await deleteCalendarItem(id);
          if (res.success) onRefreshData();
        },
        title
      );
    } else {
      deleteCalendarItem(id).then(() => onRefreshData());
    }
  };

  const handleToggleTaskStatus = async (item: CalendarItem) => {
    const targetStatus = item.status === "done" ? "pending" : "done";
    await updateCalendarItem(item.id, { status: targetStatus });
    onRefreshData();
  };

  // Generate virtual yearly birthday events for users and pets
  const birthdayItems: CalendarItem[] = [];

  if (users && users.length > 0) {
    users.forEach(u => {
      if (u.birthDate) {
        try {
          const parts = u.birthDate.split("-");
          if (parts.length === 3) {
            const bMonth = new Date(u.birthDate + 'T00:00:00').toLocaleString("es-ES", { month: "long" });
            const bDay = parseInt(parts[2], 10);
            birthdayItems.push({
              id: `birthday-user-${u.id}`,
              title: `¡Cumpleaños de ${u.name}! 🎂🎉`,
              description: `Día especial de ${u.name}. Nacimiento: ${bDay} de ${bMonth}. ¡A celebrar en el nido! 🐾🎈`,
              type: "event",
              date: u.birthDate,
              emoji: "🎂",
              assignedTo: u.id,
              status: "pending",
              recurrence: {
                type: "yearly"
              }
            });
          }
        } catch (e) {
          console.error("Error parsing user birthday:", e);
        }
      }
    });
  }

  if (pets && pets.length > 0) {
    pets.forEach(p => {
      if (p.birthDate) {
        try {
          const parts = p.birthDate.split("-");
          if (parts.length === 3) {
            const bMonth = new Date(p.birthDate + 'T00:00:00').toLocaleString("es-ES", { month: "long" });
            const bDay = parseInt(parts[2], 10);
            birthdayItems.push({
              id: `birthday-pet-${p.id}`,
              title: `¡Cumpleaños de ${p.name}! 🐶🎂`,
              description: `Día especial de nuestra mascota consentida ${p.name}. Nacimiento: ${bDay} de ${bMonth}. ¡Muchos mimos y premios hoy! 🐾🍖`,
              type: "event",
              date: p.birthDate,
              emoji: "🐾",
              assignedTo: "home",
              status: "pending",
              recurrence: {
                type: "yearly"
              }
            });
          }
        } catch (e) {
          console.error("Error parsing pet birthday:", e);
        }
      }
    });
  }

  const allCalendarItems = [...calendarItems, ...birthdayItems];

  // Run filters
  const filteredItems = allCalendarItems.filter((item) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "event") return item.type === "event";
    if (activeFilter === "task") return item.type === "task";
    if (activeFilter === "reminder") return item.type === "reminder";
    
    // Virtual tagging for pets/plants
    if (activeFilter === "pet") {
      return item.id.startsWith("birthday-pet-") ||
             item.title.toLowerCase().includes("luna") || 
             item.title.toLowerCase().includes("max") || 
             item.title.toLowerCase().includes("vacuna") || 
             item.title.toLowerCase().includes("medicina") ||
             item.title.toLowerCase().includes("veterinario");
    }
    if (activeFilter === "plant") {
      return item.title.toLowerCase().includes("planta") || 
             item.title.toLowerCase().includes("monstera") || 
             item.title.toLowerCase().includes("poto") || 
             item.title.toLowerCase().includes("suculenta") ||
             item.title.toLowerCase().includes("regar");
    }
    return true;
  });

  // Calculate Month Grid dates (classic monthly view logic)
  const getMonthDateGrid = () => {
    const today = new Date(selectedDate);
    const yr = today.getFullYear();
    const mo = today.getMonth(); // 0-indexed
    
    // First day of current month
    const firstDay = new Date(yr, mo, 1);
    const startOffset = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
    
    // Total days in current month
    const totalDays = new Date(yr, mo + 1, 0).getDate();
    
    const grid = [];
    
    // Populate previous month's padding
    const prevMoTotalDays = new Date(yr, mo, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const prevDate = new Date(yr, mo - 1, prevMoTotalDays - i);
      grid.push({
        date: prevDate,
        isCurrentMonth: false,
        formatted: prevDate.toISOString().split('T')[0]
      });
    }
    
    // Populate current month
    for (let i = 1; i <= totalDays; i++) {
      const currDate = new Date(yr, mo, i);
      grid.push({
        date: currDate,
        isCurrentMonth: true,
        formatted: currDate.toISOString().split('T')[0]
      });
    }

    // Fill training cells up to multiple of 7
    const remaining = 42 - grid.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(yr, mo + 1, i);
      grid.push({
        date: nextDate,
        isCurrentMonth: false,
        formatted: nextDate.toISOString().split('T')[0]
      });
    }

    return grid;
  };

  const monthGrid = getMonthDateGrid();

  // Helper to color categorize dots on month grid
  const getDotsForDate = (dateStr: string) => {
    // find index matches
    const dayMatches = allCalendarItems.filter(i => isItemOnDate(i, dateStr));
    const dots: { colorClass: string; key: string }[] = [];
    
    dayMatches.forEach(item => {
      const titleLower = item.title.toLowerCase();
      
      if (titleLower.includes("luna") || titleLower.includes("max") || titleLower.includes("vacuna") || titleLower.includes("veterinario")) {
        // morado = mascotas 🐶
        if (!dots.some(d => d.colorClass === "bg-purple-500")) {
          dots.push({ colorClass: "bg-purple-500", key: `${item.id}-morado` });
        }
      } else if (titleLower.includes("planta") || titleLower.includes("monstera") || titleLower.includes("regar")) {
        // naranja = plantas 🪴
        if (!dots.some(d => d.colorClass === "bg-amber-500")) {
          dots.push({ colorClass: "bg-amber-500", key: `${item.id}-naranja` });
        }
      } else if (item.type === "event") {
        // azul = eventos 📅
        if (!dots.some(d => d.colorClass === "bg-blue-500")) {
          dots.push({ colorClass: "bg-blue-500", key: `${item.id}-azul` });
        }
      } else if (item.type === "task") {
        // verde = tareas 🧹
        if (!dots.some(d => d.colorClass === "bg-green-500")) {
          dots.push({ colorClass: "bg-green-500", key: `${item.id}-verde` });
        }
      } else {
        // default recordatorios
        if (!dots.some(d => d.colorClass === "bg-indigo-400")) {
          dots.push({ colorClass: "bg-indigo-400", key: `${item.id}-indigo` });
        }
      }
    });

    return dots.slice(0, 4); // limit dots inside grid day cell to 4
  };

  // Month navigation
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const currentMonthName = monthNames[new Date(selectedDate).getMonth()];
  const currentYear = new Date(selectedDate).getFullYear();

  const realTodayStr = new Date().toISOString().split("T")[0];
  const realCurrentMonthIdx = new Date().getMonth();
  const realCurrentYear = new Date().getFullYear();

  const isSelectedRealCurrentMonth = 
    new Date(selectedDate).getMonth() === realCurrentMonthIdx && 
    new Date(selectedDate).getFullYear() === realCurrentYear;

  const handleSelectMonth = (monthIdx: number) => {
    const d = new Date(selectedDate);
    d.setMonth(monthIdx);
    if (d.getMonth() !== monthIdx) {
      d.setDate(0); // set to last day of target month if overflow
    }
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleJumpToToday = () => {
    setSelectedDate(realTodayStr);
  };

  const handlePrevMonth = () => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() - 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleNextMonth = () => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() + 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  // Agenda for selected day / or whole period for lists
  const agendaItemsSelectedDate = allCalendarItems.filter(item => isItemOnDate(item, selectedDate));

  // Group Week Days list
  const getWeekDates = () => {
    const d = new Date(selectedDate);
    const day = d.getDay();
    // find start of week (Sunday or Monday, let's do Monday = 1 as standard)
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(d.setDate(diff));
    
    const weekArr = [];
    for (let i = 0; i < 7; i++) {
      const nextD = new Date(startOfWeek);
      nextD.setDate(startOfWeek.getDate() + i);
      weekArr.push(nextD.toISOString().split('T')[0]);
    }
    return weekArr;
  };
  const weekDays = getWeekDates();
  const weekLabels = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      
      {/* Tab bar header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border-4 border-[#F3EFE6] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl shadow-inner shrink-0 leading-none text-blue-600">
            📅
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold text-cute text-[#2C2723]">Calendario Compartido</h2>
              <button
                id="btn-add-calendar-event"
                onClick={() => onOpenCreateModal("event")}
                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer shadow-2xs"
              >
                <Plus size={10} strokeWidth={3} /> Agregar Evento
              </button>
            </div>
            <p className="text-xs text-[#8A817C]">El núcleo central de organización del hogar</p>
          </div>
        </div>

        {/* View togglers */}
        <div className="flex bg-[#FAF7F2] p-1.5 rounded-2xl border border-[#EAE5D9] gap-1 shrink-0">
          {(["day", "week", "month"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-4 py-1.5 rounded-xl font-extrabold text-xs transition-all uppercase tracking-wide cursor-pointer text-cute ${
                activeView === view 
                  ? "bg-white text-[#2C2723] shadow-sm" 
                  : "text-[#8A817C] hover:text-[#2C2723]"
              }`}
            >
              {view === "day" ? "Día" : view === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
      </div>

      {/* 🔔 AUTOMATIC PUSH NOTIFICATIONS BANNER (1 HOUR BEFORE EVENTS) */}
      <div className="bg-gradient-to-r from-blue-50/80 via-amber-50/50 to-indigo-50/80 p-3.5 rounded-2xl border-2 border-blue-100/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            {notifPermission === "granted" ? <BellRing size={16} /> : <Bell size={16} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-[#2C2723]">Notificaciones Push Automáticas (1 hora antes)</h4>
              {notifPermission === "granted" ? (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle size={10} /> Activo en Service Worker
                </span>
              ) : notifPermission === "denied" ? (
                <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle size={10} /> Permiso Denegado
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Configuración Pendiente
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#625B57] mt-0.5">
              AstroHogar enviará una alerta automática a tu dispositivo 1 hora antes de que inicie cualquier evento o tarea agendada.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          {notifPermission !== "granted" ? (
            <button
              onClick={handleRequestNotifPermission}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Bell size={13} /> Activar Notificaciones Push
            </button>
          ) : (
            <button
              onClick={handleTestPush}
              className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-extrabold text-xs rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles size={13} /> Probar Alerta Push 🧪
            </button>
          )}
        </div>
      </div>

      {upcoming1HourEvents.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 text-amber-900 p-3 rounded-2xl flex items-center justify-between text-xs font-bold gap-2 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-base">⏰</span>
            <span>
              <strong>¡Evento próximo en ~1 hora!:</strong>{" "}
              {upcoming1HourEvents.map(e => `"${e.title}" a las ${e.time}`).join(", ")}
            </span>
          </div>
          <span className="bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">
            Alerta enviada por Push
          </span>
        </div>
      )}

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar whitespace-nowrap">
        {([
          { filter: "all", label: "Todo", emoji: "🏠" },
          { filter: "event", label: "Eventos", emoji: "📍" },
          { filter: "task", label: "Tareas", emoji: "🧹" },
          { filter: "pet", label: "Mascotas", emoji: "🐶" },
          { filter: "plant", label: "Plantas", emoji: "🪴" },
          { filter: "reminder", label: "Recordatorios", emoji: "🔔" }
        ] as const).map((opt) => (
          <button
            key={opt.filter}
            onClick={() => setActiveFilter(opt.filter)}
            className={`px-4 py-2 rounded-2xl border-2 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeFilter === opt.filter 
                ? "bg-white border-blue-500 text-[#2C2723] shadow-sm" 
                : "bg-white/60 hover:bg-white border-[#EAE5D9] text-[#625B57] hover:text-[#2C2723]"
            }`}
          >
            <span>{opt.emoji}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Layout panels based on active view */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* VIEW: MONTH COMPONENT CARD */}
        {activeView === "month" && (
          <div className="md:col-span-8 bg-white p-6 rounded-3xl border-4 border-[#F3EFE6] shadow-sm space-y-4">
            
            {/* Months custom selector & Active Month Banner */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-[#FAF7F2]">
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={handlePrevMonth}
                  className="font-extrabold text-cute p-2 border border-[#EAE5D9] rounded-xl hover:bg-[#FAF7F2] cursor-pointer text-sm active:scale-95 transition-all"
                  title="Mes anterior"
                >
                  ◀
                </button>

                {/* Direct Month Selector Dropdown */}
                <div className="relative flex items-center gap-1.5">
                  <select
                    value={new Date(selectedDate).getMonth()}
                    onChange={(e) => handleSelectMonth(parseInt(e.target.value, 10))}
                    className="text-base sm:text-lg font-black text-[#2C2723] bg-amber-50/60 hover:bg-amber-100/80 border-2 border-amber-200/80 rounded-2xl px-3 py-1 cursor-pointer focus:outline-none transition-all"
                  >
                    {monthNames.map((mName, mIdx) => (
                      <option key={mIdx} value={mIdx}>
                        {mName} {currentYear} {mIdx === realCurrentMonthIdx && realCurrentYear === currentYear ? "🌟 (Mes Activo)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <button 
                  type="button"
                  onClick={handleNextMonth}
                  className="font-extrabold text-cute p-2 border border-[#EAE5D9] rounded-xl hover:bg-[#FAF7F2] cursor-pointer text-sm active:scale-95 transition-all"
                  title="Mes siguiente"
                >
                  ▶
                </button>
              </div>

              {/* Active Month Status & Jump to Today Button */}
              <div className="flex items-center gap-2 flex-wrap">
                {isSelectedRealCurrentMonth ? (
                  <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Mes Activo ({currentMonthName})
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleJumpToToday}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1 shadow-2xs active:scale-95"
                  >
                    <span>📍 Volver al Mes Activo ({monthNames[realCurrentMonthIdx]})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Days of week labels */}
            <div className="grid grid-cols-7 text-center font-bold text-xs text-[#8A817C] uppercase tracking-wide gap-1.5">
              <span>Do</span>
              <span>Lu</span>
              <span>Ma</span>
              <span>Mi</span>
              <span>Ju</span>
              <span>Vi</span>
              <span>Sá</span>
            </div>

            {/* Monthly grid cells */}
            <div className="grid grid-cols-7 gap-1.5 md:h-[300px]">
              {monthGrid.map((cell, idx) => {
                const isSelected = selectedDate === cell.formatted;
                const isToday = new Date().toISOString().split('T')[0] === cell.formatted;
                const dayDots = getDotsForDate(cell.formatted);
                const mmDd = cell.formatted.substring(5, 10);
                const colDate = COLOMBIAN_SPECIAL_DATES[mmDd];
                const dayEmojis = allCalendarItems
                  .filter(i => isItemOnDate(i, cell.formatted) && i.emoji)
                  .map(i => i.emoji);
                const hasCustomEvent = dayEmojis.length > 0;

                let bgClasses = "";
                if (isSelected) {
                  bgClasses = "bg-blue-500 text-white border-blue-500 shadow-md font-bold";
                } else if (isToday) {
                  bgClasses = "bg-amber-100 border-amber-300 text-amber-900 font-bold";
                } else if (colDate) {
                  if (colDate.isHoliday) {
                    bgClasses = "bg-red-50/80 border-red-200/60 hover:border-red-300 text-red-900 font-semibold";
                  } else {
                    bgClasses = "bg-amber-50/40 border-amber-100/40 hover:border-amber-300 text-amber-950 font-semibold";
                  }
                } else if (hasCustomEvent) {
                  bgClasses = "bg-sky-50 border-sky-200 text-sky-950 font-semibold";
                } else if (cell.isCurrentMonth) {
                  bgClasses = "bg-[#FCFAF7] border-transparent hover:border-[#EAE5D9] text-[#2C2723]";
                } else {
                  bgClasses = "bg-gray-100/40 border-transparent text-gray-300 text-xs";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(cell.formatted)}
                    className={`p-2.5 rounded-2xl flex flex-col items-center justify-between min-h-[50px] transition-all border-2 relative cursor-pointer ${bgClasses}`}
                  >
                    <span className="text-xs leading-none">{cell.date.getDate()}</span>
                    
                    {dayEmojis.length > 0 && (
                      <div className="absolute top-1 left-1.5 flex gap-0.5 text-[11px] leading-none select-none">
                        {dayEmojis.slice(0, 2).map((emo, eIdx) => (
                          <span key={eIdx} title="Evento destacado">{emo}</span>
                        ))}
                      </div>
                    )}

                    {colDate && (
                      <span 
                        className="absolute top-1.5 right-1.5 text-[9px] leading-none select-none"
                        title={`${colDate.name} ${colDate.isHoliday ? "(Festivo)" : "(Especial)"}`}
                      >
                        {colDate.icon}
                      </span>
                    )}

                    {/* Color dot categories indicator */}
                    <div className="flex gap-1 mt-1 justify-center flex-wrap h-2 shrink-0">
                      {dayDots.map((dot) => (
                        <span 
                          key={dot.key} 
                          className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : dot.colorClass}`}
                        ></span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Key colors reference card */}
            <div className="pt-4 border-t border-[#FAF7F2] flex flex-wrap gap-4 text-[10px] text-[#8A817C] font-semibold justify-center">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block"></span> Eventos 📅</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-green-500 rounded-full inline-block"></span> Tareas del hogar ✅</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-purple-500 rounded-full inline-block"></span> Mascotas 🐶</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block"></span> Plantas 🪴</span>
            </div>
          </div>
        )}

        {/* VIEW: WEEK COMPONENT CONTENT */}
        {activeView === "week" && (
          <div className="md:col-span-8 bg-white p-6 rounded-3xl border-4 border-[#F3EFE6] shadow-sm space-y-4">
            <h3 className="font-bold text-cute text-sm text-[#2C2723] pb-2 border-b border-[#FAF7F2]">
              Vista Semanal
            </h3>
            
            <div className="space-y-4">
              {weekDays.map((dateStr, idx) => {
                const dayItems = allCalendarItems.filter(i => isItemOnDate(i, dateStr));
                const isSelected = selectedDate === dateStr;
                return (
                  <div 
                    key={idx}
                    className={`p-3 rounded-2xl border-2 transition-all flex flex-col md:flex-row gap-3 items-start md:items-center justify-between ${
                      isSelected 
                        ? "bg-blue-50/50 border-blue-200" 
                        : "bg-[#FCFAF7] border-transparent"
                    }`}
                  >
                    {/* Day index indicator */}
                    <button 
                      onClick={() => setSelectedDate(dateStr)}
                      className={`px-4 py-2 text-center rounded-xl font-bold font-mono transition-all shrink-0 ${
                        isSelected ? "bg-blue-500 text-white" : "bg-[#EAE5D9] text-[#2C2723]"
                      }`}
                    >
                      <div className="text-[10px] tracking-wide uppercase opacity-75">{weekLabels[idx]}</div>
                      <div className="text-cute text-baseleading-snug">{new Date(dateStr + "T00:00:00").getDate()}</div>
                    </button>

                    {/* Week day inline alerts/events */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {dayItems.length === 0 ? (
                        <p className="text-xs text-[#8A817C] italic">Sin actividades miau... ✨</p>
                      ) : (
                        dayItems.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex items-center gap-2 text-xs">
                             <span className="text-[10px] font-mono shrink-0 font-bold bg-[#FAF7F2] border border-[#EAE5D9] px-1 py-0.5 rounded text-[#625B57]">
                               {item.time || "Día"}
                             </span>
                             <span className={`font-bold truncate ${item.status === 'done' ? 'line-through text-gray-400' : 'text-[#2C2723]'}`}>
                               {item.title}
                             </span>
                             <span className="text-[10.5px] opacity-70">({item.assignedTo === 'home' ? 'Hogar' : getUserName(item.assignedTo)})</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW: DAY COMPONENT CONTENT */}
        {activeView === "day" && (
          <div className="md:col-span-8 bg-white p-6 rounded-3xl border-4 border-[#F3EFE6] shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#FAF7F2]">
              <h3 className="font-bold text-cute text-sm text-[#2C2723]">
                Vista Diaria
              </h3>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-1 border border-[#EAE5D9] rounded-xl text-xs text-[#2C2723] font-bold focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            <div className="text-center py-6 bg-[#FCFAF7] rounded-2xl border border-[#F3EFE6]">
              <p className="text-xs text-[#8A817C]">Agenda pormenorizada del día</p>
              <p className="text-sm font-bold text-[#2C2723] mt-0.5">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("es-ES", { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
        )}

        {/* Right Agenda List sidebar for all views */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-[#FCFAF7] p-5 rounded-3xl border-4 border-[#F3EFE6] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#EAE5D9]">
              <h3 className="font-bold text-cute text-sm text-[#2C2723] flex items-center gap-1.5">
                <span>📍 Agenda</span> 
                <span className="text-xs text-blue-600">({filteredItems.filter(i => i.date === selectedDate).length})</span>
              </h3>
              
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => onOpenCreateModal("task")}
                  className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                >
                  + Tarea
                </button>
                <button
                  onClick={() => onOpenCreateModal("event")}
                  className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                >
                  + Evento
                </button>
              </div>
            </div>

            {/* Special Colombian Date Highlight */}
            {(() => {
              const mmDdSelected = selectedDate.substring(5, 10);
              const colDate = COLOMBIAN_SPECIAL_DATES[mmDdSelected];
              if (colDate) {
                return (
                  <div className={`p-3.5 rounded-2xl border flex gap-3 items-center ${
                    colDate.isHoliday 
                      ? "bg-rose-50 border-rose-100/60 text-rose-950" 
                      : "bg-amber-50/60 border-amber-100/50 text-amber-950"
                  }`}>
                    <span className="text-xl shrink-0">{colDate.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800 leading-none">
                        {colDate.isHoliday ? "🇨🇴 Festivo en Colombia" : "🇨🇴 Fecha Especial en Colombia"}
                      </p>
                      <p className="text-xs font-bold text-gray-850 mt-1 leading-normal">
                        {colDate.name}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Displaying listing on chosen selected day matches */}
            {filteredItems.filter(item => isItemOnDate(item, selectedDate)).length === 0 ? (
              <div className="text-center py-10 bg-white/60 rounded-2xl border border-[#FAF7F2] space-y-1">
                <p className="text-xs font-semibold text-[#8A817C]">No hay actividades registradas</p>
                <p className="text-[10px] text-[#BE7A1F] leading-tight px-3">
                  Para este día o filtro actual. Selecciona otro día en el calendario miau 🌻.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {filteredItems.filter(item => isItemOnDate(item, selectedDate)).map((item) => (
                  <div 
                    key={item.id}
                    className={`p-3.5 bg-white rounded-2xl border-2 transition-all group flex gap-3 relative ${
                      item.status === 'done' 
                        ? "opacity-60 border-neutral-100 text-gray-400" 
                        : item.type === 'event' 
                        ? "border-blue-100 ring-2 ring-blue-50/20" 
                        : item.type === 'reminder' 
                        ? "border-purple-100 ring-2 ring-purple-50/20"
                        : "border-green-100 ring-2 ring-green-50/20"
                    }`}
                  >
                    {/* Checking box inline option only for Tasks */}
                    {item.type === "task" ? (
                      <button 
                        onClick={() => handleToggleTaskStatus(item)}
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 transition-all shrink-0 flex items-center justify-center cursor-pointer ${
                          item.status === 'done' 
                            ? "bg-green-500 border-green-500 text-white" 
                            : "border-[#8A817C] hover:border-green-500 bg-white"
                        }`}
                      >
                        {item.status === 'done' && <CheckCircle size={14} />}
                      </button>
                    ) : (
                      <span className="text-base leading-none shrink-0 mt-0.5">
                        {item.type === 'event' ? (item.emoji || "📍") : "🔔"}
                      </span>
                    )}

                    <div className="flex-1 min-w-0 pr-6">
                      <p className={`text-xs font-extrabold leading-tight ${item.status === "done" ? 'line-through' : 'text-[#2C2723]'}`}>
                        {item.title}
                      </p>
                      {item.description && (
                        <p className={`text-[10px] mt-0.5 text-cute leading-normal ${item.status === "done" ? 'text-gray-400' : 'text-[#625B57]'}`}>
                          {item.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1 mt-1.5 items-center text-[9px] font-semibold text-gray-500">
                        {item.endDate ? (
                          <span className="bg-amber-50 text-[#8C5D23] border border-amber-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            📅 {item.date} {item.time && `(${item.time})`} ➔ {item.endDate} {item.endTime && `(${item.endTime})`}
                          </span>
                        ) : (
                          item.time && (
                            <span className="bg-gray-100 px-1 py-0.5 rounded flex items-center gap-0.5">
                              <Clock size={8} /> {item.time}
                            </span>
                          )
                        )}
                        <span className="bg-gray-50 px-1 py-0.5 rounded">
                          {item.assignedTo === 'home' ? '🏠 Hogar' : `👤 ${getUserName(item.assignedTo)}`}
                        </span>
                      </div>
                    </div>

                    {/* Edit and Delete action buttons */}
                    {!item.id.startsWith("birthday-") && (
                      <div className="absolute right-2 top-2 flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity">
                        <button 
                          onClick={() => startEditItem(item)}
                          className="p-1 text-[#8A817C] hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-[#8A817C] hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* EDIT CALENDAR ITEM MODAL */}
      {editingItem && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999]">
          <div className="bg-white rounded-3xl border-4 border-[#F3EFE6] max-w-lg w-full p-6 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl text-lg font-bold">✏️</span>
                <div>
                  <h3 className="font-extrabold text-[#2C2723] text-sm sm:text-base">Editar Actividad</h3>
                  <p className="text-[11px] text-[#8A817C]">Modifica los detalles del evento o tarea</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingItem(null)} 
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCalendarEdit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#8A817C] mb-1">Título:</label>
                <input 
                  type="text" 
                  required 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#FCFAF7] border-2 border-[#EAE5D9] rounded-xl px-3 py-2 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#8A817C] mb-1">Tipo:</label>
                  <select 
                    value={editType} 
                    onChange={(e) => setEditType(e.target.value as any)}
                    className="w-full bg-[#FCFAF7] border-2 border-[#EAE5D9] rounded-xl px-3 py-2 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="event">📅 Evento</option>
                    <option value="task">✅ Tarea del Hogar</option>
                    <option value="reminder">🔔 Recordatorio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#8A817C] mb-1">Asignado a:</label>
                  <select 
                    value={editAssignedTo} 
                    onChange={(e) => setEditAssignedTo(e.target.value)}
                    className="w-full bg-[#FCFAF7] border-2 border-[#EAE5D9] rounded-xl px-3 py-2 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="home">🏠 Todo el Hogar</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>👤 {u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#8A817C] mb-1">Fecha:</label>
                  <input 
                    type="date" 
                    required 
                    value={editDate} 
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-[#FCFAF7] border-2 border-[#EAE5D9] rounded-xl px-3 py-2 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#8A817C] mb-1">Hora (opcional):</label>
                  <input 
                    type="time" 
                    value={editTime} 
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full bg-[#FCFAF7] border-2 border-[#EAE5D9] rounded-xl px-3 py-2 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#8A817C] mb-1">Descripción / Notas:</label>
                <textarea 
                  rows={2} 
                  value={editDescription} 
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-[#FCFAF7] border-2 border-[#EAE5D9] rounded-xl px-3 py-2 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>

              {/* 🔔 Push Notification 1 Hour Before Toggle */}
              <div className="flex items-center gap-2 p-2.5 bg-blue-50/70 rounded-xl border border-blue-100">
                <input 
                  type="checkbox"
                  id="edit-notify-1h"
                  checked={editNotify1HourBefore}
                  onChange={(e) => setEditNotify1HourBefore(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="edit-notify-1h" className="text-xs font-bold text-[#2C2723] cursor-pointer flex items-center gap-1.5">
                  <span>🔔 Enviar notificación Push automáticas 1 hora antes del evento</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setEditingItem(null)} 
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
