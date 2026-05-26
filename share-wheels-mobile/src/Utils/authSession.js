import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearActiveRideTracking } from "./activeRideTracking";
import { clearCachedFcmToken } from "../Notifications/registerToken";
import { disconnectAppSocket } from "../services/appSocket";

const AUTH_KEYS = ["token", "user", "USER_NAME", "PROFILE_IMAGE"];

/** Remove all session data and stop background ride tracking. */
export const clearAuthSession = async () => {
  await clearActiveRideTracking();
  await clearCachedFcmToken();
  disconnectAppSocket();
  await AsyncStorage.multiRemove(AUTH_KEYS);
};
