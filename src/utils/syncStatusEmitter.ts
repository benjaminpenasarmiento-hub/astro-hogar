import { useState, useEffect } from "react";
import { getOfflineQueueCount } from "../offlineQueue";

export type SyncStatusState = "synced" | "syncing" | "error" | "quota_exceeded" | "offline";

export interface SyncStatusData {
  status: SyncStatusState;
  lastSyncTime: string | null;
  lastError: string | null;
  pendingWrites: number;
}

type Subscriber = (data: SyncStatusData) => void;

let isInitialized = false;
let activeMutations = 0;
let holdTimeout: ReturnType<typeof setTimeout> | null = null;

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

function getQueueCountSafe(): number {
  try {
    return getOfflineQueueCount();
  } catch {
    return 0;
  }
}

function updateOfflineState() {
  const queued = getQueueCountSafe();
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    currentData = {
      ...currentData,
      status: "offline",
      pendingWrites: Math.max(currentData.pendingWrites, queued),
      lastError: queued > 0 ? `${queued} cambio(s) esperando conexión.` : currentData.lastError
    };
    notify();
    return true;
  }
  return false;
}

export async function fetchServerSyncStatus(): Promise<SyncStatusData> {
  if (updateOfflineState()) return currentData;

  try {
    const res = await fetch("/api/sync-status");
    if (!res.ok) throw new Error("Error fetching status");
    const data = await res.json();
    const queued = getQueueCountSafe();

    const serverStatus: SyncStatusState = (data.status === "quota_exceeded" || data.isQuotaExhausted)
      ? "quota_exceeded"
      : data.status === "error"
        ? "error"
        : (data.pendingWrites > 0 || activeMutations > 0 || queued > 0)
          ? "syncing"
          : "synced";

    currentData = {
      status: serverStatus,
      lastSyncTime: data.lastSuccessfulSyncTime || currentData.lastSyncTime,
      lastError: data.lastSyncError || (queued > 0 ? `${queued} cambio(s) en cola.` : null),
      pendingWrites: Math.max(data.pendingWrites || 0, activeMutations, queued)
    };
    notify();
    return currentData;
  } catch (err) {
    const queued = getQueueCountSafe();
    if (queued > 0) {
      currentData = {
        ...currentData,
        status: "offline",
        pendingWrites: queued,
        lastError: `${queued} cambio(s) pendiente(s) de sincronización.`
      };
      notify();
    }
    return currentData;
  }
}

export function initSyncStatusMonitor() {
  if (isInitialized || typeof window === "undefined") return;
  isInitialized = true;

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
        return await originalFetch.apply(this, [input, init] as any);
      } finally {
        if (isApiMutation) {
          activeMutations = Math.max(0, activeMutations - 1);
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

  const handleQueueEvent = () => {
    const queued = getQueueCountSafe();
    currentData = {
      ...currentData,
      status: queued > 0 ? "syncing" : (navigator.onLine ? currentData.status : "offline"),
      pendingWrites: queued,
      lastError: queued > 0 ? `${queued} cambio(s) pendiente(s) de sincronización.` : currentData.lastError
    };
    notify();
    if (navigator.onLine && queued === 0) fetchServerSyncStatus();
  };

  window.addEventListener("online", handleQueueEvent);
  window.addEventListener("offline", handleQueueEvent);
  window.addEventListener("astrohogar:offline-queue", handleQueueEvent as EventListener);
  window.addEventListener("astrohogar:mutation-queued", handleQueueEvent as EventListener);
  window.addEventListener("astrohogar:data-sync", handleQueueEvent as EventListener);

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
