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

export { ROLE_PIN_COLORS } from "./mapTheme";

export const hasParticipantCoords = (p) =>
  Number.isFinite(Number(p?.lat ?? p?.latitude)) &&
  Number.isFinite(Number(p?.lng ?? p?.longitude));

const normalizeViewerRole = (role) => {
  const r = (role || "").toString().toLowerCase();
  if (r === "driver" || r === "passenger" || r === "courier") return r;
  return "";
};

/**
 * Build map markers and driver path from ride tracking payload.
 * Driver viewers see passengers/couriers only (self = heading arrow elsewhere).
 * Passengers and couriers always see the driver's live pin.
 */
export const buildMarkersFromTracking = (tracking, myRole) => {
  const lt = tracking?.liveTracking || tracking || {};
  const participants = lt.participantLocations || [];
  const driverLoc = toPoint(lt.driverLocation);
  const myId = normalizeRideId(tracking?.myUserId);
  const viewerRole = normalizeViewerRole(myRole);
  const isDriverView = viewerRole === "driver";

  const markers = [];
  let hasDriverMarker = false;

  if (driverLoc && !isDriverView) {
    hasDriverMarker = true;
    markers.push({
      id: "driver",
      latitude: driverLoc.lat,
      longitude: driverLoc.lng,
      role: "driver",
      title: "Driver",
      description: driverLoc.label || "Live driver location",
      isMe: false,
    });
  }

  participants.forEach((p) => {
    const pt = toPoint(p);
    if (!pt) return;
    const uid = normalizeRideId(p.userId);
    const role = (p.role || "passenger").toLowerCase();

    if (role === "driver") {
      if (!isDriverView && !hasDriverMarker) {
        hasDriverMarker = true;
        markers.push({
          id: uid || "driver",
          latitude: pt.lat,
          longitude: pt.lng,
          role: "driver",
          title: p.name || "Driver",
          description: p.name || "Live driver location",
          isMe: false,
        });
      }
      return;
    }

    if (!isDriverView) return;

    if (role !== "passenger" && role !== "courier") return;

    markers.push({
      id: uid || `${role}-${markers.length}`,
      latitude: pt.lat,
      longitude: pt.lng,
      role,
      title: p.name || (role === "courier" ? "Courier" : "Passenger"),
      description: p.name || role,
      isMe: !isDriverView && uid && uid === myId,
    });
  });

  const path = (lt.locationHistory || [])
    .map((p) => {
      const lat = Number(p.lat ?? p.latitude);
      const lng = Number(p.lng ?? p.longitude);
      return Number.isFinite(lat) && Number.isFinite(lng)
        ? { latitude: lat, longitude: lng }
        : null;
    })
    .filter(Boolean);

  const loading = markers.length === 0 && path.length === 0;

  return { markers, path, loading };
};

/** Stopover pins along the planned route. */
export const buildStopoverMarkers = (stopovers = []) => {
  if (!Array.isArray(stopovers)) return [];
  return stopovers
    .map((stop, index) => {
      const point = toPoint(stop);
      if (!point) return null;
      return {
        id: `stopover-${index}-${point.label || index}`,
        latitude: point.lat,
        longitude: point.lng,
        role: "stopover",
        title: point.label || `Stop ${index + 1}`,
        description: "Stopover",
        isMe: false,
      };
    })
    .filter(Boolean);
};

/** Start/end pins from stored ride route coordinates. */
export const buildRouteEndpointMarkers = (fromCoords, toCoords) => {
  const markers = [];
  const from = toPoint(fromCoords);
  const to = toPoint(toCoords);

  if (from) {
    markers.push({
      id: "route-from",
      latitude: from.lat,
      longitude: from.lng,
      role: "route-from",
      title: fromCoords?.label || "Pickup",
      description: "Route start",
      isMe: false,
    });
  }

  if (to) {
    markers.push({
      id: "route-to",
      latitude: to.lat,
      longitude: to.lng,
      role: "route-to",
      title: toCoords?.label || "Destination",
      description: "Route end",
      isMe: false,
    });
  }

  return markers;
};

/** Bearing in degrees (0 = north) from point A to B. */
export const computeBearing = (lat1, lng1, lat2, lng2) => {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

/** Driver GPS from live tracking payload. */
export const getDriverMapPoint = (tracking) => {
  const lt = tracking?.liveTracking || tracking || {};
  return toPoint(lt.driverLocation);
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

/** Bearing from the last two GPS history points, if available. */
export const getDriverHeadingFromHistory = (tracking) => {
  const history = tracking?.liveTracking?.locationHistory || [];
  if (history.length < 2) return null;
  const prev = history[history.length - 2];
  const curr = history[history.length - 1];
  const lat1 = Number(prev.lat);
  const lng1 = Number(prev.lng);
  const lat2 = Number(curr.lat);
  const lng2 = Number(curr.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;
  return computeBearing(lat1, lng1, lat2, lng2);
};

/** Count live GPS markers by role (for driver status UI). */
export const countLiveParticipantsByRole = (tracking, myRole) => {
  const { markers } = buildMarkersFromTracking(tracking, myRole);
  const lt = tracking?.liveTracking || {};
  const isDriverView = normalizeViewerRole(myRole) === "driver";
  const driver =
    markers.filter((m) => m.role === "driver").length ||
    (!isDriverView && hasParticipantCoords(lt.driverLocation) ? 1 : 0);
  const passengers = markers.filter((m) => m.role === "passenger").length;
  const couriers = markers.filter((m) => m.role === "courier").length;
  return {
    passengers,
    couriers,
    driver,
    total: driver + passengers + couriers,
  };
};
