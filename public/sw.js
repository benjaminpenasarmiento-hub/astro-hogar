// AstroHogar PWA Service Worker for Mobile and Desktop
const CACHE_NAME = "astrohogar-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.jpg",
  "/icon-512.jpg"
];

// Install Event
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

// Activate Event
self.addEventListener("activate", (e) => {
  console.log("[Service Worker] Activated and ready to handle notifications and fetch requests.");
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event (Network-First Fallback to Cache)
self.addEventListener("fetch", (e) => {
  // Only handle local fetch requests
  if (!e.request.url.startsWith(self.location.origin)) return;
  // Skip API routes as they must always go to the server
  if (e.request.url.includes("/api/")) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Clone and put in cache if valid
        if (res && res.status === 200 && res.type === "basic") {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, resClone);
          });
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((cachedRes) => cachedRes || fetch(e.request)))
  );
});

// Handle Background Push Notification Event
self.addEventListener("push", (e) => {
  let data = { title: "¡Sintonía AstroHogar! 🐾", body: "Tienes una nueva actualización en el nido.", icon: "/icon-192.jpg" };
  if (e.data) {
    try {
      data = e.data.json();
    } catch (err) {
      data = { ...data, body: e.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icon-192.jpg",
    badge: "/icon-192.jpg",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle Message Event from Main Application
self.addEventListener("message", (e) => {
  if (!e.data) return;

  if (e.data.type === "SHOW_PUSH_NOTIFICATION" || e.data.type === "TRIGGER_1H_CALENDAR_ALERT") {
    const { title, body, icon, tag, eventId } = e.data;
    const options = {
      body: body || "Actualización en AstroHogar",
      icon: icon || "/icon-192.jpg",
      badge: "/icon-192.jpg",
      tag: tag || (eventId ? `cal-1h-${eventId}` : "astrohogar-notif"),
      renotify: true,
      vibrate: [200, 100, 200, 100, 200],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: eventId || 1,
        url: "/?tab=calendario"
      }
    };
    e.waitUntil(
      self.registration.showNotification(title || "⏰ Recordatorio de Evento - AstroHogar 🐾", options)
    );
  } else if (e.data.type === "SCHEDULE_CALENDAR_NOTIFICATIONS") {
    // Store scheduled alerts if needed for background check
    const { events } = e.data;
    if (Array.isArray(events)) {
      console.log(`[Service Worker] Recibidos ${events.length} eventos para sincronización de alertas push (1 hora antes).`);
    }
  }
});

// Handle Notification Click Event
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === "/" && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }
    })
  );
});
