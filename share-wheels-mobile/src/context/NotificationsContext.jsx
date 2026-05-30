import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { DeviceEventEmitter } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../ApiService/notificationsApiService";

export const NOTIFICATIONS_REFRESH_EVENT = "notifications:refresh";
import { syncFcmTokenWithBackend } from "../Notifications/registerToken";
import {
  registerTokenRefreshHandler,
} from "../Notifications/FCMService";
import {
  connectAppSocket,
  subscribeSocketEvent,
} from "../services/appSocket";

const NotificationsContext = createContext(null);

export const useNotifications = () => useContext(NotificationsContext);

export const NotificationsProvider = ({ children, isAuthenticated }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      setLoading(true);
      const res = await fetchNotifications(token);
      setNotifications(res?.notifications || []);
      setUnreadCount(res?.unreadCount ?? 0);
    } catch (e) {
      console.warn("[notifications] refresh:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(
    async (notificationId) => {
      const token = await AsyncStorage.getItem("token");
      if (!token || !notificationId) return;
      try {
        const res = await markNotificationRead(token, notificationId);
        setUnreadCount(res?.unreadCount ?? 0);
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notificationId ? { ...n, read: true } : n
          )
        );
      } catch (e) {
        console.warn("[notifications] markRead:", e.message);
      }
    },
    []
  );

  const markAllRead = useCallback(async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;
    try {
      await markAllNotificationsRead(token);
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.warn("[notifications] markAllRead:", e.message);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }

    refresh();
    syncFcmTokenWithBackend();

    const unsubRefresh = registerTokenRefreshHandler(() => {
      syncFcmTokenWithBackend();
    });

    let unsubSocket = () => {};
    let socketActive = true;

    (async () => {
      await connectAppSocket();
      if (!socketActive) return;
      unsubSocket = await subscribeSocketEvent("notificationReceived", () => {
        refresh();
        DeviceEventEmitter.emit(NOTIFICATIONS_REFRESH_EVENT);
      });
    })();

    const interval = setInterval(refresh, 60000);
    const sub = DeviceEventEmitter.addListener(
      NOTIFICATIONS_REFRESH_EVENT,
      refresh
    );

    return () => {
      socketActive = false;
      unsubRefresh?.();
      unsubSocket?.();
      clearInterval(interval);
      sub.remove();
    };
  }, [isAuthenticated, refresh]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refresh,
        markRead,
        markAllRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};
