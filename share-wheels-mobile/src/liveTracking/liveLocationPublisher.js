import {
  connectAppSocket,
  getAppSocket,
  joinRideRoom,
  leaveRideRoom,
} from "../services/appSocket";
import {
  startLocationWatch,
  getCachedCoords,
  acquireGpsPrecise,
  isGeolocationReady,
  setRideGpsMode,
} from "../Utils/gpsService";
import { requestBackgroundLocationForActiveRide } from "../Utils/locationPermissions";
import { hasLocationPermission } from "../Utils/locationPermissions";
import { normalizeRideId } from "./liveTrackingState";
import { getActiveRideTracking } from "../Utils/activeRideTracking";

const SEND_INTERVAL_MS = 1500;
const MIN_PUBLISH_MOVE_SQ = 1.2e-9;

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
  const tryEmit = (s) => {
    if (s?.connected) s.emit("updateLocation", payload);
  };

  const socket = getAppSocket();
  if (socket?.connected) {
    tryEmit(socket);
    return;
  }

  connectAppSocket()
    .then(tryEmit)
    .catch(() => {});
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

  setRideGpsMode(true);
  requestBackgroundLocationForActiveRide().catch(() => {});

  let watchHandle = null;
  let cancelled = false;
  let lastSent = 0;
  let lastPublished = null;

  const movedEnough = (coords) => {
    if (!lastPublished) return true;
    const dLat = coords.latitude - lastPublished.latitude;
    const dLng = coords.longitude - lastPublished.longitude;
    return dLat * dLat + dLng * dLng >= MIN_PUBLISH_MOVE_SQ;
  };

  const accuracyImproved = (coords) => {
    if (!Number.isFinite(coords?.accuracy) || !Number.isFinite(lastPublished?.accuracy)) {
      return false;
    }
    return coords.accuracy < lastPublished.accuracy - 4;
  };

  const publish = (coords) => {
    if (cancelled || !coords) return;
    const now = Date.now();
    const shouldSend =
      movedEnough(coords) ||
      accuracyImproved(coords) ||
      now - lastSent >= SEND_INTERVAL_MS;

    if (!shouldSend) return;

    lastSent = now;
    lastPublished = coords;
    emitAndPersist(id, token, coords.latitude, coords.longitude);
  };

  await connectAppSocket();
  await joinRideRoom(id);

  watchHandle = startLocationWatch(publish, () => {});

  const cached = getCachedCoords();
  if (cached) publish(cached);
  acquireGpsPrecise().then(publish).catch(() => {});

  session = {
    rideId: id,
    stop: () => {
      cancelled = true;
      watchHandle?.clear?.();
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
  getActiveRideTracking().then((active) => {
    if (!active?.rideId) setRideGpsMode(false);
  });
}

export function getPublishingRideId() {
  return session?.rideId || null;
}
