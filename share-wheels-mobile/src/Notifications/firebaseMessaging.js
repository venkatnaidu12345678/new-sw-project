/**
 * Modular React Native Firebase Messaging (v22-style API).
 * @see https://rnfirebase.io/migrating-to-v22
 */
import { getApp } from "@react-native-firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  onTokenRefresh,
  requestPermission,
  registerDeviceForRemoteMessages,
  isDeviceRegisteredForRemoteMessages,
  setBackgroundMessageHandler,
  AuthorizationStatus,
} from "@react-native-firebase/messaging";

let messagingInstance;

export const getFCMMessaging = () => {
  if (!messagingInstance) {
    messagingInstance = getMessaging(getApp());
  }
  return messagingInstance;
};

export { AuthorizationStatus, getToken, onMessage, onNotificationOpenedApp, getInitialNotification, onTokenRefresh, requestPermission, registerDeviceForRemoteMessages, isDeviceRegisteredForRemoteMessages, setBackgroundMessageHandler };
