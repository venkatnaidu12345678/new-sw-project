import { Platform } from "react-native";
import notifee, { AndroidImportance } from "@notifee/react-native";

const NOTIFICATION_ID = "share-wheels-live-tracking";
const CHANNEL_ID = "share_wheels_live_tracking";

let foregroundActive = false;

export async function ensureLiveTrackingChannel() {
  if (Platform.OS !== "android") return;
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: "Live ride tracking",
    importance: AndroidImportance.LOW,
    vibration: false,
  });
}

/** Android foreground service — keeps GPS + network alive while app is backgrounded. */
export async function startRideTrackingForeground() {
  if (Platform.OS !== "android" || foregroundActive) return;
  try {
    await ensureLiveTrackingChannel();
    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title: "Live ride in progress",
      body: "Sharing your location for live tracking",
      android: {
        channelId: CHANNEL_ID,
        asForegroundService: true,
        ongoing: true,
        autoCancel: false,
        smallIcon: "ic_notification",
        pressAction: { id: "default" },
      },
    });
    foregroundActive = true;
  } catch (e) {
    if (__DEV__) console.warn("[live-tracking] foreground:", e?.message);
  }
}

export async function stopRideTrackingForeground() {
  if (Platform.OS !== "android" || !foregroundActive) return;
  try {
    await notifee.stopForegroundService();
    await notifee.cancelNotification(NOTIFICATION_ID);
  } catch {
    /* ignore */
  } finally {
    foregroundActive = false;
  }
}
