import { useEffect, useState, useMemo, useRef } from "react";
import { getDriverNavigateTarget } from "../Utils/participantRouteUtils";
import {
  getDirectionsRoute,
  resolvePlaceCoords,
} from "../ApiService/placesApiService";
import { decodePolyline } from "../Utils/polyline";

const MIN_LEG_DEG_SQ = 5e-7;
const DRIVER_REFETCH_DEBOUNCE_MS = 1800;

const coordsTooClose = (lat1, lng1, lat2, lng2) => {
  if (!Number.isFinite(lat1) || !Number.isFinite(lng1)) return false;
  if (!Number.isFinite(lat2) || !Number.isFinite(lng2)) return false;
  const dLat = lat1 - lat2;
  const dLng = lng1 - lng2;
  return dLat * dLat + dLng * dLng < MIN_LEG_DEG_SQ;
};

const buildStraightLeg = (driverLat, driverLng, destLat, destLng) => {
  if (!Number.isFinite(driverLat) || !Number.isFinite(driverLng)) return [];
  if (!Number.isFinite(destLat) || !Number.isFinite(destLng)) return [];
  if (coordsTooClose(driverLat, driverLng, destLat, destLng)) return [];
  return [
    { latitude: driverLat, longitude: driverLng },
    { latitude: destLat, longitude: destLng },
  ];
};

const toCoordPoint = (coords) => {
  if (!coords) return null;
  const lat = Number(coords.lat ?? coords.latitude);
  const lng = Number(coords.lng ?? coords.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

/**
 * Driver → selected participant leg via backend directions (roads), with straight-line fallback.
 */
export function useParticipantRoute(
  participant,
  driverLocation,
  liveTracking = null,
  enabled = true
) {
  const [driverLegPath, setDriverLegPath] = useState([]);
  const [loadingDriverLeg, setLoadingDriverLeg] = useState(false);
  const [resolvedTarget, setResolvedTarget] = useState(null);
  const requestIdRef = useRef(0);
  const debounceRef = useRef(null);
  const lastFetchKeyRef = useRef("");

  const participantKey = participant
    ? `${participant.id}|${participant.from}|${participant.to}|${participant.status}`
    : "";

  const driverLat = Number(driverLocation?.lat ?? driverLocation?.latitude);
  const driverLng = Number(driverLocation?.lng ?? driverLocation?.longitude);
  const driverKey =
    Number.isFinite(driverLat) && Number.isFinite(driverLng)
      ? `${driverLat.toFixed(4)},${driverLng.toFixed(4)}`
      : "";

  const navigateTarget = useMemo(
    () => getDriverNavigateTarget(participant, liveTracking),
    [participant, liveTracking]
  );

  const targetKey = navigateTarget
    ? `${navigateTarget.kind}|${navigateTarget.label}|${navigateTarget.lat ?? ""},${navigateTarget.lng ?? ""}`
    : "";

  const effectiveNavigateTarget = useMemo(() => {
    if (!navigateTarget) return null;
    const resolved = toCoordPoint(resolvedTarget);
    const direct = toCoordPoint(navigateTarget);
    const lat = direct?.lat ?? resolved?.lat ?? null;
    const lng = direct?.lng ?? resolved?.lng ?? null;
    return { ...navigateTarget, lat, lng };
  }, [navigateTarget, resolvedTarget]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (!enabled || !navigateTarget) {
      setDriverLegPath([]);
      setResolvedTarget(null);
      setLoadingDriverLeg(false);
      lastFetchKeyRef.current = "";
      return undefined;
    }

    if (!Number.isFinite(driverLat) || !Number.isFinite(driverLng)) {
      setDriverLegPath([]);
      setLoadingDriverLeg(false);
      return undefined;
    }

    const destLabel = String(navigateTarget.label || "").trim();
    const destLat = Number(navigateTarget.lat);
    const destLng = Number(navigateTarget.lng);
    const hasDestCoords = Number.isFinite(destLat) && Number.isFinite(destLng);

    if (!hasDestCoords && !destLabel) {
      setDriverLegPath([]);
      setLoadingDriverLeg(false);
      return undefined;
    }

    const fetchKey = `${participantKey}|${targetKey}|${driverKey}`;
    const targetChanged =
      !lastFetchKeyRef.current ||
      !lastFetchKeyRef.current.startsWith(`${participantKey}|${targetKey}|`);
    const delay = targetChanged ? 0 : DRIVER_REFETCH_DEBOUNCE_MS;

    const runFetch = () => {
      const reqId = ++requestIdRef.current;
      lastFetchKeyRef.current = fetchKey;
      setLoadingDriverLeg(true);

      (async () => {
        try {
          const origin = { lat: driverLat, lng: driverLng };
          const dest = hasDestCoords ? { lat: destLat, lng: destLng } : null;

          const route = await getDirectionsRoute(origin, dest, {
            to: destLabel,
          });

          if (reqId !== requestIdRef.current) return;

          let path = [];
          if (route?.polyline) {
            const decoded = decodePolyline(route.polyline);
            if (decoded.length > 1) path = decoded;
          }

          const resolvedDest =
            toCoordPoint(route?.destination) ||
            dest ||
            (destLabel ? await resolvePlaceCoords(destLabel, origin) : null);

          if (reqId !== requestIdRef.current) return;

          if (resolvedDest) {
            setResolvedTarget(resolvedDest);
          }

          if (!path.length && resolvedDest) {
            path = buildStraightLeg(
              driverLat,
              driverLng,
              resolvedDest.lat,
              resolvedDest.lng
            );
          }

          setDriverLegPath(path);
        } catch {
          if (reqId !== requestIdRef.current) return;
          try {
            const origin = { lat: driverLat, lng: driverLng };
            const resolved =
              hasDestCoords
                ? { lat: destLat, lng: destLng }
                : destLabel
                  ? await resolvePlaceCoords(destLabel, origin)
                  : null;

            if (reqId !== requestIdRef.current) return;

            if (resolved) {
              setResolvedTarget(resolved);
              setDriverLegPath(
                buildStraightLeg(driverLat, driverLng, resolved.lat, resolved.lng)
              );
            } else {
              setDriverLegPath([]);
            }
          } catch {
            if (reqId === requestIdRef.current) setDriverLegPath([]);
          }
        } finally {
          if (reqId === requestIdRef.current) setLoadingDriverLeg(false);
        }
      })();
    };

    debounceRef.current = setTimeout(runFetch, delay);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [
    enabled,
    participantKey,
    driverKey,
    targetKey,
    driverLat,
    driverLng,
    navigateTarget,
  ]);

  return {
    driverLegPath,
    navigateTarget: effectiveNavigateTarget,
    loadingDriverLeg,
  };
};
