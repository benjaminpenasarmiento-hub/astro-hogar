const QUEUE_KEY = "astrohogar_offline_mutations_v1";
const MAX_BODY_BYTES = 180_000;

export interface QueuedMutation {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

function readQueue(): QueuedMutation[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedMutation[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getOfflineQueueCount(): number {
  if (typeof window === "undefined") return 0;
  return readQueue().length;
}

export function enqueueMutation(input: Omit<QueuedMutation, "id" | "createdAt" | "attempts">): boolean {
  if (typeof window === "undefined") return false;
  if (input.body && new Blob([input.body]).size > MAX_BODY_BYTES) return false;

  const queue = readQueue();
  queue.push({
    ...input,
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  writeQueue(queue);
  window.dispatchEvent(new CustomEvent("astrohogar:offline-queue", { detail: { count: queue.length } }));
  return true;
}

export async function flushOfflineQueue(): Promise<{ flushed: number; remaining: number }> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { flushed: 0, remaining: getOfflineQueueCount() };
  }

  let queue = readQueue();
  let flushed = 0;

  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });

      if (!response.ok) {
        item.attempts += 1;
        item.lastError = `HTTP ${response.status}`;
        continue;
      }

      queue = queue.filter(q => q.id !== item.id);
      flushed += 1;
      writeQueue(queue);
    } catch (error: any) {
      item.attempts += 1;
      item.lastError = error?.message || "Network error";
      writeQueue(queue);
      break;
    }
  }

  window.dispatchEvent(new CustomEvent("astrohogar:offline-queue", { detail: { count: queue.length, flushed } }));
  if (flushed > 0) {
    window.dispatchEvent(new CustomEvent("astrohogar:data-sync", { detail: { flushed } }));
  }
  return { flushed, remaining: queue.length };
}

export function initializeOfflineQueue() {
  if (typeof window === "undefined") return;

  const run = () => {
    if (navigator.onLine) {
      flushOfflineQueue().catch(() => {});
    }
  };

  window.addEventListener("online", run);
  window.setInterval(run, 30_000);
  run();
}
