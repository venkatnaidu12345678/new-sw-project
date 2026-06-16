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
  if (!encoded || !rows.length) return rows;

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

const labelsAlign = (placeText, corridorLabel) => {
  const place = String(placeText || "").trim().toLowerCase();
  const label = String(corridorLabel || "").trim().toLowerCase();
  if (!place || !label) return false;
  return place === label || place.includes(label) || label.includes(place);
};

const appendUniqueLabel = (corridor, seen, label) => {
  const text = String(label || "").trim();
  const key = text.toLowerCase();
  if (!text || seen.has(key)) return;
  seen.add(key);
  corridor.push(text);
};

const mergeCorridorLabelsInRouteOrder = async ({
  fromLabel,
  toLabel,
  orderedStops,
  routePolyline,
  loadPolylineTowns,
}) => {
  const polyline = String(routePolyline || "").trim();
  const points = polyline ? decodePolyline(polyline) : [];
  const entries = [];

  const pushEntry = (label, sortKey) => {
    const text = String(label || "").trim();
    if (!text) return;
    entries.push({ label: text, sortKey });
  };

  pushEntry(fromLabel, -1);

  if (polyline && typeof loadPolylineTowns === "function") {
    const towns = await loadPolylineTowns(polyline);
    towns.forEach((label, index) => pushEntry(label, index));
  }

  orderedStops.forEach((stop, index) => {
    const sortKey =
      points.length >= 2 &&
      Number.isFinite(stop.lat) &&
      Number.isFinite(stop.lng)
        ? nearestIndexOnPolyline(stop.lat, stop.lng, points)
        : 1000 + index;
    pushEntry(stop.label, sortKey);
  });

  pushEntry(toLabel, Number.MAX_SAFE_INTEGER);

  entries.sort((a, b) => a.sortKey - b.sortKey);

  const corridor = [];
  const seen = new Set();
  for (const entry of entries) {
    appendUniqueLabel(corridor, seen, entry.label);
  }

  return corridor.length >= 2
    ? corridor
    : [fromLabel, ...orderedStops.map((s) => s.label), toLabel].filter(Boolean);
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

  if (String(routePolyline || "").trim() && typeof loadPolylineTowns === "function") {
    return mergeCorridorLabelsInRouteOrder({
      fromLabel,
      toLabel,
      orderedStops,
      routePolyline,
      loadPolylineTowns,
    });
  }

  const corridor = [];
  const seen = new Set();
  appendUniqueLabel(corridor, seen, fromLabel);
  for (const stop of orderedStops) {
    appendUniqueLabel(corridor, seen, stop.label);
  }
  appendUniqueLabel(corridor, seen, toLabel);
  return corridor;
};

const findCorridorIndex = (placeText, corridor) => {
  let bestIdx = -1;
  let bestLen = 0;

  for (let i = 0; i < corridor.length; i += 1) {
    if (!labelsAlign(placeText, corridor[i])) continue;
    const len = String(corridor[i] || "").trim().length;
    if (len > bestLen) {
      bestLen = len;
      bestIdx = i;
    }
  }

  return bestIdx;
};

/** Request must move forward along the driver's ordered route (between stopovers). */
const matchesForwardCorridor = (requestFrom, requestTo, corridor) => {
  if (!Array.isArray(corridor) || corridor.length < 2) return false;

  const fromIdx = findCorridorIndex(requestFrom, corridor);
  const toIdx = findCorridorIndex(requestTo, corridor);
  if (fromIdx === -1 || toIdx === -1) return false;
  return fromIdx < toIdx;
};

const tokenizePlace = (label) =>
  String(label || "")
    .toLowerCase()
    .replace(/[,]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);

const tokenOverlap = (left, right) => {
  const rightSet = new Set(tokenizePlace(right));
  return tokenizePlace(left).some((token) => rightSet.has(token));
};

const routesRoughlyOverlap = (reqFrom, reqTo, driverFrom, driverTo) => {
  const matchDir = (aFrom, aTo, bFrom, bTo) => {
    const rf = String(aFrom || "").trim();
    const rt = String(aTo || "").trim();
    const from = String(bFrom || "").trim();
    const to = String(bTo || "").trim();
    if (!rf || !rt || !from || !to) return false;
    const fromRe = new RegExp(escapeRegex(rf), "i");
    const toRe = new RegExp(escapeRegex(rt), "i");
    return fromRe.test(from) && toRe.test(to);
  };

  if (
    matchDir(driverFrom, driverTo, reqFrom, reqTo) ||
    matchDir(reqFrom, reqTo, driverFrom, driverTo)
  ) {
    return true;
  }

  return tokenOverlap(reqFrom, driverFrom) && tokenOverlap(reqTo, driverTo);
};

const corridorTokenOrder = (requestFrom, requestTo, corridor) => {
  const reqFromTokens = tokenizePlace(requestFrom);
  const reqToTokens = tokenizePlace(requestTo);
  let fromCorridorIdx = -1;
  let toCorridorIdx = -1;

  for (let i = 0; i < corridor.length; i += 1) {
    const tokenSet = new Set(tokenizePlace(corridor[i]));
    if (fromCorridorIdx < 0 && reqFromTokens.some((t) => tokenSet.has(t))) {
      fromCorridorIdx = i;
    }
    if (reqToTokens.some((t) => tokenSet.has(t))) {
      toCorridorIdx = i;
    }
  }

  return { fromCorridorIdx, toCorridorIdx };
};

/** Whether a standalone request lies along the driver's route (with label fallbacks). */
const requestMatchesDriverCorridor = (
  requestFrom,
  requestTo,
  corridor,
  driverFrom,
  driverTo
) => {
  const reqFrom = String(requestFrom || "").trim();
  const reqTo = String(requestTo || "").trim();
  if (!reqFrom || !reqTo) return false;

  if (!Array.isArray(corridor) || corridor.length < 2) {
    return routesRoughlyOverlap(reqFrom, reqTo, driverFrom, driverTo);
  }

  if (matchesForwardCorridor(reqFrom, reqTo, corridor)) return true;

  if (routesRoughlyOverlap(reqFrom, reqTo, driverFrom, driverTo)) return true;

  const fromIdx = findCorridorIndex(reqFrom, corridor);
  const toIdx = findCorridorIndex(reqTo, corridor);
  const lastIdx = corridor.length - 1;

  if (fromIdx >= 0 && toIdx > fromIdx) return true;

  if (
    fromIdx >= 0 &&
    fromIdx < lastIdx &&
    (labelsAlign(reqTo, driverTo) || toIdx > fromIdx)
  ) {
    return true;
  }

  if (
    toIdx > 0 &&
    (labelsAlign(reqFrom, driverFrom) || (fromIdx >= 0 && fromIdx < toIdx))
  ) {
    return true;
  }

  const { fromCorridorIdx, toCorridorIdx } = corridorTokenOrder(
    reqFrom,
    reqTo,
    corridor
  );
  if (fromCorridorIdx >= 0 && toCorridorIdx > fromCorridorIdx) return true;

  return false;
};

const buildCorridorRegex = (labels) => {
  const unique = [...new Set(labels.map((l) => String(l).trim()).filter(Boolean))];
  if (!unique.length) return null;
  if (unique.length === 1) {
    return { $regex: escapeRegex(unique[0]), $options: "i" };
  }
  return { $regex: unique.map(escapeRegex).join("|"), $options: "i" };
};

/** Mongo pre-filter: request touches at least one corridor place (from or to). */
const buildCorridorTouchFilter = (labels) => {
  const regex = buildCorridorRegex(labels);
  if (!regex) return {};
  return { $or: [{ from: regex }, { to: regex }] };
};

module.exports = {
  normalizeStopoverRows,
  orderStopoversAlongPolyline,
  buildOrderedCorridor,
  matchesForwardCorridor,
  requestMatchesDriverCorridor,
  routesRoughlyOverlap,
  buildCorridorRegex,
  buildCorridorTouchFilter,
  labelsAlign,
  findCorridorIndex,
};
