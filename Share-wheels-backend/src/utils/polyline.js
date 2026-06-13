/** Decode Google encoded polyline to [{ lat, lng }, ...]. */
const decodePolyline = (encoded) => {
  if (!encoded || typeof encoded !== "string") return [];

  const coordinates = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return coordinates;
};

const parseDurationSeconds = (duration) => {
  if (typeof duration === "number" && Number.isFinite(duration)) return duration;
  const s = String(duration || "").trim();
  if (!s.endsWith("s")) return null;
  const n = Number(s.slice(0, -1));
  return Number.isFinite(n) ? n : null;
};

const haversineKm = (a, b) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

/**
 * Sample points along the route interior so nearby cities, towns, and villages
 * are not skipped on long highways (distance-aware + count cap).
 */
const samplePolylineInterior = (points, maxSamples = 20) => {
  if (!Array.isArray(points) || points.length < 3) return [];

  const interior = points.slice(1, -1);
  const cap = Math.max(Number(maxSamples) || 20, 8);
  if (interior.length <= cap) return interior;

  let totalKm = 0;
  for (let i = 1; i < points.length; i += 1) {
    totalKm += haversineKm(points[i - 1], points[i]);
  }

  // ~1 sample every 12 km, bounded by cap (more settlements on longer routes).
  const byDistance = Math.max(8, Math.min(cap, Math.ceil(totalKm / 12)));
  const target = Math.min(cap, byDistance);
  const step = Math.max(1, Math.floor(interior.length / target));
  const samples = [];

  for (let i = 0; i < interior.length && samples.length < target; i += step) {
    samples.push(interior[i]);
  }

  return samples;
};

module.exports = {
  decodePolyline,
  parseDurationSeconds,
  samplePolylineInterior,
  haversineKm,
};
