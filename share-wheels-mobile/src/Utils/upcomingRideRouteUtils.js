const norm = (value) => String(value || "").trim();

const routesMatch = (fromA, toA, fromB, toB) =>
  norm(fromA).toLowerCase() === norm(fromB).toLowerCase() &&
  norm(toA).toLowerCase() === norm(toB).toLowerCase();

const tokenize = (label) =>
  norm(label)
    .toLowerCase()
    .replace(/[,]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);

const routesRoughlyMatch = (fromA, toA, fromB, toB) => {
  const matchDir = (aFrom, aTo, bFrom, bTo) => {
    const rf = norm(aFrom).toLowerCase();
    const rt = norm(aTo).toLowerCase();
    const from = norm(bFrom).toLowerCase();
    const to = norm(bTo).toLowerCase();
    if (!rf || !rt || !from || !to) return false;
    return (from.includes(rf) || rf.includes(from)) && (to.includes(rt) || rt.includes(to));
  };

  if (matchDir(fromA, toA, fromB, toB) || matchDir(fromB, toB, fromA, toA)) {
    return true;
  }

  const tokenOverlap = (left, right) => {
    const rightSet = new Set(tokenize(right));
    return tokenize(left).some((token) => rightSet.has(token));
  };

  return tokenOverlap(fromA, fromB) && tokenOverlap(toA, toB);
};

const isFullRideBooking = (bookedFrom, bookedTo, rideFrom, rideTo) =>
  routesMatch(bookedFrom, bookedTo, rideFrom, rideTo) ||
  routesRoughlyMatch(bookedFrom, bookedTo, rideFrom, rideTo);

/**
 * Backwards segment starting at ride destination (e.g. Hyderabad → Narsaraopet).
 * Forward segments from ride origin (e.g. Chilakaluripet → Nalgonda) are valid.
 */
const isCorruptHybridSegment = (bookedFrom, bookedTo, rideFrom, rideTo) => {
  const fromNorm = norm(bookedFrom).toLowerCase();
  const toNorm = norm(bookedTo).toLowerCase();
  const rideFromNorm = norm(rideFrom).toLowerCase();
  const rideToNorm = norm(rideTo).toLowerCase();
  if (!fromNorm || !toNorm || !rideFromNorm || !rideToNorm) return false;

  const labelsAlign = (a, b) =>
    a === b || a.includes(b) || b.includes(a);

  const fromIsRideEnd = labelsAlign(fromNorm, rideToNorm);
  const toIsRideStart = labelsAlign(toNorm, rideFromNorm);

  return fromIsRideEnd && !toIsRideStart;
};

const refUserId = (ref) =>
  ref?._id?.toString?.() || ref?.id?.toString?.() || ref?.toString?.() || "";

/** Same participant lookup for passenger and courier (confirmed + pending). */
export const findViewerParticipant = (data, myUserId, role) => {
  if (!myUserId) return null;
  const uid = String(myUserId);

  if (role === "courier") {
    return (
      (data?.couriers || data?.all_deliveries || []).find(
        (row) => refUserId(row?.userId) === uid
      ) ||
      (data?.courierRequests || data?.users_request_Couriers || []).find(
        (row) => refUserId(row?.userId) === uid
      ) ||
      null
    );
  }

  return (
    (data?.passengers || []).find((row) => refUserId(row?.userId) === uid) ||
    (data?.passengerRequests || data?.passenger_requested_ride || []).find(
      (row) => refUserId(row?.userId) === uid
    ) ||
    null
  );
};

const bookedLabelForRole = (role) =>
  role === "courier" ? "Your delivery" : "Your booking";

/**
 * Ride from→to (driver) + booked from→to (passenger/courier segment).
 * Same rules for passenger and courier.
 */
export const getUpcomingRideRoutes = (data, options = {}) => {
  const myUserId = options.myUserId;
  const role = data?.myRole;

  const rideRoute = {
    label: "Ride",
    from: norm(data?.from) || "—",
    to: norm(data?.to) || "—",
  };

  if (role === "driver") {
    return { rideRoute, bookedRoute: null };
  }

  let bookedFrom = norm(data?.bookedFrom);
  let bookedTo = norm(data?.bookedTo);

  if (!bookedFrom || !bookedTo) {
    const participant =
      data?.activeData ||
      (myUserId ? findViewerParticipant(data, myUserId, role) : null);
    bookedFrom = bookedFrom || norm(participant?.from);
    bookedTo = bookedTo || norm(participant?.to);
  }

  if (!bookedFrom || !bookedTo) {
    return { rideRoute, bookedRoute: null };
  }

  if (isCorruptHybridSegment(bookedFrom, bookedTo, rideRoute.from, rideRoute.to)) {
    return { rideRoute, bookedRoute: null };
  }

  if (isFullRideBooking(bookedFrom, bookedTo, rideRoute.from, rideRoute.to)) {
    return { rideRoute, bookedRoute: null };
  }

  return {
    rideRoute,
    bookedRoute: {
      label: bookedLabelForRole(role),
      from: bookedFrom,
      to: bookedTo,
    },
  };
};

export const stopoverCount = (stopovers) =>
  Array.isArray(stopovers) ? stopovers.length : 0;
