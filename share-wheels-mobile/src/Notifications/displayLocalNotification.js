import { Platform } from "react-native";
import notifee, { AndroidImportance, EventType } from "@notifee/react-native";
import { CHANNELS, resolveNotificationChannel } from "./notificationChannels";

let channelsReady = false;

export async function ensureNotificationChannel() {
  if (channelsReady || Platform.OS !== "android") {
    channelsReady = true;
    return;
  }

  await notifee.createChannel({
    id: CHANNELS.rides,
    name: "Rides & bookings",
    importance: AndroidImportance.HIGH,
    sound: "default",
    vibration: true,
  });
  await notifee.createChannel({
    id: CHANNELS.chat,
    name: "Ride chat",
    importance: AndroidImportance.HIGH,
    sound: "default",
    vibration: true,
  });
  await notifee.createChannel({
    id: CHANNELS.reminders,
    name: "Reminders & expiry",
    importance: AndroidImportance.DEFAULT,
    sound: "default",
    vibration: true,
  });
  channelsReady = true;
}

const buildDisplayPayload = (remoteMessage) => {
  const data = remoteMessage?.data || {};
  const type = data.type || "general";
  const title =
    remoteMessage?.notification?.title || data.title || "Share Wheels";
  const body =
    remoteMessage?.notification?.body || data.body || "";
  const rideId = data.rideId ? String(data.rideId) : "";
  const notificationId =
    data.notificationId || data.passengerRideId || data.courierId || "";

  return { data, type, title, body, rideId, notificationId };
};

/**
 * Show a tray notification (foreground / data-only background).
 */
export async function displayForegroundNotification(remoteMessage) {
  const { data, type, title, body, rideId, notificationId } =
    buildDisplayPayload(remoteMessage);

  await ensureNotificationChannel();

  const channelId = resolveNotificationChannel(type);
  const tag = notificationId || `${type}-${rideId || "general"}`;

  await notifee.displayNotification({
    id: tag,
    title,
    body,
    data,
    android: {
      channelId,
      tag,
      groupId: rideId || "share_wheels_general",
      pressAction: { id: "default" },
      smallIcon: "ic_notification",
      largeIcon: "ic_launcher",
      color: "#2563EB",
      importance: AndroidImportance.HIGH,
      autoCancel: true,
    },
    ios: {
      threadId: rideId || "share_wheels",
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
