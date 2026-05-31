import { normalizeRideId } from "../../Utils/trackingMerge";

export const DEFAULT_MAP_CENTER = {
  latitude: 17.385,
  longitude: 78.4867,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const SINGLE_MARKER_DELTA = 0.025;

const toPoint = (loc) => {
  if (!loc) return null;
  const lat = Number(loc.lat ?? loc.latitude);
  const lng = Number(loc.lng ?? loc.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, label: loc.name || loc.label || "" };
};

export const ROLE_PIN_COLORS = {
  driver: "#2563EB",
  passenger: "#16A34A",
  courier: "#D97706",
};

export const hasParticipantCoords = (p) =>
  Number.isFinite(Number(p?.lat ?? p?.latitude)) &&
  Number.isFinite(Number(p?.lng ?? p?.longitude));

/**
 * Build map markers and driver path from ride tracking payload.
 * Includes driver, all passengers, and couriers that have shared GPS.
 */
export const buildMarkersFromTracking = (tracking, myRole) => {
  const lt = tracking?.liveTracking || tracking || {};
  const participants = lt.participantLocations || [];
  const driverLoc = toPoint(lt.driverLocation);
  const myId = normalizeRideId(tracking?.myUserId);

  const markers = [];
  let hasDriverMarker = false;

  if (driverLoc) {
    hasDriverMarker = true;
    markers.push({
      id: "driver",
      latitude: driverLoc.lat,
      longitude: driverLoc.lng,
      role: "driver",
      title: "Driver",
      description: driverLoc.label || "Driver",
      isMe: myRole === "driver",
    });
  }

  participants.forEach((p) => {
    const pt = toPoint(p);
    if (!pt) return;
    const uid = normalizeRideId(p.userId);
    const role = (p.role || "passenger").toLowerCase();

    if (role === "driver") {
      if (!hasDriverMarker) {
        hasDriverMarker = true;
        markers.push({
          id: uid || "driver",
          latitude: pt.lat,
          longitude: pt.lng,
          role: "driver",
          title: p.name || "Driver",
          description: pt.name || "Driver",
          isMe: myRole === "driver",
        });
      }
      return;
    }

    markers.push({
      id: uid || `${role}-${markers.length}`,
      latitude: pt.lat,
      longitude: pt.lng,
      role,
      title: p.name || (role === "courier" ? "Courier" : "Passenger"),
      description: p.name || role,
      isMe: uid && uid === myId,
    });
  });

  const path = (lt.locationHistory || [])
    .map((p) => {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      return Number.isFinite(lat) && Number.isFinite(lng)
        ? { latitude: lat, longitude: lng }
        : null;
    })
    .filter(Boolean);

  const loading = markers.length === 0 && path.length === 0;

  return { markers, path, loading };
};

/** All coordinates to include when auto-fitting the map camera. */
export const getMapFocusCoordinates = (markers, path = []) => {
  const fromMarkers = markers.map((m) => ({
    latitude: m.latitude,
    longitude: m.longitude,
  }));
  const fromPath = path.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));
  const seen = new Set();
  return [...fromMarkers, ...fromPath].filter((c) => {
    const key = `${c.latitude.toFixed(6)},${c.longitude.toFixed(6)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const regionForCoordinates = (coordinates) => {
  if (!coordinates.length) return DEFAULT_MAP_CENTER;
  if (coordinates.length === 1) {
    return {
      ...coordinates[0],
      latitudeDelta: SINGLE_MARKER_DELTA,
      longitudeDelta: SINGLE_MARKER_DELTA,
    };
  }
  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  let minLng = coordinates[0].longitude;
  let maxLng = coordinates[0].longitude;
  coordinates.forEach((c) => {
    minLat = Math.min(minLat, c.latitude);
    maxLat = Math.max(maxLat, c.latitude);
    minLng = Math.min(minLng, c.longitude);
    maxLng = Math.max(maxLng, c.longitude);
  });
  const latDelta = Math.max((maxLat - minLat) * 1.4, SINGLE_MARKER_DELTA);
  const lngDelta = Math.max((maxLng - minLng) * 1.4, SINGLE_MARKER_DELTA);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
};

/** Count live GPS markers by role (for driver status UI). */
export const countLiveParticipantsByRole = (tracking) => {
  const { markers } = buildMarkersFromTracking(tracking);
  return {
    passengers: markers.filter((m) => m.role === "passenger").length,
    couriers: markers.filter((m) => m.role === "courier").length,
    driver: markers.filter((m) => m.role === "driver").length,
    total: markers.length,
  };
};
