import React, { useEffect, useRef, useCallback, useState } from "react";
import { StatusBar, StyleSheet, DeviceEventEmitter, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NOTIFICATIONS_REFRESH_EVENT } from "./src/context/NotificationsContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";

import AuthNavigator from "./src/Navigation/AuthNavigator";
import AppErrorBoundary from "./src/Components/AppErrorBoundary";
import { AdsProvider } from "./src/context/AdsContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { AppAlertProvider } from "./src/context/AppAlertContext";
import {
  requestUserPermission,
  hasNotificationPermission,
  registerForegroundHandler,
  registerNotificationOpenedApp,
  handleInitialNotification,
  configureIosForegroundPresentation,
  registerTokenRefreshHandler,
} from "./src/Notifications/FCMService";
import { ensureNotificationChannel } from "./src/Notifications/displayLocalNotification";
import { registerNotifeeForegroundPress } from "./src/Notifications/displayLocalNotification";
import { handleNotificationOpen } from "./src/Notifications/notificationNavigation";
import { consumePendingNotificationOpen } from "./src/Notifications/notifeeBackground";
import { syncFcmTokenWithBackend } from "./src/Notifications/registerToken";
import { showAppToast } from "./src/Utils/appAlert";
import { SPLASH_LAUNCH_BACKGROUND } from "./src/theme/splashTiming";

function AppShell() {
  const navigationRef = useRef(null);
  const { colors, navigationTheme } = useTheme();
  const [navReady, setNavReady] = useState(false);

  const onNotificationOpen = useCallback((remoteMessage) => {
    if (!remoteMessage || !navigationRef.current) return;
    handleNotificationOpen(navigationRef.current, remoteMessage);
  }, []);

  const handleNavigationReady = useCallback(async () => {
    setNavReady(true);
    const token = await AsyncStorage.getItem("token");
    if (token) {
      syncFcmTokenWithBackend({ force: true }).catch(() => {});
      [4000, 12000, 30000].forEach((ms) => {
        setTimeout(() => syncFcmTokenWithBackend({ force: true }).catch(() => {}), ms);
      });
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
    let unsubTokenRefresh = () => {};

    (async () => {
      try {
        await ensureNotificationChannel();
        await configureIosForegroundPresentation();
        const granted = await requestUserPermission();
        if (!granted) {
          console.warn("[FCM] notification permission denied");
        } else {
          syncFcmTokenWithBackend({ force: true }).catch(() => {});
        }
      } catch (err) {
        console.warn("[FCM] init:", err?.message || err);
      }

      unsubForeground = registerForegroundHandler((remoteMessage) => {
        DeviceEventEmitter.emit(NOTIFICATIONS_REFRESH_EVENT);
        const title =
          remoteMessage?.notification?.title || remoteMessage?.data?.title;
        if (title) {
          showAppToast(title, "info", 4200);
        }
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

      unsubTokenRefresh = registerTokenRefreshHandler(() => {
        syncFcmTokenWithBackend({ force: true }).then(() => {
          DeviceEventEmitter.emit(NOTIFICATIONS_REFRESH_EVENT);
        });
      });

      const initial = await handleInitialNotification();
      if (initial) {
        setTimeout(() => onNotificationOpen(initial), 800);
      }
    })();

    return () => {
      unsubForeground?.();
      unsubOpened?.();
      unsubNotifee?.();
      unsubTokenRefresh?.();
    };
  }, [onNotificationOpen]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        const permitted = await hasNotificationPermission();
        if (!permitted) {
          await requestUserPermission();
        }
        syncFcmTokenWithBackend({ force: false }).catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  const rootBg = navReady ? colors.background : SPLASH_LAUNCH_BACKGROUND;

  return (
    <GestureHandlerRootView
      style={[styles.mainContainer, { backgroundColor: rootBg }]}
    >
      <StatusBar
        translucent={false}
        backgroundColor={navReady ? colors.statusBarBg : SPLASH_LAUNCH_BACKGROUND}
        barStyle={navReady ? colors.statusBar : "light-content"}
      />
      <NavigationContainer
        ref={navigationRef}
        onReady={handleNavigationReady}
        theme={
          navReady
            ? navigationTheme
            : {
                ...navigationTheme,
                colors: {
                  ...navigationTheme.colors,
                  background: SPLASH_LAUNCH_BACKGROUND,
                  card: SPLASH_LAUNCH_BACKGROUND,
                },
              }
        }
      >
        <AppAlertProvider>
          <AdsProvider>
            <AuthNavigator />
          </AdsProvider>
        </AppAlertProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider
        initialMetrics={initialWindowMetrics}
        style={[styles.mainContainer, { backgroundColor: SPLASH_LAUNCH_BACKGROUND }]}
      >
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
});
