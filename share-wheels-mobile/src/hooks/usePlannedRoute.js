import { useEffect, useState } from "react";
import { decodePolyline } from "../Utils/polyline";
import { toPoint } from "../liveTracking/liveTrackingState";

const straightLineBetween = (from, to) => {
  const a = toPoint(from);
  const b = toPoint(to);
  if (!a || !b) return [];
  return [
    { latitude: a.lat, longitude: a.lng },
    { latitude: b.lat, longitude: b.lng },
  ];
};

/**
 * Planned route for live map — decodes ride polyline from socket snapshot only.
 */
export function usePlannedRoute(
  fromCoords,
  toCoords,
  enabled = true,
  routeLabels = {},
  savedPolyline = "",
  options = {}
) {
  const { socketOnly = false } = options;
  const [route, setRoute] = useState([]);
  const [loading, setLoading] = useState(false);
  const stopoversKey = JSON.stringify(
    (routeLabels?.stopovers || []).map((s) => ({
      label: s?.label,
      lat: s?.lat ?? s?.latitude,
      lng: s?.lng ?? s?.longitude,
    }))
  );

  useEffect(() => {
    const from = toPoint(fromCoords);
    const to = toPoint(toCoords);
    const fromLabel = String(routeLabels?.from || "").trim();
    const toLabel = String(routeLabels?.to || "").trim();
    const stored = String(savedPolyline || "").trim();

    if (!enabled) {
      setRoute([]);
      return undefined;
    }

    if (stored) {
      const decoded = decodePolyline(stored);
      setRoute(decoded.length > 1 ? decoded : straightLineBetween(from, to));
      setLoading(false);
      return undefined;
    }

    if (socketOnly) {
      setRoute(straightLineBetween(from, to));
      setLoading(false);
      return undefined;
    }

    if ((!from && !fromLabel) || (!to && !toLabel)) {
      setRoute([]);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { getDirectionsPolyline } = await import(
          "../ApiService/placesApiService"
        );
        const encoded = await getDirectionsPolyline(from, to, routeLabels?.stopovers || [], {
          from: fromLabel,
          to: toLabel,
        });
        if (cancelled) return;

        const decoded = encoded ? decodePolyline(encoded) : [];
        setRoute(decoded.length > 1 ? decoded : straightLineBetween(from, to));
      } catch {
        if (cancelled) return;
        setRoute(straightLineBetween(from, to));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    fromCoords,
    toCoords,
    enabled,
    routeLabels?.from,
    routeLabels?.to,
    savedPolyline,
    stopoversKey,
    socketOnly,
  ]);

  return { route, loading };
}
