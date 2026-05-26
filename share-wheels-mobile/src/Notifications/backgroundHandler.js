/**
 * Must be imported before AppRegistry (see index.js).
 * Handles FCM when the app is in background or quit (data-only extras).
 */
import messaging from "@react-native-firebase/messaging";

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  if (__DEV__) {
    console.log("[FCM] background message:", remoteMessage?.messageId);
  }
});
