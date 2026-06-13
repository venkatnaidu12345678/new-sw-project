import { useEffect, useState, useMemo } from "react";
import { getDriverNavigateTarget } from "../Utils/participantRouteUtils";

const MIN_LEG_DEG_SQ = 5e-7;

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

/**
 * Driver → participant leg from live GPS (straight line, no directions API).
 */
export function useParticipantRoute(
  participant,
  driverLocation,
  liveTracking = null,
  enabled = true
) {
  const [driverLegPath, setDriverLegPath] = useState([]);

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

  useEffect(() => {
    if (!enabled || !navigateTarget) {
      setDriverLegPath([]);
      return undefined;
    }

    if (!Number.isFinite(driverLat) || !Number.isFinite(driverLng)) {
      setDriverLegPath([]);
      return undefined;
    }

    const destLat = Number(navigateTarget.lat);
    const destLng = Number(navigateTarget.lng);
    setDriverLegPath(buildStraightLeg(driverLat, driverLng, destLat, destLng));

    return undefined;
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
    navigateTarget,
    loadingDriverLeg: false,
  };
}
