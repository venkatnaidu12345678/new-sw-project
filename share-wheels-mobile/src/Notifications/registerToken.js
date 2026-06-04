import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerFcmTokenApi } from "../ApiService/AuthApiService";
import { getDeviceTokenWithPermission } from "./FCMService";

const FCM_STORAGE_KEY = "FCM_DEVICE_TOKEN";
const FCM_USER_SYNC_KEY = "FCM_SYNCED_USER_TOKEN";

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const getLoggedInUserId = async () => {
  try {
    const raw = await AsyncStorage.getItem("user");
    if (!raw) return "";
    const u = JSON.parse(raw);
    return (u?._id || u?.id || "").toString();
  } catch {
    return "";
  }
};

/**
 * Register FCM token with backend — always re-syncs on new user or token change.
 * @param {{ force?: boolean }} options
 */
export async function syncFcmTokenWithBackend(options = {}) {
  const { force = false } = options;
  const authToken = await AsyncStorage.getItem("token");
  if (!authToken) return null;

  const userId = await getLoggedInUserId();
  let fcmToken = await getDeviceTokenWithPermission();
  if (!fcmToken) {
    await delay(800);
    fcmToken = await getDeviceTokenWithPermission();
  }
  if (!fcmToken) {
    console.warn("[FCM] no device token (permission denied or Firebase unavailable)");
    return null;
  }

  const syncKey = `${userId}:${fcmToken}`;
  const lastSync = await AsyncStorage.getItem(FCM_USER_SYNC_KEY);
  const cachedToken = await AsyncStorage.getItem(FCM_STORAGE_KEY);

  if (!force && lastSync === syncKey && cachedToken === fcmToken) {
    return fcmToken;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await registerFcmTokenApi(authToken, fcmToken);
      await AsyncStorage.multiSet([
        [FCM_STORAGE_KEY, fcmToken],
        [FCM_USER_SYNC_KEY, syncKey],
      ]);
      if (__DEV__) console.log("[FCM] token registered with backend");
      return fcmToken;
    } catch (e) {
      if (attempt === 2) {
        console.warn("[FCM] token sync failed:", e.message);
      } else {
        await delay(400 * (attempt + 1));
      }
    }
  }

  return null;
}

export async function clearCachedFcmToken() {
  await AsyncStorage.multiRemove([FCM_STORAGE_KEY, FCM_USER_SYNC_KEY]);
}
