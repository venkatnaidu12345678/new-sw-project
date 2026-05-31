import React, { useEffect, useRef, useCallback } from "react";
import { StatusBar, StyleSheet, DeviceEventEmitter } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NOTIFICATIONS_REFRESH_EVENT } from "./src/context/NotificationsContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";

import AuthNavigator from "./src/Navigation/AuthNavigator";
import { AdsProvider } from "./src/context/AdsContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import {
  requestUserPermission,
  registerForegroundHandler,
  registerNotificationOpenedApp,
  handleInitialNotification,
  configureIosForegroundPresentation,
} from "./src/Notifications/FCMService";
import { ensureNotificationChannel } from "./src/Notifications/displayLocalNotification";
import { registerNotifeeForegroundPress } from "./src/Notifications/displayLocalNotification";
import { handleNotificationOpen } from "./src/Notifications/notificationNavigation";
import { consumePendingNotificationOpen } from "./src/Notifications/notifeeBackground";
import { syncFcmTokenWithBackend } from "./src/Notifications/registerToken";

function AppShell() {
  const navigationRef = useRef(null);
  const { colors, navigationTheme } = useTheme();

  const onNotificationOpen = useCallback((remoteMessage) => {
    if (!remoteMessage || !navigationRef.current) return;
    handleNotificationOpen(navigationRef.current, remoteMessage);
  }, []);

  const handleNavigationReady = useCallback(async () => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      syncFcmTokenWithBackend({ force: false }).catch(() => {});
    }
    const pending = await consumePendingNotificationOpen();
    if (pending) {
      setTimeout(() => onNotificationOpen(pending), 600);
    }
  }, [onNotificationOpen]);

  useEffect(() => {
    let unsubForeground = () => {};
    let unsubOpened = () => {};
    let unsubNotifee = () => {};

    (async () => {
      try {
        await ensureNotificationChannel();
        await configureIosForegroundPresentation();
        const granted = await requestUserPermission();
        if (!granted && __DEV__) {
          console.warn("[FCM] notification permission denied");
        }
      } catch (err) {
        console.warn("[FCM] init:", err?.message || err);
      }

      unsubForeground = registerForegroundHandler((remoteMessage) => {
        DeviceEventEmitter.emit(NOTIFICATIONS_REFRESH_EVENT);
        if (__DEV__) {
          console.log("[FCM] foreground:", remoteMessage?.notification?.title);
        }
      });

      unsubOpened = registerNotificationOpenedApp(onNotificationOpen);

      unsubNotifee = registerNotifeeForegroundPress((detail) => {
        onNotificationOpen({
          data: detail?.data,
          notification: {
            title: detail?.notification?.title,
            body: detail?.notification?.body,
          },
        });
      });

      const initial = await handleInitialNotification(onNotificationOpen);
      if (initial) {
        setTimeout(() => onNotificationOpen(initial), 800);
      }
    })();

    return () => {
      unsubForeground?.();
      unsubOpened?.();
      unsubNotifee?.();
    };
  }, [onNotificationOpen]);

  return (
    <GestureHandlerRootView
      style={[styles.mainContainer, { backgroundColor: colors.background }]}
    >
      <StatusBar
        translucent={false}
        backgroundColor={colors.statusBarBg}
        barStyle={colors.statusBar}
      />
      <NavigationContainer
        ref={navigationRef}
        onReady={handleNavigationReady}
        theme={navigationTheme}
      >
        <AdsProvider>
          <AuthNavigator />
        </AdsProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
});
