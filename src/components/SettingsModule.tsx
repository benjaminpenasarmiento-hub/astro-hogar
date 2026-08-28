import React, { useState, useEffect } from "react";
import { Settings, Save, Home, Wifi, ShieldAlert, Users, CheckCircle, Trash2, RefreshCw, Database, AlertTriangle, Clock, ShieldCheck, LifeBuoy, FileText } from "lucide-react";
import { Home as HomeType, UserProfile } from "../types";
import { updateHomeSettings, resetDatabaseOnboarding, rescueHomeData, fetchAuditLogs, createBackupNow, fetchBackupsList, restoreBackupFile } from "../api";
import { Avatar } from "./Avatar";
import MobileWidgetsCenter from "./MobileWidgetsCenter";
import { SyncStatusIndicator } from "./SyncStatusIndicator";

interface SettingsModuleProps {
  home: HomeType;
  users: UserProfile[];
  onRefreshData: () => void;
  onOpenInstallModal?: () => void;
  pets?: any[];
  plants?: any[];
  activeUserId?: string;
}

export default function SettingsModule({ home, users, onRefreshData, onOpenInstallModal, pets = [], plants = [], activeUserId }: SettingsModuleProps) {
  const [name, setName] = useState(home.name);
  const [address, setAddress] = useState(home.address || "Bogotá D.C., Colombia");
  const [wifiSsid, setWifiSsid] = useState(home.wifiSsid || "Nidito_Inteligente_5G");
  const [wifiPassword, setWifiPassword] = useState(home.wifiPassword || "lunaymax123");
  const [isSavedAlert, setIsSavedAlert] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<"general" | "mobile" | "diagnostics">("general");
  const [syncDiagnostics, setSyncDiagnostics] = useState<{
    isRestoredFromFirestore?: boolean;
    pendingWrites?: number;
    lastSuccessfulSyncTime?: string;
    lastSyncError?: string | null;
    status?: string;
  } | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [rescuing, setRescuing] = useState(false);
  const [rescueMessage, setRescueMessage] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  // Backup System state
  const [backupsList, setBackupsList] = useState<Array<{
    filename: string;
    createdAt: string;
    sizeFormatted: string;
    isLatest: boolean;
    appVersion: string;
    schemaVersion: number;
    requiresMigration: boolean;
  }>>([]);
  const [currentAppVersion, setCurrentAppVersion] = useState<string>("1.3.2");
  const [currentSchemaVersion, setCurrentSchemaVersion] = useState<number>(2);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackupFilename, setRestoringBackupFilename] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedBackupToRestore, setSelectedBackupToRestore] = useState<{
    filename: string;
    createdAt: string;
    sizeFormatted: string;
    appVersion: string;
    schemaVersion: number;
    requiresMigration: boolean;
  } | null>(null);

  const loadBackups = async () => {
    setLoadingBackups(true);
    try {
      const res = await fetchBackupsList();
      if (res.success) {
        setBackupsList(res.backups || []);
        if (res.currentAppVersion) setCurrentAppVersion(res.currentAppVersion);
        if (res.currentSchemaVersion) setCurrentSchemaVersion(res.currentSchemaVersion);
      }
    } catch (e) {
      console.error("Error loading backups:", e);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    setBackupMessage(null);
    try {
      const res = await createBackupNow("Crear Backup Ahora (Ajustes Diagnóstico)");
      setBackupMessage({ type: "success", text: `✓ Copia creada con éxito: ${res.filename} (${res.sizeFormatted})` });
      await loadBackups();
      await loadAuditTrail();
    } catch (err: any) {
      setBackupMessage({ type: "error", text: err?.message || "No se pudo generar la copia de seguridad." });
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    setRestoringBackupFilename(filename);
    setBackupMessage(null);
    try {
      const res = await restoreBackupFile(filename);
      setBackupMessage({ type: "success", text: `✓ ${res.message}` });
      onRefreshData();
      await loadBackups();
      await loadAuditTrail();
    } catch (err: any) {
      setBackupMessage({ type: "error", text: err?.message || "Error al restaurar desde el backup." });
    } finally {
      setRestoringBackupFilename(null);
    }
  };

  const loadAuditTrail = async () => {
    setLoadingAuditLogs(true);
    try {
      const logs = await fetchAuditLogs();
      setAuditLogs(logs);
    } catch (e) {
      console.error("Error loading audit logs:", e);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  const handleRescueData = async () => {
    setRescuing(true);
    setRescueMessage(null);
    try {
      const res = await rescueHomeData();
      setRescueMessage(res.message);
      onRefreshData();
      if (activeSection === "diagnostics") {
        loadAuditTrail();
      }
    } catch (err: any) {
      setRescueMessage("Error durante la función de rescate: " + (err?.message || "Servidor no disponible"));
    } finally {
      setRescuing(false);
    }
  };

  const fetchDiagnostics = async () => {
    setLoadingDiagnostics(true);
    try {
      const res = await fetch("/api/sync-status");
      if (res.ok) {
        const data = await res.json();
        setSyncDiagnostics(data);
      }
    } catch (e) {
      console.error("Error loading sync diagnostics:", e);
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  useEffect(() => {
    if (activeSection === "diagnostics") {
      fetchDiagnostics();
      loadAuditTrail();
      loadBackups();
      const interval = setInterval(fetchDiagnostics, 4000);
      return () => clearInterval(interval);
    }
  }, [activeSection]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(home.code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogOut = () => {
    localStorage.removeItem("astro_home_code");
    localStorage.removeItem("astro_user_id");
    window.location.reload();
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateHomeSettings({
      name,
      address,
      wifiSsid,
      wifiPassword
    });

    setIsSavedAlert(true);
    setTimeout(() => setIsSavedAlert(false), 3000);
    onRefreshData();
  };

  const handleFactoryReset = async () => {
    try {
      localStorage.clear();
      await resetDatabaseOnboarding();
      onRefreshData();
      window.location.reload();
    } catch (err) {
      alert("No se pudo borrar los datos miau.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      
      {/* Title Header bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border-4 border-[#F3EFE6] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl shadow-inner shrink-0 leading-none text-gray-600">
            ⚙️
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-cute text-[#2C2723]">Ajustes del Hogar</h2>
            <p className="text-xs text-[#8A817C]">Configura contraseñas de red, direcciones e información del nidito miau</p>
          </div>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b-2 border-[#F3EFE6] gap-4 px-2">
        <button
          onClick={() => setActiveSection("general")}
          className={`pb-2.5 px-4 text-xs font-black transition-all border-b-4 flex items-center gap-1.5 cursor-pointer leading-none ${
            activeSection === "general"
              ? "border-[#2C2723] text-[#2C2723]"
              : "border-transparent text-[#8A817C] hover:text-[#2C2723]"
          }`}
        >
          🏠 Ajustes Generales
        </button>
        <button
          onClick={() => setActiveSection("mobile")}
          className={`pb-2.5 px-4 text-xs font-black transition-all border-b-4 flex items-center gap-1.5 cursor-pointer leading-none relative ${
            activeSection === "mobile"
              ? "border-[#2C2723] text-[#2C2723]"
              : "border-transparent text-[#8A817C] hover:text-[#2C2723]"
          }`}
        >
          📱 Notificaciones y Alertas
          <span className="absolute top-0 right-1 bg-amber-500 w-1.5 h-1.5 rounded-full animate-pulse"></span>
        </button>
        <button
          onClick={() => setActiveSection("diagnostics")}
          className={`pb-2.5 px-4 text-xs font-black transition-all border-b-4 flex items-center gap-1.5 cursor-pointer leading-none ${
            activeSection === "diagnostics"
              ? "border-[#2C2723] text-[#2C2723]"
              : "border-transparent text-[#8A817C] hover:text-[#2C2723]"
          }`}
        >
          🔍 System Diagnostics
        </button>
      </div>

      {activeSection === "general" ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left main database settings form */}
        <div className="md:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border-4 border-[#F3EFE6] shadow-sm space-y-6">
          
          {/* Active Home Code Panel */}
          <div className="p-5 rounded-2xl bg-amber-50/70 border-2 border-dashed border-amber-300 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-amber-850 tracking-wider">Código de Conexión del Hogar 🔑</span>
              <span className="text-[10px] text-amber-600 font-bold">Para re-ingresar o invitar</span>
            </div>
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-amber-200">
              <span className="font-sans font-black tracking-widest text-[#2C2723] text-lg select-all">{home?.code || "NIDO-XXXXX"}</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                {copied ? "¡Copiado! ✓" : "Copiar Código"}
              </button>
            </div>
            <p className="text-[10px] text-amber-900 leading-normal font-medium animate-pulse">
              Guarda este código o compártelo con tu pareja para unirse al nido miau.
            </p>
          </div>

          <h3 className="font-extrabold text-cute text-sm text-[#2C2723] pb-2 border-b border-[#FAF7F2] flex items-center gap-2">
            <Home size={15} className="text-[#8A817C]" /> Datos Generales
          </h3>

          <form onSubmit={handleUpdateSettings} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#625B57]">Nombre del Hogar / Nido:</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej: Nidito de Mafe & Benja miau"
                className="w-full bg-[#FAF7F2] focus:ring-[#FAF7F2] focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] text-cute text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#625B57]">Dirección Física:</label>
              <input 
                type="text" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ej: Bogotá D.C., Colombia"
                className="w-full bg-[#FAF7F2] focus:ring-[#FAF7F2] focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] text-cute text-sm"
              />
            </div>

            {/* Network properties card info */}
            <div className="bg-[#FAF7F2] p-4 rounded-2xl border-2 border-[#E7E2D5] space-y-3">
              <h4 className="font-extrabold text-cute text-xs text-[#2C2723] flex items-center gap-1.5 label-wifi">
                <Wifi size={14} className="text-blue-500" /> Contraseña Wi-Fi de Visitas
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#8A817C]">Nombre Wi-Fi Ssid:</label>
                  <input 
                    type="text" 
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    placeholder="SSID"
                    className="w-full bg-white focus:outline-none rounded-xl px-2.5 py-1.5 border border-[#EAE5D9] text-xs font-mono text-[#2C2723] font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#8A817C]">Clave Wi-Fi:</label>
                  <input 
                    type="text" 
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    placeholder="Clave"
                    className="w-full bg-white focus:outline-none rounded-xl px-2.5 py-1.5 border border-[#EAE5D9] text-xs font-mono text-[#2C2723] font-bold"
                  />
                </div>
              </div>
            </div>

            {isSavedAlert && (
              <div className="bg-green-150 border border-green-300 rounded-xl p-3 flex items-center gap-2 text-xs text-green-900 font-semibold animate-bounce mt-3">
                <CheckCircle size={14} className="text-green-600" />
                <span>¡Ajustes del nido guardados en el servidor con éxito miau! 🐾🏡</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Save size={14} /> Guardar Ajustes
              </button>
            </div>
          </form>
        </div>

        {/* Right cohabitants profile grid list info */}
        <div className="md:col-span-5 space-y-6">
          
          <div className="bg-[#FAF7F2] p-5 rounded-3xl border-4 border-[#F3EFE6] space-y-4">
            <h3 className="font-extrabold text-cute text-sm text-[#2C2723] pb-1 border-b border-[#FAF7F2] flex items-center gap-2">
              <Users size={15} /> Habitantes del Nido
            </h3>

            <div className="space-y-4">
              {users.map((u) => (
                <div key={u.id} className="bg-white p-4 rounded-2xl border border-[#EAE5D9] flex items-center gap-3.5 shadow-sm">
                  <Avatar 
                    emoji={u.emoji} 
                    className="w-12 h-12 rounded-2xl border-2 border-[#FAF7F2] bg-white text-center shadow shrink-0" 
                  />
                  <div>
                    <h4 className="font-bold text-[#2C2723] text-sm text-cute leading-none">{u.name}</h4>
                    <p className="text-[10px] text-gray-400 capitalize mt-1">Signo zodiaco: {u.zodiacSign}</p>
                    <p className="text-[10px] text-green-700 bg-green-50 border border-green-150 rounded px-1.5 py-0.2 mt-1 font-bold inline-block leading-none">
                      👤 Habitante del Nido
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 📱 INSTALAR EN EL CELULAR CARD */}
          <div className="bg-[#FAF7F2] p-5 rounded-3xl border-4 border-[#F3EFE6] space-y-4">
            <h3 className="font-extrabold text-cute text-sm text-[#2C2723] pb-1 border-b border-[#FAF7F2] flex items-center gap-2">
              📱 Aplicación en el Celular
            </h3>
            <p className="text-[11.5px] text-gray-600 leading-relaxed font-semibold">
              ¿Quieres descargar esta aplicación en tu celular para tener un acceso directo en tu pantalla de inicio como una app real de nido? miau 🐾
            </p>
            <button
              type="button"
              onClick={onOpenInstallModal}
              className="w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black py-2.5 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
            >
              📱 Escanear QR e Instalar App
            </button>
          </div>

          {/* 🛟 RESCATE DE DATOS CARD */}
          <div className="bg-sky-50 rounded-3xl p-5 border border-sky-200 space-y-3">
            <p className="text-cute text-xs text-sky-800 font-extrabold flex items-center gap-1.5">
              <LifeBuoy size={15} /> Función de Rescate de Datos
            </p>
            <p className="text-[11px] text-sky-900 leading-relaxed font-medium">
              Escanea la base de datos de tu hogar buscando plantas, closet o metas registradas bajo tu código de hogar que no se estén visualizando para restaurar su visibilidad.
            </p>
            <button
              type="button"
              onClick={handleRescueData}
              disabled={rescuing}
              className="w-full text-center bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-[11px] font-black py-2.5 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={13} className={rescuing ? "animate-spin" : ""} />
              {rescuing ? "Escaneando y restaurando..." : "🔄 Escanear y Rescatar Datos de Mi Hogar"}
            </button>
            {rescueMessage && (
              <p className="text-[10.5px] font-bold text-sky-900 bg-white p-2.5 rounded-xl border border-sky-200 leading-tight">
                {rescueMessage}
              </p>
            )}
          </div>

          {/* Security details card */}
          <div className="bg-amber-50 rounded-3xl p-5 border border-amber-200">
            <p className="text-cute text-xs text-[#BE7A1F] font-extrabold flex items-center gap-1">
              <ShieldCheck size={15} /> Aislamiento y Seguridad
            </p>
            <p className="text-[11px] text-[#625B57] mt-1.5 leading-relaxed font-semibold">
              Tu hogar está protegido. Solo los usuarios autorizados (Mafe y Benjamin) pueden acceder a este código de hogar ({home.code}). Los accesos externos están bloqueados y aislados.
            </p>
          </div>

          {/* Active Session Logout */}
          <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-250 space-y-2">
            <p className="text-cute text-xs text-emerald-800 font-extrabold flex items-center gap-1.5">
              🪐 Conectores Cósmicos Activos
            </p>
            <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
              ¿Quieres fundar otro nido, unirte a otro código, o simplemente cambiar de usuario activo?
            </p>
            <button
              type="button"
              onClick={handleLogOut}
              className="w-full text-center bg-white hover:bg-[#F2FCF6] text-emerald-800 text-[11px] font-bold py-2 rounded-xl border border-emerald-300 transition-all cursor-pointer shadow-sm"
            >
              Salir de este Hogar (Cerrar Sesión) 👋
            </button>
          </div>

          {/* Danger zone / Reset DB */}
          <div className="bg-red-50 rounded-3xl p-5 border border-red-200">
            <p className="text-cute text-xs text-red-600 font-extrabold flex items-center gap-1.5">
              <Trash2 size={14} /> Zona de Ajustes Críticos
            </p>
            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
              Borra todos los movimientos, presupuestos, notas, recuerdos, plantas y habitantes del nido para comenzar desde cero.
            </p>
            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="mt-3 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1 shadow-xs"
              >
                <Trash2 size={12} /> Borrar todos los datos miau
              </button>
            ) : (
              <div className="mt-3 border-t border-dashed border-red-200 pt-3 space-y-2">
                <p className="text-[11px] font-bold text-red-700">🐱 ¿Estás seguro/a? Se borrarán todos los datos permanentemente miau.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleFactoryReset}
                    className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-black px-3.5 py-1.5 rounded-lg cursor-pointer transition-all"
                  >
                    Sí, restablecer de fábrica ✔
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="bg-white border border-gray-300 hover:bg-gray-100 text-[#625B57] text-[10px] font-bold px-3.5 py-1.5 rounded-lg cursor-pointer"
                  >
                    Cancelar ✘
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
      ) : activeSection === "mobile" ? (
        <MobileWidgetsCenter 
          home={home} 
          users={users} 
          onRefreshData={onRefreshData} 
          pets={pets} 
          plants={plants} 
          activeUserId={activeUserId}
        />
      ) : (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border-4 border-[#F3EFE6] shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b-2 border-[#F3EFE6] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-800">
                <Database size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#2C2723]">System Diagnostics</h3>
                <p className="text-xs text-[#8A817C]">Estado en tiempo real de sincronización con Firebase Firestore</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SyncStatusIndicator showLabel={true} />
              <button
                type="button"
                onClick={fetchDiagnostics}
                disabled={loadingDiagnostics}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FAF7F2] hover:bg-[#F3EFE6] text-[#2C2723] rounded-xl border border-[#E8E1D5] text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw size={14} className={loadingDiagnostics ? "animate-spin" : ""} />
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          {/* Sync Status Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Status Badge */}
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border-2 border-[#F3EFE6] space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#8A817C] block">Estado de Sincronización</span>
              <div className="flex items-center gap-2 mt-1">
                {syncDiagnostics?.status === "error" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-red-100 text-red-800">
                    <AlertTriangle size={14} /> Error de Sincronización
                  </span>
                ) : syncDiagnostics?.pendingWrites && syncDiagnostics.pendingWrites > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 animate-pulse">
                    <Clock size={14} /> Sincronizando...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                    <CheckCircle size={14} /> Sincronizado (Active)
                  </span>
                )}
              </div>
            </div>

            {/* 2. Pending Writes Count */}
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border-2 border-[#F3EFE6] space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#8A817C] block">Pending Writes</span>
              <div className="text-2xl font-black text-[#2C2723] flex items-baseline gap-1.5">
                <span>{syncDiagnostics?.pendingWrites ?? 0}</span>
                <span className="text-xs font-normal text-gray-500">operaciones en cola</span>
              </div>
            </div>

            {/* 3. Last Successful Sync Time */}
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border-2 border-[#F3EFE6] space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#8A817C] block">Last Successful Sync</span>
              <div className="text-xs font-bold text-[#2C2723] break-all">
                {syncDiagnostics?.lastSuccessfulSyncTime
                  ? new Date(syncDiagnostics.lastSuccessfulSyncTime).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " - " + new Date(syncDiagnostics.lastSuccessfulSyncTime).toLocaleDateString("es-CO")
                  : "Sincronización inicial..."}
              </div>
            </div>
          </div>

          {/* Error Alert Box if lastSyncError is present */}
          {syncDiagnostics?.lastSyncError && (
            <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-900 space-y-1 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black">Error detectado en la última escritura a Firebase:</p>
                <p className="text-xs font-medium text-red-800 mt-0.5">{syncDiagnostics.lastSyncError}</p>
              </div>
            </div>
          )}

          {/* Diagnostic Details & Explanations */}
          <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-[#E8E1D5] space-y-3">
            <h4 className="text-xs font-black text-[#2C2723] uppercase tracking-wider">¿Qué significa esta información?</h4>
            <ul className="text-xs text-[#625B57] space-y-2 list-disc list-inside">
              <li>
                <strong>Pending Writes:</strong> Muestra la cantidad de escrituras en memoria pendientes de transferirse a la base de datos de Firebase. Si está en <strong>0</strong>, significa que todos los cambios (fotos desde el celular, presupuestos, recuerdos y respuestas) ya están confirmados y resguardados en Firestore.
              </li>
              <li>
                <strong>Last Successful Sync Time:</strong> Es la hora exacta en la que el servidor completó con éxito el último respaldo de tus datos al servidor de nube.
              </li>
              <li>
                <strong>Protección Anti-sobreescritura activa:</strong> El servidor ahora fusiona sin eliminar tus registros al reiniciar el contenedor, evitando que se borren fotos o cambios recientes subidos desde dispositivos móviles.
              </li>
            </ul>
          </div>

          {/* SYSTEM BACKUP MANAGEMENT SECTION */}
          <div className="p-6 rounded-3xl bg-[#FAF9F5] border-2 border-amber-200/80 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-800 shrink-0 shadow-xs">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#2C2723] flex items-center gap-2">
                    Sistema de Copias de Seguridad (Backups)
                    <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                      Protección Activa
                    </span>
                  </h3>
                  <p className="text-xs text-[#8A817C]">
                    Respaldos del archivo db_sim.json con rotación automática de 10 copias y restauración instantánea.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl font-extrabold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Save size={15} className={creatingBackup ? "animate-spin" : ""} />
                <span>{creatingBackup ? "Creando Copia..." : "Crear Backup Ahora"}</span>
              </button>
            </div>

            {backupMessage && (
              <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-fade-in ${
                backupMessage.type === "success" 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                  : "bg-red-50 border-red-200 text-red-900"
              }`}>
                {backupMessage.type === "success" ? <CheckCircle size={16} className="shrink-0 text-emerald-600" /> : <AlertTriangle size={16} className="shrink-0 text-red-600" />}
                <span>{backupMessage.text}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-[#2C2723] uppercase tracking-wider flex items-center gap-1.5">
                  <Database size={14} className="text-amber-800" /> Copias Disponibles ({backupsList.length} Mantenidas)
                </h4>
                <button
                  type="button"
                  onClick={loadBackups}
                  disabled={loadingBackups}
                  className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={12} className={loadingBackups ? "animate-spin" : ""} />
                  Actualizar Lista
                </button>
              </div>

              {loadingBackups ? (
                <div className="p-4 text-center text-xs text-gray-500 italic">Cargando copias de seguridad...</div>
              ) : backupsList.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-[#EAE5D9] rounded-2xl bg-white">
                  <p className="text-xs font-bold text-[#2C2723]">No hay copias de seguridad aún</p>
                  <p className="text-[11px] text-[#8A817C] mt-1">Haz clic en "Crear Backup Ahora" para registrar la primera copia de seguridad de Mafe y Benja.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {backupsList.map((bk) => (
                    <div
                      key={bk.filename}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        bk.isLatest ? "bg-amber-50/80 border-amber-300 shadow-xs" : "bg-white border-[#EAE5D9] hover:border-amber-200"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-[#2C2723] bg-white px-2 py-0.5 rounded-lg border border-gray-200 select-all">{bk.filename}</span>
                          {bk.isLatest && (
                            <span className="bg-amber-200 text-amber-900 text-[9.5px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                              Más Reciente ✨
                            </span>
                          )}
                          <span className="bg-amber-100 text-amber-900 text-[9.5px] font-bold px-2 py-0.5 rounded-md border border-amber-200">
                            v{bk.appVersion} (Esquema v{bk.schemaVersion})
                          </span>
                          {bk.requiresMigration && (
                            <span className="bg-amber-100 text-amber-900 text-[9.5px] font-extrabold px-2 py-0.5 rounded-md border border-amber-300 flex items-center gap-1">
                              ⚡ Migración Necesaria
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#8A817C] flex items-center gap-2.5 flex-wrap">
                          <span className="flex items-center gap-1 font-medium text-gray-600">
                            <Clock size={12} />
                            {new Date(bk.createdAt).toLocaleDateString("es-CO")} {new Date(bk.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-gray-600">Tamaño: {bk.sizeFormatted}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedBackupToRestore(bk)}
                        disabled={restoringBackupFilename === bk.filename}
                        className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 active:scale-95 text-amber-900 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 border border-amber-300 shadow-2xs"
                      >
                        <RefreshCw size={13} className={restoringBackupFilename === bk.filename ? "animate-spin" : ""} />
                        <span>Restaurar desde Backup</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Audit Logs Trail */}
          <div className="p-5 rounded-2xl bg-white border-2 border-[#F3EFE6] space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5">
              <h4 className="text-xs font-black text-[#2C2723] uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={15} /> Registro de Auditoría y Cambios (Audit Trail)
              </h4>
              <button
                type="button"
                onClick={loadAuditTrail}
                className="text-[11px] font-bold text-amber-800 hover:underline cursor-pointer"
              >
                Actualizar Log
              </button>
            </div>
            
            {loadingAuditLogs ? (
              <p className="text-xs text-gray-500 italic">Cargando registros de auditoría...</p>
            ) : auditLogs.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No hay modificaciones registradas en este hogar aun.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {auditLogs.slice(0, 30).map((log: any) => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#EAE5D9] text-[11px] flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-[#2C2723]">{log.userName || log.userId}</span>
                      <span className="text-gray-400 mx-1.5">•</span>
                      <span className="font-semibold text-amber-900 uppercase text-[10px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{log.action}</span>
                      <span className="text-gray-400 mx-1.5">•</span>
                      <span className="font-medium text-gray-600">{log.module}</span>
                      {log.details && <p className="text-gray-500 text-[10.5px] mt-0.5">{log.details}</p>}
                    </div>
                    <span className="text-[9.5px] font-semibold text-gray-400 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      {selectedBackupToRestore && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border-4 border-amber-200 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-amber-800">
              <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-black text-base text-[#2C2723]">Restaurar Estado del Hogar</h3>
                <p className="text-xs text-gray-500">Confirmación de recuperación de backup</p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-2">
              <p className="font-bold">¿Deseas restaurar la copia de seguridad seleccionada?</p>
              <p className="font-mono text-[11px] text-amber-800 bg-white p-2 rounded-xl border border-amber-200 break-all font-bold select-all">
                {selectedBackupToRestore.filename}
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10.5px] bg-white/70 p-2 rounded-xl border border-amber-200">
                <div>
                  <span className="text-gray-500 font-medium">Versión del Backup:</span>
                  <p className="font-bold text-[#2C2723]">v{selectedBackupToRestore.appVersion} (Esquema v{selectedBackupToRestore.schemaVersion})</p>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Versión Actual:</span>
                  <p className="font-bold text-[#2C2723]">v{currentAppVersion} (Esquema v{currentSchemaVersion})</p>
                </div>
              </div>
              <p className="text-[10.5px] text-amber-800">
                Fecha de creación: {new Date(selectedBackupToRestore.createdAt).toLocaleString("es-CO")}
              </p>
            </div>

            {selectedBackupToRestore.requiresMigration && (
              <div className="p-3 bg-amber-100/90 rounded-2xl border border-amber-300 text-[11px] text-amber-900 font-medium space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  ⚡ <span>Migración Automática de Esquema Activa</span>
                </p>
                <p className="text-[10.5px] leading-relaxed">
                  Este backup pertenece al Esquema v{selectedBackupToRestore.schemaVersion}. Al restaurar, el sistema ejecutará una adaptación automática hacia el Esquema v{currentSchemaVersion} para asegurar compatibilidad total sin perder ningún registro.
                </p>
              </div>
            )}

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-[11px] text-emerald-900 font-medium">
              🛡️ <strong>Seguridad Garantizada:</strong> Antes de aplicar esta restauración, el sistema creará automáticamente un respaldo de seguridad del estado actual.
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSelectedBackupToRestore(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#625B57] text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const filename = selectedBackupToRestore.filename;
                  setSelectedBackupToRestore(null);
                  handleRestoreBackup(filename);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-sm transition-all"
              >
                Sí, Restaurar Ahora ✔
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
