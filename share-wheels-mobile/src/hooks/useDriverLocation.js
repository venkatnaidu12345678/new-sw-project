import { useEffect, useRef } from "react";
import { Platform, PermissionsAndroid, NativeModules } from "react-native";
import { updateRideLocation } from "../ApiService/chatApiServices";
import {
  connectRideSocket,
  joinRideRoom,
  leaveRideRoom,
  emitLocationViaSocket,
  releaseRideSocket,
} from "../services/rideSocket";

import Geolocation from "@react-native-community/geolocation";

const isGeolocationLinked =
  !!Geolocation &&
  typeof Geolocation.getCurrentPosition === "function" &&
  !!NativeModules.RNCGeolocation;

if (Geolocation?.setRNConfiguration) {
  Geolocation.setRNConfiguration({
    skipPermissionRequests: false,
    authorizationLevel: "whenInUse",
    locationProvider: "auto",
  });
}

const REBUILD_HINT =
  "Location native module is missing. Run: cd share-wheels-mobile && npm install && npx react-native run-android";

/** Fast network/cached fix first; high-accuracy GPS last (avoids indoor timeouts). */
const LOCATION_ATTEMPTS = [
  { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 },
  { enableHighAccuracy: false, timeout: 25000, maximumAge: 60000 },
  { enableHighAccuracy: true, timeout: 40000, maximumAge: 30000 },
];

const WATCH_OPTIONS = {
  enableHighAccuracy: false,
  distanceFilter: 20,
  interval: 12000,
  fastestInterval: 8000,
  timeout: 20000,
  maximumAge: 60000,
};

const hasLocationPermission = async () => {
  if (Platform.OS !== "android") return true;
  try {
    const fine = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    if (fine) return true;
    return PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
    );
  } catch {
    return false;
  }
};

const requestLocationPermission = async () => {
  if (Platform.OS !== "android") return true;

  if (await hasLocationPermission()) return true;

  const fine = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  );
  if (fine === PermissionsAndroid.RESULTS.GRANTED) return true;

  const coarse = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
  );
  return coarse === PermissionsAndroid.RESULTS.GRANTED;
};

const mapGpsError = (err) => {
  const code = err?.code;
  if (code === 1) {
    return "Location permission denied. Open Settings → Apps → Share Wheels → Permissions → Location → Allow.";
  }
  if (code === 2) {
    return "Location is turned off. Turn on Location/GPS in quick settings, then try again.";
  }
  if (code === 3) {
    return (
      "Could not get your location in time. Turn on Location, move near a window or outdoors, wait a few seconds, and tap Start Ride again."
    );
  }
  return err?.message || "Turn on Location and allow Share Wheels to use it.";
};

const assertGeolocationReady = () => {
  if (!isGeolocationLinked) {
    throw new Error(REBUILD_HINT);
  }
};

const parsePosition = (pos) => {
  const { latitude, longitude, accuracy } = pos?.coords || {};
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Could not read GPS coordinates");
  }
  return { latitude, longitude, accuracy };
};

const getCurrentPositionAsync = (options) =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos) => {
        try {
          resolve(parsePosition(pos));
        } catch (e) {
          reject(e);
        }
      },
      (err) => reject(err),
      options
    );
  });

/** Tries cached/network location first, then high-accuracy GPS. */
export const acquireLocationForRide = async () => {
  assertGeolocationReady();

  const permitted = await requestLocationPermission();
  if (!permitted) {
    throw new Error(
      "Location permission is required to start a ride. Allow location access when prompted, or enable it in Settings."
    );
  }

  let lastError = null;
  for (const options of LOCATION_ATTEMPTS) {
    try {
      const coords = await getCurrentPositionAsync(options);
      if (__DEV__) {
        console.log("[GPS] acquired", coords, options);
      }
      return coords;
    } catch (err) {
      lastError = err;
      if (__DEV__) {
        console.log("[GPS] attempt failed", err?.message || err);
      }
    }
  }

  throw new Error(mapGpsError(lastError));
};

const sendCoords = async (token, rideId, latitude, longitude) => {
  if (!token || !rideId) return;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Invalid GPS coordinates");
  }
  emitLocationViaSocket(rideId, latitude, longitude);
  const data = await updateRideLocation(token, rideId, latitude, longitude);
  if (__DEV__) {
    console.log("[GPS] sent", rideId, latitude, longitude, data?.success);
  }
  return data;
};

/**
 * Must pass before Start Ride — permission + working location fix.
 */
export const ensureLocationReadyForRide = () => acquireLocationForRide();

/**
 * Send location to server. Pass coords if already acquired (avoids second GPS wait).
 */
export const pushDriverLocationNow = async (rideId, token, coords) => {
  assertGeolocationReady();

  const ok = await requestLocationPermission();
  if (!ok) throw new Error("Location permission denied");

  if (
    coords &&
    Number.isFinite(coords.latitude) &&
    Number.isFinite(coords.longitude)
  ) {
    return sendCoords(token, rideId, coords.latitude, coords.longitude);
  }

  const acquired = await acquireLocationForRide();
  return sendCoords(token, rideId, acquired.latitude, acquired.longitude);
};

/**
 * Sends participant GPS to backend while ride is started (driver, passenger, courier).
 */
export const useParticipantLocation = ({ enabled, rideId, token }) => {
  const watchId = useRef(null);
  const lastSent = useRef(0);

  useEffect(() => {
    if (!enabled || !rideId || !token) {
      if (watchId.current != null && isGeolocationLinked) {
        Geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      return undefined;
    }

    if (!isGeolocationLinked) {
      console.warn("[GPS]", REBUILD_HINT);
      return undefined;
    }

    const pushLocation = (pos) => {
      const now = Date.now();
      if (now - lastSent.current < 6000) return;
      lastSent.current = now;

      try {
        const { latitude, longitude } = parsePosition(pos);
        sendCoords(token, rideId, latitude, longitude).catch((e) => {
          console.warn("[GPS] update failed:", e.message);
        });
      } catch {
        /* ignore bad fix */
      }
    };

    const onError = (err) => {
      console.warn("[GPS] error:", err?.message || err);
    };

    let intervalId;

    (async () => {
      const ok = await requestLocationPermission();
      if (!ok) {
        console.warn("[GPS] permission denied");
        return;
      }

      try {
        await connectRideSocket(token);
        joinRideRoom(rideId);
      } catch (e) {
        console.warn("[Socket] tracking connect failed:", e.message);
      }

      try {
        await pushDriverLocationNow(rideId, token);
      } catch (e) {
        console.warn("[GPS] initial ping:", e.message);
      }

      watchId.current = Geolocation.watchPosition(pushLocation, onError, WATCH_OPTIONS);

      intervalId = setInterval(() => {
        getCurrentPositionAsync({
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 90000,
        })
          .then(({ latitude, longitude }) =>
            sendCoords(token, rideId, latitude, longitude)
          )
          .catch(() => {});
      }, 20000);
    })();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (watchId.current != null) {
        Geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      leaveRideRoom(rideId);
      releaseRideSocket();
    };
  }, [enabled, rideId, token]);
};

/** @deprecated use useParticipantLocation */
export const useDriverLocation = useParticipantLocation;
