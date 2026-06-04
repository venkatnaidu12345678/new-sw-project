import { Platform } from "react-native";
import notifee, { AndroidImportance, EventType } from "@notifee/react-native";

const CHANNEL_ID = "share_wheels_default";

let channelReady = false;

export async function ensureNotificationChannel() {
  if (channelReady || Platform.OS !== "android") {
    channelReady = true;
    return;
  }
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: "Share Wheels",
    importance: AndroidImportance.HIGH,
    sound: "default",
    vibration: true,
  });
  channelReady = true;
}

/**
 * Show a heads-up notification while the app is in the foreground.
 */
export async function displayForegroundNotification(remoteMessage) {
  const title =
    remoteMessage?.notification?.title ||
    remoteMessage?.data?.title ||
    "Share Wheels";
  const body =
    remoteMessage?.notification?.body ||
    remoteMessage?.data?.body ||
    "";

  await ensureNotificationChannel();

  await notifee.displayNotification({
    title,
    body,
    data: remoteMessage?.data || {},
    android: {
      channelId: CHANNEL_ID,
      pressAction: { id: "default" },
      smallIcon: "ic_notification",
      importance: AndroidImportance.HIGH,
    },
    ios: {
      foregroundPresentationOptions: {
        alert: true,
        badge: true,
        sound: true,
      },
    },
  });
}

/**
 * Tap on a local Notifee notification (foreground display).
 */
export function registerNotifeeForegroundPress(handler) {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) {
      handler?.({
        data: detail.notification?.data,
        notification: detail.notification,
      });
    }
  });
}
