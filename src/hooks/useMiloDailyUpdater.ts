import { useState, useEffect, useCallback } from "react";
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

export function useMiloDailyUpdater(): UseMiloDailyUpdaterResult {
  const [miloContextState, setMiloContextState] = useState<MiloHomeContextState | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updatedToday, setUpdatedToday] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getTodayDateStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const performDailyUpdate = useCallback(async (force = false): Promise<MiloHomeContextState | null> => {
    setIsUpdating(true);
    setError(null);
    const todayStr = getTodayDateStr();

    try {
      // 1. Invoke Gemini API endpoint to refresh weather, moon phases, events, and welcome message
      const res = await updateMiloDailyContext(force);
      let updatedData: MiloHomeContextState | null = null;

      if (res && res.data) {
        updatedData = res.data;
      } else {
        // Fallback to init-home-state if post fails
        updatedData = await initializeMiloHomeContext(true);
      }

      if (updatedData) {
        setMiloContextState(updatedData);
        setUpdatedToday(true);
        setLastUpdated(updatedData.lastUpdated || new Date().toISOString());

        // 2. Save marker and context in localStorage
        try {
          localStorage.setItem("milo_daily_update_date", todayStr);
          localStorage.setItem("milo_daily_update_data", JSON.stringify(updatedData));
        } catch {}

        // 3. Save new welcome message and context into Firestore database
        try {
          if (db) {
            const docRef = doc(db, "milo_daily_updates", todayStr);
            await setDoc(docRef, {
              date: todayStr,
              dailyGreeting: updatedData.dailyGreeting,
              weather: updatedData.weather,
              moon: updatedData.moon,
              briefing: updatedData.briefing,
              harmonyScore: updatedData.harmonyScore,
              lastUpdated: updatedData.lastUpdated || new Date().toISOString(),
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
      setIsUpdating(false);
    }
    return null;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function checkAndAutoUpdate() {
      setIsChecking(true);
      const todayStr = getTodayDateStr();

      try {
        // A. Check local storage
        const savedDate = localStorage.getItem("milo_daily_update_date");
        const savedDataRaw = localStorage.getItem("milo_daily_update_data");

        // B. Check server status
        const serverStatus = await getMiloDailyStatus().catch(() => null);

        const isUpdatedOnServer = serverStatus?.updatedToday && serverStatus?.todayDate === todayStr;
        const isUpdatedLocally = savedDate === todayStr && !!savedDataRaw;

        // C. Check Firestore database
        let isUpdatedInFirestore = false;
        let firestoreData: any = null;
        try {
          if (db) {
            const docSnap = await getDoc(doc(db, "milo_daily_updates", todayStr));
            if (docSnap.exists()) {
              isUpdatedInFirestore = true;
              firestoreData = docSnap.data();
            }
          }
        } catch {}

        const hasBeenUpdatedToday = isUpdatedOnServer || isUpdatedLocally || isUpdatedInFirestore;

        if (hasBeenUpdatedToday) {
          // Already updated today! Load existing saved context
          let existingState: MiloHomeContextState | null = null;

          if (serverStatus?.lastUpdate) {
            existingState = serverStatus.lastUpdate;
          } else if (firestoreData) {
            existingState = firestoreData;
          } else if (savedDataRaw) {
            try {
              existingState = JSON.parse(savedDataRaw);
            } catch {}
          }

          if (!existingState) {
            existingState = await initializeMiloHomeContext(false);
          }

          if (mounted) {
            setMiloContextState(existingState);
            setUpdatedToday(true);
            setLastUpdated(existingState?.lastUpdated || new Date().toISOString());
            setIsChecking(false);
          }
        } else {
          // NOT updated today! Trigger Gemini API update to process context & save welcome message
          if (mounted) {
            setUpdatedToday(false);
            setIsChecking(false);
            await performDailyUpdate(true);
          }
        }
      } catch (err) {
        console.error("Error comprobando estado de Milo:", err);
        const fallback = await initializeMiloHomeContext(false);
        if (mounted) {
          setMiloContextState(fallback);
          setIsChecking(false);
        }
      }
    }

    checkAndAutoUpdate();

    return () => {
      mounted = false;
    };
  }, [performDailyUpdate]);

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
