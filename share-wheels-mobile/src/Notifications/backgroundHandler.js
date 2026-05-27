/**
 * Must be imported before AppRegistry (see index.js).
 * Handles FCM when the app is in background or quit (data-only extras).
 */
import {
  getFCMMessaging,
  setBackgroundMessageHandler,
} from "./firebaseMessaging";

setBackgroundMessageHandler(getFCMMessaging(), async (remoteMessage) => {
  if (__DEV__) {
    console.log("[FCM] background message:", remoteMessage?.messageId);
  }
});
