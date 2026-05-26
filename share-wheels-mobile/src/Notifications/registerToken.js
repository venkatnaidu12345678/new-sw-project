import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerFcmTokenApi } from "../ApiService/AuthApiService";
import { getDeviceToken } from "./FCMService";

const FCM_STORAGE_KEY = "FCM_DEVICE_TOKEN";

export async function syncFcmTokenWithBackend() {
  const authToken = await AsyncStorage.getItem("token");
  if (!authToken) return null;

  const fcmToken = await getDeviceToken();
  if (!fcmToken) return null;

  const cached = await AsyncStorage.getItem(FCM_STORAGE_KEY);
  if (cached === fcmToken) {
    return fcmToken;
  }

  try {
    await registerFcmTokenApi(authToken, fcmToken);
    await AsyncStorage.setItem(FCM_STORAGE_KEY, fcmToken);
    if (__DEV__) console.log("[FCM] token registered with backend");
  } catch (e) {
    console.warn("[FCM] token sync failed:", e.message);
  }

  return fcmToken;
}

export async function clearCachedFcmToken() {
  await AsyncStorage.removeItem(FCM_STORAGE_KEY);
}
