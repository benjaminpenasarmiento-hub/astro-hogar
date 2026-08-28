import React from "react";
import { useSyncStatus } from "../utils/syncStatusEmitter";

interface SyncStatusIndicatorProps {
  onForceRefresh?: () => void;
  showLabel?: boolean;
  className?: string;
}

export function SyncStatusIndicator({
  onForceRefresh,
  showLabel = false,
  className = ""
}: SyncStatusIndicatorProps) {
  const { status, lastSyncTime, lastError, triggerSyncCheck } = useSyncStatus();

  let dotColor = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]";
  let labelText = "Sincronizado";
  let tooltipText = "Firestore: Sincronización exitosa con la nube";

  if (status === "quota_exceeded") {
    dotColor = "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]";
    labelText = "Local Seguro";
    tooltipText = "Resguardo Local Activo: Cuota diaria de Firestore alcanzada. Tus datos están 100% seguros y guardados en almacenamiento local.";
  } else if (status === "syncing") {
    dotColor = "bg-amber-400 shadow-[0_0_8px_rgba(250,204,21,0.9)] animate-pulse";
    labelText = "Guardando...";
    tooltipText = "Firestore: Escritura pendiente en la base de datos...";
  } else if (status === "error") {
    dotColor = "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse";
    labelText = "Error de sync";
    tooltipText = `Firestore: Error en sincronización (${lastError || "Verifica tu conexión"})`;
  } else if (lastSyncTime) {
    try {
      const date = new Date(lastSyncTime);
      const formattedTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      tooltipText = `Firestore: Sincronización exitosa (${formattedTime})`;
    } catch {
      tooltipText = "Firestore: Sincronizado con la nube";
    }
  }

  const handleClick = () => {
    triggerSyncCheck();
    if (onForceRefresh) {
      onForceRefresh();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/90 hover:bg-white border border-[#E7E2D5] shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer select-none shrink-0 ${className}`}
      title={`${tooltipText} - Haz clic para sincronizar`}
      aria-label={tooltipText}
    >
      <span className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${dotColor}`} />
      {showLabel && (
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#625B57] max-sm:hidden">
          {labelText}
        </span>
      )}
    </button>
  );
}
