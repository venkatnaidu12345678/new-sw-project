import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { connectAppSocket, getAppSocket } from "../services/appSocket";
import { getActiveRideTracking } from "../Utils/activeRideTracking";
import { acquireGpsInstant, acquireGpsPrecise, getCachedCoords } from "../Utils/gpsService";
import {
  publishLocationOnce,
  startLiveLocationPublishing,
  getPublishingRideId,
} from "./liveLocationPublisher";

const HEARTBEAT_MS = 3000;

let installed = false;
let heartbeatId = null;
let appStateSub = null;

const publishCachedForActiveRide = async () => {
  const active = await getActiveRideTracking();
  const rideId = active?.rideId;
  if (!rideId) return;

  const token = await AsyncStorage.getItem("token");
  if (!token) return;

  if (!getPublishingRideId()) {
    await startLiveLocationPublishing({ rideId, token });
  }

  const cached = getCachedCoords();
  const stale =
    !cached?.acquiredAt || Date.now() - cached.acquiredAt > 8000;

  if (cached && !stale) {
    publishLocationOnce(rideId, token, cached.latitude, cached.longitude);
    return;
  }

  try {
    const fix = stale ? await acquireGpsPrecise() : await acquireGpsInstant();
    publishLocationOnce(rideId, token, fix.latitude, fix.longitude);
  } catch {
    if (cached) {
      publishLocationOnce(rideId, token, cached.latitude, cached.longitude);
    }
  }
};

const ensureSocketConnected = () => {
  connectAppSocket().catch(() => {});
  const s = getAppSocket();
  if (s && !s.connected && !s.active) {
    try {
      s.connect();
    } catch {
      /* ignore */
    }
  }
};

/**
 * Keeps socket warm and pushes location while app is backgrounded (not force-killed).
 * Call once when user is authenticated.
 */
export function installRideBackgroundKeepAlive() {
  if (installed) return;
  installed = true;

  appStateSub = AppState.addEventListener("change", (state) => {
    if (state === "background" || state === "inactive") {
      ensureSocketConnected();
      publishCachedForActiveRide();
      return;
    }
    if (state === "active") {
      ensureSocketConnected();
      publishCachedForActiveRide();
    }
  });

  heartbeatId = setInterval(async () => {
    const active = await getActiveRideTracking();
    if (!active?.rideId) return;
    ensureSocketConnected();
    await publishCachedForActiveRide();
  }, HEARTBEAT_MS);
}

export function uninstallRideBackgroundKeepAlive() {
  if (!installed) return;
  installed = false;
  appStateSub?.remove?.();
  appStateSub = null;
  if (heartbeatId) {
    clearInterval(heartbeatId);
    heartbeatId = null;
  }
}
