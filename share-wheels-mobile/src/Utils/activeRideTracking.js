import AsyncStorage from "@react-native-async-storage/async-storage";
import { setRideGpsMode, restartLocationWatchIfActive } from "./gpsService";
import { requestBackgroundLocationForActiveRide } from "./locationPermissions";
import { leaveRideRoom } from "../services/appSocket";
import { normalizeRideId } from "../liveTracking/liveTrackingState";

const KEY = "ACTIVE_RIDE_TRACKING";

export const setActiveRideTracking = async (rideId) => {
  const id = rideId?.toString?.() || rideId;
  if (!id) return;
  setRideGpsMode(true);
  restartLocationWatchIfActive();
  requestBackgroundLocationForActiveRide().catch(() => {});
  await AsyncStorage.setItem(KEY, JSON.stringify({ rideId: id, since: Date.now() }));
};

export const clearActiveRideTracking = async () => {
  const active = await getActiveRideTracking();
  const rideId = normalizeRideId(active?.rideId);
  setRideGpsMode(false);
  const { stopLiveLocationPublishing } = await import(
    "../liveTracking/liveLocationPublisher"
  );
  await stopLiveLocationPublishing(true);
  if (rideId) leaveRideRoom(rideId);
  await AsyncStorage.removeItem(KEY);
};

export const getActiveRideTracking = async () => {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
