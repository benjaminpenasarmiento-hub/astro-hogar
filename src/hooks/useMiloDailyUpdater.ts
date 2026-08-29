import { useState, useEffect, useCallback, useRef } from "react";
import {
  MiloHomeContextState,
  initializeMiloHomeContext,
  getMiloDailyStatus,
  updateMiloDailyContext
} from "../api";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface UseMiloDailyUpdaterResult {
  miloContextState: MiloHomeContextState | null;
  isChecking: boolean;
  isUpdating: boolean;
  updatedToday: boolean;
  lastUpdated: string | null;
  greeting: string | null;
  error: string | null;
  triggerManualUpdate: () => Promise<MiloHomeContextState | null>;
}

function getTodayDateStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getLocalTimeOfDay(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

export function useMiloDailyUpdater(): UseMiloDailyUpdaterResult {
  const [miloContextState, setMiloContextState] = useState<MiloHomeContextState | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatedToday, setUpdatedToday] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const updateInFlightRef = useRef(false);

  const performDailyUpdate = useCallback(async (force = false): Promise<MiloHomeContextState | null> => {
    if (updateInFlightRef.current) return null;
    updateInFlightRef.current = true;
    setIsUpdating(true);
    setError(null);
    const todayStr = getTodayDateStr();

    try {
      const res = await updateMiloDailyContext(force);
      let updatedData: MiloHomeContextState | null = res?.data || null;
      if (!updatedData) updatedData = await initializeMiloHomeContext(true);

      if (updatedData) {
        setMiloContextState(updatedData);
        setUpdatedToday(true);
        setLastUpdated(updatedData.lastUpdated || new Date().toISOString());
        try {
          localStorage.setItem("milo_daily_update_date", todayStr);
          localStorage.setItem("milo_daily_update_data", JSON.stringify(updatedData));
          localStorage.setItem("milo_daily_update_period", getLocalTimeOfDay());
        } catch {}

        try {
          if (db) {
            await setDoc(doc(db, "milo_daily_updates", todayStr), {
              date: todayStr,
              dailyGreeting: updatedData.dailyGreeting,
              weather: updatedData.weather,
              moon: updatedData.moon,
              briefing: updatedData.briefing,
              harmonyScore: updatedData.harmonyScore,
              lastUpdated: updatedData.lastUpdated || new Date().toISOString(),
              timeOfDay: updatedData.timeOfDay,
              updatedBy: "Milo AI (Gemini)"
            }, { merge: true });
          }
        } catch (fsError) {
          console.warn("Error guardando actualización de Milo en Firestore:", fsError);
        }
        return updatedData;
      }
    } catch (err: any) {
      console.error("Error al actualizar contexto diario con Milo:", err);
      setError("No se pudo actualizar el contexto diario con Milo.");
    } finally {
      updateInFlightRef.current = false;
      setIsUpdating(false);
    }
    return null;
  }, []);

  const checkAndAutoUpdate = useCallback(async () => {
    setIsChecking(true);
    const todayStr = getTodayDateStr();
    const currentPeriod = getLocalTimeOfDay();

    try {
      const savedDate = localStorage.getItem("milo_daily_update_date");
      const savedDataRaw = localStorage.getItem("milo_daily_update_data");
      const savedPeriod = localStorage.getItem("milo_daily_update_period");
      const serverStatus = await getMiloDailyStatus().catch(() => null);
      const serverState = serverStatus?.lastUpdate as MiloHomeContextState | null;

      let firestoreData: any = null;
      try {
        if (db) {
          const docSnap = await getDoc(doc(db, "milo_daily_updates", todayStr));
          if (docSnap.exists()) firestoreData = docSnap.data();
        }
      } catch {}

      const candidate = serverState || firestoreData || (savedDataRaw ? (() => { try { return JSON.parse(savedDataRaw); } catch { return null; } })() : null);
      const storedPeriod = savedPeriod || candidate?.timeOfDay || null;
      const needsPeriodRefresh = storedPeriod !== currentPeriod;
      const hasTodayData = savedDate === todayStr || serverStatus?.updatedToday || !!firestoreData;

      if (hasTodayData && candidate && !needsPeriodRefresh) {
        setMiloContextState(candidate);
        setUpdatedToday(true);
        setLastUpdated(candidate.lastUpdated || new Date().toISOString());
      } else {
        setUpdatedToday(false);
        await performDailyUpdate(true);
      }
    } catch (err) {
      console.error("Error comprobando estado de Milo:", err);
      const fallback = await initializeMiloHomeContext(true);
      setMiloContextState(fallback);
      setLastUpdated(fallback?.lastUpdated || new Date().toISOString());
    } finally {
      setIsChecking(false);
    }
  }, [performDailyUpdate]);

  useEffect(() => {
    let mounted = true;
    const run = () => { if (mounted) checkAndAutoUpdate(); };
    run();

    const timer = window.setInterval(run, 15 * 60 * 1000);
    const handleVisibility = () => { if (document.visibilityState === "visible") run(); };
    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mounted = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", run);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [checkAndAutoUpdate]);

  return {
    miloContextState,
    isChecking,
    isUpdating,
    updatedToday,
    lastUpdated,
    greeting: miloContextState?.dailyGreeting || null,
    error,
    triggerManualUpdate: () => performDailyUpdate(true)
  };
}
