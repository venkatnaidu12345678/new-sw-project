import { Platform } from "react-native";
import {
  getFCMMessaging,
  AuthorizationStatus,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  onTokenRefresh,
  requestPermission,
  hasPermission,
  registerDeviceForRemoteMessages,
  isDeviceRegisteredForRemoteMessages,
} from "./firebaseMessaging";
import {
  displayForegroundNotification,
  ensureNotificationChannel,
} from "./displayLocalNotification";

const messaging = () => getFCMMessaging();

let tokenFailureLogged = false;

export const wasFcmTokenFailureLogged = () => tokenFailureLogged;

export async function hasNotificationPermission() {
  const msg = messaging();
  if (Platform.OS === "ios") {
    try {
      const authStatus = await hasPermission(msg);
      return (
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL
      );
    } catch {
      return false;
    }
  }

  if (Platform.OS === "android" && Platform.Version >= 33) {
    const { PermissionsAndroid } = require("react-native");
    return PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
  }

  return true;
}

export async function requestUserPermission() {
  if (await hasNotificationPermission()) return true;

  const msg = messaging();

  if (Platform.OS === "ios") {
    const authStatus = await requestPermission(msg);
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;
    if (enabled) {
      await registerDeviceForRemoteMessages(msg);
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
    const msg = messaging();
    if (Platform.OS === "ios") {
      const registered = isDeviceRegisteredForRemoteMessages(msg);
      if (!registered) {
        await registerDeviceForRemoteMessages(msg);
      }
    }
    return await getToken(msg);
  } catch (error) {
    if (!tokenFailureLogged) {
      tokenFailureLogged = true;
      const code = error?.code || error?.nativeErrorCode || "";
      console.warn(
        "[FCM] getToken failed:",
        error.message,
        code ? `(code: ${code})` : "",
        Platform.OS === "android"
          ? "— add debug + release SHA-1/SHA-256 in Firebase → Project settings → Your apps → com.sharewheels.app, then download a new google-services.json (npm run android:sha)"
          : ""
      );
    }
    return null;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Permission + Android channel, then FCM token (required before backend sync). */
export async function getDeviceTokenWithPermission() {
  const permitted = await requestUserPermission();
  if (!permitted) return null;

  await ensureNotificationChannel();

  if (Platform.OS === "android") {
    try {
      const msg = messaging();
      await registerDeviceForRemoteMessages(msg);
    } catch {
      /* ignore */
    }
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const token = await getDeviceToken();
    if (token) return token;
    await sleep(350 * (attempt + 1));
  }
  return null;
}

export function registerForegroundHandler(onMessageCb) {
  return onMessage(messaging(), async (remoteMessage) => {
    try {
      await displayForegroundNotification(remoteMessage);
    } catch (e) {
      console.warn("[FCM] foreground display:", e.message);
    }
    onMessageCb?.(remoteMessage);
  });
}

export function registerNotificationOpenedApp(onNotification) {
  return onNotificationOpenedApp(messaging(), (remoteMessage) => {
    onNotification?.(remoteMessage);
  });
}

export async function handleInitialNotification(onNotification) {
  const remoteMessage = await getInitialNotification(messaging());
  if (remoteMessage) {
    onNotification?.(remoteMessage);
  }
  return remoteMessage;
}

export function registerTokenRefreshHandler(onToken) {
  return onTokenRefresh(messaging(), (token) => {
    onToken?.(token);
  });
}

export async function configureIosForegroundPresentation() {
  if (Platform.OS === "ios") {
    const msg = messaging();
    if (typeof msg.setForegroundPresentationOptions === "function") {
      await msg.setForegroundPresentationOptions({
        alert: true,
        badge: true,
        sound: true,
      });
    }
  }
}
