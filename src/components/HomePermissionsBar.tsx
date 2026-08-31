import React, { useEffect, useState } from "react";
import { Bell, LocateFixed, CheckCircle2 } from "lucide-react";
import { updateUserProfile } from "../api";
import { UserProfile } from "../types";

interface Props {
  activeUser: UserProfile | null | undefined;
  onRefreshAll?: () => void;
}

export default function HomePermissionsBar({ activeUser, onRefreshAll }: Props) {
  const [location, setLocation] = useState<PermissionState | "unsupported">("prompt");
  const [notifications, setNotifications] = useState<NotificationPermission | "unsupported">("default");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) setNotifications("unsupported");
    else setNotifications(Notification.permission);
    navigator.permissions?.query({ name: "geolocation" as PermissionName }).then(p => {
      setLocation(p.state);
      p.onchange = () => setLocation(p.state);
    }).catch(() => setLocation("prompt"));
  }, []);

  async function saveEnvironment(next: any) {
    if (!activeUser) return;
    await updateUserProfile(activeUser.id, {
      name: activeUser.name,
      birthDate: activeUser.birthDate,
      birthTime: activeUser.birthTime || "12:00",
      birthPlace: activeUser.birthPlace || "",
      emoji: activeUser.emoji || "👤",
      pushToken: activeUser.pushToken,
      alertPreferences: activeUser.alertPreferences,
      environment: { ...(activeUser.environment || {}), ...next }
    } as any);
    onRefreshAll?.();
  }

  async function requestLocation() {
    if (!("geolocation" in navigator) || !activeUser) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async pos => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      await saveEnvironment({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy || null,
        timezone,
        label: "Ubicación actual",
        capturedAt: new Date().toISOString()
      });
      setLocation("granted");
      setBusy(false);
    }, () => {
      setLocation("denied");
      setBusy(false);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 5 * 60 * 1000 });
  }

  async function requestNotifications() {
    if (!("Notification" in window) || !activeUser) return;
    const permission = await Notification.requestPermission();
    setNotifications(permission);
    await saveEnvironment({ notificationPermission: permission, notificationsEnabled: permission === "granted" });
  }

  if (!activeUser) return null;
  if (location === "granted" && (notifications === "granted" || notifications === "unsupported")) {
    return <div className="flex items-center gap-2 text-[9px] text-emerald-700 pt-1"><CheckCircle2 size={11}/> Entorno sincronizado con Milo</div>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {location !== "granted" && <button type="button" onClick={requestLocation} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-black text-amber-900 disabled:opacity-50"><LocateFixed size={12}/>{busy ? "Buscando…" : "Activar ubicación"}</button>}
      {notifications !== "granted" && notifications !== "unsupported" && <button type="button" onClick={requestNotifications} className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[10px] font-black text-sky-900"><Bell size={12}/> Activar notificaciones</button>}
    </div>
  );
}
