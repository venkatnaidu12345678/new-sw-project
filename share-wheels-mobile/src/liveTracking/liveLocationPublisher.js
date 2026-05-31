import Geolocation from "@react-native-community/geolocation";
import {
  connectAppSocket,
  getAppSocket,
  joinRideRoom,
  leaveRideRoom,
} from "../services/appSocket";
import { updateRideLocation } from "../ApiService/chatApiServices";
import {
  startLocationWatch,
  getCachedCoords,
  acquireGpsInstant,
  isGeolocationReady,
} from "../Utils/gpsService";
import { hasLocationPermission } from "../Utils/locationPermissions";
import { normalizeRideId } from "./liveTrackingState";

const SEND_INTERVAL_MS = 4000;

let session = null;

const emitAndPersist = (rideId, token, latitude, longitude) => {
  const id = normalizeRideId(rideId);
  if (!id || !token) return;

  const payload = {
    rideId: id,
    lat: latitude,
    lng: longitude,
    latitude,
    longitude,
  };
  const socket = getAppSocket();
  if (socket?.connected) {
    socket.emit("updateLocation", payload);
  } else {
    connectAppSocket()
      .then((s) => {
        if (s?.connected) s.emit("updateLocation", payload);
      })
      .catch(() => {});
  }

  updateRideLocation(token, id, latitude, longitude).catch(() => {});
};

export const publishLocationOnce = (rideId, token, latitude, longitude) => {
  emitAndPersist(rideId, token, latitude, longitude);
};

/**
 * One background GPS session per active ride (app-wide). Uses the shared app socket.
 */
export async function startLiveLocationPublishing({ rideId, token }) {
  stopLiveLocationPublishing();

  const id = normalizeRideId(rideId);
  if (!id || !token || !isGeolocationReady) return false;

  if (!(await hasLocationPermission())) return false;

  let watchId = null;
  let intervalId = null;
  let lastSent = 0;
  let cancelled = false;

  const publish = (coords) => {
    if (cancelled || !coords) return;
    const now = Date.now();
    if (now - lastSent < SEND_INTERVAL_MS) return;
    lastSent = now;
    emitAndPersist(id, token, coords.latitude, coords.longitude);
  };

  await joinRideRoom(id);

  watchId = startLocationWatch(publish, () => {});

  const cached = getCachedCoords();
  if (cached) publish(cached);
  else acquireGpsInstant().then(publish).catch(() => {});

  intervalId = setInterval(() => {
    const c = getCachedCoords();
    if (c) publish(c);
  }, 20000);

  session = {
    rideId: id,
    stop: () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      if (watchId != null) Geolocation.clearWatch(watchId);
      leaveRideRoom(id);
    },
  };

  return true;
}

export function stopLiveLocationPublishing() {
  if (session) {
    try {
      session.stop();
    } catch {
      /* ignore */
    }
    session = null;
  }
}

export function getPublishingRideId() {
  return session?.rideId || null;
}
