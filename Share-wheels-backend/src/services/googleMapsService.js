const {
  decodePolyline,
  parseDurationSeconds,
  samplePolylineInterior,
} = require("../utils/polyline");

const GOOGLE_KEY = (process.env.GOOGLE_MAPS_API_KEY || "").trim();

const hasGoogleKey = () => Boolean(GOOGLE_KEY);

const googleLegacyFetch = async (path, params = {}) => {
  if (!hasGoogleKey()) {
    return { status: 503, body: { success: false, message: "Google Maps API key not configured" } };
  }

  const qs = new URLSearchParams({ ...params, key: GOOGLE_KEY });
  const url = `https://maps.googleapis.com/maps/api/${path}?${qs.toString()}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));

  if (data.status === "REQUEST_DENIED" || data.status === "INVALID_REQUEST") {
    return {
      status: 502,
      body: { success: false, message: data.error_message || data.status || "Google API error" },
    };
  }

  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return {
      status: 502,
      body: { success: false, message: data.error_message || data.status },
    };
  }

  return { status: 200, body: data };
};

const latLngLocation = (lat, lng) => ({
  location: { latLng: { latitude: lat, longitude: lng } },
});

const parseWaypoints = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((w) => ({
        lat: Number(w?.lat ?? w?.latitude),
        lng: Number(w?.lng ?? w?.longitude),
      }))
      .filter((w) => Number.isFinite(w.lat) && Number.isFinite(w.lng));
  }

  const text = String(raw).trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parseWaypoints(parsed);
  } catch {
    /* pipe-separated lat,lng pairs */
  }

  return text
    .split("|")
    .map((pair) => {
      const [a, b] = pair.split(",").map((v) => Number(v.trim()));
      if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
      return { lat: a, lng: b };
    })
    .filter(Boolean);
};

const geocodeAddress = async (address) => {
  const q = String(address || "").trim();
  if (q.length < 2) return null;

  const result = await googleLegacyFetch("geocode/json", {
    address: q,
    components: "country:IN",
  });
  if (result.status !== 200) return null;

  const loc = result.body.results?.[0]?.geometry?.location;
  const lat = Number(loc?.lat);
  const lng = Number(loc?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng, label: q };
};

const resolveRoutePoint = async (lat, lng, label) => {
  const pLat = Number(lat);
  const pLng = Number(lng);
  if (Number.isFinite(pLat) && Number.isFinite(pLng)) {
    return { lat: pLat, lng: pLng };
  }
  const text = String(label || "").trim();
  if (!text) return null;
  return geocodeAddress(text);
};

/**
 * Google Routes API (replaces legacy Directions API).
 * https://developers.google.com/maps/documentation/routes/compute_route_directions
 */
const computeRoute = async ({ originLat, originLng, destLat, destLng, waypoints = [] }) => {
  if (!hasGoogleKey()) {
    return { status: 503, body: { success: false, message: "Google Maps API key not configured" } };
  }

  const oLat = Number(originLat);
  const oLng = Number(originLng);
  const dLat = Number(destLat);
  const dLng = Number(destLng);

  if (![oLat, oLng, dLat, dLng].every(Number.isFinite)) {
    return { status: 400, body: { success: false, message: "Invalid origin or destination" } };
  }

  const body = {
    origin: latLngLocation(oLat, oLng),
    destination: latLngLocation(dLat, dLng),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_UNAWARE",
  };

  const stops = parseWaypoints(waypoints);
  if (stops.length) {
    body.intermediates = stops.map((w) => latLngLocation(w.lat, w.lng));
  }

  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_KEY,
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    return {
      status: res.status === 403 ? 502 : res.status || 502,
      body: {
        success: false,
        message: data.error?.message || "Routes API error",
      },
    };
  }

  const route = data.routes?.[0];
  const polyline = route?.polyline?.encodedPolyline;
  if (!polyline) {
    return { status: 404, body: { success: false, message: "No route found" } };
  }

  return {
    status: 200,
    body: {
      success: true,
      polyline,
      distanceMeters: route.distanceMeters ?? null,
      durationSeconds: parseDurationSeconds(route.duration),
    },
  };
};

const normalizeCountry = (country) => {
  const c = String(country || "").trim().toLowerCase();
  return /^[a-z]{2}$/.test(c) ? c : "in";
};

const autocompletePlaces = async (input, sessionToken, opts = {}) => {
  const query = String(input || "").trim();
  if (query.length < 2) {
    return { status: 200, body: { success: true, predictions: [] } };
  }

  const country = normalizeCountry(opts.country);
  const mode = String(opts.mode || "cities").trim().toLowerCase();
  const typeByMode = {
    cities: "(cities)",
    all: null,
    geocode: "geocode",
    establishments: "establishment",
  };
  const types = Object.prototype.hasOwnProperty.call(typeByMode, mode)
    ? typeByMode[mode]
    : "(cities)";

  const params = {
    input: query,
    ...(types ? { types } : {}),
    components: `country:${country}`,
  };
  if (sessionToken) params.sessiontoken = sessionToken;

  const result = await googleLegacyFetch("place/autocomplete/json", params);
  if (result.status !== 200) return result;

  const predictions = (result.body.predictions || []).map((p) => ({
    placeId: p.place_id,
    label: p.structured_formatting?.main_text || p.description,
    description: p.structured_formatting?.secondary_text || "",
    fullText: p.description,
  }));

  return { status: 200, body: { success: true, predictions } };
};

const getPlaceDetails = async (placeId) => {
  const id = String(placeId || "").trim();
  if (!id) {
    return { status: 400, body: { success: false, message: "placeId is required" } };
  }

  const result = await googleLegacyFetch("place/details/json", {
    place_id: id,
    fields: "geometry,formatted_address,name",
  });
  if (result.status !== 200) return result;

  const r = result.body.result || {};
  const loc = r.geometry?.location;
  const lat = Number(loc?.lat);
  const lng = Number(loc?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { status: 404, body: { success: false, message: "Place coordinates not found" } };
  }

  return {
    status: 200,
    body: {
      success: true,
      place: {
        lat,
        lng,
        label: r.name || r.formatted_address || "",
        formattedAddress: r.formatted_address || "",
      },
    },
  };
};

const ROUTE_FIELD_MASK =
  "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.routeLabels";

const mapRouteRow = (route, index) => {
  const labels = Array.isArray(route?.routeLabels) ? route.routeLabels : [];
  return {
    index,
    polyline: route?.polyline?.encodedPolyline || "",
    distanceMeters: route?.distanceMeters ?? null,
    durationSeconds: parseDurationSeconds(route?.duration),
    label:
      labels.includes("DEFAULT_ROUTE") || index === 0
        ? "Recommended"
        : `Alternative ${index}`,
    isRecommended: index === 0,
  };
};

const computeAlternativeRoutes = async ({
  originLat,
  originLng,
  destLat,
  destLng,
  waypoints = [],
}) => {
  if (!hasGoogleKey()) {
    return { status: 503, body: { success: false, message: "Google Maps API key not configured" } };
  }

  const oLat = Number(originLat);
  const oLng = Number(originLng);
  const dLat = Number(destLat);
  const dLng = Number(destLng);

  if (![oLat, oLng, dLat, dLng].every(Number.isFinite)) {
    return { status: 400, body: { success: false, message: "Invalid origin or destination" } };
  }

  const body = {
    origin: latLngLocation(oLat, oLng),
    destination: latLngLocation(dLat, dLng),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_UNAWARE",
    computeAlternativeRoutes: true,
  };

  const stops = parseWaypoints(waypoints);
  if (stops.length) {
    body.intermediates = stops.map((w) => latLngLocation(w.lat, w.lng));
    body.computeAlternativeRoutes = false;
  }

  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_KEY,
      "X-Goog-FieldMask": ROUTE_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    return {
      status: res.status === 403 ? 502 : res.status || 502,
      body: {
        success: false,
        message: data.error?.message || "Routes API error",
      },
    };
  }

  const routes = (data.routes || [])
    .map((route, index) => mapRouteRow(route, index))
    .filter((r) => r.polyline);

  if (!routes.length) {
    return { status: 404, body: { success: false, message: "No routes found" } };
  }

  return {
    status: 200,
    body: {
      success: true,
      routes,
      count: routes.length,
    },
  };
};

/** Settlement types in priority order: city → town → village → sub-district. */
const SETTLEMENT_COMPONENT_TYPES = [
  "locality",
  "postal_town",
  "administrative_area_level_4",
  "administrative_area_level_3",
  "administrative_area_level_2",
];

const SETTLEMENT_RESULT_TYPES = SETTLEMENT_COMPONENT_TYPES.join("|");

const SKIP_SETTLEMENT_NAMES = new Set([
  "india",
  "indian",
  "unincorporated",
]);

const isUsableSettlementName = (name) => {
  const text = String(name || "").trim();
  if (text.length < 2) return false;
  const lower = text.toLowerCase();
  if (SKIP_SETTLEMENT_NAMES.has(lower)) return false;
  if (/^\d+$/.test(text)) return false;
  if (/^(national|state) highway/i.test(text)) return false;
  return true;
};

const extractSettlementName = (row) => {
  if (!row) return null;

  const components = row.address_components || [];
  for (const type of SETTLEMENT_COMPONENT_TYPES) {
    const match = components.find((c) => (c.types || []).includes(type));
    if (match?.long_name && isUsableSettlementName(match.long_name)) {
      return match.long_name.trim();
    }
  }

  const formatted = String(row.formatted_address || "").trim();
  if (!formatted) return null;

  const parts = formatted.split(",").map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    if (isUsableSettlementName(part)) return part;
  }

  return null;
};

const reverseGeocodeLatLng = async (lat, lng) => {
  const pLat = Number(lat);
  const pLng = Number(lng);
  if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) return null;

  const latlng = `${pLat},${pLng}`;

  let result = await googleLegacyFetch("geocode/json", {
    latlng,
    result_type: SETTLEMENT_RESULT_TYPES,
  });

  let row = result.status === 200 ? result.body.results?.[0] : null;
  let label = extractSettlementName(row);

  if (!label) {
    result = await googleLegacyFetch("geocode/json", { latlng });
    row = result.status === 200 ? result.body.results?.[0] : null;
    label = extractSettlementName(row);
  }

  return label;
};

const getStopoverCandidates = async ({ polyline, max = 20 } = {}) => {
  const encoded = String(polyline || "").trim();
  if (!encoded) {
    return { status: 400, body: { success: false, message: "polyline is required" } };
  }

  const points = decodePolyline(encoded);
  const limit = Math.min(Math.max(Number(max) || 20, 8), 28);
  const samples = samplePolylineInterior(points, limit);
  const seen = new Set();
  const candidates = [];

  for (const point of samples) {
    const label = await reverseGeocodeLatLng(point.lat, point.lng);
    const key = String(label || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    candidates.push({
      id: `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`,
      label,
      lat: point.lat,
      lng: point.lng,
    });
  }

  return {
    status: 200,
    body: { success: true, count: candidates.length, candidates },
  };
};

const getAlternativeRoutes = async (params = {}) => {
  const origin = await resolveRoutePoint(
    params.originLat,
    params.originLng,
    params.originLabel || params.from
  );
  const destination = await resolveRoutePoint(
    params.destLat,
    params.destLng,
    params.destLabel || params.to
  );

  if (!origin || !destination) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Could not resolve route endpoints for alternative routes.",
      },
    };
  }

  const routeResult = await computeAlternativeRoutes({
    originLat: origin.lat,
    originLng: origin.lng,
    destLat: destination.lat,
    destLng: destination.lng,
    waypoints: params.waypoints,
  });

  if (routeResult.status !== 200) return routeResult;

  return {
    status: 200,
    body: {
      ...routeResult.body,
      origin,
      destination,
    },
  };
};

const getDirections = async ({
  originLat,
  originLng,
  destLat,
  destLng,
  originLabel,
  destLabel,
  from,
  to,
  waypoints = [],
} = {}) => {
  const origin = await resolveRoutePoint(
    originLat,
    originLng,
    originLabel || from
  );
  const destination = await resolveRoutePoint(destLat, destLng, destLabel || to);

  if (!origin || !destination) {
    return {
      status: 400,
      body: {
        success: false,
        message:
          "Could not resolve route endpoints. Save ride coordinates or use recognizable place names.",
      },
    };
  }

  const routeResult = await computeRoute({
    originLat: origin.lat,
    originLng: origin.lng,
    destLat: destination.lat,
    destLng: destination.lng,
    waypoints,
  });

  if (routeResult.status !== 200) return routeResult;

  return {
    status: 200,
    body: {
      ...routeResult.body,
      origin,
      destination,
    },
  };
};

module.exports = {
  hasGoogleKey,
  autocompletePlaces,
  getPlaceDetails,
  geocodeAddress,
  getDirections,
  getAlternativeRoutes,
  getStopoverCandidates,
  computeRoute,
  computeAlternativeRoutes,
  parseWaypoints,
};
