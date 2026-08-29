// AstroHogar PWA Service Worker for Mobile and Desktop
const CACHE_NAME = "astrohogar-v2";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.jpg",
  "/icon-512.jpg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching app shell assets...");
      return cache.addAll(ASSETS).catch(err => {
        console.warn("[Service Worker] Cache addAll failed, skipping initial assets:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  console.log("[Service Worker] Activated and ready to handle notifications and fetch requests.");
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : undefined)
    ))
  );
  return self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  if (e.request.url.includes("/api/")) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((cachedRes) => cachedRes || fetch(e.request)))
  );
});

self.addEventListener("push", (e) => {
  let data = { title: "¡Sintonía AstroHogar! 🐾", body: "Tienes una nueva actualización en el nido.", icon: "/icon-192.jpg" };
  if (e.data) {
    try { data = e.data.json(); }
    catch { data = { ...data, body: e.data.text() }; }
  }
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon || "/icon-192.jpg",
    badge: "/icon-192.jpg",
    vibrate: [100, 50, 100],
    data: { dateOfArrival: Date.now(), primaryKey: 1 }
  }));
});

self.addEventListener("message", (e) => {
  if (!e.data) return;
  if (e.data.type === "SHOW_PUSH_NOTIFICATION" || e.data.type === "TRIGGER_1H_CALENDAR_ALERT") {
    const { title, body, icon, tag, eventId } = e.data;
    e.waitUntil(self.registration.showNotification(title || "⏰ Recordatorio de Evento - AstroHogar 🐾", {
      body: body || "Actualización en AstroHogar",
      icon: icon || "/icon-192.jpg",
      badge: "/icon-192.jpg",
      tag: tag || (eventId ? `cal-1h-${eventId}` : "astrohogar-notif"),
      renotify: true,
      vibrate: [200, 100, 200, 100, 200],
      data: { dateOfArrival: Date.now(), primaryKey: eventId || 1, url: "/?tab=calendario" }
    }));
  } else if (e.data.type === "SCHEDULE_CALENDAR_NOTIFICATIONS") {
    const { events } = e.data;
    if (Array.isArray(events)) console.log(`[Service Worker] Recibidos ${events.length} eventos para alertas push.`);
  }
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      if (client.url === "/" && "focus" in client) return client.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow("/");
  }));
});
