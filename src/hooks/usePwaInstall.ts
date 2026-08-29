import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEventLike = Event & {
  prompt: () => Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
};

const INSTALL_PROMPT_KEY = "__astroHogarInstallPrompt";
const INSTALLED_KEY = "astrohogar_pwa_installed";

function getPrompt() {
  if (typeof window === "undefined") return null;
  return ((window as any)[INSTALL_PROMPT_KEY] || null) as BeforeInstallPromptEventLike | null;
}

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || Boolean((navigator as any).standalone);
}

// Capture the event as soon as the module is loaded so a later-opened modal can still install.
if (typeof window !== "undefined" && !(window as any).__astroHogarInstallListener) {
  (window as any).__astroHogarInstallListener = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    (window as any)[INSTALL_PROMPT_KEY] = event;
    window.dispatchEvent(new CustomEvent("astro-install-available"));
  });
  window.addEventListener("appinstalled", () => {
    delete (window as any)[INSTALL_PROMPT_KEY];
    localStorage.setItem(INSTALLED_KEY, "1");
    window.dispatchEvent(new CustomEvent("astro-install-complete"));
  });
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEventLike | null>(getPrompt);
  const [isInstalled, setIsInstalled] = useState(() => isStandalone() || (typeof localStorage !== "undefined" && localStorage.getItem(INSTALLED_KEY) === "1"));
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDeferredPrompt(getPrompt());
    setIsInstalled(isStandalone() || localStorage.getItem(INSTALLED_KEY) === "1");
    setIsIos(isIosDevice());

    const syncPrompt = () => setDeferredPrompt(getPrompt());
    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };
    window.addEventListener("astro-install-available", syncPrompt);
    window.addEventListener("astro-install-complete", onInstalled);
    return () => {
      window.removeEventListener("astro-install-available", syncPrompt);
      window.removeEventListener("astro-install-complete", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    const prompt = deferredPrompt || getPrompt();
    if (!prompt) return { outcome: "unavailable" as const };
    try {
      const result = await prompt.prompt();
      delete (window as any)[INSTALL_PROMPT_KEY];
      setDeferredPrompt(null);
      if (result.outcome === "accepted") {
        localStorage.setItem(INSTALLED_KEY, "1");
        setIsInstalled(true);
      }
      return result;
    } catch {
      delete (window as any)[INSTALL_PROMPT_KEY];
      setDeferredPrompt(null);
      return { outcome: "error" as const };
    }
  }, [deferredPrompt]);

  return { canInstall: Boolean(deferredPrompt || getPrompt()), isInstalled, isIos, install };
}
