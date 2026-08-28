import { useState, useEffect } from "react";

export type SyncStatusState = "synced" | "syncing" | "error" | "quota_exceeded";

export interface SyncStatusData {
  status: SyncStatusState;
  lastSyncTime: string | null;
  lastError: string | null;
  pendingWrites: number;
}

type Subscriber = (data: SyncStatusData) => void;

let currentData: SyncStatusData = {
  status: "synced",
  lastSyncTime: null,
  lastError: null,
  pendingWrites: 0
};

const subscribers = new Set<Subscriber>();

function notify() {
  subscribers.forEach(sub => sub(currentData));
}

let isInitialized = false;
let activeMutations = 0;
let holdTimeout: any = null;

export async function fetchServerSyncStatus(): Promise<SyncStatusData> {
  try {
    const res = await fetch("/api/sync-status");
    if (!res.ok) throw new Error("Error fetching status");
    const data = await res.json();
    
    // Si la cuota fue excedida, mostrar quota_exceeded; si hay mutaciones activas, syncing; de lo contrario synced/error
    const serverStatus: SyncStatusState = (data.status === "quota_exceeded" || data.isQuotaExhausted)
      ? "quota_exceeded"
      : data.status === "error" 
        ? "error" 
        : (data.pendingWrites > 0 || activeMutations > 0) 
          ? "syncing" 
          : "synced";

    currentData = {
      status: serverStatus,
      lastSyncTime: data.lastSuccessfulSyncTime || currentData.lastSyncTime,
      lastError: data.lastSyncError || null,
      pendingWrites: data.pendingWrites || activeMutations
    };
    notify();
    return currentData;
  } catch (err) {
    return currentData;
  }
}

export function initSyncStatusMonitor() {
  if (isInitialized || typeof window === "undefined") return;
  isInitialized = true;

  // Interceptar window.fetch para cambiar a amarillo ("syncing") inmediatamente
  const originalFetch = window.fetch;
  if (originalFetch) {
    const interceptedFetch = async function (this: any, input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
      const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
      const isApiMutation = url.includes("/api/") && ["POST", "PUT", "DELETE", "PATCH"].includes(method);

      if (isApiMutation) {
        activeMutations++;
        currentData = {
          ...currentData,
          status: "syncing",
          pendingWrites: Math.max(1, currentData.pendingWrites + 1)
        };
        notify();
      }

      try {
        const response = await originalFetch.apply(this, [input, init] as any);
        return response;
      } finally {
        if (isApiMutation) {
          activeMutations = Math.max(0, activeMutations - 1);
          
          // Retener el indicador en amarillo durante al menos 1200ms para claridad visual de la escritura en Firestore
          if (holdTimeout) clearTimeout(holdTimeout);
          holdTimeout = setTimeout(() => {
            fetchServerSyncStatus();
          }, 1200);
        }
      }
    };

    try {
      Object.defineProperty(window, "fetch", {
        value: interceptedFetch,
        writable: true,
        configurable: true,
      });
    } catch {
      try {
        (window as any).fetch = interceptedFetch;
      } catch (e) {
        console.warn("Could not patch window.fetch:", e);
      }
    }
  }

  // Sondeo periódico cada 4 segundos
  fetchServerSyncStatus();
  setInterval(() => {
    fetchServerSyncStatus();
  }, 4000);
}

export function useSyncStatus() {
  const [data, setData] = useState<SyncStatusData>(currentData);

  useEffect(() => {
    initSyncStatusMonitor();
    const sub: Subscriber = (updated) => {
      setData({ ...updated });
    };
    subscribers.add(sub);
    // Ejecución inicial por si acaso
    setData({ ...currentData });
    return () => {
      subscribers.delete(sub);
    };
  }, []);

  return {
    ...data,
    triggerSyncCheck: fetchServerSyncStatus
  };
}
