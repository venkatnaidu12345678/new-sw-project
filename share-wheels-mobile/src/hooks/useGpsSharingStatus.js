import { useEffect, useState } from "react";
import { subscribeGpsUpdates } from "../Utils/gpsService";
import { hasLocationPermission } from "../Utils/locationPermissions";

/**
 * Lightweight GPS status for map UI (no blocking waits).
 */
export const useGpsSharingStatus = (enabled) => {
  const [permission, setPermission] = useState(false);
  const [hasFix, setHasFix] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setPermission(false);
      setHasFix(false);
      return undefined;
    }

    let active = true;
    hasLocationPermission().then((ok) => {
      if (active) setPermission(ok);
    });

    const unsub = subscribeGpsUpdates((coords) => {
      if (active && coords) setHasFix(true);
    });

    return () => {
      active = false;
      unsub();
    };
  }, [enabled]);

  return { permission, hasFix, sharing: permission && hasFix };
};
