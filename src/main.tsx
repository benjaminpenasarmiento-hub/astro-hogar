import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { startOfflineSync } from './offlineInit';
import { enqueueMutation, flushOfflineQueue } from './offlineQueue';

// Install a resilient fetch layer before the application starts issuing API calls.
if (typeof window !== "undefined") {
  const originalFetch = window.fetch.bind(window);
  (window as any).__astroOriginalFetch = originalFetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : null;
    const url = request ? request.url : String(input);
    const method = (init?.method || request?.method || "GET").toUpperCase();
    const isApiMutation = url.includes("/api/") && !["GET", "HEAD", "OPTIONS"].includes(method);

    if (!isApiMutation) {
      return originalFetch(input, init);
    }

    const code = localStorage.getItem("astro_home_code") || "";
    const uid = localStorage.getItem("astro_user_id") || "";
    const canQueue = Boolean(code);
    const headers = new Headers(request ? request.headers : init?.headers);
    if (code) headers.set("x-home-code", code);
    if (uid) headers.set("x-user-id", uid);

    let body: BodyInit | null | undefined = init?.body;
    if (request && body === undefined && method !== "GET" && method !== "HEAD") {
      try { body = await request.clone().text(); } catch { body = undefined; }
    }

    let queuedOffline = false;

    try {
      if (!navigator.onLine && canQueue) {
        const queued = typeof body === "string" || body === undefined
          ? enqueueMutation({
              url,
              method,
              headers: Object.fromEntries(headers.entries()),
              body: typeof body === "string" ? body : undefined
            })
          : false;

        if (queued) {
          queuedOffline = true;
          window.dispatchEvent(new CustomEvent("astrohogar:mutation-queued"));
          throw new TypeError("OFFLINE_MUTATION_QUEUED");
        }
      }

      return await originalFetch(input, {
        ...(init || {}),
        method,
        headers,
        body,
      });
    } catch (error: any) {
      // Queue only genuine network failures. HTTP errors are left untouched so the
      // caller receives the actual backend response and we don't risk duplicates.
      const message = String(error?.message || "");
      const networkFailure = error instanceof TypeError && !message.includes("OFFLINE_MUTATION_QUEUED");

      if (networkFailure && canQueue) {
        const queued = typeof body === "string" || body === undefined
          ? enqueueMutation({
              url,
              method,
              headers: Object.fromEntries(headers.entries()),
              body: typeof body === "string" ? body : undefined
            })
          : false;
        if (queued) {
          window.dispatchEvent(new CustomEvent("astrohogar:mutation-queued"));
        }
      }

      if (queuedOffline) {
        throw new TypeError("OFFLINE_MUTATION_QUEUED");
      }
      throw error;
    }
  };

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason ? String(event.reason) : "";
    if (reason.includes("WebSocket") || reason.includes("vite")) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener("error", (event) => {
    const message = event.message ? String(event.message) : "";
    if (message.includes("WebSocket") || message.includes("vite")) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  startOfflineSync();
  window.addEventListener("online", () => {
    flushOfflineQueue().catch(() => {});
  });
}

// Register Service Worker for PWA features and push notification support
if (typeof window !== "undefined" && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => {
        console.log('[Service Worker] Registration successful with scope: ', reg.scope);
      },
      (err) => {
        console.warn('[Service Worker] Registration failed: ', err);
      }
    );
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
