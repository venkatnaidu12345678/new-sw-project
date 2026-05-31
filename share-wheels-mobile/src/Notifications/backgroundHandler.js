/**
 * Must be imported before AppRegistry (see index.js).
 * Shows tray notifications when FCM arrives in background / quit.
 */
import {
  getFCMMessaging,
  setBackgroundMessageHandler,
} from "./firebaseMessaging";
import { displayForegroundNotification } from "./displayLocalNotification";

setBackgroundMessageHandler(getFCMMessaging(), async (remoteMessage) => {
  try {
    await displayForegroundNotification(remoteMessage);
  } catch (e) {
    if (__DEV__) {
      console.warn("[FCM] background display:", e?.message || e);
    }
  }
});
