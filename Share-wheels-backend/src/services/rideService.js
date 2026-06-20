const mongoose = require("mongoose");
const Ride = require("../models/rideModel");
const UserRides = require("../models/userRides");
const User = require("../models/userModel");
const Courier = require("../models/courierModel");
const PassengerRide = require("../models/passengerRideModel");
const { parseAmount } = require("../schemas/commonSchemas");
const { ensureParticipantBoardingOtp } = require("./rideVerificationService");
const { notifyUser } = require("./notificationService");
const {
  isRideScheduledTimePassed,
  isRideScheduledTimeFuture,
  parseRideScheduledStart,
  assertDriverActionLeadTime,
  assertScheduledStartInFuture,
  parsePostponedStartTime,
  applyScheduledStartToRide,
  MAX_POSTPONE_DURATION_MS,
  formatStartTimeHHmm,
  isRidePastStartGracePeriod,
} = require("../utils/rideScheduleUtils");
const {
  notifyRideParticipants,
  emitRideScheduleUpdated,
} = require("../utils/rideNotificationUtils");
const {
  emitRideParticipantsUpdated,
  emitMyRequestsUpdated,
  emitEnrouteRequestRemoved,
  emitEnrouteRequestAdded,
  emitRideRequestUpdated,
} = require("../utils/socketEmit");
const { toEnrouteDateKey } = require("../utils/rideDateQueryUtils");
const { normalizeAllowedVehicleType } = require("../constants/vehicleTypes");
const {
  closeStandaloneRequestsAfterJoin,
  linkStandalonePassengersForRideRequest,
  routesRoughlyMatch,
  resolvePassengerLockedRideId,
  assertStandalonePassengerAvailableForRide,
} = require("../utils/participantRequestCleanup");
const {
  buildOrderedCorridor,
  matchesForwardCorridor,
} = require("../utils/enrouteCorridorUtils");
const googleMapsService = require("./googleMapsService");
const driverSubscriptionService = require("./driverSubscriptionService");
const { calculatePerSeatFareForSegment, quoteSegmentFare, enrichRideListEntry, enrichRideDetailsParticipants } = require("./segmentFareService");
const { expireStalePendingRides, expirePendingRideIfStale } = require("./rideExpiryService");
const { expireStaleOpenRequests } = require("./requestExpiryService");
const { rejectIfCourierJoiningAsPassenger } = require("../utils/rideParticipantRules");
const { normalizeStartTimeForStorage } = require("../utils/rideScheduleUtils");

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const loadPolylineTownLabels = async (polyline) => {
  const result = await googleMapsService.getStopoverCandidates({ polyline, max: 20 });
  if (result.status !== 200) return [];
  return (result.body.candidates || [])
    .map((row) => String(row.label || "").trim())
    .filter(Boolean);
};

const legacyEndpointMatch = (rideFrom, rideTo, searchFrom, searchTo) => {
  const fromRe = new RegExp(escapeRegex(searchFrom), "i");
  const toRe = new RegExp(escapeRegex(searchTo), "i");
  return fromRe.test(String(rideFrom || "")) && toRe.test(String(rideTo || ""));
};

const rideMatchesPassengerSearch = async (ride, searchFrom, searchTo) => {
  if (legacyEndpointMatch(ride.from, ride.to, searchFrom, searchTo)) {
    return true;
  }

  const hasRouteData =
    (Array.isArray(ride.stopovers) && ride.stopovers.length > 0) ||
    String(ride.routePolyline || "").trim();
  if (!hasRouteData) return false;

  const corridor = await buildOrderedCorridor({
    from: ride.from,
    to: ride.to,
    stopovers: ride.stopovers,
    routePolyline: ride.routePolyline,
    loadPolylineTowns: loadPolylineTownLabels,
  });

  return matchesForwardCorridor(searchFrom, searchTo, corridor);
};

const applyRideTypeFilter = (filter, rideType) => {
  const normalized = String(rideType || "").trim().toLowerCase();
  if (normalized === "long") {
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { rideType: "long" },
          { rideType: { $exists: false } },
          { rideType: null },
        ],
      },
    ];
    return;
  }
  if (normalized === "local") {
    filter.rideType = "local";
  }
};

const parseCalendarDateParts = (dateStr) => {
  const parts = String(dateStr).trim().split("-").map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  return { year: parts[0], month: parts[1], day: parts[2] };
};

/** Match rides stored as UTC midnight or local calendar day (legacy). */
const calendarDayRange = (dateStr) => {
  const p = parseCalendarDateParts(dateStr);
  if (!p) return null;
  const { year, month, day } = p;
  const utcStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const utcEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  const localStart = new Date(year, month - 1, day, 0, 0, 0, 0);
  const localEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
  return {
    startDate: new Date(Math.min(utcStart.getTime(), localStart.getTime())),
    endDate: new Date(Math.max(utcEnd.getTime(), localEnd.getTime())),
  };
};

const parseRideDateForStorage = (dateStr) => {
  const p = parseCalendarDateParts(dateStr);
  if (!p) return null;
  return new Date(Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0, 0));
};

const getRidesData = async ({ rideIds }) => {
  if (!rideIds || !Array.isArray(rideIds)) {
    return { status: 400, body: { status: false, message: "rideIds must be an array" } };
  }
  await expireStalePendingRides();
  const rides = await Ride.find({ _id: { $in: rideIds } })
    .populate("creator", "name mobile profile_img")
    .populate("users_request_Couriers.userId", "name mobile profile_img")
    .populate("all_deliveries.userId", "name mobile profile_img")
    .populate("passenger_requested_ride.userId", "name mobile profile_img")
    .populate("passengers.userId", "name mobile profile_img");
  return { status: 200, body: { status: true, count: rides.length, rides } };
};

const normalizeCoordsPayload = (coords, fallbackLabel) => {
  if (!coords || typeof coords !== "object") return undefined;
  const lat = Number(coords.lat ?? coords.latitude);
  const lng = Number(coords.lng ?? coords.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  const label = String(coords.label || fallbackLabel || "").trim();
  return { lat, lng, ...(label ? { label } : {}) };
};

const normalizeStopoversPayload = (stops) => {
  if (!Array.isArray(stops)) return [];
  return stops
    .map((stop) => {
      const lat = Number(stop?.lat ?? stop?.latitude);
      const lng = Number(stop?.lng ?? stop?.longitude);
      const label = String(stop?.label || "").trim();
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !label) return null;
      return { label, lat, lng };
    })
    .filter(Boolean);
};

const createRide = async (user, payload) => {
  const {
    from,
    to,
    availableSeats,
    ride_amount,
    date,
    startTime,
    AlternatePhoneNumber,
    CanCarryCourier,
    QuickReserve,
    rideType,
    fromCoords,
    toCoords,
    routePolyline,
    selectedRouteIndex,
    stopovers,
    routeDistanceMeters,
  } = payload;
  if (!from || !to || !date || !startTime || !ride_amount) {
    return { status: 400, body: { error: "All required ride fields are missing" } };
  }
  const vehicle = user.vehicle;
  if (!vehicle || !vehicle.company || !vehicle.car_no) {
    return { status: 400, body: { error: "Please add your vehicle details first" } };
  }
  const rideDate = parseRideDateForStorage(date);
  if (!rideDate || isNaN(rideDate.getTime())) {
    return { status: 400, body: { error: "Invalid date format" } };
  }

  const parsedAmount = parseAmount(ride_amount);
  if (parsedAmount === null || parsedAmount <= 0) {
    return { status: 400, body: { error: "Valid ride_amount is required" } };
  }

  const normalizedStartTime = normalizeStartTimeForStorage(rideDate, startTime);
  const scheduleCheck = assertScheduledStartInFuture(
    { date: rideDate, startTime: normalizedStartTime },
    null
  );
  if (!scheduleCheck.ok) {
    return { status: 400, body: { error: scheduleCheck.message } };
  }

  const normalizedFromCoords = normalizeCoordsPayload(fromCoords, from);
  const normalizedToCoords = normalizeCoordsPayload(toCoords, to);
  const normalizedStopovers = normalizeStopoversPayload(stopovers);
  const polyline = String(routePolyline || "").trim();
  const routeIndex = Number.isInteger(Number(selectedRouteIndex))
    ? Number(selectedRouteIndex)
    : 0;
  const routeMeters = Number(routeDistanceMeters);
  const storedRouteMeters =
    Number.isFinite(routeMeters) && routeMeters > 0 ? Math.round(routeMeters) : null;
  const normalizedRideType = String(rideType || "long").trim().toLowerCase();
  const storedRideType = normalizedRideType === "local" ? "local" : "long";

  const ride = await Ride.create({
    creator: user._id,
    from,
    to,
    rideType: storedRideType,
    ...(normalizedFromCoords ? { fromCoords: normalizedFromCoords } : {}),
    ...(normalizedToCoords ? { toCoords: normalizedToCoords } : {}),
    ...(polyline ? { routePolyline: polyline } : {}),
    ...(storedRouteMeters ? { routeDistanceMeters: storedRouteMeters } : {}),
    selectedRouteIndex: routeIndex,
    stopovers: normalizedStopovers,
    availableSeats: availableSeats || 1,
    date: rideDate,
    AlternatePhoneNumber: AlternatePhoneNumber ? String(AlternatePhoneNumber) : undefined,
    startTime: normalizedStartTime,
    vehicle: {
      type: vehicle.type || "car",
      company: vehicle.company || "",
      model: vehicle.model || "",
      car_image: vehicle.car_image || "",
      car_no: vehicle.car_no || "",
    },
    ride_amount: parsedAmount,
    CanCarryCourier,
    QuickReserve,
  });
  if (global.io) global.io.emit("newRide", ride);
  return { status: 200, body: { message: "Ride created successfully", ride } };
};

const getRides = async (query, authUser) => {
  await expireStalePendingRides();

  let { from, to, date, rideType } = query;
  if (!from || !to || !date) {
    return { status: 400, body: { message: "from, to and date are required" } };
  }
  from = String(from).trim();
  to = String(to).trim();
  const range = calendarDayRange(date);
  if (!range) {
    return { status: 400, body: { message: "Invalid date format" } };
  }

  const fromRegex = { $regex: escapeRegex(from), $options: "i" };
  const toRegex = { $regex: escapeRegex(to), $options: "i" };

  const findFilter = {
    date: { $gte: range.startDate, $lte: range.endDate },
    status: "pending",
    $or: [
      { from: fromRegex, to: toRegex },
      { from: fromRegex },
      { to: toRegex },
      { from: toRegex },
      { to: fromRegex },
      { "stopovers.label": fromRegex },
      { "stopovers.label": toRegex },
    ],
  };
  if (authUser?._id) {
    findFilter.creator = { $ne: authUser._id };
  }
  applyRideTypeFilter(findFilter, rideType);

  const candidates = await Ride.find(findFilter)
    .populate("creator", "name email mobile profile_img")
    .sort({ createdAt: -1 })
    .lean();

  const matchResults = await Promise.all(
    candidates.map(async (ride) => ({
      ride,
      matches: await rideMatchesPassengerSearch(ride, from, to),
    }))
  );
  const rides = matchResults.filter((row) => row.matches).map((row) => row.ride);

  // Original API: JSON array of rides (empty array when none)
  return { status: 200, body: rides };
};

const MIN_REASON_LENGTH = 10;

const validateActionReason = (reason, label = "reason") => {
  const trimmed = String(reason || "").trim();
  if (trimmed.length < MIN_REASON_LENGTH) {
    return {
      ok: false,
      message: `A valid ${label} is required (at least ${MIN_REASON_LENGTH} characters)`,
    };
  }
  return { ok: true, value: trimmed };
};

const cancelRide = async (user, { rideId, reason }) => {
  const ride = await Ride.findById(rideId);
  if (!ride) return { status: 404, body: { message: "Ride not found" } };
  if (ride.creator.toString() !== user._id.toString()) {
    return { status: 403, body: { message: "Only ride creator can cancel this ride" } };
  }
  if (ride.status !== "pending") {
    return {
      status: 400,
      body: { status: false, message: "Only pending rides can be cancelled" },
    };
  }
  const reasonCheck = validateActionReason(reason, "cancellation reason");
  if (!reasonCheck.ok) {
    return { status: 400, body: { status: false, message: reasonCheck.message } };
  }
  const leadCheck = assertDriverActionLeadTime(ride);
  if (!leadCheck.ok) {
    return { status: 400, body: { status: false, message: leadCheck.message } };
  }
  ride.status = "cancelled";
  ride.cancel_reason = reasonCheck.value;
  await ride.save();

  const driverName = user.name || "Driver";
  await notifyRideParticipants(ride, {
    title: "Ride cancelled",
    body: `${driverName} cancelled the ride ({route}). Reason: ${reasonCheck.value}`,
    driverMessage: `You cancelled the ride ({route}).`,
    type: "ride_cancelled",
    data: { reason: reasonCheck.value },
  });
  emitRideParticipantsUpdated(ride._id, { action: "cancelled" });

  return { status: 200, body: { status: true, message: "Ride cancelled successfully", ride } };
};

const postponeRide = async (user, { rideId, newStartTime, reason }) => {
  const ride = await Ride.findById(rideId);
  if (!ride) return { status: 404, body: { message: "Ride not found" } };
  if (ride.creator.toString() !== user._id.toString()) {
    return { status: 403, body: { message: "Only ride creator can postpone this ride" } };
  }
  if (ride.status !== "pending") {
    return {
      status: 400,
      body: { status: false, message: "Only pending rides can be postponed" },
    };
  }
  if ((ride.postponeCount || 0) >= 1) {
    return {
      status: 400,
      body: { status: false, message: "This ride has already been postponed once" },
    };
  }
  const reasonCheck = validateActionReason(reason, "postponement reason");
  if (!reasonCheck.ok) {
    return { status: 400, body: { status: false, message: reasonCheck.message } };
  }
  const leadCheck = assertDriverActionLeadTime(ride);
  if (!leadCheck.ok) {
    return { status: 400, body: { status: false, message: leadCheck.message } };
  }

  const currentStart = leadCheck.scheduledStart;
  const newStart = parsePostponedStartTime(ride, newStartTime);
  if (!newStart || Number.isNaN(newStart.getTime())) {
    return { status: 400, body: { status: false, message: "Invalid new start time" } };
  }

  const delayMs = newStart.getTime() - currentStart.getTime();
  if (delayMs <= 0) {
    return {
      status: 400,
      body: { status: false, message: "New start time must be after the current scheduled time" },
    };
  }
  if (delayMs > MAX_POSTPONE_DURATION_MS) {
    return {
      status: 400,
      body: { status: false, message: "Postponement cannot exceed 2 hours" },
    };
  }
  if (newStart.getTime() <= Date.now()) {
    return {
      status: 400,
      body: { status: false, message: "New start time must be in the future" },
    };
  }

  if (!ride.originalScheduledStart) {
    ride.originalScheduledStart = currentStart;
  }
  applyScheduledStartToRide(ride, newStart);
  ride.postponeCount = 1;
  ride.postponeReason = reasonCheck.value;
  ride.postponedAt = new Date();
  ride.scheduledStartNotifiedAt = null;
  await ride.save();

  const newTimeLabel = formatStartTimeHHmm(newStart);
  const driverName = user.name || "Driver";
  await notifyRideParticipants(ride, {
    title: "Ride postponed",
    body: `${driverName} postponed the ride ({route}) to ${newTimeLabel}. Reason: ${reasonCheck.value}`,
    driverMessage: `You postponed the ride ({route}) to ${newTimeLabel}.`,
    type: "ride_postponed",
    data: {
      reason: reasonCheck.value,
      newStartTime: newStart.toISOString(),
      postponeCount: ride.postponeCount,
    },
  });
  emitRideScheduleUpdated(ride._id, "postponed", {
    newStartTime: newStart.toISOString(),
  });

  return {
    status: 200,
    body: {
      status: true,
      message: "Ride postponed successfully",
      ride,
      newStartTime: newStart.toISOString(),
    },
  };
};

const addPassengerDirectly = async (
  ride,
  user,
  seats,
  total_amount,
  { standalonePassengerRideId, bookingSegment, requestedFrom, requestedTo } = {}
) => {
  const userId = user._id;
  const segment =
    bookingSegment ||
    (await resolvePassengerBookingSegment(userId, ride, {
      standalonePassengerRideId,
      requestedFrom,
      requestedTo,
    }));
  const passengerEntry = {
    userId,
    requires_seats: seats,
    from: segment.from,
    to: segment.to,
    ride_amount: total_amount,
    status: "accepted",
    joinedAt: new Date(),
  };
  await ensureParticipantBoardingOtp(passengerEntry, userId, {
    rideId: ride._id,
    from: segment.from,
    to: segment.to,
  });
  ride.passengers.push(passengerEntry);
  ride.availableSeats -= seats;
  await ride.save();

  await UserRides.findOneAndUpdate(
    { creator: userId },
    {
      $pull: { my_pending_ride_requests: { rideId: ride._id } },
      $push: {
        driver_accepted_ride_requests: {
          rideId: ride._id,
          driverId: ride.creator,
          amount_requested: total_amount,
          seats_requested: seats,
          status: "accepted",
        },
      },
    },
    { upsert: true }
  );

  await closeStandaloneRequestsAfterJoin(userId, ride, {
    explicitPassengerRideId: standalonePassengerRideId,
  });
  emitMyRequestsUpdated(userId, {
    action: "passenger_joined",
    rideId: ride._id.toString(),
    from: ride.from,
    to: ride.to,
    ...(standalonePassengerRideId
      ? { passengerRideId: String(standalonePassengerRideId) }
      : {}),
  });
  emitRideParticipantsUpdated(ride._id, {
    action: "passenger_joined",
    userId: userId.toString(),
  });

  await notifyUser(ride.creator, {
    title: "New passenger (Quick Reserve)",
    body: `${user.name || "A passenger"} booked ${seats} seat(s) on your ride`,
    type: "passenger_joined",
    data: { rideId: ride._id.toString() },
  });

  return passengerEntry;
};

const sendPassengerRequest = async (
  user,
  {
    rideId,
    requires_seats,
    standalonePassengerRideId,
    from: requestedFrom,
    to: requestedTo,
    amount_will,
  }
) => {
  const userId = user._id;
  const seats = Number(requires_seats);
  if (!rideId || !Number.isFinite(seats) || seats < 1) {
    return {
      status: 400,
      body: { success: false, message: "rideId and requires_seats (min 1) are required" },
    };
  }
  let ride = await Ride.findById(rideId);
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };

  const stale = await expirePendingRideIfStale(ride);
  ride = stale.ride || ride;
  if (ride.status === "expired") {
    return {
      status: 400,
      body: {
        success: false,
        message: "This ride has expired and is no longer accepting bookings",
      },
    };
  }
  if (ride.status !== "pending") {
    return {
      status: 400,
      body: { success: false, message: "Ride is not open for new bookings" },
    };
  }

  if (ride.creator.toString() === userId.toString()) {
    return {
      status: 400,
      body: {
        success: false,
        message: "You cannot book a seat on your own ride. You are the driver for this trip.",
      },
    };
  }

  const alreadyRequested = ride.passenger_requested_ride.some(
    (reqObj) => reqObj.userId.toString() === userId.toString()
  );
  if (alreadyRequested) {
    return { status: 400, body: { success: false, message: "Request already sent" } };
  }
  const alreadyPassenger = ride.passengers.some(
    (p) => p.userId.toString() === userId.toString()
  );
  if (alreadyPassenger) {
    return { status: 400, body: { success: false, message: "Already a passenger" } };
  }
  const courierConflict = rejectIfCourierJoiningAsPassenger(ride, userId);
  if (courierConflict.blocked) {
    return { status: 400, body: { success: false, message: courierConflict.message } };
  }
  if (seats > ride.availableSeats) {
    return {
      status: 400,
      body: {
        success: false,
        message: `Not enough seats available (only ${ride.availableSeats} left)`,
      },
    };
  }

  const standaloneLock = await assertStandalonePassengerAvailableForRide(
    userId,
    standalonePassengerRideId,
    rideId
  );
  if (!standaloneLock.ok) {
    return {
      status: 400,
      body: { success: false, message: standaloneLock.message },
    };
  }

  const bookingSegment = await resolvePassengerBookingSegment(userId, ride, {
    standalonePassengerRideId,
    requestedFrom,
    requestedTo,
  });

  const requestPerSeat = await resolvePassengerRequestPerSeatAmount(userId, {
    standalonePassengerRideId,
    amount_will,
  });

  const perSeatAmount =
    requestPerSeat != null
      ? requestPerSeat
      : await calculatePerSeatFareForSegment(ride, bookingSegment);
  if (!Number.isFinite(perSeatAmount) || perSeatAmount <= 0) {
    return {
      status: 400,
      body: {
        success: false,
        message: requestPerSeat != null
          ? "Invalid offer amount on your passenger request."
          : "Could not calculate fare for this segment. Ask the admin to configure vehicle fare rules.",
      },
    };
  }
  const total_amount = perSeatAmount * seats;

  if (ride.QuickReserve) {
    await addPassengerDirectly(ride, user, seats, total_amount, {
      standalonePassengerRideId,
      bookingSegment,
    });
    return {
      status: 200,
      body: {
        success: true,
        bookingStatus: "confirmed",
        message: `Booking confirmed! ${seats} seat(s) reserved (₹${total_amount}).`,
        calculated_amount: total_amount,
        ride,
      },
    };
  }

  const requesterName = user.name || "Someone";

  ride.passenger_requested_ride.push({
    userId,
    requires_seats: seats,
    from: bookingSegment.from,
    to: bookingSegment.to,
    ride_amount: total_amount,
    requestedAt: new Date(),
  });
  await ride.save();

  await UserRides.findOneAndUpdate(
    { creator: userId },
    {
      $push: {
        my_pending_ride_requests: {
          rideId: ride._id,
          driverId: ride.creator,
          amount_requested: total_amount,
          seats_requested: seats,
          status: "pending",
        },
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  await linkStandalonePassengersForRideRequest(userId, ride, {
    explicitPassengerRideId: standalonePassengerRideId,
  });
  emitMyRequestsUpdated(userId, {
    action: "passenger_request_sent",
    rideId: ride._id.toString(),
    from: ride.from,
    to: ride.to,
  });
  emitRideRequestUpdated(ride._id, {
    action: "passenger_request_sent",
    userId: userId.toString(),
    seats,
  });

  await notifyUser(ride.creator, {
    title: "New passenger request",
    body: `${requesterName} requested ${seats} seat(s) on your ride`,
    type: "passenger_request",
    data: { rideId: ride._id.toString() },
  });

  return {
    status: 200,
    body: {
      success: true,
      bookingStatus: "pending_approval",
      message: "Request sent. The driver must accept your booking.",
      calculated_amount: total_amount,
      ride,
    },
  };
};

const refIdStr = (ref) =>
  ref?._id?.toString?.() || ref?.toString?.() || "";

const normalizeRouteLabel = (value) => String(value || "").trim();

const routesMatch = (fromA, toA, fromB, toB) =>
  normalizeRouteLabel(fromA).toLowerCase() === normalizeRouteLabel(fromB).toLowerCase() &&
  normalizeRouteLabel(toA).toLowerCase() === normalizeRouteLabel(toB).toLowerCase();

const isFullRideBooking = (bookedFrom, bookedTo, rideFrom, rideTo) =>
  routesMatch(bookedFrom, bookedTo, rideFrom, rideTo) ||
  routesRoughlyMatch(bookedFrom, bookedTo, rideFrom, rideTo);

/** Backwards segment from ride destination (e.g. Hyderabad → Narsaraopet). */
const isCorruptHybridSegment = (from, to, rideFrom, rideTo) => {
  const fromNorm = normalizeRouteLabel(from).toLowerCase();
  const toNorm = normalizeRouteLabel(to).toLowerCase();
  const rideFromNorm = normalizeRouteLabel(rideFrom).toLowerCase();
  const rideToNorm = normalizeRouteLabel(rideTo).toLowerCase();
  if (!fromNorm || !toNorm || !rideFromNorm || !rideToNorm) return false;

  const labelsAlign = (a, b) =>
    a === b || a.includes(b) || b.includes(a);

  const fromIsRideEnd = labelsAlign(fromNorm, rideToNorm);
  const toIsRideStart = labelsAlign(toNorm, rideFromNorm);

  return fromIsRideEnd && !toIsRideStart;
};

const validateSegmentOnRideCorridor = async (ride, from, to) => {
  const fromLabel = normalizeRouteLabel(from);
  const toLabel = normalizeRouteLabel(to);
  if (!fromLabel || !toLabel) return null;

  const corridor = await buildOrderedCorridor({
    from: ride.from,
    to: ride.to,
    stopovers: ride.stopovers || [],
    routePolyline: ride.routePolyline || "",
    loadPolylineTowns: loadPolylineTownLabels,
  });

  if (!matchesForwardCorridor(fromLabel, toLabel, corridor)) return null;
  if (isFullRideBooking(fromLabel, toLabel, ride.from, ride.to)) return null;
  return { from: fromLabel, to: toLabel };
};

/** Use passenger/courier request offer only when explicitly linked in the booking payload. */
const resolvePassengerRequestPerSeatAmount = async (
  userId,
  { standalonePassengerRideId, amount_will } = {}
) => {
  const fromBody = parseAmount(amount_will);
  if (fromBody != null && fromBody > 0) return fromBody;

  const amountFromDoc = (doc) => {
    if (!doc || String(doc.creator) !== String(userId)) return null;
    const parsed = parseAmount(doc.amount_will);
    return parsed != null && parsed > 0 ? parsed : null;
  };

  if (standalonePassengerRideId && mongoose.Types.ObjectId.isValid(standalonePassengerRideId)) {
    const passengerRide = await PassengerRide.findById(standalonePassengerRideId)
      .select("amount_will creator")
      .lean();
    return amountFromDoc(passengerRide);
  }

  return null;
};

const findLinkedPassengerRideSegment = async (userId, rideId) => {
  const linked = await PassengerRide.findOne({
    creator: userId,
    $or: [
      { "assigned_to.rideId": rideId },
      { join_requested_By: { $elemMatch: { rideId } } },
    ],
  })
    .sort({ updatedAt: -1 })
    .select("from to assigned_to")
    .lean();

  if (!linked?.from || !linked?.to) return null;
  return {
    from: normalizeRouteLabel(linked.from),
    to: normalizeRouteLabel(linked.to),
  };
};

const resolveRideIdForPassengerRequest = (passengerRide, rideIdsSet) => {
  const fromAssigned = passengerRide.assigned_to?.rideId?.toString?.();
  if (fromAssigned && rideIdsSet.has(fromAssigned)) return fromAssigned;
  for (const row of passengerRide.join_requested_By || []) {
    const rideId = row?.rideId?.toString?.();
    if (rideId && rideIdsSet.has(rideId)) return rideId;
  }
  return fromAssigned || null;
};

const buildPassengerSegmentByRideId = (passengerRides, rideIds) => {
  const rideIdsSet = new Set(rideIds.map((id) => String(id)));
  const map = new Map();
  const sorted = [...(passengerRides || [])].sort(
    (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  );

  for (const passengerRide of sorted) {
    const rideId = resolveRideIdForPassengerRequest(passengerRide, rideIdsSet);
    if (!rideId || map.has(rideId)) continue;
    const from = normalizeRouteLabel(passengerRide.from);
    const to = normalizeRouteLabel(passengerRide.to);
    if (from && to) map.set(rideId, { from, to });
  }
  return map;
};

const collectViewerCourierRefsFromRides = (rides, userIdStr) => {
  const ids = new Set();
  const numbers = new Set();
  for (const ride of rides || []) {
    for (const row of [
      ...(ride.all_deliveries || []),
      ...(ride.users_request_Couriers || []),
    ]) {
      if (refIdStr(row.userId) !== userIdStr) continue;
      const courierId = row.courierId?.toString?.();
      if (courierId) ids.add(courierId);
      const courierNumber = String(row.courierNumber || "").trim();
      if (courierNumber) numbers.add(courierNumber);
    }
  }
  return { ids, numbers };
};

const buildCourierSegmentByRideId = (linkedCouriers, rides, userIdStr, rideIds) => {
  const rideIdsSet = new Set(rideIds.map((id) => String(id)));
  const map = new Map();

  for (const courier of linkedCouriers || []) {
    const rideId = courier.driver_assigned_courier?.rideId?.toString?.();
    const from = normalizeRouteLabel(courier.from);
    const to = normalizeRouteLabel(courier.to);
    if (rideId && rideIdsSet.has(rideId) && from && to && !map.has(rideId)) {
      map.set(rideId, { from, to });
    }
  }

  for (const courier of linkedCouriers || []) {
    const from = normalizeRouteLabel(courier.from);
    const to = normalizeRouteLabel(courier.to);
    if (!from || !to) continue;
    const courierId = courier._id?.toString?.();
    for (const ride of rides || []) {
      const rideId = String(ride._id);
      if (!rideIdsSet.has(rideId) || map.has(rideId)) continue;
      const courierNumber = String(courier.courierNumber || "").trim();
      const matched = [
        ...(ride.all_deliveries || []),
        ...(ride.users_request_Couriers || []),
      ].some((row) => {
        if (refIdStr(row.userId) !== userIdStr) return false;
        if (courierId && row.courierId?.toString?.() === courierId) return true;
        return courierNumber && String(row.courierNumber || "").trim() === courierNumber;
      });
      if (matched) map.set(rideId, { from, to });
    }
  }

  return map;
};

const applyValidEmbedCourierSegments = (rides, userIdStr, map) => {
  for (const ride of rides || []) {
    const rideId = String(ride._id);
    if (map.has(rideId)) continue;

    for (const row of [
      ...(ride.all_deliveries || []),
      ...(ride.users_request_Couriers || []),
    ]) {
      if (refIdStr(row.userId) !== userIdStr) continue;
      const from = normalizeRouteLabel(row.from);
      const to = normalizeRouteLabel(row.to);
      if (!from || !to) continue;
      if (isCorruptHybridSegment(from, to, ride.from, ride.to)) continue;
      if (isFullRideBooking(from, to, ride.from, ride.to)) continue;
      map.set(rideId, { from, to });
      break;
    }
  }
};

const loadPassengerSegmentByRideId = async (userId, rideIds) => {
  if (!rideIds.length) return new Map();
  const passengerRides = await PassengerRide.find({
    creator: userId,
    $or: [
      { "assigned_to.rideId": { $in: rideIds } },
      { join_requested_By: { $elemMatch: { rideId: { $in: rideIds } } } },
    ],
  })
    .select("from to assigned_to join_requested_By updatedAt")
    .sort({ updatedAt: -1 })
    .lean();
  return buildPassengerSegmentByRideId(passengerRides, rideIds);
};

const loadCourierSegmentByRideId = async (userId, userIdStr, rides, rideIds) => {
  if (!rideIds.length) return new Map();
  const { ids: courierIds, numbers: courierNumbers } =
    collectViewerCourierRefsFromRides(rides, userIdStr);
  const orClauses = [{ "driver_assigned_courier.rideId": { $in: rideIds } }];
  if (courierIds.size) orClauses.push({ _id: { $in: [...courierIds] } });
  if (courierNumbers.size) {
    orClauses.push({ courierNumber: { $in: [...courierNumbers] } });
  }
  const linkedCouriers = await Courier.find({
    creator: userId,
    $or: orClauses,
  })
    .select("from to driver_assigned_courier courierNumber")
    .sort({ updatedAt: -1 })
    .lean();

  const map = buildCourierSegmentByRideId(linkedCouriers, rides, userIdStr, rideIds);
  applyValidEmbedCourierSegments(rides, userIdStr, map);

  for (const ride of rides || []) {
    const rideId = String(ride._id);
    if (map.has(rideId)) continue;

    const onRide = [
      ...(ride.all_deliveries || []),
      ...(ride.users_request_Couriers || []),
    ].find((row) => refIdStr(row.userId) === userIdStr);
    if (!onRide) continue;

    const corridor = await buildOrderedCorridor({
      from: ride.from,
      to: ride.to,
      stopovers: ride.stopovers || [],
      routePolyline: ride.routePolyline || "",
      loadPolylineTowns: loadPolylineTownLabels,
    });

    const candidates = linkedCouriers.filter((courier) => {
      const from = normalizeRouteLabel(courier.from);
      const to = normalizeRouteLabel(courier.to);
      if (!from || !to) return false;
      if (isFullRideBooking(from, to, ride.from, ride.to)) return false;
      if (isCorruptHybridSegment(from, to, ride.from, ride.to)) return false;
      return matchesForwardCorridor(from, to, corridor);
    });

    if (candidates.length === 1) {
      map.set(rideId, {
        from: normalizeRouteLabel(candidates[0].from),
        to: normalizeRouteLabel(candidates[0].to),
      });
      continue;
    }

    const openCouriers = await Courier.find({
      creator: userId,
      courier_status: { $in: ["pending", "request_to_driver"] },
    })
      .select("from to")
      .sort({ updatedAt: -1 })
      .lean();

    const openMatches = openCouriers.filter((courier) => {
      const from = normalizeRouteLabel(courier.from);
      const to = normalizeRouteLabel(courier.to);
      if (!from || !to) return false;
      if (isFullRideBooking(from, to, ride.from, ride.to)) return false;
      if (isCorruptHybridSegment(from, to, ride.from, ride.to)) return false;
      return matchesForwardCorridor(from, to, corridor);
    });

    if (openMatches.length === 1) {
      map.set(rideId, {
        from: normalizeRouteLabel(openMatches[0].from),
        to: normalizeRouteLabel(openMatches[0].to),
      });
    }
  }

  return map;
};

/** Passenger corridor segment (e.g. stopover town → stopover town), not always the full driver ride. */
const resolvePassengerBookingSegment = async (
  userId,
  ride,
  { standalonePassengerRideId, requestedFrom, requestedTo } = {}
) => {
  const rideFrom = ride.from;
  const rideTo = ride.to;

  if (requestedFrom && requestedTo) {
    const corridorSegment = await validateSegmentOnRideCorridor(
      ride,
      requestedFrom,
      requestedTo
    );
    if (corridorSegment) return corridorSegment;
  }

  if (standalonePassengerRideId && mongoose.Types.ObjectId.isValid(standalonePassengerRideId)) {
    const passengerRide = await PassengerRide.findById(standalonePassengerRideId)
      .select("from to creator")
      .lean();
    if (passengerRide && String(passengerRide.creator) === String(userId)) {
      const from = normalizeRouteLabel(passengerRide.from) || rideFrom;
      const to = normalizeRouteLabel(passengerRide.to) || rideTo;
      if (!isFullRideBooking(from, to, rideFrom, rideTo)) {
        return { from, to };
      }
    }
  }

  const linked = await findLinkedPassengerRideSegment(userId, ride._id);
  if (linked && !isFullRideBooking(linked.from, linked.to, rideFrom, rideTo)) {
    return linked;
  }

  return { from: rideFrom, to: rideTo };
};

const resolveBookedSegmentForList = (
  ride,
  activeData,
  role,
  passengerSegmentByRideId,
  courierSegmentByRideId
) => {
  if (!activeData || role === "driver") return null;

  const rideFrom = ride.from;
  const rideTo = ride.to;

  if (role === "passenger") {
    const linked = passengerSegmentByRideId.get(String(ride._id));
    if (
      linked?.from &&
      linked?.to &&
      !isFullRideBooking(linked.from, linked.to, rideFrom, rideTo) &&
      !isCorruptHybridSegment(linked.from, linked.to, rideFrom, rideTo)
    ) {
      return linked;
    }
  }

  if (role === "courier") {
    const linked = courierSegmentByRideId.get(String(ride._id));
    if (
      linked?.from &&
      linked?.to &&
      !isFullRideBooking(linked.from, linked.to, rideFrom, rideTo) &&
      !isCorruptHybridSegment(linked.from, linked.to, rideFrom, rideTo)
    ) {
      return linked;
    }
  }

  const from = normalizeRouteLabel(activeData.from);
  const to = normalizeRouteLabel(activeData.to);

  if (!from || !to) return null;
  if (isCorruptHybridSegment(from, to, rideFrom, rideTo)) return null;
  if (isFullRideBooking(from, to, rideFrom, rideTo)) return null;
  return { from, to };
};

/** Inclusion-only — cannot mix `-password` exclusions with named fields in MongoDB projections */
const USER_PUBLIC_FIELDS = "name email mobile profile_img gender userNo";

const listRidesByPhase = async (user, completed) => {
  if (!completed) {
    await expireStalePendingRides();
  }

  const userIdRaw = user?._id || user?.id;
  if (!userIdRaw) {
    return { status: 401, body: { success: false, message: "User not authenticated" } };
  }

  let userId;
  try {
    userId = new mongoose.Types.ObjectId(userIdRaw);
  } catch {
    return { status: 400, body: { success: false, message: "Invalid user id" } };
  }

  const userIdStr = userId.toString();
  const membership = {
    $or: [
      { creator: userId },
      { "passengers.userId": userId },
      { "all_deliveries.userId": userId },
      { "passenger_requested_ride.userId": userId },
      { "users_request_Couriers.userId": userId },
    ],
  };

  const query = completed
    ? {
        status: { $in: ["completed", "cancelled", "expired"] },
        ...membership,
      }
    : {
        status: { $in: ["pending", "started"] },
        ...membership,
      };

  const rides = await Ride.find(query)
    .populate({ path: "creator", select: USER_PUBLIC_FIELDS, strictPopulate: false })
    .populate({
      path: "passengers.userId",
      select: USER_PUBLIC_FIELDS,
      strictPopulate: false,
    })
    .populate({
      path: "all_deliveries.userId",
      select: USER_PUBLIC_FIELDS,
      strictPopulate: false,
    })
    .populate({
      path: "passenger_requested_ride.userId",
      select: USER_PUBLIC_FIELDS,
      strictPopulate: false,
    })
    .populate({
      path: "users_request_Couriers.userId",
      select: USER_PUBLIC_FIELDS,
      strictPopulate: false,
    })
    .sort(completed ? { date: -1, startTime: -1 } : { date: 1, startTime: 1 })
    .lean();

  const rideIds = rides.map((r) => r._id);
  const passengerSegmentByRideId = await loadPassengerSegmentByRideId(userId, rideIds);
  const courierSegmentByRideId = await loadCourierSegmentByRideId(
    userId,
    userIdStr,
    rides,
    rideIds
  );

  const allowedStatuses = completed
    ? ["completed", "cancelled", "expired"]
    : ["pending", "started"];

  const updatedRides = rides
    .filter((ride) => allowedStatuses.includes(ride.status))
    .flatMap((ride) => {
      const results = [];
      const passengers = ride.passengers || [];
      const deliveries = ride.all_deliveries || [];
      const passengerRequests = ride.passenger_requested_ride || [];
      const courierRequests = ride.users_request_Couriers || [];

      const isDriver = refIdStr(ride.creator) === userIdStr;
      const passengerData = passengers.find((p) => refIdStr(p.userId) === userIdStr);
      const courierData = deliveries.find((d) => refIdStr(d.userId) === userIdStr);
      const pendingPassengerReq = passengerRequests.find(
        (r) => refIdStr(r.userId) === userIdStr
      );
      const pendingCourierReq = courierRequests.find(
        (r) => refIdStr(r.userId) === userIdStr
      );

      const scheduleMeta = {
        isSchedulePassed: isRideScheduledTimePassed(ride),
        isScheduleFuture: isRideScheduledTimeFuture(ride),
        canStartLate: ride.status === "pending" && isRideScheduledTimePassed(ride),
        canStartEarly: ride.status === "pending" && isRideScheduledTimeFuture(ride),
      };

      if (isDriver) {
        results.push({
          ...ride,
          ...scheduleMeta,
          myRole: "driver",
          roleContext: "creator",
          activeData: ride.creator,
        });
      }
      if (passengerData) {
        const bookedSegment = resolveBookedSegmentForList(
          ride,
          passengerData,
          "passenger",
          passengerSegmentByRideId,
          courierSegmentByRideId
        );
        const activeData = bookedSegment
          ? { ...passengerData, from: bookedSegment.from, to: bookedSegment.to }
          : passengerData;
        results.push({
          ...ride,
          ...scheduleMeta,
          myRole: "passenger",
          roleContext: "passengers",
          bookingStatus: "confirmed",
          activeData,
          ...(bookedSegment
            ? { bookedFrom: bookedSegment.from, bookedTo: bookedSegment.to }
            : {}),
          ride_amount: passengerData.ride_amount ?? ride.ride_amount,
          requires_seats: passengerData.requires_seats,
        });
      } else if (pendingPassengerReq) {
        const bookedSegment = resolveBookedSegmentForList(
          ride,
          pendingPassengerReq,
          "passenger",
          passengerSegmentByRideId,
          courierSegmentByRideId
        );
        const activeData = bookedSegment
          ? { ...pendingPassengerReq, from: bookedSegment.from, to: bookedSegment.to }
          : pendingPassengerReq;
        results.push({
          ...ride,
          ...scheduleMeta,
          myRole: "passenger",
          roleContext: "passenger_requested_ride",
          bookingStatus: "pending_approval",
          activeData,
          ...(bookedSegment
            ? { bookedFrom: bookedSegment.from, bookedTo: bookedSegment.to }
            : {}),
          ride_amount: pendingPassengerReq.ride_amount ?? ride.ride_amount,
          requires_seats: pendingPassengerReq.requires_seats,
        });
      }
      if (courierData) {
        const bookedSegment = resolveBookedSegmentForList(
          ride,
          courierData,
          "courier",
          passengerSegmentByRideId,
          courierSegmentByRideId
        );
        const activeData = bookedSegment
          ? { ...courierData, from: bookedSegment.from, to: bookedSegment.to }
          : courierData;
        results.push({
          ...ride,
          ...scheduleMeta,
          myRole: "courier",
          roleContext: "all_deliveries",
          bookingStatus: "confirmed",
          activeData,
          ...(bookedSegment
            ? { bookedFrom: bookedSegment.from, bookedTo: bookedSegment.to }
            : {}),
          ride_amount: courierData.amount_will ?? ride.ride_amount,
        });
      } else if (pendingCourierReq) {
        const bookedSegment = resolveBookedSegmentForList(
          ride,
          pendingCourierReq,
          "courier",
          passengerSegmentByRideId,
          courierSegmentByRideId
        );
        const activeData = bookedSegment
          ? { ...pendingCourierReq, from: bookedSegment.from, to: bookedSegment.to }
          : pendingCourierReq;
        results.push({
          ...ride,
          ...scheduleMeta,
          myRole: "courier",
          roleContext: "users_request_Couriers",
          bookingStatus: "pending_approval",
          activeData,
          ...(bookedSegment
            ? { bookedFrom: bookedSegment.from, bookedTo: bookedSegment.to }
            : {}),
          ride_amount: pendingCourierReq.amount_will ?? ride.ride_amount,
        });
      }
      return results;
    });

  const ridesOut = completed
    ? updatedRides
    : [...updatedRides].sort((a, b) => {
        const order = { started: 0, pending: 1 };
        const aRank = order[a.status] ?? 9;
        const bRank = order[b.status] ?? 9;
        if (aRank !== bRank) return aRank - bRank;
        const aTime = new Date(a?.date || a?.createdAt || 0).getTime();
        const bTime = new Date(b?.date || b?.createdAt || 0).getTime();
        return aTime - bTime;
      });

  const enrichedRides = await Promise.all(ridesOut.map((entry) => enrichRideListEntry(entry)));

  return { status: 200, body: { success: true, count: enrichedRides.length, rides: enrichedRides } };
};

const USER_FIELDS = USER_PUBLIC_FIELDS;

const sanitizeParticipant = (entry, viewerId) => {
  const doc = entry.toObject ? entry.toObject() : { ...entry };
  const uid = doc.userId?._id?.toString?.() || doc.userId?.toString?.();
  const isSelf = viewerId && uid === viewerId.toString();
  if (!isSelf) {
    delete doc.boardingOtp;
    delete doc.boardingOtpExpires;
  }
  return doc;
};

const getRideDetails = async (rideId, viewerId) => {
  if (!mongoose.Types.ObjectId.isValid(rideId)) return { status: 400, body: { success: false, message: "Invalid Ride ID" } };
  let ride = await Ride.findById(rideId)
    .select(
      "passengers all_deliveries passenger_requested_ride users_request_Couriers status creator vehicle from to fromCoords toCoords stopovers routePolyline selectedRouteIndex routeDistanceMeters date startTime ride_amount availableSeats CanCarryCourier QuickReserve postponeCount postponeReason postponedAt originalScheduledStart cancel_reason"
    )
    .populate("creator", USER_FIELDS)
    .populate("passengers.userId", USER_FIELDS)
    .populate("all_deliveries.userId", USER_FIELDS)
    .populate("passenger_requested_ride.userId", USER_FIELDS)
    .populate("users_request_Couriers.userId", USER_FIELDS);
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };

  if (ride.status === "pending" && isRidePastStartGracePeriod(ride)) {
    const stale = await expirePendingRideIfStale(ride);
    ride = stale.ride || ride;
  }

  const toPlain = (entry) => (entry?.toObject ? entry.toObject() : { ...entry });
  const passengers = (ride.passengers || []).map((p) =>
    sanitizeParticipant(toPlain(p), viewerId)
  );
  const all_deliveries = (ride.all_deliveries || []).map((c) =>
    sanitizeParticipant(toPlain(c), viewerId)
  );
  const passenger_requested_ride = (ride.passenger_requested_ride || []).map(toPlain);
  const users_request_Couriers = (ride.users_request_Couriers || []).map(toPlain);

  const enrichedData = await enrichRideDetailsParticipants({
    ...ride.toObject(),
    passengers,
    all_deliveries,
    passenger_requested_ride,
    users_request_Couriers,
  });

  const verificationParticipants = [
    ...enrichedData.passengers.map((p) => ({
      role: "passenger",
      name: p.userId?.name,
      userNo: p.userId?.userNo,
      isBoardingVerified: !!p.isBoardingVerified,
    })),
    ...enrichedData.all_deliveries.map((c) => ({
      role: "courier",
      name: c.userId?.name,
      userNo: c.userId?.userNo,
      isBoardingVerified: !!c.isBoardingVerified,
    })),
  ];
  const pendingVerification = verificationParticipants.filter((p) => !p.isBoardingVerified).length;

  let myBoarding = null;
  let bookedFrom = null;
  let bookedTo = null;
  let viewerDisplayFare = enrichedData.displayFare;
  let viewerPerSeatFare = enrichedData.perSeatFare;
  let viewerFareHint = "";
  if (viewerId) {
    const vid = viewerId.toString();
    const asPassenger = enrichedData.passengers.find((p) => p.userId?._id?.toString() === vid);
    const asCourier = enrichedData.all_deliveries.find((c) => c.userId?._id?.toString() === vid);
    const pendingPassengerReq = enrichedData.passenger_requested_ride.find(
      (r) => r.userId?._id?.toString() === vid || r.userId?.toString() === vid
    );
    const pendingCourierReq = enrichedData.users_request_Couriers.find(
      (r) => r.userId?._id?.toString() === vid || r.userId?.toString() === vid
    );
    const self = asPassenger || asCourier || pendingPassengerReq || pendingCourierReq;
    if (self) {
      viewerDisplayFare = self.displayFare ?? self.computedSegmentFare ?? self.ride_amount ?? self.amount_will ?? viewerDisplayFare;
      viewerPerSeatFare = self.perSeatFare ?? viewerPerSeatFare;
      viewerFareHint = self.fareHint || "";
    }
    if (asPassenger || asCourier) {
      myBoarding = {
        role: asPassenger ? "passenger" : "courier",
        userNo: self.userId?.userNo,
        boardingOtp: self.boardingOtp,
        boardingOtpExpires: self.boardingOtpExpires,
        isBoardingVerified: !!self.isBoardingVerified,
        tripStatus: self.status || "accepted",
      };
    }

    const rideIds = [ride._id];
    const passengerSegmentByRideId = await loadPassengerSegmentByRideId(viewerId, rideIds);
    const courierSegmentByRideId = await loadCourierSegmentByRideId(
      viewerId,
      vid,
      [ride],
      rideIds
    );

    let viewerRole = null;
    let viewerActive = null;
    if (asPassenger) {
      viewerRole = "passenger";
      viewerActive = asPassenger;
    } else if (pendingPassengerReq) {
      viewerRole = "passenger";
      viewerActive = pendingPassengerReq;
    } else if (asCourier) {
      viewerRole = "courier";
      viewerActive = asCourier;
    } else if (pendingCourierReq) {
      viewerRole = "courier";
      viewerActive = pendingCourierReq;
    }

    if (viewerRole && viewerActive) {
      const bookedSegment = resolveBookedSegmentForList(
        ride,
        viewerActive,
        viewerRole,
        passengerSegmentByRideId,
        courierSegmentByRideId
      );
      if (bookedSegment) {
        bookedFrom = bookedSegment.from;
        bookedTo = bookedSegment.to;
      }
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      data: {
        status: ride.status,
        vehicle: ride.vehicle,
        creator: ride.creator,
        from: ride.from,
        to: ride.to,
        fromCoords: ride.fromCoords || null,
        toCoords: ride.toCoords || null,
        routePolyline: ride.routePolyline || "",
        selectedRouteIndex: ride.selectedRouteIndex ?? 0,
        stopovers: ride.stopovers || [],
        date: ride.date,
        startTime: ride.startTime,
        postponeCount: ride.postponeCount || 0,
        postponeReason: ride.postponeReason,
        postponedAt: ride.postponedAt,
        originalScheduledStart: ride.originalScheduledStart,
        cancel_reason: ride.cancel_reason,
        ride_amount: enrichedData.ride_amount,
        displayFare: enrichedData.displayFare,
        perSeatFare: enrichedData.perSeatFare,
        resolvedVehicleType: enrichedData.resolvedVehicleType,
        availableSeats: ride.availableSeats,
        CanCarryCourier: !!ride.CanCarryCourier,
        QuickReserve: !!ride.QuickReserve,
        passengers: enrichedData.passengers,
        all_deliveries: enrichedData.all_deliveries,
        passenger_requested_ride: enrichedData.passenger_requested_ride,
        users_request_Couriers: enrichedData.users_request_Couriers,
        verification: {
          total: verificationParticipants.length,
          pending: pendingVerification,
          allVerified: verificationParticipants.length === 0 || pendingVerification === 0,
          participants: verificationParticipants,
        },
        myBoarding,
        ...(bookedFrom && bookedTo ? { bookedFrom, bookedTo } : {}),
        viewerDisplayFare,
        viewerPerSeatFare,
        viewerFareHint,
      },
    },
  };
};

/** Normalize any stored/sent date to YYYY-MM-DD (calendar day, UTC-safe). */
const parseCalendarDateString = (dateValue) => {
  if (dateValue == null || dateValue === "") return null;
  if (typeof dateValue === "string") {
    const trimmed = dateValue.trim();
    const ymd = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (ymd) return ymd[1];
  }
  if (typeof dateValue === "object" && !(dateValue instanceof Date)) {
    if (dateValue.startDate != null) return parseCalendarDateString(dateValue.startDate);
    if (dateValue.endDate != null) return parseCalendarDateString(dateValue.endDate);
  }
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Inclusive calendar range for matching driver rides to a request's date span. */
const calendarRangeFromRequestDates = (startValue, endValue) => {
  let startStr = parseCalendarDateString(startValue);
  if (!startStr) return null;
  let endStr = parseCalendarDateString(endValue) || startStr;
  if (endStr < startStr) {
    const tmp = startStr;
    startStr = endStr;
    endStr = tmp;
  }
  const startRange = calendarDayRange(startStr);
  const endRange = calendarDayRange(endStr);
  if (!startRange || !endRange) return null;
  return { startDate: startRange.startDate, endDate: endRange.endDate };
};

const userIdOnRideRequests = (ride, userId) => {
  const uid = String(userId);
  const passengerPending = (ride.passenger_requested_ride || []).some(
    (p) => String(p.userId?._id || p.userId) === uid
  );
  const courierPending = (ride.users_request_Couriers || []).some(
    (c) => String(c.userId?._id || c.userId) === uid
  );
  return { passengerPending, courierPending };
};

const MATCHING_RIDE_CREATOR_SELECT =
  "name mobile profile_img vehicle.type vehicle.company vehicle.model vehicle.car_no vehicle.car_image";

const resolveMatchingRideVehicle = (ride) => {
  const fromRide = ride?.vehicle || {};
  const fromCreator = ride?.creator?.vehicle || {};
  const type =
    normalizeAllowedVehicleType(fromRide.type) ||
    normalizeAllowedVehicleType(fromCreator.type) ||
    "car";

  return {
    type,
    company: String(fromRide.company || fromCreator.company || "").trim(),
    model: String(fromRide.model || fromCreator.model || "").trim(),
    car_no: String(fromRide.car_no || fromCreator.car_no || "").trim(),
    car_image: String(fromRide.car_image || fromCreator.car_image || "").trim(),
  };
};

const serializeMatchingRide = (ride, userId) => {
  if (!ride) return null;
  const { passengerPending, courierPending } = userIdOnRideRequests(ride, userId);
  const vehicle = resolveMatchingRideVehicle(ride);
  return {
    _id: ride._id,
    from: ride.from,
    to: ride.to,
    date: ride.date,
    startTime: ride.startTime,
    availableSeats: ride.availableSeats,
    ride_amount: ride.ride_amount,
    status: ride.status,
    CanCarryCourier: !!ride.CanCarryCourier,
    QuickReserve: !!ride.QuickReserve,
    vehicle,
    vehicleType: vehicle.type,
    stopovers: ride.stopovers || [],
    routePolyline: ride.routePolyline || "",
    routeDistanceMeters: ride.routeDistanceMeters ?? null,
    creator: ride.creator
      ? {
          _id: ride.creator._id,
          name: ride.creator.name,
          mobile: ride.creator.mobile,
          profile_img: ride.creator.profile_img,
        }
      : null,
    passengerRequestPending: passengerPending,
    courierRequestPending: courierPending,
  };
};

const MATCHING_RIDE_SELECT =
  "from to date startTime availableSeats ride_amount status vehicle creator CanCarryCourier QuickReserve passenger_requested_ride.userId users_request_Couriers.userId stopovers routePolyline routeDistanceMeters";

const filterRidesByDriverSubscription = async (rides) => {
  if (!Array.isArray(rides) || !rides.length) return [];

  const driverIds = rides
    .map((ride) => ride.creator?._id || ride.creator)
    .filter(Boolean);
  const subscribedDriverIds =
    await driverSubscriptionService.getEligibleRelatedRideDriverIds(driverIds);

  return rides.filter((ride) => {
    const driverId = String(ride.creator?._id || ride.creator || "");
    return subscribedDriverIds.has(driverId);
  });
};

const findMatchingRidesForRequest = async ({
  from,
  to,
  date,
  dateEnd = null,
  userId,
  courierOnly = false,
  excludeRideId = null,
}) => {
  await expireStalePendingRides();

  if (!from?.trim() || !to?.trim()) return [];
  const range = calendarRangeFromRequestDates(date, dateEnd);
  if (!range) return [];

  const fromRegex = { $regex: escapeRegex(String(from).trim()), $options: "i" };
  const toRegex = { $regex: escapeRegex(String(to).trim()), $options: "i" };

  const filter = {
    date: { $gte: range.startDate, $lte: range.endDate },
    status: "pending",
    creator: { $ne: userId },
    QuickReserve: true,
    $or: [
      { from: fromRegex, to: toRegex },
      { from: fromRegex },
      { to: toRegex },
      { from: toRegex },
      { to: fromRegex },
      { "stopovers.label": fromRegex },
      { "stopovers.label": toRegex },
    ],
  };
  if (courierOnly) filter.CanCarryCourier = true;
  if (excludeRideId) filter._id = { $ne: excludeRideId };

  const candidates = await Ride.find(filter)
    .select(MATCHING_RIDE_SELECT)
    .populate("creator", MATCHING_RIDE_CREATOR_SELECT)
    .sort({ date: 1, startTime: 1 })
    .limit(25)
    .lean();

  const searchFrom = String(from).trim();
  const searchTo = String(to).trim();
  const matchResults = await Promise.all(
    candidates.map(async (ride) => ({
      ride,
      matches: await rideMatchesPassengerSearch(ride, searchFrom, searchTo),
    }))
  );
  const matchedRides = matchResults.filter((row) => row.matches).map((row) => row.ride);

  const subscribedRides = await filterRidesByDriverSubscription(matchedRides);

  return subscribedRides.slice(0, 10).map((r) => serializeMatchingRide(r, userId));
};

const fetchLinkedRide = async (rideId, userId) => {
  if (!rideId) return null;
  const ride = await Ride.findById(rideId)
    .select(MATCHING_RIDE_SELECT)
    .populate("creator", MATCHING_RIDE_CREATOR_SELECT)
    .lean();
  if (!ride) return null;

  const driverId = ride.creator?._id || ride.creator;
  const hasSubscription =
    await driverSubscriptionService.driverHasActiveSubscription(driverId);
  if (!hasSubscription) return null;

  return serializeMatchingRide(ride, userId);
};

const buildMyPassengerRequests = async (user) => {
  await expireStaleOpenRequests();
  const userId = new mongoose.Types.ObjectId(user._id);

  const passengerData = await PassengerRide.find({
    creator: userId,
    status: "pending",
    $or: [{ assigned_to: { $exists: false } }, { "assigned_to.rideId": null }],
  }).lean();

  const visiblePassengerData = passengerData.filter(
    (p) => !p.assigned_to?.rideId
  );

  const standalonePassengerRequests = visiblePassengerData.map((p) => {
    const lockedRideId = resolvePassengerLockedRideId(p);
    return {
      requestId: p._id,
      passengerRideId: p._id,
      requestKind: "standalone",
      rideId: lockedRideId,
      from: p.from,
      to: p.to,
      date: p.date,
      date_end: p.date_end,
      seats: p.seats_needed,
      amount: p.amount_will,
      luggage: p.luggage_included,
      requestedAt: p.createdAt,
      status: p.status,
      assignedRide: p.assigned_to?.rideId || null,
      join_requested_By: (p.join_requested_By || []).map((row) => ({
        rideId: row.rideId,
      })),
      lockedRideId,
      type: "passenger",
    };
  });

  const passengerRequestsBase = standalonePassengerRequests;

  return Promise.all(
    passengerRequestsBase.map(async (req) => {
      const matchingRides = await findMatchingRidesForRequest({
        from: req.from,
        to: req.to,
        date: req.date,
        dateEnd: req.date_end,
        userId,
      });
      const linkedRideId = req.lockedRideId || null;
      const linkedRide = linkedRideId
        ? await fetchLinkedRide(linkedRideId, userId)
        : null;
      return { ...req, linkedRide, matchingRides };
    })
  );
};

const buildMyCourierRequests = async (user) => {
  await expireStaleOpenRequests();
  const userId = new mongoose.Types.ObjectId(user._id);

  const courierRequestsData = await Courier.find({
    creator: userId,
    courier_status: "pending",
    $or: [
      { driver_assigned_courier: { $exists: false } },
      { "driver_assigned_courier.rideId": null },
    ],
  }).lean();

  const courierRequestsBase = courierRequestsData
    .filter(
      (c) => !c.driver_assigned_courier?.rideId
    )
    .map((c) => ({
      requestId: c._id,
      requestKind: "courier",
      courierNumber: c.courierNumber,
      from: c.from,
      to: c.to,
      parcel: c.what_to_deliver,
      what_to_deliver: c.what_to_deliver,
      courier_type: c.courier_type,
      courier_img: c.courier_img,
      amount: c.amount_will,
      amount_will: c.amount_will,
      date: c.date,
      receiver: c.courier_receiver_details,
      status: c.courier_status,
      assignedRide: c.driver_assigned_courier?.rideId || null,
      lockedRideId: c.driver_assigned_courier?.rideId?.toString?.() || null,
      requestedAt: c.createdAt,
      type: "courier",
    }));

  return Promise.all(
    courierRequestsBase.map(async (c) => {
      const matchingRides = await findMatchingRidesForRequest({
        from: c.from,
        to: c.to,
        date: c.date?.startDate || c.date,
        dateEnd: c.date?.endDate,
        userId,
        courierOnly: true,
      });
      const linkedRideId = c.lockedRideId || c.assignedRide || null;
      const linkedRide = linkedRideId
        ? await fetchLinkedRide(linkedRideId, userId)
        : null;
      return { ...c, linkedRide, matchingRides };
    })
  );
};

const getMyPassengerRequests = async (user) => {
  const passengerRequests = await buildMyPassengerRequests(user);
  return {
    status: 200,
    body: {
      success: true,
      passengerRequests,
      total: passengerRequests.length,
    },
  };
};

const getMyCourierRequests = async (user) => {
  const courierRequests = await buildMyCourierRequests(user);
  return {
    status: 200,
    body: {
      success: true,
      courierRequests,
      total: courierRequests.length,
    },
  };
};

const getMyRequests = async (user) => {
  const [passengerRequests, courierRequests] = await Promise.all([
    buildMyPassengerRequests(user),
    buildMyCourierRequests(user),
  ]);

  return {
    status: 200,
    body: {
      success: true,
      passengerRequests,
      courierRequests,
      total: passengerRequests.length + courierRequests.length,
    },
  };
};

const deleteMyPassengerRequest = async (user, requestId) => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    return {
      status: 400,
      body: { success: false, message: "Invalid request id" },
    };
  }

  const userId = new mongoose.Types.ObjectId(user._id);
  const doc = await PassengerRide.findOne({
    _id: requestId,
    creator: userId,
    status: "pending",
    $or: [{ assigned_to: { $exists: false } }, { "assigned_to.rideId": null }],
  });

  if (!doc) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Request not found or cannot be deleted (only pending open requests)",
      },
    };
  }

  await PassengerRide.deleteOne({ _id: doc._id });
  return {
    status: 200,
    body: { success: true, message: "Passenger request deleted" },
  };
};

const deleteMyCourierRequest = async (user, requestId) => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    return {
      status: 400,
      body: { success: false, message: "Invalid request id" },
    };
  }

  const userId = new mongoose.Types.ObjectId(user._id);
  const doc = await Courier.findOne({
    _id: requestId,
    creator: userId,
    courier_status: { $in: ["pending", "request_to_driver"] },
    $or: [
      { driver_assigned_courier: { $exists: false } },
      { "driver_assigned_courier.rideId": null },
    ],
  });

  if (!doc) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Request not found or cannot be deleted (only pending open requests)",
      },
    };
  }

  await Courier.deleteOne({ _id: doc._id });
  return {
    status: 200,
    body: { success: true, message: "Courier request deleted" },
  };
};

const parseDateValue = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const updateMyPassengerRequest = async (user, requestId, body = {}) => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    return { status: 400, body: { success: false, message: "Invalid request id" } };
  }

  const userId = new mongoose.Types.ObjectId(user._id);
  const doc = await PassengerRide.findOne({
    _id: requestId,
    creator: userId,
    status: "pending",
    $or: [{ assigned_to: { $exists: false } }, { "assigned_to.rideId": null }],
  });
  if (!doc) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Request not found or cannot be edited (only pending open requests)",
      },
    };
  }

  const from = String(body.from || "").trim();
  const to = String(body.to || "").trim();
  const seats = Number(body.seats_needed);
  const amount = parseAmount(body.amount_will);
  const startDate = parseDateValue(body.date?.startDate ?? body.date ?? body.ride_need_date);
  const endDateRaw = body.date?.endDate ?? body.date_end ?? null;
  const endDate = endDateRaw ? parseDateValue(endDateRaw) : null;

  if (!from || !to || !startDate || !Number.isFinite(seats) || seats < 1) {
    return { status: 400, body: { success: false, message: "Invalid route, seats, or date" } };
  }
  if (amount === null || amount <= 0) {
    return { status: 400, body: { success: false, message: "Valid amount_will is required" } };
  }

  const prev = {
    from: doc.from,
    to: doc.to,
    date: doc.date,
    passengerRideId: doc._id.toString(),
    userId: doc.creator.toString(),
    type: "passenger",
  };

  doc.from = from;
  doc.to = to;
  doc.seats_needed = seats;
  doc.amount_will = amount;
  doc.ride_need_date = startDate;
  doc.date = startDate;
  doc.date_end = endDate || null;
  if (typeof body.luggage_included === "boolean") {
    doc.luggage_included = body.luggage_included;
  }
  await doc.save();

  emitEnrouteRequestRemoved(prev.from, prev.to, toEnrouteDateKey(prev.date), prev);
  emitEnrouteRequestAdded(doc.from, doc.to, toEnrouteDateKey(doc.date), {
    passengerRideId: doc._id.toString(),
    userId: doc.creator.toString(),
    type: "passenger",
  });
  emitMyRequestsUpdated(doc.creator, {
    action: "passenger_request_updated",
    passengerRideId: doc._id.toString(),
  });

  return {
    status: 200,
    body: { success: true, message: "Passenger request updated", request: doc },
  };
};

const updateMyCourierRequest = async (user, requestId, body = {}) => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    return { status: 400, body: { success: false, message: "Invalid request id" } };
  }

  const userId = new mongoose.Types.ObjectId(user._id);
  const doc = await Courier.findOne({
    _id: requestId,
    creator: userId,
    courier_status: { $in: ["pending", "request_to_driver"] },
    $or: [
      { driver_assigned_courier: { $exists: false } },
      { "driver_assigned_courier.rideId": null },
    ],
  });
  if (!doc) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Request not found or cannot be edited (only pending open requests)",
      },
    };
  }

  const from = String(body.from || "").trim();
  const to = String(body.to || "").trim();
  const courierType = String(body.courier_type || "").trim();
  const what = String(body.what_to_deliver || "").trim();
  const image = String(body.courier_img || "").trim();
  const amount = parseAmount(body.amount_will);
  const startDate = parseDateValue(body.date?.startDate ?? body.date);
  const endDate = parseDateValue(body.date?.endDate ?? body.date) || startDate;
  const receiverName = String(body.receiver_name || "").trim();
  const receiverMobile = String(body.receiver_mobile || "").trim();
  const receiverAlt = String(body.receiver_alternate_mobile || "").trim() || receiverMobile;
  const receiverAddress = String(body.receiver_address || "").trim();

  if (
    !from ||
    !to ||
    !courierType ||
    !what ||
    !image ||
    !startDate ||
    !receiverName ||
    !receiverMobile ||
    !receiverAddress
  ) {
    return { status: 400, body: { success: false, message: "Invalid courier request fields" } };
  }
  if (amount === null || amount <= 0) {
    return { status: 400, body: { success: false, message: "Valid amount_will is required" } };
  }

  const prev = {
    from: doc.from,
    to: doc.to,
    date: doc.date?.startDate || doc.date,
    courierId: doc._id.toString(),
    userId: doc.creator.toString(),
    type: "courier",
  };

  doc.from = from;
  doc.to = to;
  doc.courier_type = courierType;
  doc.what_to_deliver = what;
  doc.courier_img = image;
  doc.amount_will = amount;
  doc.date = { startDate, endDate };
  doc.courier_receiver_details = {
    name: receiverName,
    mobile: receiverMobile,
    alternate_mobile: receiverAlt,
    Address: receiverAddress,
  };
  await doc.save();

  emitEnrouteRequestRemoved(prev.from, prev.to, toEnrouteDateKey(prev.date), prev);
  emitEnrouteRequestAdded(doc.from, doc.to, toEnrouteDateKey(doc.date?.startDate || doc.date), {
    courierId: doc._id.toString(),
    userId: doc.creator.toString(),
    type: "courier",
  });
  emitMyRequestsUpdated(doc.creator, {
    action: "courier_request_updated",
    courierId: doc._id.toString(),
  });

  return {
    status: 200,
    body: { success: true, message: "Courier request updated", request: doc },
  };
};

const getSegmentFare = async (rideId, { from, to, seats } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    return { status: 400, body: { success: false, message: "Invalid ride ID" } };
  }
  const ride = await Ride.findById(rideId).populate("creator", "vehicle.type vehicle.company").lean();
  if (!ride) {
    return { status: 404, body: { success: false, message: "Ride not found" } };
  }
  const quote = await quoteSegmentFare(ride, { from, to, seats });
  return { status: 200, body: { success: true, quote } };
};

module.exports = {
  getRidesData,
  createRide,
  getRides,
  cancelRide,
  postponeRide,
  sendPassengerRequest,
  listRidesByPhase,
  getRideDetails,
  getMyRequests,
  getMyPassengerRequests,
  getMyCourierRequests,
  getSegmentFare,
  deleteMyPassengerRequest,
  deleteMyCourierRequest,
  updateMyPassengerRequest,
  updateMyCourierRequest,
};
