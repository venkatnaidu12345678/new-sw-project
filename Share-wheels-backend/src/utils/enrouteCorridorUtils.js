const { decodePolyline, haversineKm } = require("./polyline");
const { escapeRegex } = require("./rideDateQueryUtils");

const normalizeStopoverRows = (stopovers) => {
  if (!Array.isArray(stopovers)) return [];
  return stopovers
    .map((stop) => {
      const label = String(stop?.label || "").trim();
      const lat = Number(stop?.lat ?? stop?.latitude);
      const lng = Number(stop?.lng ?? stop?.longitude);
      if (!label) return null;
      return {
        label,
        ...(Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {}),
      };
    })
    .filter(Boolean);
};

const nearestIndexOnPolyline = (lat, lng, points) => {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < points.length; i += 1) {
    const d = haversineKm({ lat, lng }, points[i]);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
};

const orderStopoversAlongPolyline = (stopovers, routePolyline) => {
  const rows = normalizeStopoverRows(stopovers);
  const encoded = String(routePolyline || "").trim();
  if (!encoded || rows.length < 2) return rows;

  const points = decodePolyline(encoded);
  if (points.length < 2) return rows;

  return [...rows].sort((a, b) => {
    const aIdx =
      Number.isFinite(a.lat) && Number.isFinite(a.lng)
        ? nearestIndexOnPolyline(a.lat, a.lng, points)
        : 0;
    const bIdx =
      Number.isFinite(b.lat) && Number.isFinite(b.lng)
        ? nearestIndexOnPolyline(b.lat, b.lng, points)
        : 0;
    return aIdx - bIdx;
  });
};

const appendUniqueLabel = (corridor, seen, label) => {
  const text = String(label || "").trim();
  const key = text.toLowerCase();
  if (!text || seen.has(key)) return;
  seen.add(key);
  corridor.push(text);
};

const buildOrderedCorridor = async ({
  from,
  to,
  stopovers = [],
  routePolyline = "",
  loadPolylineTowns,
}) => {
  const fromLabel = String(from || "").trim();
  const toLabel = String(to || "").trim();
  const orderedStops = orderStopoversAlongPolyline(stopovers, routePolyline);
  const corridor = [];
  const seen = new Set();

  appendUniqueLabel(corridor, seen, fromLabel);

  for (const stop of orderedStops) {
    appendUniqueLabel(corridor, seen, stop.label);
  }

  if (!orderedStops.length && routePolyline && typeof loadPolylineTowns === "function") {
    const towns = await loadPolylineTowns(routePolyline);
    for (const label of towns) {
      appendUniqueLabel(corridor, seen, label);
    }
  }

  appendUniqueLabel(corridor, seen, toLabel);
  return corridor;
};

const labelMatchesPlace = (placeText, corridorLabel) => {
  const place = String(placeText || "").trim();
  const label = String(corridorLabel || "").trim();
  if (!place || !label) return false;
  return new RegExp(escapeRegex(label), "i").test(place);
};

const findCorridorIndex = (placeText, corridor) => {
  for (let i = 0; i < corridor.length; i += 1) {
    if (labelMatchesPlace(placeText, corridor[i])) return i;
  }
  return -1;
};

/** Request must move forward along the driver's ordered route (between stopovers). */
const matchesForwardCorridor = (requestFrom, requestTo, corridor) => {
  if (!Array.isArray(corridor) || corridor.length < 2) return false;

  const fromIdx = findCorridorIndex(requestFrom, corridor);
  const toIdx = findCorridorIndex(requestTo, corridor);
  if (fromIdx === -1 || toIdx === -1) return false;
  return fromIdx < toIdx;
};

const buildCorridorRegex = (labels) => {
  const unique = [...new Set(labels.map((l) => String(l).trim()).filter(Boolean))];
  if (!unique.length) return null;
  if (unique.length === 1) {
    return { $regex: escapeRegex(unique[0]), $options: "i" };
  }
  return { $regex: unique.map(escapeRegex).join("|"), $options: "i" };
};

module.exports = {
  normalizeStopoverRows,
  orderStopoversAlongPolyline,
  buildOrderedCorridor,
  matchesForwardCorridor,
  buildCorridorRegex,
};
