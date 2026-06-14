import AsyncStorage from "@react-native-async-storage/async-storage";
import { baseUrl } from "../Config";

const authHeaders = async () => {
  const token = await AsyncStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const parseJson = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
};

export const autocompletePlaces = async (input, sessionToken) => {
  const q = String(input || "").trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({ input: q, mode: "cities", country: "in" });
  if (sessionToken) params.set("sessionToken", sessionToken);

  const res = await fetch(`${baseUrl}/locations/places/autocomplete?${params}`, {
    headers: await authHeaders(),
  });
  const data = await parseJson(res);
  return Array.isArray(data.predictions) ? data.predictions : [];
};

export const getPlaceDetails = async (placeId) => {
  const id = String(placeId || "").trim();
  if (!id) return null;

  const params = new URLSearchParams({ placeId: id });
  const res = await fetch(`${baseUrl}/locations/places/details?${params}`, {
    headers: await authHeaders(),
  });
  const data = await parseJson(res);
  return data.place || null;
};

/**
 * Driving route polyline via backend Routes API (computeRoutes).
 * Pass coordinates and/or from/to place names (geocoded server-side when coords missing).
 */
export const getDirectionsPolyline = async (
  fromCoords,
  toCoords,
  waypoints = [],
  labels = {}
) => {
  const oLat = Number(fromCoords?.lat ?? fromCoords?.latitude);
  const oLng = Number(fromCoords?.lng ?? fromCoords?.longitude);
  const dLat = Number(toCoords?.lat ?? toCoords?.latitude);
  const dLng = Number(toCoords?.lng ?? toCoords?.longitude);
  const fromLabel = String(labels?.from || "").trim();
  const toLabel = String(labels?.to || "").trim();

  const hasOrigin = Number.isFinite(oLat) && Number.isFinite(oLng);
  const hasDest = Number.isFinite(dLat) && Number.isFinite(dLng);

  if (!hasOrigin && !fromLabel) return null;
  if (!hasDest && !toLabel) return null;

  const params = new URLSearchParams();
  if (hasOrigin) {
    params.set("originLat", String(oLat));
    params.set("originLng", String(oLng));
  }
  if (hasDest) {
    params.set("destLat", String(dLat));
    params.set("destLng", String(dLng));
  }
  if (fromLabel) params.set("from", fromLabel);
  if (toLabel) params.set("to", toLabel);

  const wp = (Array.isArray(waypoints) ? waypoints : [])
    .map((w) => {
      const lat = Number(w?.lat ?? w?.latitude);
      const lng = Number(w?.lng ?? w?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return `${lat},${lng}`;
    })
    .filter(Boolean);
  if (wp.length) params.set("waypoints", wp.join("|"));

  const res = await fetch(`${baseUrl}/locations/directions?${params}`, {
    headers: await authHeaders(),
  });
  const data = await parseJson(res);
  return data.polyline || null;
};

/** Driving route with resolved endpoints (for driver → participant navigation). */
export const getDirectionsRoute = async (
  fromCoords,
  toCoords,
  labels = {}
) => {
  const oLat = Number(fromCoords?.lat ?? fromCoords?.latitude);
  const oLng = Number(fromCoords?.lng ?? fromCoords?.longitude);
  const dLat = Number(toCoords?.lat ?? toCoords?.latitude);
  const dLng = Number(toCoords?.lng ?? toCoords?.longitude);
  const fromLabel = String(labels?.from || "").trim();
  const toLabel = String(labels?.to || "").trim();

  const hasOrigin = Number.isFinite(oLat) && Number.isFinite(oLng);
  const hasDest = Number.isFinite(dLat) && Number.isFinite(dLng);

  if (!hasOrigin && !fromLabel) return null;
  if (!hasDest && !toLabel) return null;

  const params = new URLSearchParams();
  if (hasOrigin) {
    params.set("originLat", String(oLat));
    params.set("originLng", String(oLng));
  }
  if (hasDest) {
    params.set("destLat", String(dLat));
    params.set("destLng", String(dLng));
  }
  if (fromLabel) params.set("from", fromLabel);
  if (toLabel) params.set("to", toLabel);

  const res = await fetch(`${baseUrl}/locations/directions?${params}`, {
    headers: await authHeaders(),
  });
  const data = await parseJson(res);
  return {
    polyline: data.polyline || null,
    destination: data.destination || null,
    origin: data.origin || null,
  };
};

export const getAlternativeRoutes = async (fromCoords, toCoords, labels = {}) => {
  const params = new URLSearchParams();
  const oLat = Number(fromCoords?.lat ?? fromCoords?.latitude);
  const oLng = Number(fromCoords?.lng ?? fromCoords?.longitude);
  const dLat = Number(toCoords?.lat ?? toCoords?.latitude);
  const dLng = Number(toCoords?.lng ?? toCoords?.longitude);
  const fromLabel = String(labels?.from || "").trim();
  const toLabel = String(labels?.to || "").trim();

  if (Number.isFinite(oLat) && Number.isFinite(oLng)) {
    params.set("originLat", String(oLat));
    params.set("originLng", String(oLng));
  }
  if (Number.isFinite(dLat) && Number.isFinite(dLng)) {
    params.set("destLat", String(dLat));
    params.set("destLng", String(dLng));
  }
  if (fromLabel) params.set("from", fromLabel);
  if (toLabel) params.set("to", toLabel);

  const res = await fetch(`${baseUrl}/locations/routes/alternatives?${params}`, {
    headers: await authHeaders(),
  });
  const data = await parseJson(res);
  const raw = Array.isArray(data.routes) ? data.routes : [];
  return raw
    .map((route, index) => ({
      index: Number.isInteger(route?.index) ? route.index : index,
      polyline: String(route?.polyline || "").trim(),
      distanceMeters: route?.distanceMeters ?? null,
      durationSeconds: route?.durationSeconds ?? null,
      label: route?.label || (index === 0 ? "Recommended" : `Alternative ${index}`),
      isRecommended: route?.isRecommended ?? index === 0,
    }))
    .filter((route) => route.polyline.length > 0);
};

/** Resolve a place label to coordinates (uses backend geocoding via directions). */
export const resolvePlaceCoords = async (label, originCoords = null) => {
  const place = String(label || "").trim();
  if (!place) return null;

  const params = new URLSearchParams({ to: place });
  const oLat = Number(originCoords?.lat ?? originCoords?.latitude);
  const oLng = Number(originCoords?.lng ?? originCoords?.longitude);
  if (Number.isFinite(oLat) && Number.isFinite(oLng)) {
    params.set("originLat", String(oLat));
    params.set("originLng", String(oLng));
  } else {
    params.set("from", place);
  }

  const res = await fetch(`${baseUrl}/locations/directions?${params}`, {
    headers: await authHeaders(),
  });
  const data = await parseJson(res);
  const dest = data.destination || data.origin;
  const lat = Number(dest?.lat);
  const lng = Number(dest?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, label: dest.label || place };
};

export const getStopoverCandidates = async (polyline, max = 20) => {
  const encoded = String(polyline || "").trim();
  if (!encoded) return [];

  const res = await fetch(`${baseUrl}/locations/route/stopover-candidates`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ polyline: encoded, max }),
  });
  const data = await parseJson(res);
  return Array.isArray(data.candidates) ? data.candidates : [];
};
