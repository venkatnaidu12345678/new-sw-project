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

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

const bearingDeg = (from, to) => {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

/** Point reached by moving distanceKm along bearing from lat/lng. */
const destinationPoint = (lat, lng, bearing, distanceKm) => {
  const R = 6371;
  const brng = toRad(bearing);
  const lat1 = toRad(lat);
  const lng1 = toRad(lng);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceKm / R) +
      Math.cos(lat1) * Math.sin(distanceKm / R) * Math.cos(brng)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(distanceKm / R) * Math.cos(lat1),
      Math.cos(distanceKm / R) - Math.sin(lat1) * Math.sin(lat2)
    );
  return { lat: toDeg(lat2), lng: toDeg(lng2) };
};

/**
 * Sample points along the route interior so nearby cities and towns
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
  bearingDeg,
  destinationPoint,
};
