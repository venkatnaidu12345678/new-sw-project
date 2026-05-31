import Geolocation from "@react-native-community/geolocation";
import { NativeModules } from "react-native";
import { hasLocationPermission } from "./locationPermissions";

export const isGeolocationReady =
  !!Geolocation &&
  typeof Geolocation.getCurrentPosition === "function" &&
  !!NativeModules.RNCGeolocation;

if (Geolocation?.setRNConfiguration) {
  Geolocation.setRNConfiguration({
    skipPermissionRequests: true,
    authorizationLevel: "whenInUse",
    locationProvider: "auto",
  });
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
  timeout: 12000,
  maximumAge: 20000,
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

export const setCachedCoords = (coords) => {
  if (
    coords &&
    Number.isFinite(coords.latitude) &&
    Number.isFinite(coords.longitude)
  ) {
    lastKnownCoords = coords;
    notifyWatchers(coords);
  }
};

const parsePosition = (pos) => {
  const { latitude, longitude, accuracy } = pos?.coords || {};
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Could not read GPS coordinates");
  }
  const coords = { latitude, longitude, accuracy };
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

/** Best effort in under ~4s using cache first */
export const acquireGpsInstant = async () => {
  if (lastKnownCoords) return lastKnownCoords;
  try {
    return await getCurrentPosition(INSTANT);
  } catch (e) {
    throw new Error(mapGpsError(e));
  }
};

/** Tries instant → fast → precise without long cumulative waits */
export const acquireGpsForSharing = async () => {
  if (lastKnownCoords) return lastKnownCoords;
  const attempts = [INSTANT, FAST, PRECISE];
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

export const WATCH_OPTIONS = {
  enableHighAccuracy: false,
  distanceFilter: 15,
  interval: 10000,
  fastestInterval: 5000,
  timeout: 15000,
  maximumAge: 30000,
};

export const startLocationWatch = (onPosition, onError) => {
  if (!isGeolocationReady) return null;
  return Geolocation.watchPosition(
    (pos) => {
      try {
        onPosition(parsePosition(pos));
      } catch {
        /* ignore */
      }
    },
    onError || (() => {}),
    WATCH_OPTIONS
  );
};

export const canShareLocation = () => hasLocationPermission();
