import React, { Component, StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { startOfflineSync } from './offlineInit';
import { enqueueMutation, flushOfflineQueue } from './offlineQueue';
import { AuthProvider, useAuth } from './auth';
import GoogleLogin from './components/GoogleLogin';
import { auth } from './firebase';

const HOME_SNAPSHOT_PREFIX = "astrohogar_home_snapshot_v1:";
const LEGACY_HOME_CODES = new Set(["HOGARPELUDO", "HOGAR-PELUDO", "NIDO-HOGARPELUDO", "NIDO-YCV5W"]);

function getHomeSnapshotKey(): string {
  if (typeof window === "undefined") return `${HOME_SNAPSHOT_PREFIX}unknown`;
  return `${HOME_SNAPSHOT_PREFIX}${localStorage.getItem("astro_home_code") || "default"}`;
}

function saveHomeSnapshot(response: Response) {
  response.clone().json().then((data) => {
    try {
      localStorage.setItem(getHomeSnapshotKey(), JSON.stringify({ savedAt: new Date().toISOString(), data }));
      window.dispatchEvent(new CustomEvent("astrohogar:home-snapshot-updated"));
    } catch {}
  }).catch(() => {});
}

function getCachedHomeSnapshot(): Response | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getHomeSnapshotKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data) return null;
    return new Response(JSON.stringify(parsed.data), { status: 200, headers: { "Content-Type": "application/json", "X-AstroHogar-Cache": "last-confirmed-snapshot", "X-AstroHogar-Cached-At": parsed.savedAt || "" } });
  } catch {
    return null;
  }
}

function clearNewOnboardingSession() {
  try {
    const currentCode = localStorage.getItem("astro_home_code") || "";
    localStorage.removeItem("astro_home_code");
    localStorage.removeItem("astro_user_id");
    localStorage.removeItem("astro_auth_email");
    if (currentCode) localStorage.removeItem(`${HOME_SNAPSHOT_PREFIX}${currentCode}`);
    localStorage.removeItem(`${HOME_SNAPSHOT_PREFIX}default`);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith("astro_mobile_nav_items_")) localStorage.removeItem(key);
    }
  } catch {}
}

async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

function NotificationButton() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;
  });

  if (permission === "granted" || permission === "unsupported") return null;

  const enable = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") {
      try {
        const registration = await navigator.serviceWorker.ready;
        registration.active?.postMessage({
          type: "SHOW_PUSH_NOTIFICATION",
          title: "¡Notificaciones activadas! 🔔",
          body: "AstroHogar podrá avisarte de eventos y recordatorios importantes.",
          tag: "astrohogar-notifications-enabled"
        });
      } catch {}
    }
  };

  return (
    <button
      type="button"
      onClick={enable}
      className="rounded-full px-3 py-1.5 text-[10px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200"
      title="Activar notificaciones"
    >
      🔔 Activar avisos
    </button>
  );
}

class AppErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[AstroHogar] React render error:", error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
          <div className="text-4xl mb-3">🐾</div>
          <h1 className="text-xl font-black mb-2">AstroHogar encontró un error</h1>
          <p className="text-sm text-white/70 mb-4">La aplicación no debería mostrar una pantalla blanca. Este es el error real:</p>
          <pre className="whitespace-pre-wrap break-words rounded-2xl bg-black/30 p-4 text-xs text-rose-200 overflow-auto max-h-48">{error.message || String(error)}</pre>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => window.location.reload()} className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-900">Recargar</button>
            <button type="button" onClick={() => { try { localStorage.clear(); } catch {} window.location.reload(); }} className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-black">Limpiar sesión y recargar</button>
          </div>
        </div>
      </div>
    );
  }
}

function AuthGate() {
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (user?.uid) localStorage.setItem("astro_auth_uid", user.uid);
    if (user?.email) localStorage.setItem("astro_auth_email", user.email);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-2xl bg-white/10 flex items-center justify-center text-2xl">🏡</div>
          <p className="text-sm text-white/65">Preparando tu nido...</p>
        </div>
      </div>
    );
  }

  if (!user) return <GoogleLogin />;

  return (
    <div className="min-h-screen">
      <div className="fixed right-4 top-4 z-[100] flex items-center gap-2 rounded-full border border-white/20 bg-white/90 px-2 py-1.5 shadow-sm backdrop-blur-md">
        {user.photoURL && <img src={user.photoURL} alt="" className="h-7 w-7 rounded-full" />}
        <span className="hidden max-w-[180px] truncate text-[11px] font-bold text-slate-700 sm:block">{user.email}</span>
        <NotificationButton />
        <button type="button" onClick={() => logout().then(() => { try { localStorage.removeItem("astro_auth_uid"); localStorage.removeItem("astro_auth_email"); } catch {} }).catch(() => {})} className="rounded-full px-2 py-1 text-[10px] font-black text-slate-500 hover:bg-slate-100 hover:text-slate-900">Salir</button>
      </div>
      <App />
    </div>
  );
}

if (typeof window !== "undefined") {
  const originalFetch = window.fetch.bind(window);
  (window as any).__astroOriginalFetch = originalFetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : null;
    const url = request ? request.url : String(input);
    const method = (init?.method || request?.method || "GET").toUpperCase();
    const isApiRequest = url.includes("/api/");
    const isApiMutation = isApiRequest && !["GET", "HEAD", "OPTIONS"].includes(method);
    const isHomeDataRead = url.includes("/api/home-data") && method === "GET";
    const isCreateOnboarding = url.includes("/api/onboarding/create-home") && method === "POST";
    const isJoinOnboarding = url.includes("/api/onboarding/join-home") && method === "POST";

    if (!isApiRequest) return originalFetch(input, init);

    let code = localStorage.getItem("astro_home_code") || "";
    if (LEGACY_HOME_CODES.has(code.toUpperCase().trim())) {
      clearNewOnboardingSession();
      code = "";
    }

    const uid = localStorage.getItem("astro_user_id") || "";
    const authUid = localStorage.getItem("astro_auth_uid") || "";
    const firebaseUser = auth.currentUser;
    const authEmail = firebaseUser?.email || localStorage.getItem("astro_auth_email") || "";
    if (firebaseUser?.email) localStorage.setItem("astro_auth_email", firebaseUser.email);

    const canQueue = Boolean(code);
    const headers = new Headers(request ? request.headers : init?.headers);
    if (code && !isCreateOnboarding && !isJoinOnboarding) headers.set("x-home-code", code);
    if (uid) headers.set("x-user-id", uid);
    if (authUid) headers.set("x-auth-uid", authUid);
    if (authEmail) headers.set("x-auth-email", authEmail);

    try {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        if (idToken) headers.set("Authorization", `Bearer ${idToken}`);
      }
    } catch (error) {
      console.warn("[AstroHogar Auth] No se pudo obtener el ID token para la petición.", error);
    }

    let body: BodyInit | null | undefined = init?.body;
    if (request && body === undefined && method !== "GET" && method !== "HEAD") {
      try { body = await request.clone().text(); } catch { body = undefined; }
    }

    if (isCreateOnboarding || isJoinOnboarding) {
      try {
        const payload = typeof body === "string" ? JSON.parse(body) : {};
        if (authEmail) payload.email = authEmail;
        delete payload.authEmail;
        body = JSON.stringify(payload);
        headers.set("content-type", "application/json");
      } catch {}
    }

    try {
      if (isApiMutation && !navigator.onLine && canQueue) {
        const queued = typeof body === "string" || body === undefined
          ? enqueueMutation({ url, method, headers: Object.fromEntries(headers.entries()), body: typeof body === "string" ? body : undefined })
          : false;
        if (queued) {
          window.dispatchEvent(new CustomEvent("astrohogar:mutation-queued"));
          throw new TypeError("OFFLINE_MUTATION_QUEUED");
        }
      }

      const response = await originalFetch(input, { ...(init || {}), method, headers, body });
      if (isHomeDataRead && response.ok) saveHomeSnapshot(response);
      return response;
    } catch (error: any) {
      const message = String(error?.message || "");
      const networkFailure = error instanceof TypeError && !message.includes("OFFLINE_MUTATION_QUEUED");
      if (isApiMutation && networkFailure && canQueue) {
        const queued = typeof body === "string" || body === undefined
          ? enqueueMutation({ url, method, headers: Object.fromEntries(headers.entries()), body: typeof body === "string" ? body : undefined })
          : false;
        if (queued) window.dispatchEvent(new CustomEvent("astrohogar:mutation-queued"));
      }
      if (isHomeDataRead) {
        const cached = getCachedHomeSnapshot();
        if (cached) return cached;
      }
      if (message.includes("OFFLINE_MUTATION_QUEUED")) throw new TypeError("OFFLINE_MUTATION_QUEUED");
      throw error;
    }
  };

  window.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest("button");
    if (button?.textContent?.toLowerCase().includes("fundar mi nido")) clearNewOnboardingSession();
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason ? String(event.reason) : "";
    if (reason.includes("WebSocket") || reason.includes("vite")) { event.preventDefault(); event.stopPropagation(); }
  });

  window.addEventListener("error", (event) => {
    const message = event.message ? String(event.message) : "";
    if (message.includes("WebSocket") || message.includes("vite")) { event.preventDefault(); event.stopPropagation(); }
  });

  startOfflineSync();
  window.addEventListener("online", () => { flushOfflineQueue().catch(() => {}); });
}

if (typeof window !== "undefined" && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => console.log('[Service Worker] Registration successful with scope: ', reg.scope),
      (err) => console.warn('[Service Worker] Registration failed: ', err),
    );
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
