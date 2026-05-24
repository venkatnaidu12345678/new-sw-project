import React, { useEffect, useRef, useState } from "react";
import {
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";

import AuthNavigator from "./src/Navigation/AuthNavigator";
import SplashPaint from "./src/Components/SplashComponents/SplashPaint";
import {
  StarRender,
  AnimatedAppName,
  WelcomeText,
} from "./src/Components/SplashComponents/SplashTopAnimation";
import {
  requestUserPermission,
  getDeviceToken,
  registerForegroundHandler,
  registerNotificationOpenedApp,
  handleInitialNotification,
} from "./src/Notifications/FCMService";

export default function App() {
  const navigationRef = useRef(null);
  const [currentRoute, setCurrentRoute] = useState("Splash");

  useEffect(() => {
    async function initFCM() {
      const permissionGranted = await requestUserPermission();
      if (!permissionGranted) {
        return;
      }

      const token = await getDeviceToken();
      if (token) {
        console.log("FCM token initialized:", token);
      }
    }

    const unsubscribeForeground = registerForegroundHandler(remoteMessage => {
      console.log("Foreground notification received:", remoteMessage);
    });

    const unsubscribeOpened = registerNotificationOpenedApp(remoteMessage => {
      console.log("Notification opened:", remoteMessage);
    });

    handleInitialNotification(remoteMessage => {
      console.log("Opened from quit state:", remoteMessage);
    });

    initFCM();

    return () => {
      unsubscribeForeground?.();
      unsubscribeOpened?.();
    };
  }, []);

  // ✅ Routes where SplashPaint should be visible
  const SPLASH_ROUTES = ["Splash", "Signin", "Signup", "Otp"];

  const updateRoute = () => {
    const route = navigationRef.current?.getCurrentRoute();
    setCurrentRoute(route?.name || "Splash"); // ✅ fallback
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      ✅ Splash animation layer
      {SPLASH_ROUTES.includes(currentRoute) && (
        <SplashPaint>
          <StarRender />
          <AnimatedAppName />
          <WelcomeText />
          
        </SplashPaint>
      )}

      <NavigationContainer
        ref={navigationRef}
        onReady={updateRoute}       // ✅ fixed
        onStateChange={updateRoute} // ✅ fixed
      >
        <AuthNavigator />
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
