import {StrictMode, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { startOfflineSync } from './offlineInit';
import { enqueueMutation, flushOfflineQueue } from './offlineQueue';
import { AuthProvider, useAuth } from './auth';
import GoogleLogin from './components/GoogleLogin';
import { auth } from './firebase';

const HOME_SNAPSHOT_PREFIX = "astrohogar_home_snapshot_v1:";

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

function AuthGate() {
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (user?.uid) localStorage.setItem("astro_auth_uid", user.uid);
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
        <button type="button" onClick={() => logout().catch(() => {})} className="rounded-full px-2 py-1 text-[10px] font-black text-slate-500 hover:bg-slate-100 hover:text-slate-900">Salir</button>
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

    if (!isApiRequest) {
      return originalFetch(input, init);
    }

    const code = localStorage.getItem("astro_home_code") || "";
    const uid = localStorage.getItem("astro_user_id") || "";
    const authUid = localStorage.getItem("astro_auth_uid") || "";
    const authEmail = localStorage.getItem("astro_auth_email") || "";
    const canQueue = Boolean(code);
    const headers = new Headers(request ? request.headers : init?.headers);
    if (code) headers.set("x-home-code", code);
    if (uid) headers.set("x-user-id", uid);
    if (authUid) headers.set("x-auth-uid", authUid);
    if (authEmail) headers.set("x-auth-email", authEmail);

    try {
      const firebaseUser = auth.currentUser;
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
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  </StrictMode>,
);
