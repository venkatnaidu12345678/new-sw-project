/**
 * Decode Google encoded polyline to [{ latitude, longitude }, ...].
 * @param {string} encoded
 * @returns {{ latitude: number, longitude: number }[]}
 */
export const decodePolyline = (encoded) => {
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

    coordinates.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return coordinates;
};

/** Keep map polylines responsive by capping point count. */
export const thinPolylineCoords = (coords, maxPoints = 150) => {
  if (!Array.isArray(coords) || coords.length <= maxPoints) {
    return Array.isArray(coords) ? coords : [];
  }
  const step = Math.ceil(coords.length / maxPoints);
  const out = [coords[0]];
  for (let i = step; i < coords.length - 1; i += step) {
    out.push(coords[i]);
  }
  const last = coords[coords.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
};

export const validMapCoords = (coords) =>
  (Array.isArray(coords) ? coords : []).filter(
    (c) =>
      c &&
      Number.isFinite(Number(c.latitude)) &&
      Number.isFinite(Number(c.longitude))
  );

const toRad = (deg) => (deg * Math.PI) / 180;

export const haversineMeters = (a, b) => {
  const R = 6371000;
  const lat1 = toRad(Number(a.latitude));
  const lat2 = toRad(Number(b.latitude));
  const dLat = toRad(Number(b.latitude) - Number(a.latitude));
  const dLng = toRad(Number(b.longitude) - Number(a.longitude));
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** Total path length along a decoded or encoded polyline. */
export const polylinePathLengthMeters = (encodedOrPoints) => {
  const pts = Array.isArray(encodedOrPoints)
    ? encodedOrPoints
    : decodePolyline(encodedOrPoints);
  if (!pts || pts.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < pts.length; i += 1) {
    total += haversineMeters(pts[i - 1], pts[i]);
  }
  return total;
};
