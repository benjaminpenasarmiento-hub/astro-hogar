import React, { useEffect, useMemo, useState } from "react";
import { Bell, CloudRain, Clock3, LocateFixed, MapPin, Moon, RefreshCw, Sun } from "lucide-react";
import { Home, UserProfile } from "../types";

interface Props {
  home: Home;
  users: UserProfile[];
  activeUserId?: string;
}

type WeatherPoint = {
  time: string;
  temperature: number;
  rain: number;
  code: number;
};

const weatherCode = (code: number) => {
  if (code === 0) return { icon: "☀️", text: "Despejado" };
  if ([1, 2].includes(code)) return { icon: "⛅", text: "Parcialmente nublado" };
  if (code === 3) return { icon: "☁️", text: "Nublado" };
  if ([45, 48].includes(code)) return { icon: "🌫️", text: "Niebla" };
  if ([51, 53, 55, 56, 57].includes(code)) return { icon: "🌦️", text: "Llovizna" };
  if ([61, 63, 65, 66, 67].includes(code)) return { icon: "🌧️", text: "Lluvia" };
  if ([71, 73, 75, 77].includes(code)) return { icon: "🌨️", text: "Nieve" };
  if ([80, 81, 82].includes(code)) return { icon: "🌦️", text: "Chubascos" };
  if ([95, 96, 99].includes(code)) return { icon: "⛈️", text: "Tormenta" };
  return { icon: "🌤️", text: "Clima actual" };
};

const PHASES = [
  { age: 0, label: "Luna nueva", icon: "🌑" },
  { age: 3.69, label: "Creciente", icon: "🌒" },
  { age: 7.38, label: "Cuarto creciente", icon: "🌓" },
  { age: 11.07, label: "Gibosa creciente", icon: "🌔" },
  { age: 14.77, label: "Luna llena", icon: "🌕" },
  { age: 18.46, label: "Gibosa menguante", icon: "🌖" },
  { age: 22.15, label: "Cuarto menguante", icon: "🌗" },
  { age: 25.84, label: "Menguante", icon: "🌘" }
];

const SYNODIC_MONTH = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);

function lunarAge(date: Date) {
  const elapsed = (date.getTime() - KNOWN_NEW_MOON) / 86400000;
  const age = elapsed % SYNODIC_MONTH;
  return age < 0 ? age + SYNODIC_MONTH : age;
}

function phaseForAge(age: number) {
  let current = PHASES[0];
  for (const phase of PHASES) if (age >= phase.age) current = phase;
  return current;
}

function nextPhaseDate(now: Date, targetAge: number) {
  let currentAge = lunarAge(now);
  let delta = targetAge - currentAge;
  if (delta <= 0.01) delta += SYNODIC_MONTH;
  return new Date(now.getTime() + delta * 86400000);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(date);
}

export default function HomeWeatherMoonPanel({ home, users, activeUserId }: Props) {
  const currentUser = users.find((u) => u.id === activeUserId) || users[0];
  const environment = currentUser?.environment;
  const [weather, setWeather] = useState<any>(null);
  const [now, setNow] = useState(() => new Date());
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | "unsupported">("default");
  const [locationStatus, setLocationStatus] = useState<PermissionState>("prompt");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setNotificationStatus("Notification" in window ? Notification.permission : "unsupported");
    navigator.permissions?.query({ name: "geolocation" as PermissionName }).then((permission) => {
      setLocationStatus(permission.state);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadWeather() {
      const latitude = Number(environment?.latitude);
      const longitude = Number(environment?.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        setWeather(null);
        return;
      }
      try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", String(latitude));
        url.searchParams.set("longitude", String(longitude));
        url.searchParams.set("timezone", "auto");
        url.searchParams.set("forecast_days", "1");
        url.searchParams.set("current", "temperature_2m,apparent_temperature,precipitation,relative_humidity_2m,weather_code,wind_speed_10m");
        url.searchParams.set("hourly", "temperature_2m,precipitation_probability,weather_code");
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("weather request failed");
        const data = await response.json();
        if (!cancelled) setWeather(data);
      } catch (error) {
        if (!cancelled) console.warn("No se pudo actualizar el clima:", error);
      }
    }
    loadWeather();
    const interval = window.setInterval(loadWeather, 15 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [environment?.latitude, environment?.longitude]);

  const weatherCurrent = weather?.current;
  const currentWeather = weatherCode(Number(weatherCurrent?.weather_code));
  const rainNow = weather?.hourly?.precipitation_probability?.[Math.max(0, new Date().getHours())] ?? null;

  const forecast = useMemo<WeatherPoint[]>(() => {
    if (!weather?.hourly?.time) return [];
    const hour = now.getHours();
    const indices = [8, 14, 20].map((target) => {
      const idx = Math.min(weather.hourly.time.length - 1, Math.max(0, target));
      return idx;
    });
    return indices.map((idx) => ({
      time: weather.hourly.time[idx],
      temperature: Number(weather.hourly.temperature_2m[idx]),
      rain: Number(weather.hourly.precipitation_probability[idx] ?? 0),
      code: Number(weather.hourly.weather_code[idx])
    })).map((item, i) => ({ ...item, time: ["Mañana", "Tarde", "Noche"][i] } as any));
  }, [weather, now]);

  const age = lunarAge(now);
  const phase = phaseForAge(age);
  const illumination = Math.round(((1 - Math.cos((age / SYNODIC_MONTH) * Math.PI * 2)) / 2) * 100);
  const nextPhases = useMemo(() => {
    const ordered = PHASES.map((item) => ({ ...item, date: nextPhaseDate(now, item.age) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return ordered.slice(0, 3);
  }, [now]);
  const nextNewMoon = nextPhases.find((p) => p.age === 0);
  const progress = Math.min(100, Math.max(0, (age / SYNODIC_MONTH) * 100));

  async function requestNotifications() {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationStatus(permission);
  }

  function requestLocation() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      () => setLocationStatus("granted"),
      () => setLocationStatus("denied"),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5 * 60 * 1000 }
    );
  }

  const locationLabel = environment?.label || home.address || "Ubicación del hogar";

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-gradient-to-br from-sky-50/90 via-blue-50/50 to-indigo-50/30 rounded-3xl p-5 sm:p-6 border-4 border-sky-100/90 shadow-2xs space-y-4 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-36 h-36 bg-amber-200/30 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between gap-3 border-b border-sky-100 pb-3">
          <div>
            <h3 className="font-extrabold text-[#2C2723] text-sm uppercase tracking-wider flex items-center gap-1.5"><span>{currentWeather.icon}</span> Clima de hoy</h3>
            <p className="text-[10.5px] text-[#8A817C] font-medium">{locationLabel}</p>
          </div>
          <MapPin size={15} className="text-sky-600" />
        </div>

        <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-sky-100 shadow-2xs">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{currentWeather.icon}</span>
              <div>
                <div className="flex items-baseline gap-2"><span className="text-3xl font-black text-[#2C2723]">{weatherCurrent ? `${Math.round(weatherCurrent.temperature_2m)}°C` : "—"}</span><span className="text-xs text-gray-500 font-bold">Sensación {weatherCurrent ? `${Math.round(weatherCurrent.apparent_temperature)}°C` : "—"}</span></div>
                <p className="text-xs font-extrabold text-sky-900">{currentWeather.text}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-black text-[#8A817C]">Lluvia ahora</p>
              <p className="text-xl font-black text-blue-700">{rainNow != null ? `${rainNow}%` : "—"}</p>
            </div>
          </div>
          <p className="text-[10px] text-[#8A817C] mt-2"><CloudRain size={11} className="inline mr-1"/> Humedad {weatherCurrent?.relative_humidity_2m ?? "—"}% · Viento {weatherCurrent ? `${Math.round(weatherCurrent.wind_speed_10m)} km/h` : "—"}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {forecast.map((item: any, index) => {
            const wx = weatherCode(item.code);
            return <div key={index} className="bg-white/90 p-2.5 rounded-2xl border border-sky-100 text-center space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-sky-800 block">{item.time}</span>
              <span className="text-lg block">{wx.icon}</span>
              <span className="text-xs font-black text-[#2C2723] block">{Math.round(item.temperature)}°C</span>
              <span className="text-[9.5px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded-md inline-block">💧 {item.rain}%</span>
            </div>;
          })}
        </div>

        {(locationStatus !== "granted" || (notificationStatus !== "granted" && notificationStatus !== "unsupported")) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {locationStatus !== "granted" && <button type="button" onClick={requestLocation} className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-sky-200 px-2.5 py-1.5 text-[10px] font-black text-sky-900"><LocateFixed size={12}/> Activar ubicación</button>}
            {notificationStatus !== "granted" && notificationStatus !== "unsupported" && <button type="button" onClick={requestNotifications} className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-sky-200 px-2.5 py-1.5 text-[10px] font-black text-sky-900"><Bell size={12}/> Activar notificaciones</button>}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-[#1A162B] via-[#231C38] to-[#120E20] text-white rounded-3xl p-5 sm:p-6 border-4 border-purple-900/40 shadow-sm space-y-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-40 h-40 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center justify-between border-b border-purple-800/60 pb-3">
          <div>
            <h3 className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-1.5"><Moon size={15} className="text-purple-200"/> Estado de la luna hoy</h3>
            <p className="text-[10.5px] text-purple-200/80 font-medium">Ciclo lunar actualizado para {locationLabel}</p>
          </div>
          <span className="text-xl">{phase.icon}</span>
        </div>

        <div className="bg-purple-950/70 p-4 rounded-2xl border border-purple-800/60">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-[9.5px] font-black uppercase tracking-wider text-purple-300">Fase actual</p><p className="text-base font-black text-amber-200 mt-1">{phase.label}</p><p className="text-[10.5px] text-purple-200/90 mt-1">{illumination}% iluminada · día {age.toFixed(1)} del ciclo</p></div>
            <div className="w-16 h-16 rounded-full border-2 border-purple-500/60 bg-gradient-to-br from-purple-800/80 to-black flex items-center justify-center text-3xl">{phase.icon}</div>
          </div>
          <div className="mt-4"><div className="flex justify-between text-[9px] text-purple-300 font-bold"><span>Nueva</span><span>Llena</span><span>Nueva</span></div><div className="relative h-2 mt-1 bg-purple-950 rounded-full overflow-hidden border border-purple-800"><div className="h-full bg-gradient-to-r from-purple-500 via-amber-300 to-purple-500 rounded-full" style={{ width: `${progress}%` }}/><span className="absolute -top-1.5 w-5 h-5 rounded-full bg-amber-200 border-2 border-purple-900 shadow" style={{ left: `calc(${progress}% - 10px)` }} /></div></div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {nextPhases.map((item, index) => <div key={`${item.label}-${index}`} className="bg-purple-950/50 p-2.5 rounded-2xl border border-purple-800/60 text-center"><span className="text-lg block">{item.icon}</span><p className="text-[10px] font-black text-white mt-1">{item.label}</p><p className="text-[9px] text-purple-200 mt-0.5">{formatDate(item.date)}</p></div>)}
        </div>

        <div className="border-t border-purple-800/50 pt-3 space-y-2">
          {nextNewMoon && <div className="flex items-center justify-between text-[11px] font-extrabold text-purple-200"><span>🌑 Próxima luna nueva</span><span className="text-amber-200">{formatDate(nextNewMoon.date)}</span></div>}
          <div className="flex items-start gap-2 text-[10.5px] text-purple-200/90 leading-snug"><Sun size={12} className="text-amber-300 mt-0.5"/><span>Próximo hito visible: {nextPhases[0]?.label || "siguiente fase"} alrededor del {nextPhases[0] ? formatDate(nextPhases[0].date) : "próximamente"}.</span></div>
        </div>
      </div>
    </section>
  );
}
