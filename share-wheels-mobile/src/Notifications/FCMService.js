import { Alert, Platform } from "react-native";
import messaging from "@react-native-firebase/messaging";

export async function requestUserPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  console.log("FCM permission status:", authStatus);

  if (!enabled) {
    console.warn("Firebase Cloud Messaging permission not granted.");
  }

  return enabled;
}

export async function getDeviceToken() {
  try {
    const token = await messaging().getToken();
    console.log("FCM device token:", token);
    return token;
  } catch (error) {
    console.error("Failed to fetch FCM token:", error);
    return null;
  }
}

export function registerForegroundHandler(onMessage) {
  return messaging().onMessage(async remoteMessage => {
    console.log("FCM foreground message:", remoteMessage);

    if (remoteMessage?.notification) {
      const title = remoteMessage.notification.title || "Notification";
      const body = remoteMessage.notification.body || "";

      if (Platform.OS === "ios" || Platform.OS === "android") {
        Alert.alert(title, body);
      }
    }

    onMessage?.(remoteMessage);
  });
}

export function registerNotificationOpenedApp(onNotification) {
  return messaging().onNotificationOpenedApp(remoteMessage => {
    console.log("Notification opened from background state:", remoteMessage);
    onNotification?.(remoteMessage);
  });
}

export async function handleInitialNotification(onNotification) {
  const remoteMessage = await messaging().getInitialNotification();
  if (remoteMessage) {
    console.log("Notification opened from quit state:", remoteMessage);
    onNotification?.(remoteMessage);
  }
}

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log("FCM background message:", remoteMessage);
});
