import React from "react";
import { 
  Home, 
  Calendar, 
  Heart, 
  Folder, 
  Settings, 
  User, 
  ShieldAlert,
  Leaf,
  PawPrint,
  Activity,
  Sparkles,
  Wallet,
  Dumbbell,
  Target,
  Shirt
} from "lucide-react";

import { UserProfile } from "../types";
import { Avatar, getAvatarEmojiChar } from "./Avatar";

interface SidebarProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
  homeName?: string;
  alertsCount?: number;
  users?: UserProfile[];
  onSelectUser?: (user: UserProfile, initialTab?: "natal" | "edit" | "synastry" | "settings") => void;
  activeUserId?: string;
  onSwitchActiveUser?: (userId: string) => void;
}

export default function Sidebar({ 
  currentTab, 
  onChangeTab, 
  homeName = "Mi AstroHogar", 
  alertsCount = 0, 
  users = [], 
  onSelectUser,
  activeUserId,
  onSwitchActiveUser
}: SidebarProps) {
  
  const menuItems = [
    { id: "inicio", label: "Inicio", icon: Home, emoji: "🏡", color: "text-amber-500" },
    { id: "presupuesto", label: "Presupuesto", icon: Wallet, emoji: "💰", color: "text-emerald-600" },
    { id: "cosmos", label: "Cosmos", icon: Sparkles, emoji: "🌌", color: "text-purple-600" },
    { id: "calendario", label: "Calendario", icon: Calendar, emoji: "📅", color: "text-blue-500" },
    { id: "mascotas", label: "Mascotas", icon: PawPrint, emoji: "🐶", color: "text-purple-500" },
    { id: "plantas", label: "Plantas", icon: Leaf, emoji: "🌿", color: "text-emerald-500" },
    { id: "metas", label: "Metas", icon: Target, emoji: "🎯", color: "text-rose-500" },
    { id: "recuerdos", label: "Recuerdos", icon: Heart, emoji: "❤️", color: "text-rose-500" },
    { id: "salud", label: "Salud", icon: Activity, emoji: "🌸", color: "text-rose-500" },
    { id: "ejercicio", label: "Templo", icon: Dumbbell, emoji: "🏛️", color: "text-amber-500" },
    { id: "closet", label: "Closet", icon: Shirt, emoji: "👔", color: "text-purple-600" }
  ];

  const activeUser = users.find(u => u.id === activeUserId);

  return (
    <aside className="hidden md:flex w-64 max-lg:w-20 bg-white border-r-4 border-[#F3EFE6] flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-300">
      {/* Brand Header */}
      <div className="p-6 max-lg:p-4 border-b-2 border-[#F3EFE6] flex items-center gap-3">
        <div className="w-10 h-10 bg-[#FFE5D9] rounded-2xl flex items-center justify-center text-xl shadow-inner shrink-0 leading-none">
          🏡
        </div>
        <div className="max-lg:hidden overflow-hidden">
          <h1 className="font-bold text-cute text-sm text-[#2C2723] leading-tight truncate">{homeName}</h1>
          <p className="text-[11px] text-green-600 font-semibold flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
            Hogar Inteligente Compartido
          </p>
        </div>
      </div>

      {/* Active User Card Section (Top) */}
      {activeUser && (
        <div className="mx-4 mt-4 p-3 bg-[#FAF7F2] border-2 border-[#E7E2D5] rounded-2xl flex flex-col gap-2 max-lg:mx-2 max-lg:p-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectUser?.(activeUser, "natal")}
              className="w-9 h-9 rounded-full bg-white border border-[#E7E2D5] relative shrink-0 cursor-pointer hover:scale-105 transition-transform"
              title={`Perfil de ${activeUser.name}`}
            >
              <Avatar emoji={activeUser.emoji} className="w-full h-full" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
            </button>
            <div className="overflow-hidden flex-1 leading-none max-lg:hidden">
              <span className="text-[9px] font-black uppercase text-[#BE7A1F] tracking-wider block">Sesión Activa</span>
              <button
                onClick={() => onSelectUser?.(activeUser, "natal")}
                className="font-extrabold text-cute text-xs text-[#2C2723] truncate mt-1 flex items-center gap-1 hover:text-amber-700 cursor-pointer"
              >
                {activeUser.name} <span className="text-[10px] filter saturate-150">{getAvatarEmojiChar(activeUser.emoji)}</span>
              </button>
            </div>
          </div>
          
          {/* Profile & Settings Buttons */}
          <div className="flex gap-1.5 pt-1 border-t border-[#E7E2D5]/70 max-lg:hidden">
            <button
              onClick={() => onSelectUser?.(activeUser, "natal")}
              className="flex-1 py-1 px-2 bg-white hover:bg-amber-50 border border-[#E7E2D5] hover:border-amber-300 rounded-xl text-[10px] font-bold text-[#625B57] hover:text-[#2C2723] transition-all cursor-pointer flex items-center justify-center gap-1 shadow-3xs"
            >
              <span>👤 Perfil</span>
            </button>
            <button
              onClick={() => onSelectUser?.(activeUser, "settings")}
              className="flex-1 py-1 px-2 bg-white hover:bg-amber-50 border border-[#E7E2D5] hover:border-amber-300 rounded-xl text-[10px] font-bold text-[#625B57] hover:text-[#2C2723] transition-all cursor-pointer flex items-center justify-center gap-1 shadow-3xs"
            >
              <Settings size={12} className="text-amber-600" />
              <span>Ajustes</span>
            </button>
          </div>

          {/* Quick Profile Switcher pills */}
          {users.length > 1 && (
            <div className="border-t border-[#E7E2D5]/70 pt-1.5 flex flex-col gap-1 max-lg:hidden">
              <span className="text-[8.5px] text-[#8A817C] font-black uppercase tracking-wider">Cambiar de perfil:</span>
              <div className="flex flex-wrap gap-1">
                {users.map(u => {
                  if (u.id === activeUserId) return null;
                  return (
                    <button
                      key={u.id}
                      onClick={() => onSwitchActiveUser?.(u.id)}
                      className="px-2 py-0.5 bg-white hover:bg-amber-50 border border-[#E7E2D5] hover:border-amber-300 rounded-lg text-[9.5px] font-bold text-[#625B57] transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <span>{getAvatarEmojiChar(u.emoji || "👤")}</span>
                      <span>{u.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = currentTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-cute font-medium text-sm transition-all text-left cursor-pointer relative ${
                isActive 
                  ? "bg-[#FAF7F2] text-[#2C2723] font-bold border-2 border-[#E7E2D5]" 
                  : "text-[#625B57] hover:bg-[#FAF7F2] hover:text-[#2C2723] border-2 border-transparent"
              }`}
            >
              <div className={`flex items-center justify-center text-lg shrink-0 ${isActive ? item.color : "opacity-80"}`}>
                <span>{item.emoji}</span>
              </div>
              
              <span className="max-lg:hidden flex-1 truncate">{item.label}</span>
              
              {item.id === "inicio" && alertsCount > 0 && (
                <span className="max-lg:hidden bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                  {alertsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Clean Footer */}
      <div className="p-4 border-t-2 border-[#F3EFE6] bg-[#FCFAF7] max-lg:p-2 text-center">
        <div className="flex items-center justify-between max-lg:justify-center text-[11px] text-[#8A817C] font-semibold">
          <span className="max-lg:hidden flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            AstroHogar v2.5
          </span>
          <span className="text-xs">🏡✨</span>
        </div>
      </div>
    </aside>
  );
}
