import { CalendarItem } from "../types";

export type NotificationPermissionStatus = "granted" | "denied" | "default" | "unsupported";

/**
 * Check if the browser supports notifications and return current status
 */
export function getNotificationPermissionStatus(): NotificationPermissionStatus {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as NotificationPermissionStatus;
}

/**
 * Request notification permissions from the user
 */
export async function requestCalendarNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted" && "serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg) {
        reg.active?.postMessage({
          type: "SHOW_PUSH_NOTIFICATION",
          title: "🔔 Notificaciones Push Activadas",
          body: "AstroHogar te avisará 1 hora antes de cada evento agendado miau 🐾",
          tag: "welcome-notif"
        });
      }
    }
    return permission as NotificationPermissionStatus;
  } catch (err) {
    console.error("Error al solicitar permisos de notificación:", err);
    return Notification.permission as NotificationPermissionStatus;
  }
}

/**
 * Dispatch a push notification utilizing Service Worker or browser Notification API
 */
export async function dispatchCalendarPushNotification(
  title: string,
  body: string,
  eventId?: string
): Promise<boolean> {
  if (getNotificationPermissionStatus() !== "granted") {
    console.warn("No se pueden enviar notificaciones push: permiso no concedido.");
    return false;
  }

  try {
    // 1. Prefer Service Worker registration
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg) {
        // Try postMessage to active controller first
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "TRIGGER_1H_CALENDAR_ALERT",
            title,
            body,
            eventId,
            icon: "/icon-192.jpg",
            tag: eventId ? `cal-1h-${eventId}` : "astrohogar-calendar-alert"
          });
          return true;
        }

        // Fallback to direct showNotification on registration
        await reg.showNotification(title, {
          body,
          icon: "/icon-192.jpg",
          badge: "/icon-192.jpg",
          tag: eventId ? `cal-1h-${eventId}` : "astrohogar-calendar-alert",
          vibrate: [200, 100, 200, 100, 200],
          data: {
            url: "/?tab=calendario",
            dateOfArrival: Date.now()
          }
        } as any);
        return true;
      }
    }

    // 2. Fallback to standard Notification web API
    if ("Notification" in window) {
      new Notification(title, {
        body,
        icon: "/icon-192.jpg"
      });
      return true;
    }
  } catch (err) {
    console.error("Error al despachar notificación push desde el Service Worker:", err);
  }

  return false;
}

/**
 * Checks all active calendar items and triggers push notifications for events starting in 1 hour
 */
export function checkUpcomingCalendarEvents(calendarItems: CalendarItem[]): {
  notifiedEvents: CalendarItem[];
  upcoming1HourEvents: CalendarItem[];
} {
  const notifiedEvents: CalendarItem[] = [];
  const upcoming1HourEvents: CalendarItem[] = [];

  if (!Array.isArray(calendarItems) || calendarItems.length === 0) {
    return { notifiedEvents, upcoming1HourEvents };
  }

  const now = new Date();

  for (const item of calendarItems) {
    // Skip finished tasks or explicitly disabled notifications
    if (item.status === "done" || item.notify1HourBefore === false) {
      continue;
    }

    // Must have date (YYYY-MM-DD) and time (HH:MM)
    if (!item.date || !item.time) {
      continue;
    }

    try {
      // Construct target date time
      const [year, month, day] = item.date.split("-").map(n => parseInt(n, 10));
      const [hours, minutes] = item.time.split(":").map(n => parseInt(n, 10));

      if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
        continue;
      }

      const eventDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
      const diffMs = eventDateTime.getTime() - now.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      // Event is coming up in the next 65 minutes (approx 1 hour away or less, but in the future)
      if (diffMinutes > 0 && diffMinutes <= 65) {
        upcoming1HourEvents.push(item);

        // Deduplication key to prevent repeated push notifications for the same event
        const sentKey = `astro_notified_1h_${item.id}_${item.date}_${item.time}`;
        const alreadyNotified = localStorage.getItem(sentKey);

        if (!alreadyNotified) {
          const emojiStr = item.emoji ? `${item.emoji} ` : "⏰ ";
          const timeRemainingText = Math.round(diffMinutes) === 60 
            ? "en 1 hora exactos" 
            : `en unos ${Math.round(diffMinutes)} minutos`;

          const title = `${emojiStr}Recordatorio: "${item.title}" (${timeRemainingText})`;
          const body = `Tu evento "${item.title}" comienza hoy a las ${item.time}. ¡Es hora de prepararse en el nido! 🐾`;

          dispatchCalendarPushNotification(title, body, item.id);
          localStorage.setItem(sentKey, new Date().toISOString());
          notifiedEvents.push(item);
        }
      }
    } catch (e) {
      console.warn("Error evaluando fecha de evento para notificación push:", item, e);
    }
  }

  // Also post active upcoming list to Service Worker if supported
  if ("serviceWorker" in navigator && upcoming1HourEvents.length > 0) {
    navigator.serviceWorker.ready.then(reg => {
      reg.active?.postMessage({
        type: "SCHEDULE_CALENDAR_NOTIFICATIONS",
        events: upcoming1HourEvents.map(e => ({ id: e.id, title: e.title, time: e.time, date: e.date }))
      });
    }).catch(() => {});
  }

  return { notifiedEvents, upcoming1HourEvents };
}

/**
 * Send an immediate test push notification
 */
export async function sendTestPushNotification(): Promise<boolean> {
  const perm = await requestCalendarNotificationPermission();
  if (perm !== "granted") {
    return false;
  }

  return dispatchCalendarPushNotification(
    "🧪 Prueba de Notificación Push - AstroHogar",
    "¡Sintonización exitosa! Las notificaciones automáticas te avisarán 1 hora antes de cada compromiso agendado. ⏰🐾"
  );
}
