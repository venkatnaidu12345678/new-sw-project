/**
 * Must be imported before AppRegistry (see index.js).
 * Data-only FCM messages in background; skip when system already shows notification payload.
 */
import {
  getFCMMessaging,
  setBackgroundMessageHandler,
} from "./firebaseMessaging";
import { displayForegroundNotification } from "./displayLocalNotification";

setBackgroundMessageHandler(getFCMMessaging(), async (remoteMessage) => {
  if (remoteMessage?.notification?.title) {
    return;
  }

  try {
    await displayForegroundNotification(remoteMessage);
  } catch (e) {
    if (__DEV__) {
      console.warn("[FCM] background display:", e?.message || e);
    }
  }
});
