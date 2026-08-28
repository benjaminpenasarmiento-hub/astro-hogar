// Astronomical Solar Times Calculator for Bogotá, Colombia and custom coordinates
// Uses NOAA / Astronomical Almanac Solar Position & Hour Angle algorithm

export interface SolarTimesResult {
  sunrise: string;              // e.g. "05:52 AM"
  sunset: string;               // e.g. "06:08 PM"
  solarNoon: string;            // e.g. "12:00 PM"
  dawn: string;                 // e.g. "05:32 AM" (civil twilight start)
  dusk: string;                 // e.g. "06:28 PM" (civil twilight end)
  goldenHourMorning: string;    // e.g. "06:20 AM"
  goldenHourEvening: string;    // e.g. "05:40 PM"
  sunlightHours: string;        // e.g. "12h 16m"
  daylightDurationMinutes: number;
  sunProgressPct: number;       // 0 to 100%
  isDaylight: boolean;
  isGoldenHour: boolean;
  statusText: string;
  nextTransitionText: string;
  dayOfYear: number;
  declinationDeg: number;
}

export interface CityCoordinates {
  name: string;
  latitude: number;
  longitude: number;
  timezoneOffsetHours: number;
}

export const KNOWN_CITIES: Record<string, CityCoordinates> = {
  bogota: { name: "Bogotá, D.C.", latitude: 4.7110, longitude: -74.0721, timezoneOffsetHours: -5 },
  medellin: { name: "Medellín", latitude: 6.2442, longitude: -75.5812, timezoneOffsetHours: -5 },
  cali: { name: "Cali", latitude: 3.4516, longitude: -76.5320, timezoneOffsetHours: -5 },
  barranquilla: { name: "Barranquilla", latitude: 10.9685, longitude: -74.7813, timezoneOffsetHours: -5 },
  cartagena: { name: "Cartagena", latitude: 10.3910, longitude: -75.4794, timezoneOffsetHours: -5 },
  bucaramanga: { name: "Bucaramanga", latitude: 7.1254, longitude: -73.1198, timezoneOffsetHours: -5 },
  pereira: { name: "Pereira", latitude: 4.8133, longitude: -75.6961, timezoneOffsetHours: -5 },
  manizales: { name: "Manizales", latitude: 5.0689, longitude: -75.5174, timezoneOffsetHours: -5 },
  ibague: { name: "Ibagué", latitude: 4.4389, longitude: -75.2322, timezoneOffsetHours: -5 },
  santa_marta: { name: "Santa Marta", latitude: 11.2408, longitude: -74.1990, timezoneOffsetHours: -5 }
};

export function getCityCoordinates(cityName?: string): CityCoordinates {
  if (!cityName) return KNOWN_CITIES.bogota;
  const clean = cityName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  if (clean.includes("medellin")) return KNOWN_CITIES.medellin;
  if (clean.includes("cali")) return KNOWN_CITIES.cali;
  if (clean.includes("barranquilla")) return KNOWN_CITIES.barranquilla;
  if (clean.includes("cartagena")) return KNOWN_CITIES.cartagena;
  if (clean.includes("bucaramanga")) return KNOWN_CITIES.bucaramanga;
  if (clean.includes("pereira")) return KNOWN_CITIES.pereira;
  if (clean.includes("manizales")) return KNOWN_CITIES.manizales;
  if (clean.includes("ibague")) return KNOWN_CITIES.ibague;
  if (clean.includes("santa marta")) return KNOWN_CITIES.santa_marta;
  
  return KNOWN_CITIES.bogota;
}

/**
 * Calculates exact astronomical sunrise, sunset, twilights and solar progress
 * for a specific date and geographic coordinate.
 */
export function calculateSolarTimes(
  date: Date = new Date(),
  latitude: number = 4.7110,
  longitude: number = -74.0721,
  timezoneOffsetHours: number = -5
): SolarTimesResult {
  // Day of the year
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Fractional year in radians
  const hourFrac = date.getHours() + date.getMinutes() / 60;
  const gamma = (2 * Math.PI / 365.25) * (dayOfYear - 1 + (hourFrac - 12) / 24);

  // Equation of time in minutes
  const eqtime = 229.18 * (
    0.000075 +
    0.001868 * Math.cos(gamma) -
    0.032077 * Math.sin(gamma) -
    0.014615 * Math.cos(2 * gamma) -
    0.040849 * Math.sin(2 * gamma)
  );

  // Solar declination angle in radians
  const decl = 0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const declinationDeg = (decl * 180) / Math.PI;
  const latRad = (latitude * Math.PI) / 180;

  // Helper to compute hour angle for a given zenith
  const getHourAngleDeg = (zenithDeg: number): number => {
    const zenithRad = (zenithDeg * Math.PI) / 180;
    const cosHa = (Math.cos(zenithRad) - Math.sin(latRad) * Math.sin(decl)) / (Math.cos(latRad) * Math.cos(decl));
    const clamped = Math.max(-1, Math.min(1, cosHa));
    return (Math.acos(clamped) * 180) / Math.PI;
  };

  // Time offset in minutes (accounting for longitude and standard timezone)
  const timeOffset = eqtime + 4 * longitude - 60 * timezoneOffsetHours;

  // 1. Standard Sunrise / Sunset (Zenith = 90.833° for atmospheric refraction and sun's radius)
  const haSunDeg = getHourAngleDeg(90.833);
  const sunriseMinutes = 720 - 4 * haSunDeg - timeOffset;
  const sunsetMinutes = 720 + 4 * haSunDeg - timeOffset;
  const solarNoonMinutes = 720 - timeOffset;

  // 2. Civil Twilight (Zenith = 96.0°) - Dawn & Dusk
  const haCivilDeg = getHourAngleDeg(96.0);
  const dawnMinutes = 720 - 4 * haCivilDeg - timeOffset;
  const duskMinutes = 720 + 4 * haCivilDeg - timeOffset;

  // 3. Golden Hour (Zenith = 84.0° - sun is 6° above horizon)
  const haGoldenDeg = getHourAngleDeg(84.0);
  const goldenHourMorningMinutes = 720 - 4 * haGoldenDeg - timeOffset;
  const goldenHourEveningMinutes = 720 + 4 * haGoldenDeg - timeOffset;

  // Format minutes from midnight to "hh:mm AM/PM"
  const formatTime = (minutes: number): string => {
    let m = Math.round(minutes);
    while (m < 0) m += 1440;
    while (m >= 1440) m -= 1440;
    const hours24 = Math.floor(m / 60);
    const mins = m % 60;
    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return `${hours12.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")} ${period}`;
  };

  // Daylight duration
  const daylightDurationMinutes = Math.max(0, sunsetMinutes - sunriseMinutes);
  const durHours = Math.floor(daylightDurationMinutes / 60);
  const durMins = Math.round(daylightDurationMinutes % 60);
  const sunlightHours = `${durHours}h ${durMins.toString().padStart(2, "0")}m`;

  // Current day status
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const isDaylight = currentMinutes >= sunriseMinutes && currentMinutes <= sunsetMinutes;
  const isGoldenHour = 
    (currentMinutes >= sunriseMinutes && currentMinutes <= goldenHourMorningMinutes) ||
    (currentMinutes >= goldenHourEveningMinutes && currentMinutes <= sunsetMinutes);

  let sunProgressPct = 0;
  if (currentMinutes < sunriseMinutes) {
    sunProgressPct = 0;
  } else if (currentMinutes > sunsetMinutes) {
    sunProgressPct = 100;
  } else if (daylightDurationMinutes > 0) {
    sunProgressPct = Math.min(100, Math.max(0, Math.round(((currentMinutes - sunriseMinutes) / daylightDurationMinutes) * 100)));
  }

  let statusText = "";
  let nextTransitionText = "";

  if (currentMinutes < dawnMinutes) {
    const diff = Math.round(dawnMinutes - currentMinutes);
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    statusText = "Madrugada estrellada · Noche serena 🌌";
    nextTransitionText = `Primeras luces del alba en ${h > 0 ? `${h}h ` : ""}${m}m`;
  } else if (currentMinutes < sunriseMinutes) {
    const diff = Math.round(sunriseMinutes - currentMinutes);
    statusText = "Crepúsculo matutino · Cielo encendiéndose 🌅";
    nextTransitionText = `Salida del sol en ${diff} min`;
  } else if (currentMinutes <= goldenHourMorningMinutes) {
    const diff = Math.round(goldenHourMorningMinutes - currentMinutes);
    statusText = "Hora dorada matutina · Luz cálida y suave ☕✨";
    nextTransitionText = `Luz suave de mañana por ${diff} min más`;
  } else if (currentMinutes < solarNoonMinutes - 45) {
    statusText = "Mañana soleada · El sol asciende con energía ☀️";
    const diff = Math.round(solarNoonMinutes - currentMinutes);
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    nextTransitionText = `Cenit solar (mediodía) en ${h > 0 ? `${h}h ` : ""}${m}m`;
  } else if (currentMinutes <= solarNoonMinutes + 45) {
    statusText = "Cenit solar · Máxima iluminación en el hogar ☀️";
    nextTransitionText = `Sol en su punto más alto sobre la Sabana`;
  } else if (currentMinutes < goldenHourEveningMinutes) {
    const diff = Math.round(sunsetMinutes - currentMinutes);
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    statusText = "Tarde despejada · Luz agradable en el nido 🌤️";
    nextTransitionText = `Puesta del sol en ${h > 0 ? `${h}h ` : ""}${m}m`;
  } else if (currentMinutes <= sunsetMinutes) {
    const diff = Math.round(sunsetMinutes - currentMinutes);
    statusText = "Hora dorada del atardecer · Ocaso mágico 🌇";
    nextTransitionText = `Puesta de sol en ${diff} min`;
  } else if (currentMinutes <= duskMinutes) {
    const diff = Math.round(duskMinutes - currentMinutes);
    statusText = "Crepúsculo vespertino · Cielo en tonos violeta y azul 🌆";
    nextTransitionText = `Noche cerrada en ${diff} min`;
  } else {
    statusText = "Noche en el nido bajo las estrellas 🌙";
    // until next dawn (tomorrow)
    const untilMidnight = 1440 - currentMinutes;
    const diff = Math.round(untilMidnight + dawnMinutes);
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    nextTransitionText = `Amanecer de mañana en ${h}h ${m}m`;
  }

  return {
    sunrise: formatTime(sunriseMinutes),
    sunset: formatTime(sunsetMinutes),
    solarNoon: formatTime(solarNoonMinutes),
    dawn: formatTime(dawnMinutes),
    dusk: formatTime(duskMinutes),
    goldenHourMorning: formatTime(goldenHourMorningMinutes),
    goldenHourEvening: formatTime(goldenHourEveningMinutes),
    sunlightHours,
    daylightDurationMinutes,
    sunProgressPct,
    isDaylight,
    isGoldenHour,
    statusText,
    nextTransitionText,
    dayOfYear,
    declinationDeg: Number(declinationDeg.toFixed(2))
  };
}
