import { useEffect, useRef } from "react";
import { updateRideLocation } from "../ApiService/chatApiServices";
import {
  connectRideSocket,
  joinRideRoom,
  leaveRideRoom,
  emitLocationViaSocket,
  releaseRideSocket,
} from "../services/rideSocket";
import {
  hasLocationPermission,
  requestLocationPermissionForDriverStart,
} from "../Utils/locationPermissions";

import Geolocation from "@react-native-community/geolocation";
import { NativeModules } from "react-native";

const isGeolocationLinked =
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

const REBUILD_HINT =
  "Location native module is missing. Run: cd share-wheels-mobile && npm install && npx react-native run-android";

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

const acquireGpsFix = async () => {
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

/** Driver start ride — prompts for permission only if not granted at login. */
export const acquireLocationForRide = async () => {
  assertGeolocationReady();

  const permitted = await requestLocationPermissionForDriverStart();
  if (!permitted) {
    throw new Error(
      "Location permission is required to start a ride. Allow location access when prompted, or enable it in Settings."
    );
  }

  return acquireGpsFix();
};

const sendCoords = async (token, rideId, latitude, longitude) => {
  if (!token || !rideId) return;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Invalid GPS coordinates");
  }
  const id = rideId?.toString?.() || rideId;
  emitLocationViaSocket(id, latitude, longitude);
  const data = await updateRideLocation(token, id, latitude, longitude);
  if (__DEV__) {
    console.log("[GPS] sent", rideId, latitude, longitude, data?.success);
  }
  return data;
};

export const ensureLocationReadyForRide = () => acquireLocationForRide();

/**
 * Send location to server. Pass coords if already acquired (avoids second GPS wait).
 * Does not prompt — requires permission already granted.
 */
export const pushDriverLocationNow = async (rideId, token, coords) => {
  assertGeolocationReady();

  const ok = await hasLocationPermission();
  if (!ok) throw new Error("Location permission denied");

  if (
    coords &&
    Number.isFinite(coords.latitude) &&
    Number.isFinite(coords.longitude)
  ) {
    return sendCoords(token, rideId, coords.latitude, coords.longitude);
  }

  const acquired = await acquireGpsFix();
  return sendCoords(token, rideId, acquired.latitude, acquired.longitude);
};

/**
 * Sends participant GPS while ride is started. Never prompts — uses permission from login or driver request.
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
    let cancelled = false;

    (async () => {
      const ok = await hasLocationPermission();
      if (!ok || cancelled) {
        if (__DEV__) {
          console.warn("[GPS] tracking skipped — location not granted");
        }
        return;
      }

      try {
        await connectRideSocket(token);
        if (cancelled) return;
        joinRideRoom(rideId);
      } catch (e) {
        console.warn("[Socket] tracking connect failed:", e.message);
      }

      if (cancelled) return;

      try {
        await pushDriverLocationNow(rideId, token);
      } catch (e) {
        console.warn("[GPS] initial ping:", e.message);
      }

      if (cancelled) return;

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
      cancelled = true;
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
