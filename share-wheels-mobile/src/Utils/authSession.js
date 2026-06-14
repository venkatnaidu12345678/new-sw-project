import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearActiveRideTracking } from "./activeRideTracking";
import { clearCachedFcmToken } from "../Notifications/registerToken";
import { clearFcmTokenApi } from "../ApiService/AuthApiService";
import { disconnectAppSocket } from "../services/appSocket";
import { uninstallRideBackgroundKeepAlive } from "../liveTracking/rideBackgroundKeepAlive";

const AUTH_KEYS = ["token", "user", "USER_NAME", "PROFILE_IMAGE"];

/** Remove all session data and stop background ride tracking. */
export const clearAuthSession = async () => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    try {
      await clearFcmTokenApi(token);
    } catch {
      /* best-effort — local session still clears */
    }
  }
  await clearActiveRideTracking();
  uninstallRideBackgroundKeepAlive();
  await clearCachedFcmToken();
  disconnectAppSocket();
  await AsyncStorage.multiRemove(AUTH_KEYS);
};
