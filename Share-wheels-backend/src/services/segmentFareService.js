const User = require("../models/userModel");
const { normalizeAllowedVehicleType } = require("../constants/vehicleTypes");
const { getDirections } = require("./googleMapsService");
const {
  quoteFareForVehicle,
  resolveActiveFareConfig,
  vehicleTypeCandidates,
} = require("./vehicleFareService");
const { buildOrderedCorridor } = require("../utils/enrouteCorridorUtils");

const normalizeLabel = (value) => String(value || "").trim();

const normalizeVehicleType = (value) =>
  normalizeAllowedVehicleType(value) || "car";

const labelsMatch = (a, b) => {
  const x = normalizeLabel(a).toLowerCase();
  const y = normalizeLabel(b).toLowerCase();
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
};

const buildCorridorLabels = (ride) => {
  const labels = [];
  const seen = new Set();
  const add = (label) => {
    const text = normalizeLabel(label);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    labels.push(text);
  };

  add(ride?.from);
  (Array.isArray(ride?.stopovers) ? ride.stopovers : []).forEach((stop) => {
    add(stop?.label || stop?.name);
  });
  add(ride?.to);
  return labels;
};

/** Full driver route only when segment spans corridor start → end (not a stopover leg). */
const isFullRideSegment = (segFrom, segTo, ride) => {
  const from = normalizeLabel(segFrom);
  const to = normalizeLabel(segTo);
  const corridor = buildCorridorLabels(ride);

  if (corridor.length < 2) {
    return labelsMatch(from, ride?.from) && labelsMatch(to, ride?.to);
  }

  const fromIdx = corridor.findIndex((label) => labelsMatch(from, label));
  const toIdx = corridor.findIndex((label) => labelsMatch(to, label));
  if (fromIdx < 0 || toIdx < 0 || toIdx <= fromIdx) return false;

  return fromIdx === 0 && toIdx === corridor.length - 1;
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

const resolveRideVehicleType = (ride) => normalizeVehicleType(ride?.vehicle?.type);

const enrichRideVehicle = async (ride) => {
  if (!ride) return ride;

  const creatorId = ride.creator?._id || ride.creator;
  if (!creatorId) return ride;

  const driver = await User.findById(creatorId).select("vehicle.type vehicle.company").lean();
  if (!driver?.vehicle?.type) return ride;

  const rideType = normalizeVehicleType(ride?.vehicle?.type);
  const driverType = normalizeVehicleType(driver.vehicle.type);
  if (rideType === driverType && ride?.vehicle?.company) return ride;

  return {
    ...ride,
    vehicle: {
      ...(ride.vehicle || {}),
      type: driver.vehicle.type,
      company: ride.vehicle?.company || driver.vehicle.company || "",
    },
  };
};

const quoteAdminFareForKm = async (ride, distanceKm) => {
  const km = Number(distanceKm);
  if (!Number.isFinite(km) || km <= 0) return null;

  const vehicleType = resolveRideVehicleType(ride);
  const config = await resolveActiveFareConfig(vehicleType);
  if (!config) return null;

  const quote = quoteFareForVehicle(config, km);
  if (!quote) return null;

  return { ...quote, resolvedVehicleType: config.vehicleType };
};

const buildFareHint = (quote, segmentKm) => {
  if (!quote || segmentKm == null) return "";
  const fare = Math.round(quote.pricePerSeat ?? quote.price ?? 0);
  const kmLabel = Number(segmentKm).toFixed(1);

  if (quote.progressive && quote.segments?.length > 1) {
    const parts = quote.segments.map((s) => `₹${s.rate}/km × ${s.km} km`).join(" + ");
    return `${kmLabel} km: ${parts} = ₹${fare}`;
  }

  if (quote.rate) {
    return `₹${quote.rate}/km × ${kmLabel} km = ₹${fare}`;
  }

  return `${kmLabel} km segment`;
};

const resolveSegmentDistances = async (ride, from, to, isFull) => {
  const fullMeters = await resolveFullRideDistanceMeters(ride);
  let segmentMeters = isFull
    ? fullMeters
    : await fetchRouteDistanceMeters(from, to, ride);

  if (!segmentMeters && fullMeters && !isFull) {
    const ratio = await corridorIndexRatio(ride, from, to);
    if (ratio != null && ratio > 0) {
      segmentMeters = Math.round(fullMeters * ratio);
    }
  }

  return { fullMeters, segmentMeters };
};

const noFareRulesResult = (ride, { fullMeters, segmentMeters, isFull, segmentKm }) => {
  const vehicleType = resolveRideVehicleType(ride);
  const tried = vehicleTypeCandidates(vehicleType).join(", ") || vehicleType;
  return {
    perSeat: 0,
    fullMeters,
    segmentMeters,
    isFull,
    pricingSource: "no_fare_rules",
    fareHint: `No admin fare rules for ${tried}`,
    adminQuote: null,
    segmentKm,
  };
};

/**
 * Per-seat fare for a passenger corridor segment — always admin ₹/km tiers × segment km.
 */
const resolveSegmentFare = async (ride, segment = {}) => {
  const enrichedRide = await enrichRideVehicle(ride);

  const from = normalizeLabel(segment.from || enrichedRide.from);
  const to = normalizeLabel(segment.to || enrichedRide.to);
  const isFull = isFullRideSegment(from, to, enrichedRide);

  if (!from || !to) {
    return {
      perSeat: 0,
      fullMeters: null,
      segmentMeters: null,
      isFull: true,
      pricingSource: "invalid_segment",
      fareHint: "",
      adminQuote: null,
    };
  }

  const { fullMeters, segmentMeters } = await resolveSegmentDistances(
    enrichedRide,
    from,
    to,
    isFull
  );
  const segmentKm = segmentMeters > 0 ? segmentMeters / 1000 : null;

  if (!segmentKm) {
    return noFareRulesResult(enrichedRide, {
      fullMeters,
      segmentMeters,
      isFull,
      segmentKm: null,
    });
  }

  const adminQuote = await quoteAdminFareForKm(enrichedRide, segmentKm);
  if (adminQuote && Number(adminQuote.pricePerSeat) > 0) {
    return {
      perSeat: adminQuote.pricePerSeat,
      fullMeters,
      segmentMeters,
      isFull,
      pricingSource: "admin_tiers",
      fareHint: buildFareHint(adminQuote, segmentKm),
      adminQuote,
    };
  }

  return noFareRulesResult(enrichedRide, {
    fullMeters,
    segmentMeters,
    isFull,
    segmentKm,
  });
};

const calculatePerSeatFareForSegment = async (ride, segment = {}) => {
  const result = await resolveSegmentFare(ride, segment);
  return result.perSeat;
};

const quoteSegmentFare = async (ride, { from, to, seats = 1 } = {}) => {
  const seatCount = Math.max(1, Number(seats) || 1);
  const segment = {
    from: normalizeLabel(from || ride.from),
    to: normalizeLabel(to || ride.to),
  };

  const fare = await resolveSegmentFare(ride, segment);

  return {
    from: segment.from,
    to: segment.to,
    perSeatFare: fare.perSeat,
    totalFare: fare.perSeat * seatCount,
    seats: seatCount,
    fullRouteDistanceMeters: fare.fullMeters,
    segmentDistanceMeters: fare.segmentMeters,
    fullRideFare: Math.round(Number(ride.ride_amount) || 0),
    isFullRide: fare.isFull,
    pricingSource: fare.pricingSource,
    vehicleType: resolveRideVehicleType(ride),
    rate: fare.adminQuote?.rate ?? null,
    progressive: fare.adminQuote?.progressive ?? false,
    fareSegments: fare.adminQuote?.segments ?? null,
    fareHint: fare.fareHint,
  };
};

const resolveParticipantSegment = (ride, participant = {}) => ({
  from: normalizeLabel(participant.from || ride?.from),
  to: normalizeLabel(participant.to || ride?.to),
});

/** Apply admin tier segment fare onto a passenger/courier row for API responses. */
const enrichParticipantRecord = async (ride, participant, role = "passenger") => {
  if (!participant || !ride) return participant;

  const enrichedRide = await enrichRideVehicle(ride);
  const segment = resolveParticipantSegment(enrichedRide, participant);
  const fare = await resolveSegmentFare(enrichedRide, segment);
  const perSeat = Math.round(Number(fare.perSeat) || 0);
  const seats =
    role === "passenger"
      ? Math.max(1, Number(participant.requires_seats) || 1)
      : 1;
  const total = role === "passenger" ? perSeat * seats : perSeat;

  const out = { ...participant, perSeatFare: perSeat, fareHint: fare.fareHint || "" };
  out.pricingSource = fare.pricingSource;
  out.resolvedVehicleType = resolveRideVehicleType(enrichedRide);

  if (fare.pricingSource === "admin_tiers" && total > 0) {
    out.computedSegmentFare = total;
    out.displayFare = total;
    if (role === "passenger") out.ride_amount = total;
    if (role === "courier") out.amount_will = total;
    return out;
  }

  const stored =
    role === "passenger"
      ? Math.round(Number(participant.ride_amount) || 0)
      : Math.round(Number(participant.amount_will) || 0);
  out.computedSegmentFare = stored || total;
  out.displayFare = stored || total || 0;
  return out;
};

/** Upcoming/history list entry for passenger, courier, or driver. */
const enrichRideListEntry = async (entry) => {
  if (!entry) return entry;

  const enrichedRide = await enrichRideVehicle(entry);
  const role = entry.myRole || "passenger";

  if (role === "driver") {
    const fare = await resolveSegmentFare(enrichedRide, {
      from: enrichedRide.from,
      to: enrichedRide.to,
    });
    const perSeat = Math.round(Number(fare.perSeat) || 0);
    if (fare.pricingSource === "admin_tiers" && perSeat > 0) {
      return {
        ...entry,
        ride_amount: perSeat,
        perSeatFare: perSeat,
        displayFare: perSeat,
        fareHint: fare.fareHint || "",
        pricingSource: fare.pricingSource,
        resolvedVehicleType: resolveRideVehicleType(enrichedRide),
      };
    }
    return {
      ...entry,
      displayFare: Math.round(Number(entry.ride_amount) || 0),
      resolvedVehicleType: resolveRideVehicleType(enrichedRide),
    };
  }

  const participant = entry.activeData || {};
  const segment = {
    from: entry.bookedFrom || participant.from || entry.from,
    to: entry.bookedTo || participant.to || entry.to,
  };
  const fare = await resolveSegmentFare(enrichedRide, segment);
  const perSeat = Math.round(Number(fare.perSeat) || 0);
  const seats =
    role === "passenger"
      ? Math.max(1, Number(entry.requires_seats || participant.requires_seats) || 1)
      : 1;
  const total = role === "passenger" ? perSeat * seats : perSeat;

  const base = {
    ...entry,
    perSeatFare: perSeat,
    fareHint: fare.fareHint || "",
    pricingSource: fare.pricingSource,
    resolvedVehicleType: resolveRideVehicleType(enrichedRide),
  };

  if (fare.pricingSource === "admin_tiers" && total > 0) {
    return {
      ...base,
      computedSegmentFare: total,
      displayFare: total,
      ride_amount: role === "passenger" ? total : entry.ride_amount,
      amount_will: role === "courier" ? total : entry.amount_will,
    };
  }

  const stored =
    role === "passenger"
      ? Math.round(Number(entry.ride_amount) || 0)
      : Math.round(Number(entry.amount_will || entry.ride_amount) || 0);

  return {
    ...base,
    computedSegmentFare: stored || total,
    displayFare: stored || total || 0,
  };
};

const enrichRideDetailsParticipants = async (ride) => {
  if (!ride) return ride;

  const base = ride.toObject ? ride.toObject() : { ...ride };
  const enrichedRide = await enrichRideVehicle(base);

  const [passengers, all_deliveries, passenger_requested_ride, users_request_Couriers] =
    await Promise.all([
      Promise.all(
        (base.passengers || []).map((p) => enrichParticipantRecord(enrichedRide, p, "passenger"))
      ),
      Promise.all(
        (base.all_deliveries || []).map((c) => enrichParticipantRecord(enrichedRide, c, "courier"))
      ),
      Promise.all(
        (base.passenger_requested_ride || []).map((p) =>
          enrichParticipantRecord(enrichedRide, p, "passenger")
        )
      ),
      Promise.all(
        (base.users_request_Couriers || []).map((c) =>
          enrichParticipantRecord(enrichedRide, c, "courier")
        )
      ),
    ]);

  let driverDisplayFare = Math.round(Number(base.ride_amount) || 0);
  const driverFare = await resolveSegmentFare(enrichedRide, {
    from: base.from,
    to: base.to,
  });
  if (driverFare.pricingSource === "admin_tiers" && driverFare.perSeat > 0) {
    driverDisplayFare = Math.round(driverFare.perSeat);
  }

  return {
    ...base,
    passengers,
    all_deliveries,
    passenger_requested_ride,
    users_request_Couriers,
    ride_amount: driverDisplayFare,
    displayFare: driverDisplayFare,
    perSeatFare: driverDisplayFare,
    resolvedVehicleType: resolveRideVehicleType(enrichedRide),
  };
};

module.exports = {
  calculatePerSeatFareForSegment,
  quoteSegmentFare,
  resolveSegmentFare,
  isFullRideSegment,
  resolveFullRideDistanceMeters,
  enrichRideVehicle,
  enrichParticipantRecord,
  enrichRideListEntry,
  enrichRideDetailsParticipants,
};
