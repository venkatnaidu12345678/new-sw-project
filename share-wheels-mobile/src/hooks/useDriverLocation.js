import { useEffect, useState } from "react";
import {
  acquireGpsInstant,
  acquireGpsForSharing,
  getCachedCoords,
  isGeolocationReady,
} from "../Utils/gpsService";
import { hasLocationPermission } from "../Utils/locationPermissions";
import {
  startLiveLocationPublishing,
  stopLiveLocationPublishing,
  publishLocationOnce,
  getPublishingRideId,
} from "../liveTracking/liveLocationPublisher";
import { getActiveRideTracking } from "../Utils/activeRideTracking";

const REBUILD_HINT =
  "Location module missing. Rebuild: cd share-wheels-mobile && npm run android";

/** One-shot location upload (e.g. right after starting a ride). No permission dialogs. */
export const pushDriverLocationNow = async (rideId, token, coords) => {
  if (!isGeolocationReady) throw new Error(REBUILD_HINT);

  const ok = await hasLocationPermission();
  if (!ok) return null;

  const id = rideId?.toString?.() || rideId;
  if (!id || !token) return null;

  if (
    coords &&
    Number.isFinite(coords.latitude) &&
    Number.isFinite(coords.longitude)
  ) {
    publishLocationOnce(id, token, coords.latitude, coords.longitude);
    return coords;
  }

  const cached = getCachedCoords();
  if (cached) {
    publishLocationOnce(id, token, cached.latitude, cached.longitude);
    return cached;
  }

  acquireGpsInstant()
    .then((fix) =>
      publishLocationOnce(id, token, fix.latitude, fix.longitude)
    )
    .catch(() => {});

  return cached || null;
};

/** @deprecated Permissions are requested at sign-in only. */
export const ensureLocationPermissionForRide = () => hasLocationPermission();

/** @deprecated */
export const acquireLocationForRide = async () => {
  const ok = await hasLocationPermission();
  if (!ok) throw new Error("Location permission not granted");
  return acquireGpsForSharing();
};

export const ensureLocationReadyForRide = () => acquireLocationForRide();

/**
 * Background GPS for the active ride — never prompts; uses permission from sign-in.
 */
export const useParticipantLocation = ({ enabled, rideId, token }) => {
  const [sharing, setSharing] = useState(false);
  const [lastFix, setLastFix] = useState(null);

  useEffect(() => {
    if (!enabled || !rideId || !token) {
      (async () => {
        const active = await getActiveRideTracking();
        const activeId = active?.rideId?.toString?.() || active?.rideId;
        const currentId = rideId?.toString?.() || rideId;
        if (activeId && currentId && activeId === currentId) {
          return;
        }
        if (getPublishingRideId() && activeId) return;
        stopLiveLocationPublishing();
        setSharing(false);
      })();
      return undefined;
    }

    let cancelled = false;

    (async () => {
      const ok = await hasLocationPermission();
      if (!ok || cancelled) {
        if (__DEV__ && !ok) {
          console.warn("[GPS] skipped — enable location in Settings");
        }
        return;
      }

      const started = await startLiveLocationPublishing({ rideId, token });
      if (!cancelled) setSharing(!!started);
    })();

    const tick = setInterval(() => {
      const c = getCachedCoords();
      if (c) setLastFix(c);
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(tick);
      stopLiveLocationPublishing();
      setSharing(false);
    };
  }, [enabled, rideId, token]);

  return { sharing, lastFix };
};

/** @deprecated use useParticipantLocation */
export const useDriverLocation = useParticipantLocation;
