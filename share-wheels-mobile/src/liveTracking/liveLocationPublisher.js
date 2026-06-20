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
  acquireGpsPrecise,
  isGeolocationReady,
  setRideGpsMode,
} from "../Utils/gpsService";
import { requestBackgroundLocationForActiveRide } from "../Utils/locationPermissions";
import { hasLocationPermission } from "../Utils/locationPermissions";
import { normalizeRideId } from "./liveTrackingState";
import { getActiveRideTracking } from "../Utils/activeRideTracking";
import {
  startRideTrackingForeground,
  stopRideTrackingForeground,
} from "./rideTrackingForeground";

const SEND_INTERVAL_MS = 1500;
const BACKGROUND_HEARTBEAT_MS = 3000;
const MIN_PUBLISH_MOVE_SQ = 1.2e-9;

let session = null;

/** REST is reliable when the app is backgrounded or the socket is disconnected. */
const persistLocationHttp = (rideId, token, latitude, longitude) => {
  const id = normalizeRideId(rideId);
  if (!id || !token) return;
  updateRideLocation(token, id, latitude, longitude).catch((e) => {
    if (__DEV__) console.warn("[live-location] HTTP:", e?.message);
  });
};

const emitAndPersist = (rideId, token, latitude, longitude) => {
  const id = normalizeRideId(rideId);
  if (!id || !token) return;

  persistLocationHttp(id, token, latitude, longitude);

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
 * One background GPS session per active ride (app-wide).
 * Uses HTTP + socket so tracking continues when the app is minimized.
 */
export async function startLiveLocationPublishing({ rideId, token }) {
  const id = normalizeRideId(rideId);
  if (!id || !token || !isGeolocationReady) return false;

  if (session?.rideId === id) return true;

  if (session) {
    await stopLiveLocationPublishing(true);
  }

  if (!(await hasLocationPermission())) return false;

  setRideGpsMode(true);
  requestBackgroundLocationForActiveRide().catch(() => {});
  startRideTrackingForeground().catch(() => {});

  let watchHandle = null;
  let heartbeatId = null;
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

  heartbeatId = setInterval(() => {
    if (cancelled) return;
    const cached = getCachedCoords();
    if (cached) {
      publish(cached);
      return;
    }
    acquireGpsPrecise().then(publish).catch(() => {});
  }, BACKGROUND_HEARTBEAT_MS);

  const cached = getCachedCoords();
  if (cached) publish(cached);
  acquireGpsPrecise().then(publish).catch(() => {});

  session = {
    rideId: id,
    stop: ({ leaveRoom = false } = {}) => {
      cancelled = true;
      if (heartbeatId) {
        clearInterval(heartbeatId);
        heartbeatId = null;
      }
      watchHandle?.clear?.();
      if (leaveRoom) leaveRideRoom(id);
    },
  };

  return true;
}

/** @param {boolean} force — stop even if active ride flag is still set (ride ended / logout) */
export async function stopLiveLocationPublishing(force = false) {
  if (!session) {
    if (force) await stopRideTrackingForeground();
    return;
  }

  if (!force) {
    const active = await getActiveRideTracking();
    if (normalizeRideId(active?.rideId) === session.rideId) {
      return;
    }
  }

  try {
    session.stop({ leaveRoom: force });
  } catch {
    /* ignore */
  }
  session = null;
  await stopRideTrackingForeground();

  const active = await getActiveRideTracking();
  if (!active?.rideId) setRideGpsMode(false);
}

export function getPublishingRideId() {
  return session?.rideId || null;
}
