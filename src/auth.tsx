import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
}

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }) => void;
      prompt: () => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

const AUTH_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GIS_SCRIPT_ID = "google-identity-services";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function clearStaleHouseholdSession() {
  try {
    localStorage.removeItem("astro_home_code");
    localStorage.removeItem("astro_user_id");
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith("astro_mobile_nav_items_")) localStorage.removeItem(key);
    }
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

async function detectHomeForAccount(currentUser: User): Promise<string | null> {
  try {
    const idToken = await currentUser.getIdToken();
    const response = await fetch("/api/onboarding/detect-home", {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
    if (!response.ok) {
      console.warn("[AstroHogar] No se pudo detectar el hogar de la cuenta:", response.status);
      return null;
    }
    const payload = await response.json().catch(() => ({}));
    return typeof payload.homeCode === "string" && payload.homeCode.trim()
      ? payload.homeCode.trim().toUpperCase()
      : null;
  } catch (error) {
    console.warn("[AstroHogar] Error detectando hogar por cuenta:", error);
    return null;
  }
}

function loadGoogleIdentityServices(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Google Identity Services solo puede ejecutarse en el navegador."));
  if (window.google?.accounts?.id) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(GIS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar Google Identity Services.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GIS_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Google Identity Services."));
    document.head.appendChild(script);
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(true);

      if (currentUser) {
        localStorage.setItem("astro_auth_uid", currentUser.uid);
        if (currentUser.email) localStorage.setItem("astro_auth_email", currentUser.email);
        if (currentUser.displayName) localStorage.setItem("astro_auth_name", currentUser.displayName);
        if (currentUser.photoURL) localStorage.setItem("astro_auth_photo", currentUser.photoURL);

        try {
          const idToken = await currentUser.getIdToken();
          localStorage.setItem("astro_auth_id_token", idToken);
        } catch (error) {
          console.warn("[Firebase Auth] No se pudo obtener el ID token:", error);
        }

        const detectedHome = await detectHomeForAccount(currentUser);
        if (detectedHome) {
          localStorage.setItem("astro_home_code", detectedHome);
        } else {
          clearStaleHouseholdSession();
        }
      } else {
        localStorage.removeItem("astro_auth_uid");
        localStorage.removeItem("astro_auth_email");
        localStorage.removeItem("astro_auth_name");
        localStorage.removeItem("astro_auth_photo");
        localStorage.removeItem("astro_auth_id_token");
        clearStaleHouseholdSession();
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const previousFetch = window.fetch.bind(window);
    const authenticatedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      if (!auth.currentUser) return previousFetch(input, init);

      try {
        const idToken = await auth.currentUser.getIdToken();
        localStorage.setItem("astro_auth_id_token", idToken);
        const headers = new Headers(input instanceof Request ? input.headers : init?.headers);
        headers.set("Authorization", `Bearer ${idToken}`);
        return previousFetch(input, { ...(init || {}), headers });
      } catch (error) {
        console.warn("[Firebase Auth] No se pudo adjuntar el ID token; continuando sin él:", error);
        return previousFetch(input, init);
      }
    };

    (window as any).__astroAuthFetchInstalled = true;
    window.fetch = authenticatedFetch;

    return () => {
      if ((window as any).__astroAuthFetchInstalled) {
        window.fetch = previousFetch;
        delete (window as any).__astroAuthFetchInstalled;
      }
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    signInWithGoogle: async () => {
      if (!AUTH_CLIENT_ID) throw new Error("Falta configurar VITE_GOOGLE_CLIENT_ID en el entorno de la aplicación.");
      await loadGoogleIdentityServices();

      return new Promise<User>((resolve, reject) => {
        let settled = false;
        const finish = (action: () => void) => {
          if (settled) return;
          settled = true;
          action();
        };

        window.google!.accounts.id.initialize({
          client_id: AUTH_CLIENT_ID,
          callback: async ({ credential }) => {
            try {
              const firebaseCredential = GoogleAuthProvider.credential(credential);
              const result = await signInWithCredential(auth, firebaseCredential);
              finish(() => resolve(result.user));
            } catch (error) {
              finish(() => reject(error));
            }
          },
          cancel_on_tap_outside: true,
        });

        window.google!.accounts.id.prompt();
      });
    },
    logout: () => signOut(auth),
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}
