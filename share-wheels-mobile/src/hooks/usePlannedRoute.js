import { useEffect, useState, useRef } from "react";
import { getDirectionsPolyline } from "../ApiService/placesApiService";
import { decodePolyline } from "../Utils/polyline";
import { toPoint } from "../liveTracking/liveTrackingState";

/**
 * Fetches Google Directions polyline for ride from/to coordinates.
 */
export function usePlannedRoute(fromCoords, toCoords, enabled = true) {
  const [route, setRoute] = useState([]);
  const [loading, setLoading] = useState(false);
  const cacheKeyRef = useRef("");

  useEffect(() => {
    const from = toPoint(fromCoords);
    const to = toPoint(toCoords);

    if (!enabled || !from || !to) {
      setRoute([]);
      return undefined;
    }

    const cacheKey = `${from.lat},${from.lng}|${to.lat},${to.lng}`;
    if (cacheKeyRef.current === cacheKey) return undefined;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const encoded = await getDirectionsPolyline(from, to);
        if (cancelled) return;
        const decoded = encoded ? decodePolyline(encoded) : [];
        cacheKeyRef.current = cacheKey;
        setRoute(decoded.length > 1 ? decoded : []);
      } catch {
        if (!cancelled) {
          setRoute([
            {
              latitude: from.lat,
              longitude: from.lng,
            },
            {
              latitude: to.lat,
              longitude: to.lng,
            },
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fromCoords, toCoords, enabled]);

  return { route, loading };
}
