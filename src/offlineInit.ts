import { initializeOfflineQueue } from "./offlineQueue";

let initialized = false;

export function startOfflineSync() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  initializeOfflineQueue();
}
