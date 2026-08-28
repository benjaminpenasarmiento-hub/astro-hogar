import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { GoogleAuthProvider, User, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "./firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

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
      } else {
        localStorage.removeItem("astro_auth_uid");
        localStorage.removeItem("astro_auth_email");
        localStorage.removeItem("astro_auth_name");
        localStorage.removeItem("astro_auth_photo");
        localStorage.removeItem("astro_auth_id_token");
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const previousFetch = window.fetch.bind(window);
    const authenticatedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      if (!auth.currentUser) {
        return previousFetch(input, init);
      }

      try {
        const idToken = await auth.currentUser.getIdToken();
        localStorage.setItem("astro_auth_id_token", idToken);
        const headers = new Headers(input instanceof Request ? input.headers : init?.headers);
        headers.set("Authorization", `Bearer ${idToken}`);

        return previousFetch(input, {
          ...(init || {}),
          headers,
        });
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
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      return result.user;
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
