import React, { useEffect, useMemo, useState } from "react";
import { Bell, CloudRain, Clock3, Compass, LocateFixed, MapPin, Moon, RefreshCw, Sun } from "lucide-react";
import { Home, UserProfile } from "../types";
import { calculateSolarTimes } from "../utils/solarCalculator";
import { updateHomeSettings, updateUserProfile } from "../api";

interface Props {
  home: Home;
  users: UserProfile[];
  activeUserId?: string;
  onRefreshAll?: () => void;
}

const weatherText: Record<number, { label: string; icon: string }> = {
  0: { label: "Despejado", icon: "☀️" }, 1: { label: "Mayormente despejado", icon: "🌤️" }, 2: { label: "Parcialmente nublado", icon: "⛅" }, 3: { label: "Nublado", icon: "☁️" },
  45: { label: "Niebla", icon: "🌫️" }, 48: { label: "Niebla", icon: "🌫️" }, 51: { label: "Llovizna", icon: "🌦️" }, 53: { label: "Llovizna", icon: "🌦️" }, 55: { label: "Llovizna", icon: "🌧️" },
  61: { label: "Lluvia", icon: "🌧️" }, 63: { label: "Lluvia", icon: "🌧️" }, 65: { label: "Lluvia fuerte", icon: "🌧️" }, 71: { label: "Nieve", icon: "🌨️" }, 73: { label: "Nieve", icon: "🌨️" }, 75: { label: "Nieve fuerte", icon: "❄️" },
  80: { label: "Chubascos", icon: "🌦️" }, 81: { label: "Chubascos", icon: "🌧️" }, 82: { label: "Chubascos fuertes", icon: "⛈️" }, 95: { label: "Tormenta", icon: "⛈️" }, 96: { label: "Tormenta", icon: "⛈️" }, 99: { label: "Tormenta", icon: "⛈️" }
};

function moonPhase(date: Date) {
  const synodic = 29.530588853;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const age = ((date.getTime() - knownNewMoon) / 86400000) % synodic;
  const normalizedAge = age < 0 ? age + synodic : age;
  const illumination = Math.round((1 - Math.cos((normalizedAge / synodic) * Math.PI * 2)) / 2 * 100);
  const names = [
    [1.85, "Luna nueva 🌑"], [5.53, "Creciente 🌒"], [9.22, "Cuarto creciente 🌓"], [12.91, "Gibosa creciente 🌔"],
    [16.61, "Luna llena 🌕"], [20.30, "Gibosa menguante 🌖"], [23.99, "Cuarto menguante 🌗"], [27.68, "Menguante 🌘"], [29.54, "Luna nueva 🌑"]
  ] as const;
  const label = names.find(([limit]) => normalizedAge < limit)?.[1] || "Luna nueva 🌑";
  return { age: Number(normalizedAge.toFixed(1)), illumination, label };
}

export default function HomeEnvironmentStrip({ home, users, activeUserId, onRefreshAll }: Props) {
  const currentUser = users.find(u => u.id === activeUserId) || users[0];
  const [locationStatus, setLocationStatus] = useState<"unknown" | "granted" | "denied">("unknown");
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | "unsupported">("default");
  const [locationName, setLocationName] = useState("Ubicación del hogar");
  const [environment, setEnvironment] = useState<any>(currentUser?.environment || null);
  const [weather, setWeather] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());

  const coords = environment?.latitude && environment?.longitude
    ? { latitude: Number(environment.latitude), longitude: Number(environment.longitude) }
    : null;

  const solar = useMemo(() => calculateSolarTimes(now, coords?.latitude || 4.711, coords?.longitude || -74.0721, -5), [now, coords?.latitude, coords?.longitude]);
  const moon = useMemo(() => moonPhase(now), [now]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) setNotificationStatus("unsupported");
    else setNotificationStatus(Notification.permission);

    navigator.permissions?.query({ name: "geolocation" as PermissionName }).then(permission => {
      setLocationStatus(permission.state === "granted" ? "granted" : permission.state === "denied" ? "denied" : "unknown");
      permission.onchange = () => setLocationStatus(permission.state === "granted" ? "granted" : permission.state === "denied" ? "denied" : "unknown");
    }).catch(() => {});

    const saved = currentUser?.environment;
    if (saved) {
      setEnvironment(saved);
      setLocationName(saved.label || "Ubicación guardada");
    }

    if (!saved?.latitude) requestLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  useEffect(() => {
    let cancelled = false;
    const loadWeather = async () => {
      const target = environment?.latitude && environment?.longitude
        ? { latitude: Number(environment.latitude), longitude: Number(environment.longitude) }
        : { latitude: 4.711, longitude: -74.0721 };
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${target.latitude}&longitude=${target.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto&forecast_days=1`;
        const response = await window.fetch(url);
        if (!response.ok) throw new Error("weather request failed");
        const data = await response.json();
        if (!cancelled) setWeather(data);
      } catch (error) {
        console.warn("No se pudo actualizar el clima:", error);
      }
    };
    loadWeather();
    const id = window.setInterval(loadWeather, 15 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [environment?.latitude, environment?.longitude]);

  async function persistLocation(latitude: number, longitude: number, accuracy?: number) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const next = { latitude, longitude, accuracy: accuracy || null, timezone, label: "Ubicación actual", capturedAt: new Date().toISOString() };
    setEnvironment(next);
    setLocationStatus("granted");
    try {
      const geoResponse = await window.fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`);
      if (geoResponse.ok) {
        const geo = await geoResponse.json();
        const label = [geo.locality, geo.principalSubdivision, geo.countryName].filter(Boolean).slice(0, 2).join(", ");
        if (label) {
          next.label = label;
          setLocationName(label);
        }
      }
    } catch {}

    if (!currentUser) return;
    try {
      await updateUserProfile(currentUser.id, {
        name: currentUser.name,
        birthDate: currentUser.birthDate,
        birthTime: currentUser.birthTime || "12:00",
        birthPlace: currentUser.birthPlace || "",
        emoji: currentUser.emoji || "👤",
        pushToken: currentUser.pushToken,
        alertPreferences: currentUser.alertPreferences,
        environment: next
      } as any);
      setEnvironment(next);
      onRefreshAll?.();
    } catch (error) {
      console.warn("No se pudo sincronizar la ubicación con el perfil:", error);
    }
  }

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setLocationStatus("denied");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        persistLocation(position.coords.latitude, position.coords.longitude, position.coords.accuracy).finally(() => setBusy(false));
      },
      () => {
        setLocationStatus("denied");
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5 * 60 * 1000 }
    );
  }

  async function requestNotifications() {
    if (!("Notification" in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);
      if (currentUser) {
        await updateUserProfile(currentUser.id, {
          name: currentUser.name,
          birthDate: currentUser.birthDate,
          birthTime: currentUser.birthTime || "12:00",
          birthPlace: currentUser.birthPlace || "",
          emoji: currentUser.emoji || "👤",
          pushToken: currentUser.pushToken,
          alertPreferences: currentUser.alertPreferences,
          environment: { ...(currentUser.environment || environment || {}), notificationPermission: permission, notificationsEnabled: permission === "granted" }
        } as any);
      }
      onRefreshAll?.();
    } catch (error) {
      console.warn("No se pudo solicitar permisos de notificaciones:", error);
    }
  }

  const weatherCurrent = weather?.current;
  const code = Number(weatherCurrent?.weather_code);
  const wx = weatherText[code] || { label: "Clima actual", icon: "🌤️" };
  const timezone = environment?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const formattedDate = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: timezone }).format(now);
  const formattedTime = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(now);

  return (
    <section className="space-y-3">
      {(locationStatus !== "granted" || (notificationStatus !== "granted" && notificationStatus !== "unsupported")) && (
        <div className="rounded-3xl border-2 border-amber-200 bg-amber-50/90 p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-amber-900">🌍🐱 Conectemos a Milo con vuestro entorno</p>
              <p className="text-[11px] text-amber-800 mt-1">La ubicación mantiene clima, hora, amanecer, atardecer y contexto local actualizados. Las notificaciones permiten recordatorios del nido.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {locationStatus !== "granted" && <button type="button" onClick={requestLocation} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-amber-300 px-3 py-2 text-[11px] font-black text-amber-900 hover:bg-amber-100 disabled:opacity-50"><LocateFixed size={14}/>{busy ? "Buscando..." : "Permitir ubicación"}</button>}
              {notificationStatus !== "granted" && notificationStatus !== "unsupported" && <button type="button" onClick={requestNotifications} className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-amber-300 px-3 py-2 text-[11px] font-black text-amber-900 hover:bg-amber-100"><Bell size={14}/>Permitir notificaciones</button>}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-3xl border-2 border-[#E7E2D5] bg-white/95 p-4 sm:p-5 shadow-sm">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
          <div className="xl:col-span-2 rounded-2xl bg-[#FAF7F2] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-black text-[#8A817C]">📅 Hoy en el nido</p>
                <p className="text-base font-black text-[#2C2723] capitalize mt-1">{formattedDate}</p>
                <p className="text-2xl font-black text-[#2C2723] mt-1 flex items-center gap-2"><Clock3 size={20}/>{formattedTime}</p>
                <p className="text-[10px] text-[#625B57] mt-1">{locationName} · {timezone}</p>
              </div>
              <div className="text-4xl">🐾</div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <p className="text-[10px] uppercase tracking-wider font-black text-blue-700">🌦️ Clima ahora</p>
            <p className="text-xl font-black text-[#2C2723] mt-1">{weatherCurrent ? `${Math.round(weatherCurrent.temperature_2m)}°C` : "—"}</p>
            <p className="text-[11px] text-[#625B57]">{wx.icon} {wx.label}{weatherCurrent?.apparent_temperature != null ? ` · Sensación ${Math.round(weatherCurrent.apparent_temperature)}°C` : ""}</p>
            <p className="text-[10px] text-[#8A817C] mt-1"><CloudRain size={11} className="inline mr-1"/>Humedad {weatherCurrent?.relative_humidity_2m ?? "—"}%</p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
            <p className="text-[10px] uppercase tracking-wider font-black text-amber-700">☀️ Sol</p>
            <p className="text-[11px] font-black text-[#2C2723] mt-1">Sale {solar.sunrise}</p>
            <p className="text-[11px] font-black text-[#2C2723]">Se oculta {solar.sunset}</p>
            <p className="text-[10px] text-[#625B57] mt-1">{solar.statusText}</p>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
            <p className="text-[10px] uppercase tracking-wider font-black text-violet-700">{moon.label}</p>
            <p className="text-xl font-black text-[#2C2723] mt-1">{moon.illumination}%</p>
            <p className="text-[10px] text-[#625B57]">Iluminación lunar · edad {moon.age} días</p>
          </div>

          <button type="button" onClick={requestLocation} className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-left hover:bg-emerald-100/70 transition-colors">
            <p className="text-[10px] uppercase tracking-wider font-black text-emerald-700">📍 Sincronización</p>
            <p className="text-[11px] font-black text-[#2C2723] mt-1 flex items-center gap-1.5"><Compass size={13}/> {locationStatus === "granted" ? "Ubicación activa" : "Activar ubicación"}</p>
            <p className="text-[10px] text-[#625B57] mt-1">Actualiza el contexto local de Milo.</p>
            <RefreshCw size={13} className="mt-2 text-emerald-700"/>
          </button>
        </div>
      </div>
    </section>
  );
}
