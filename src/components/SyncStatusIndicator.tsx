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
  const { status, lastSyncTime, lastError, pendingWrites, triggerSyncCheck } = useSyncStatus();

  let dotColor = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]";
  let labelText = "Sincronizado";
  let tooltipText = "Firestore: Sincronización exitosa con la nube";

  if (status === "offline") {
    dotColor = "bg-slate-400 shadow-[0_0_8px_rgba(100,116,139,0.6)] animate-pulse";
    labelText = pendingWrites > 0 ? `Offline · ${pendingWrites}` : "Sin conexión";
    tooltipText = pendingWrites > 0
      ? `${pendingWrites} cambio(s) están guardados localmente y se enviarán al recuperar internet.`
      : "Sin conexión a internet. No se perderán cambios nuevos que puedan ponerse en cola.";
  } else if (status === "quota_exceeded") {
    dotColor = "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]";
    labelText = "Cuota";
    tooltipText = "La cuota de Firestore está temporalmente limitada. Revisa la sincronización antes de continuar con cambios importantes.";
  } else if (status === "syncing") {
    dotColor = "bg-amber-400 shadow-[0_0_8px_rgba(250,204,21,0.9)] animate-pulse";
    labelText = pendingWrites > 0 ? `Guardando · ${pendingWrites}` : "Guardando...";
    tooltipText = pendingWrites > 0
      ? `${pendingWrites} cambio(s) están pendientes de confirmación en Firestore.`
      : "Firestore: Escritura pendiente en la base de datos...";
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
    onForceRefresh?.();
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
