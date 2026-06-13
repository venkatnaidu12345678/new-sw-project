import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerFcmTokenApi } from "../ApiService/AuthApiService";
import { getDeviceTokenWithPermission, wasFcmTokenFailureLogged } from "./FCMService";
import { wakeBackendIfRemote } from "../Utils/wakeBackend";

const FCM_STORAGE_KEY = "FCM_DEVICE_TOKEN";
const FCM_USER_SYNC_KEY = "FCM_SYNCED_USER_TOKEN";
const FCM_SYNC_SCHEMA_KEY = "FCM_SYNC_SCHEMA";
const FCM_SYNC_SCHEMA = "v2";

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

/** Drop stale "synced" flags from older app versions that skipped failed API calls. */
const ensureSyncSchema = async () => {
  const schema = await AsyncStorage.getItem(FCM_SYNC_SCHEMA_KEY);
  if (schema === FCM_SYNC_SCHEMA) return;
  await clearCachedFcmToken();
  await AsyncStorage.setItem(FCM_SYNC_SCHEMA_KEY, FCM_SYNC_SCHEMA);
};

const SYNC_RETRY_DELAYS_MS = [0, 2000, 5000, 10000, 15000, 20000];

/**
 * Register FCM token with backend — re-syncs on new user, token change, or force.
 * @param {{ force?: boolean }} options
 */
export async function syncFcmTokenWithBackend(options = {}) {
  const { force = false } = options;
  await ensureSyncSchema();

  const authToken = await AsyncStorage.getItem("token");
  if (!authToken) return null;

  const userId = await getLoggedInUserId();
  let fcmToken = await getDeviceTokenWithPermission();
  if (!fcmToken) {
    await delay(1500);
    fcmToken = await getDeviceTokenWithPermission();
  }
  if (!fcmToken) {
    if (!wasFcmTokenFailureLogged()) {
      console.warn(
        "[FCM] no device token — allow Notifications in Android settings; add app SHA fingerprints in Firebase and replace google-services.json (npm run android:sha)"
      );
    }
    return null;
  }

  const syncKey = `${FCM_SYNC_SCHEMA}:${userId}:${fcmToken}`;
  const lastSync = await AsyncStorage.getItem(FCM_USER_SYNC_KEY);
  const cachedToken = await AsyncStorage.getItem(FCM_STORAGE_KEY);

  if (!force && lastSync === syncKey && cachedToken === fcmToken) {
    return fcmToken;
  }

  await wakeBackendIfRemote();

  for (let attempt = 0; attempt < SYNC_RETRY_DELAYS_MS.length; attempt += 1) {
    if (SYNC_RETRY_DELAYS_MS[attempt] > 0) {
      await delay(SYNC_RETRY_DELAYS_MS[attempt]);
    }
    try {
      const res = await registerFcmTokenApi(authToken, fcmToken);
      if (res?.success === false) {
        throw new Error(res?.message || "FCM register failed");
      }
      await AsyncStorage.multiSet([
        [FCM_STORAGE_KEY, fcmToken],
        [FCM_USER_SYNC_KEY, syncKey],
      ]);
      console.log("[FCM] token registered with backend, length:", fcmToken.length);
      return fcmToken;
    } catch (e) {
      await AsyncStorage.removeItem(FCM_USER_SYNC_KEY);
      if (attempt === SYNC_RETRY_DELAYS_MS.length - 1) {
        console.warn("[FCM] token sync failed:", e?.message || e);
      }
    }
  }

  return null;
}

export async function clearCachedFcmToken() {
  await AsyncStorage.multiRemove([
    FCM_STORAGE_KEY,
    FCM_USER_SYNC_KEY,
    FCM_SYNC_SCHEMA_KEY,
  ]);
}
