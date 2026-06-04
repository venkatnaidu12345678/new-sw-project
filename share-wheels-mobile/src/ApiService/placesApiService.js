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

  const params = new URLSearchParams({ input: q });
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

export const getDirectionsPolyline = async (fromCoords, toCoords) => {
  const oLat = Number(fromCoords?.lat ?? fromCoords?.latitude);
  const oLng = Number(fromCoords?.lng ?? fromCoords?.longitude);
  const dLat = Number(toCoords?.lat ?? toCoords?.latitude);
  const dLng = Number(toCoords?.lng ?? toCoords?.longitude);

  if (![oLat, oLng, dLat, dLng].every(Number.isFinite)) {
    return null;
  }

  const params = new URLSearchParams({
    originLat: String(oLat),
    originLng: String(oLng),
    destLat: String(dLat),
    destLng: String(dLng),
  });

  const res = await fetch(`${baseUrl}/locations/directions?${params}`, {
    headers: await authHeaders(),
  });
  const data = await parseJson(res);
  return data.polyline || null;
};
