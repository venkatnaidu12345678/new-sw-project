import React, { useEffect, useRef } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";

import AuthNavigator from "./src/Navigation/AuthNavigator";
import { AdsProvider } from "./src/context/AdsContext";
import {
  requestUserPermission,
  getDeviceToken,
  registerForegroundHandler,
  registerNotificationOpenedApp,
  handleInitialNotification,
} from "./src/Notifications/FCMService";

export default function App() {
  const navigationRef = useRef(null);

  useEffect(() => {
    async function initFCM() {
      try {
        const permissionGranted = await requestUserPermission();
        if (!permissionGranted) return;
        const token = await getDeviceToken();
        if (token) {
          console.log("FCM token initialized:", token);
        }
      } catch (err) {
        console.warn("FCM init skipped:", err?.message || err);
      }
    }

    const unsubscribeForeground = registerForegroundHandler((remoteMessage) => {
      console.log("Foreground notification received:", remoteMessage);
    });

    const unsubscribeOpened = registerNotificationOpenedApp((remoteMessage) => {
      console.log("Notification opened:", remoteMessage);
    });

    handleInitialNotification((remoteMessage) => {
      console.log("Opened from quit state:", remoteMessage);
    });

    initFCM();

    return () => {
      unsubscribeForeground?.();
      unsubscribeOpened?.();
    };
  }, []);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <GestureHandlerRootView style={styles.mainContainer}>
        <StatusBar
          translucent={false}
          backgroundColor="#F8FAFC"
          barStyle="dark-content"
        />
        <NavigationContainer ref={navigationRef}>
          <AdsProvider>
            <AuthNavigator />
          </AdsProvider>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
});
