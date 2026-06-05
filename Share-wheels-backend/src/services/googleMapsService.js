const GOOGLE_KEY = (process.env.GOOGLE_MAPS_API_KEY || "").trim();

const hasGoogleKey = () => Boolean(GOOGLE_KEY);

const googleFetch = async (path, params = {}) => {
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

const normalizeCountry = (country) => {
  const c = String(country || "").trim().toLowerCase();
  // Google "components=country:xx" expects ISO 3166-1 alpha-2.
  return /^[a-z]{2}$/.test(c) ? c : "in";
};

/**
 * Google Places Autocomplete.
 *
 * Note: Google does not provide an API to "list all places in India".
 * Autocomplete is query-driven; we can only broaden/narrow what kinds of
 * suggestions are returned for a given input string.
 */
const autocompletePlaces = async (input, sessionToken, opts = {}) => {
  const query = String(input || "").trim();
  if (query.length < 2) {
    return { status: 200, body: { success: true, predictions: [] } };
  }

  const country = normalizeCountry(opts.country);
  const mode = String(opts.mode || "cities").trim().toLowerCase();
  const typeByMode = {
    // Maintains existing behavior (city-level suggestions).
    cities: "(cities)",
    // Broader set: places/areas/addresses; Google recommends omitting `types`
    // unless you specifically need a narrow subset.
    all: null,
    // Useful for "place-like" results without full addresses.
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

  const result = await googleFetch("place/autocomplete/json", params);
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

  const result = await googleFetch("place/details/json", {
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

const getDirections = async ({ originLat, originLng, destLat, destLng }) => {
  const oLat = Number(originLat);
  const oLng = Number(originLng);
  const dLat = Number(destLat);
  const dLng = Number(destLng);

  if (![oLat, oLng, dLat, dLng].every(Number.isFinite)) {
    return { status: 400, body: { success: false, message: "Invalid origin or destination" } };
  }

  const result = await googleFetch("directions/json", {
    origin: `${oLat},${oLng}`,
    destination: `${dLat},${dLng}`,
    mode: "driving",
  });
  if (result.status !== 200) return result;

  const route = result.body.routes?.[0];
  const polyline = route?.overview_polyline?.points;
  if (!polyline) {
    return { status: 404, body: { success: false, message: "No route found" } };
  }

  return {
    status: 200,
    body: {
      success: true,
      polyline,
      distanceMeters: route.legs?.[0]?.distance?.value,
      durationSeconds: route.legs?.[0]?.duration?.value,
    },
  };
};

module.exports = {
  hasGoogleKey,
  autocompletePlaces,
  getPlaceDetails,
  getDirections,
};
