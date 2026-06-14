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
      const message = String(error?.message || error || "");
      const isFisAuth =
        /FIS_AUTH_ERROR/i.test(message) || /fis_auth/i.test(String(code));

      console.warn(
        "[FCM] getToken failed:",
        message,
        code ? `(code: ${code})` : ""
      );

      if (Platform.OS === "android") {
        if (isFisAuth) {
          console.warn(
            "[FCM] FIS_AUTH_ERROR — Firebase does not trust this APK signing key.\n" +
              "  1) Run: npm run android:sha\n" +
              "  2) Firebase Console → Project share-wheels-4afd2 → Android app com.sharewheels.app\n" +
              "  3) Add Debug SHA-1 + SHA-256 (and Release SHAs for release APK)\n" +
              "  4) Download NEW google-services.json → android/app/google-services.json\n" +
              "  5) Rebuild app (uninstall old APK first)\n" +
              "  6) Run: npm run fcm:verify"
          );
        } else {
          console.warn(
            "[FCM] Allow Notifications in Android settings; ensure google-services.json matches Firebase (npm run fcm:verify)"
          );
        }
      }
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
