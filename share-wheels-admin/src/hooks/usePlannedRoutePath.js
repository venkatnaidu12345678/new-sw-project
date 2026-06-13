import { useEffect, useState } from "react";
import { getAdminRouteDirections } from "../api/client";
import { decodePolyline } from "../utils/polyline";

const normalizeCoords = (coords) => {
  if (!coords) return null;
  const lat = Number(coords.lat ?? coords.latitude);
  const lng = Number(coords.lng ?? coords.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

/**
 * Loads planned driving route (Routes API) for admin map.
 * Uses ride coordinates when present; otherwise geocodes from/to place names.
 */
export function usePlannedRoutePath({
  fromCoords,
  toCoords,
  fromLabel,
  toLabel,
  savedPolyline = "",
  stopovers = [],
  enabled = true,
}) {
  const [plannedPath, setPlannedPath] = useState([]);
  const [endpoints, setEndpoints] = useState({ from: null, to: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const from = normalizeCoords(fromCoords);
    const to = normalizeCoords(toCoords);
    const fromText = String(fromLabel || "").trim();
    const toText = String(toLabel || "").trim();

    const stored = String(savedPolyline || "").trim();

    if (!enabled || (!from && !fromText) || (!to && !toText)) {
      setPlannedPath([]);
      setEndpoints({ from: null, to: null });
      setError("");
      return undefined;
    }

    if (stored) {
      const path = decodePolyline(stored);
      setPlannedPath(path.length > 1 ? path : []);
      setEndpoints({ from: from || null, to: to || null });
      setError("");
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    const params = {};
    if (from) {
      params.originLat = String(from.lat);
      params.originLng = String(from.lng);
    }
    if (to) {
      params.destLat = String(to.lat);
      params.destLng = String(to.lng);
    }
    if (fromText) params.from = fromText;
    if (toText) params.to = toText;
    if (Array.isArray(stopovers) && stopovers.length) {
      const waypoints = stopovers
        .map((stop) => ({
          lat: Number(stop?.lat ?? stop?.latitude),
          lng: Number(stop?.lng ?? stop?.longitude),
        }))
        .filter((w) => Number.isFinite(w.lat) && Number.isFinite(w.lng));
      if (waypoints.length) {
        params.waypoints = JSON.stringify(waypoints);
      }
    }

    getAdminRouteDirections(params)
      .then((res) => {
        if (cancelled) return;
        const path = res.polyline ? decodePolyline(res.polyline) : [];
        setPlannedPath(path.length > 1 ? path : []);
        setEndpoints({
          from: res.origin ? { lat: res.origin.lat, lng: res.origin.lng, label: "Pickup" } : from,
          to: res.destination
            ? { lat: res.destination.lat, lng: res.destination.lng, label: "Destination" }
            : to,
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setPlannedPath([]);
        setEndpoints({ from: from || null, to: to || null });
        setError(e.message || "Could not load route");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    fromCoords?.lat,
    fromCoords?.lng,
    toCoords?.lat,
    toCoords?.lng,
    fromLabel,
    toLabel,
    savedPolyline,
    stopovers,
  ]);

  return { plannedPath, endpoints, loading, error };
}
