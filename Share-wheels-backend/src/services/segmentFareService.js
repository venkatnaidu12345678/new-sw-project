const { getDirections } = require("./googleMapsService");
const { buildOrderedCorridor } = require("../utils/enrouteCorridorUtils");
const { routesRoughlyMatch } = require("../utils/participantRequestCleanup");

const normalizeLabel = (value) => String(value || "").trim();

const labelsMatch = (a, b) => {
  const x = normalizeLabel(a).toLowerCase();
  const y = normalizeLabel(b).toLowerCase();
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
};

const isFullRideSegment = (segFrom, segTo, rideFrom, rideTo) => {
  const from = normalizeLabel(segFrom);
  const to = normalizeLabel(segTo);
  const rf = normalizeLabel(rideFrom);
  const rt = normalizeLabel(rideTo);
  if (!from || !to || !rf || !rt) return true;
  return (
    (labelsMatch(from, rf) && labelsMatch(to, rt)) ||
    routesRoughlyMatch(from, to, rf, rt)
  );
};

const resolveCoordsForLabel = (ride, label) => {
  const target = normalizeLabel(label);
  if (!target) return null;

  if (labelsMatch(target, ride.from) && ride.fromCoords?.lat != null) {
    return { lat: ride.fromCoords.lat, lng: ride.fromCoords.lng };
  }
  if (labelsMatch(target, ride.to) && ride.toCoords?.lat != null) {
    return { lat: ride.toCoords.lat, lng: ride.toCoords.lng };
  }

  for (const stop of ride.stopovers || []) {
    if (labelsMatch(target, stop?.label) && stop?.lat != null && stop?.lng != null) {
      return { lat: stop.lat, lng: stop.lng };
    }
  }
  return null;
};

const fetchRouteDistanceMeters = async (from, to, ride) => {
  const fromCoords = resolveCoordsForLabel(ride, from);
  const toCoords = resolveCoordsForLabel(ride, to);

  const res = await getDirections({
    originLabel: from,
    destLabel: to,
    originLat: fromCoords?.lat,
    originLng: fromCoords?.lng,
    destLat: toCoords?.lat,
    destLng: toCoords?.lng,
    from,
    to,
  });

  if (res.status !== 200) return null;
  const meters = Number(res.body?.distanceMeters);
  return Number.isFinite(meters) && meters > 0 ? Math.round(meters) : null;
};

const resolveFullRideDistanceMeters = async (ride) => {
  const stored = Number(ride?.routeDistanceMeters);
  if (Number.isFinite(stored) && stored > 0) return Math.round(stored);

  return fetchRouteDistanceMeters(ride.from, ride.to, ride);
};

const corridorIndexRatio = async (ride, from, to) => {
  const corridor = await buildOrderedCorridor({
    from: ride.from,
    to: ride.to,
    stopovers: ride.stopovers || [],
    routePolyline: ride.routePolyline || "",
  });
  if (!corridor?.length || corridor.length < 2) return null;

  const fromIdx = corridor.findIndex((label) => labelsMatch(from, label));
  const toIdx = corridor.findIndex((label) => labelsMatch(to, label));
  if (fromIdx < 0 || toIdx < 0 || toIdx <= fromIdx) return null;

  const span = corridor.length - 1;
  return (toIdx - fromIdx) / span;
};

/**
 * Per-seat fare for a passenger corridor segment (e.g. Narsaraopet → Hyderabad on a longer driver ride).
 */
const calculatePerSeatFareForSegment = async (ride, segment = {}) => {
  const baseFare = Number(ride?.ride_amount) || 0;
  if (baseFare <= 0) return 0;

  const from = normalizeLabel(segment.from || ride.from);
  const to = normalizeLabel(segment.to || ride.to);
  if (!from || !to) return baseFare;

  if (isFullRideSegment(from, to, ride.from, ride.to)) {
    return Math.round(baseFare);
  }

  const fullMeters = await resolveFullRideDistanceMeters(ride);
  const segmentMeters = await fetchRouteDistanceMeters(from, to, ride);

  if (fullMeters && segmentMeters) {
    const ratio = Math.min(1, segmentMeters / fullMeters);
    return Math.max(1, Math.round(baseFare * ratio));
  }

  const ratio = await corridorIndexRatio(ride, from, to);
  if (ratio != null && ratio > 0) {
    return Math.max(1, Math.round(baseFare * ratio));
  }

  return Math.round(baseFare);
};

const quoteSegmentFare = async (ride, { from, to, seats = 1 } = {}) => {
  const seatCount = Math.max(1, Number(seats) || 1);
  const segment = {
    from: normalizeLabel(from || ride.from),
    to: normalizeLabel(to || ride.to),
  };
  const perSeat = await calculatePerSeatFareForSegment(ride, segment);
  const fullMeters = await resolveFullRideDistanceMeters(ride);
  const isFull = isFullRideSegment(segment.from, segment.to, ride.from, ride.to);
  let segmentMeters = isFull
    ? fullMeters
    : await fetchRouteDistanceMeters(segment.from, segment.to, ride);

  if (!segmentMeters && fullMeters && !isFull) {
    const ratio = await corridorIndexRatio(ride, segment.from, segment.to);
    if (ratio != null && ratio > 0) {
      segmentMeters = Math.round(fullMeters * ratio);
    }
  }

  return {
    from: segment.from,
    to: segment.to,
    perSeatFare: perSeat,
    totalFare: perSeat * seatCount,
    seats: seatCount,
    fullRouteDistanceMeters: fullMeters,
    segmentDistanceMeters: segmentMeters,
    fullRideFare: Math.round(Number(ride.ride_amount) || 0),
    isFullRide: isFull,
  };
};

module.exports = {
  calculatePerSeatFareForSegment,
  quoteSegmentFare,
  isFullRideSegment,
  resolveFullRideDistanceMeters,
};
