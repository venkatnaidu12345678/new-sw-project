import { Platform } from "react-native";
import messaging from "@react-native-firebase/messaging";
import { displayForegroundNotification } from "./displayLocalNotification";

export async function requestUserPermission() {
  if (Platform.OS === "ios") {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    if (enabled) {
      await messaging().registerDeviceForRemoteMessages();
    }
    return enabled;
  }

  if (Platform.OS === "android" && Platform.Version >= 33) {
    const { PermissionsAndroid } = require("react-native");
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  return true;
}

export async function getDeviceToken() {
  try {
    if (Platform.OS === "ios") {
      const registered = messaging().isDeviceRegisteredForRemoteMessages;
      if (!registered) {
        await messaging().registerDeviceForRemoteMessages();
      }
    }
    return await messaging().getToken();
  } catch (error) {
    console.warn("[FCM] getToken failed:", error.message);
    return null;
  }
}

export function registerForegroundHandler(onMessage) {
  return messaging().onMessage(async (remoteMessage) => {
    try {
      await displayForegroundNotification(remoteMessage);
    } catch (e) {
      console.warn("[FCM] foreground display:", e.message);
    }
    onMessage?.(remoteMessage);
  });
}

export function registerNotificationOpenedApp(onNotification) {
  return messaging().onNotificationOpenedApp((remoteMessage) => {
    onNotification?.(remoteMessage);
  });
}

export async function handleInitialNotification(onNotification) {
  const remoteMessage = await messaging().getInitialNotification();
  if (remoteMessage) {
    onNotification?.(remoteMessage);
  }
  return remoteMessage;
}

export function registerTokenRefreshHandler(onToken) {
  return messaging().onTokenRefresh((token) => {
    onToken?.(token);
  });
}

export async function configureIosForegroundPresentation() {
  if (Platform.OS === "ios") {
    await messaging().setForegroundPresentationOptions({
      alert: true,
      badge: true,
      sound: true,
    });
  }
}
