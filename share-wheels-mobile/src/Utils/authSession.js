import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearActiveRideTracking } from "./activeRideTracking";
import { disconnectRideSocket } from "../services/rideSocket";

const AUTH_KEYS = ["token", "user", "USER_NAME", "PROFILE_IMAGE"];

/** Remove all session data and stop background ride tracking. */
export const clearAuthSession = async () => {
  await clearActiveRideTracking();
  disconnectRideSocket();
  await AsyncStorage.multiRemove(AUTH_KEYS);
};
