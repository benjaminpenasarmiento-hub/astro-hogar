import { useState, useEffect, useCallback } from "react";
import { CalendarItem } from "../types";
import { 
  getNotificationPermissionStatus, 
  requestCalendarNotificationPermission, 
  checkUpcomingCalendarEvents, 
  sendTestPushNotification,
  NotificationPermissionStatus 
} from "../utils/calendarNotificationManager";

export function useCalendarNotifications(calendarItems: CalendarItem[]) {
  const [permission, setPermission] = useState<NotificationPermissionStatus>("default");
  const [upcoming1HourEvents, setUpcoming1HourEvents] = useState<CalendarItem[]>([]);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);

  // Sync permission status
  const updatePermission = useCallback(() => {
    setPermission(getNotificationPermissionStatus());
  }, []);

  useEffect(() => {
    updatePermission();
  }, [updatePermission]);

  // Request permissions
  const handleRequestPermission = async () => {
    const newStatus = await requestCalendarNotificationPermission();
    setPermission(newStatus);
    return newStatus;
  };

  // Run periodic check
  const runCheck = useCallback(() => {
    if (!calendarItems || calendarItems.length === 0) return;
    const { upcoming1HourEvents: upcoming } = checkUpcomingCalendarEvents(calendarItems);
    setUpcoming1HourEvents(upcoming);
    setLastCheckTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, [calendarItems]);

  useEffect(() => {
    runCheck();

    // Check every 30 seconds
    const interval = setInterval(() => {
      runCheck();
    }, 30000);

    // Also check on tab focus or visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runCheck();
        updatePermission();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [runCheck, updatePermission]);

  // Handle manual test notification
  const handleTestPush = async () => {
    const success = await sendTestPushNotification();
    updatePermission();
    return success;
  };

  return {
    permission,
    upcoming1HourEvents,
    lastCheckTime,
    requestPermission: handleRequestPermission,
    testPushNotification: handleTestPush,
    runCheck
  };
}
