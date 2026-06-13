import Geolocation from "@react-native-community/geolocation";
import { NativeModules } from "react-native";
import { hasLocationPermission } from "./locationPermissions";

export const isGeolocationReady =
  !!Geolocation &&
  typeof Geolocation.getCurrentPosition === "function" &&
  !!NativeModules.RNCGeolocation;

let rideTrackingMode = false;

export const setRideGpsMode = (active) => {
  rideTrackingMode = !!active;
  if (!Geolocation?.setRNConfiguration) return;
  try {
    Geolocation.setRNConfiguration({
      skipPermissionRequests: true,
      authorizationLevel: rideTrackingMode ? "always" : "whenInUse",
      locationProvider: "auto",
    });
  } catch {
    /* ignore native config failures */
  }
};

if (Geolocation?.setRNConfiguration) {
  setRideGpsMode(false);
}

/** Instant — cached / network fix, does not block UI long */
const INSTANT = {
  enableHighAccuracy: false,
  timeout: 4000,
  maximumAge: 600000,
};

const FAST = {
  enableHighAccuracy: false,
  timeout: 8000,
  maximumAge: 120000,
};

const PRECISE = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

const RIDE_PRECISE = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 0,
};

let lastKnownCoords = null;
let watchSubscribers = new Set();

const notifyWatchers = (coords) => {
  watchSubscribers.forEach((fn) => {
    try {
      fn(coords);
    } catch {
      /* ignore */
    }
  });
};

export const getCachedCoords = () => lastKnownCoords;

const isBetterFix = (next, prev) => {
  if (!prev) return true;
  if (!Number.isFinite(next.accuracy)) return true;
  if (!Number.isFinite(prev.accuracy)) return true;
  if (next.accuracy <= prev.accuracy) return true;
  /** Reject a much worse fix unless the previous one is stale */
  const prevAge = prev.acquiredAt ? Date.now() - prev.acquiredAt : Infinity;
  if (prevAge > 45000) return true;
  return next.accuracy <= prev.accuracy * 1.35;
};

export const setCachedCoords = (coords) => {
  if (
    !coords ||
    !Number.isFinite(coords.latitude) ||
    !Number.isFinite(coords.longitude)
  ) {
    return;
  }
  const next = { ...coords, acquiredAt: Date.now() };
  if (!isBetterFix(next, lastKnownCoords)) return;
  lastKnownCoords = next;
  notifyWatchers(next);
};

const parsePosition = (pos) => {
  const { latitude, longitude, accuracy, heading, speed } = pos?.coords || {};
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Could not read GPS coordinates");
  }
  const coords = {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
    heading: Number.isFinite(heading) ? heading : undefined,
    speed: Number.isFinite(speed) ? speed : undefined,
    acquiredAt: Date.now(),
  };
  setCachedCoords(coords);
  return coords;
};

export const getCurrentPosition = (options) =>
  new Promise((resolve, reject) => {
    if (!isGeolocationReady) {
      reject(new Error("Location module not available"));
      return;
    }
    Geolocation.getCurrentPosition(
      (pos) => {
        try {
          resolve(parsePosition(pos));
        } catch (e) {
          reject(e);
        }
      },
      reject,
      options
    );
  });

const mapGpsError = (err) => {
  const code = err?.code;
  if (code === 1) {
    return "Location permission denied. Enable it in Settings → Apps → Share Wheels.";
  }
  if (code === 2) {
    return "Turn on Location/GPS in your phone settings.";
  }
  if (code === 3) {
    return "GPS signal weak — try outdoors or near a window.";
  }
  return err?.message || "Could not get location";
};

const isFreshAccurateCache = (coords) => {
  if (!coords) return false;
  const age = coords.acquiredAt ? Date.now() - coords.acquiredAt : Infinity;
  const accurate =
    !Number.isFinite(coords.accuracy) || coords.accuracy <= 35;
  return age <= 20000 && accurate;
};

/** Best effort in under ~4s using cache first (non-ride flows). */
export const acquireGpsInstant = async () => {
  if (isFreshAccurateCache(lastKnownCoords)) return lastKnownCoords;
  if (rideTrackingMode) {
    try {
      return await getCurrentPosition(RIDE_PRECISE);
    } catch {
      if (lastKnownCoords) return lastKnownCoords;
    }
  }
  try {
    return await getCurrentPosition(INSTANT);
  } catch (e) {
    if (lastKnownCoords) return lastKnownCoords;
    throw new Error(mapGpsError(e));
  }
};

/** High-accuracy fix for live ride sharing (never uses stale network cache). */
export const acquireGpsPrecise = async () => {
  if (isFreshAccurateCache(lastKnownCoords)) return lastKnownCoords;
  const attempts = rideTrackingMode
    ? [RIDE_PRECISE, PRECISE, FAST]
    : [PRECISE, FAST, INSTANT];
  let lastErr = null;
  for (const opts of attempts) {
    try {
      return await getCurrentPosition(opts);
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastKnownCoords) return lastKnownCoords;
  throw new Error(mapGpsError(lastErr));
};

/** Tries instant → fast → precise without long cumulative waits */
export const acquireGpsForSharing = async () => {
  if (rideTrackingMode) return acquireGpsPrecise();
  if (isFreshAccurateCache(lastKnownCoords)) return lastKnownCoords;
  const attempts = [PRECISE, FAST, INSTANT];
  let lastErr = null;
  for (const opts of attempts) {
    try {
      return await getCurrentPosition(opts);
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastKnownCoords) return lastKnownCoords;
  throw new Error(mapGpsError(lastErr));
};

export const subscribeGpsUpdates = (listener) => {
  watchSubscribers.add(listener);
  if (lastKnownCoords) listener(lastKnownCoords);
  return () => watchSubscribers.delete(listener);
};

let sharedWatchId = null;
const sharedWatchListeners = new Set();

const ensureSharedLocationWatch = () => {
  if (sharedWatchId != null || !isGeolocationReady) return;
  try {
    sharedWatchId = Geolocation.watchPosition(
      (pos) => {
        try {
          const coords = parsePosition(pos);
          sharedWatchListeners.forEach((fn) => {
            try {
              fn(coords);
            } catch {
              /* ignore */
            }
          });
        } catch {
          /* ignore */
        }
      },
      () => {},
      getLocationWatchOptions()
    );
  } catch {
    sharedWatchId = null;
  }
};

const stopSharedLocationWatchIfIdle = () => {
  if (sharedWatchListeners.size === 0 && sharedWatchId != null) {
    Geolocation.clearWatch(sharedWatchId);
    sharedWatchId = null;
  }
};

/** One shared high-accuracy watch — safe for map + publisher together. */
export const subscribeLocationWatch = (onPosition) => {
  if (typeof onPosition === "function") {
    sharedWatchListeners.add(onPosition);
  }
  ensureSharedLocationWatch();
  if (lastKnownCoords) onPosition?.(lastKnownCoords);
  return () => {
    sharedWatchListeners.delete(onPosition);
    stopSharedLocationWatchIfIdle();
  };
};

export const WATCH_OPTIONS = {
  enableHighAccuracy: false,
  distanceFilter: 15,
  interval: 10000,
  fastestInterval: 5000,
  timeout: 15000,
  maximumAge: 30000,
};

export const WATCH_OPTIONS_ACTIVE_RIDE = {
  enableHighAccuracy: true,
  distanceFilter: 2,
  interval: 2000,
  fastestInterval: 1000,
  timeout: 25000,
  maximumAge: 2000,
};

export const getLocationWatchOptions = () =>
  rideTrackingMode ? WATCH_OPTIONS_ACTIVE_RIDE : WATCH_OPTIONS;

export const startLocationWatch = (onPosition, onError) => {
  if (!isGeolocationReady) return null;
  if (onError) {
    /* shared watch uses a no-op error handler; callers rarely need onError */
  }
  const unsub = subscribeLocationWatch(onPosition);
  return { clear: unsub };
};

/** Re-apply watch options after ride mode toggles (higher accuracy during rides). */
export const restartLocationWatchIfActive = () => {
  if (sharedWatchId != null && sharedWatchListeners.size > 0) {
    Geolocation.clearWatch(sharedWatchId);
    sharedWatchId = null;
    ensureSharedLocationWatch();
  }
};

export const canShareLocation = () => hasLocationPermission();
