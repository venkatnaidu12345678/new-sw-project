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
  emitRideRequestUpdated,
} = require("../utils/socketEmit");
const { toEnrouteDateKey } = require("../utils/rideDateQueryUtils");
const { expireStalePendingRides, expirePendingRideIfStale } = require("./rideExpiryService");
const { expireStaleOpenRequests } = require("./requestExpiryService");
const { rejectIfCourierJoiningAsPassenger } = require("../utils/rideParticipantRules");
const { normalizeStartTimeForStorage } = require("../utils/rideScheduleUtils");

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
    fromCoords,
    toCoords,
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

  const ride = await Ride.create({
    creator: user._id,
    from,
    to,
    ...(normalizedFromCoords ? { fromCoords: normalizedFromCoords } : {}),
    ...(normalizedToCoords ? { toCoords: normalizedToCoords } : {}),
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

  let { from, to, date } = query;
  if (!from || !to || !date) {
    return { status: 400, body: { message: "from, to and date are required" } };
  }
  from = String(from).trim();
  to = String(to).trim();
  const range = calendarDayRange(date);
  if (!range) {
    return { status: 400, body: { message: "Invalid date format" } };
  }

  const findFilter = {
    from: { $regex: escapeRegex(from), $options: "i" },
    to: { $regex: escapeRegex(to), $options: "i" },
    date: { $gte: range.startDate, $lte: range.endDate },
    status: "pending",
  };
  if (authUser?._id) {
    findFilter.creator = { $ne: authUser._id };
  }

  const rides = await Ride.find(findFilter)
    .populate("creator", "name email mobile profile_img")
    .sort({ createdAt: -1 })
    .lean();

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

/** Hide standalone open requests once user has joined this driver ride. */
const closeStandalonePassengerRequestsAfterJoin = async (userId, ride) => {
  const fromRegex = { $regex: escapeRegex(String(ride.from).trim()), $options: "i" };
  const toRegex = { $regex: escapeRegex(String(ride.to).trim()), $options: "i" };
  const open = await PassengerRide.find({
    creator: userId,
    status: "pending",
    from: fromRegex,
    to: toRegex,
    $or: [{ assigned_to: { $exists: false } }, { "assigned_to.rideId": null }],
  }).lean();

  if (!open.length) return;

  await PassengerRide.updateMany(
    { _id: { $in: open.map((p) => p._id) } },
    {
      $set: {
        status: "cancelled",
        assigned_to: { userId: ride.creator, rideId: ride._id },
      },
    }
  );

  const dateKey = toEnrouteDateKey(ride.date);
  open.forEach((p) => {
    emitEnrouteRequestRemoved(ride.from, ride.to, dateKey, {
      passengerRideId: p._id.toString(),
      type: "passenger",
    });
  });
};

const addPassengerDirectly = async (ride, user, seats, total_amount) => {
  const userId = user._id;
  const passengerEntry = {
    userId,
    requires_seats: seats,
    ride_amount: total_amount,
    status: "accepted",
    joinedAt: new Date(),
  };
  await ensureParticipantBoardingOtp(passengerEntry, userId, {
    rideId: ride._id,
    from: ride.from,
    to: ride.to,
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

  await closeStandalonePassengerRequestsAfterJoin(userId, ride);
  emitMyRequestsUpdated(userId, { action: "passenger_joined", rideId: ride._id.toString() });
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

const sendPassengerRequest = async (user, { rideId, requires_seats }) => {
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

  const total_amount = ride.ride_amount * seats;

  if (ride.QuickReserve) {
    await addPassengerDirectly(ride, user, seats, total_amount);
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

  await closeStandalonePassengerRequestsAfterJoin(userId, ride);
  emitMyRequestsUpdated(userId, {
    action: "passenger_request_sent",
    rideId: ride._id.toString(),
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
        results.push({
          ...ride,
          ...scheduleMeta,
          myRole: "passenger",
          roleContext: "passengers",
          bookingStatus: "confirmed",
          activeData: passengerData,
          ride_amount: passengerData.ride_amount ?? ride.ride_amount,
          requires_seats: passengerData.requires_seats,
        });
      } else if (pendingPassengerReq) {
        results.push({
          ...ride,
          ...scheduleMeta,
          myRole: "passenger",
          roleContext: "passenger_requested_ride",
          bookingStatus: "pending_approval",
          activeData: pendingPassengerReq,
          ride_amount: pendingPassengerReq.ride_amount ?? ride.ride_amount,
          requires_seats: pendingPassengerReq.requires_seats,
        });
      }
      if (courierData) {
        results.push({
          ...ride,
          ...scheduleMeta,
          myRole: "courier",
          roleContext: "all_deliveries",
          bookingStatus: "confirmed",
          activeData: courierData,
          ride_amount: courierData.amount_will ?? ride.ride_amount,
        });
      } else if (pendingCourierReq) {
        results.push({
          ...ride,
          ...scheduleMeta,
          myRole: "courier",
          roleContext: "users_request_Couriers",
          bookingStatus: "pending_approval",
          activeData: pendingCourierReq,
          ride_amount: pendingCourierReq.amount_will ?? ride.ride_amount,
        });
      }
      return results;
    });
  return { status: 200, body: { success: true, count: updatedRides.length, rides: updatedRides } };
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
      "passengers all_deliveries passenger_requested_ride users_request_Couriers status creator vehicle from to date startTime ride_amount availableSeats CanCarryCourier QuickReserve postponeCount postponeReason postponedAt originalScheduledStart cancel_reason"
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

  const passengers = (ride.passengers || []).map((p) => sanitizeParticipant(p, viewerId));
  const all_deliveries = (ride.all_deliveries || []).map((c) => sanitizeParticipant(c, viewerId));

  const verificationParticipants = [
    ...passengers.map((p) => ({
      role: "passenger",
      name: p.userId?.name,
      userNo: p.userId?.userNo,
      isBoardingVerified: !!p.isBoardingVerified,
    })),
    ...all_deliveries.map((c) => ({
      role: "courier",
      name: c.userId?.name,
      userNo: c.userId?.userNo,
      isBoardingVerified: !!c.isBoardingVerified,
    })),
  ];
  const pendingVerification = verificationParticipants.filter((p) => !p.isBoardingVerified).length;

  let myBoarding = null;
  if (viewerId) {
    const vid = viewerId.toString();
    const asPassenger = passengers.find((p) => p.userId?._id?.toString() === vid);
    const asCourier = all_deliveries.find((c) => c.userId?._id?.toString() === vid);
    const self = asPassenger || asCourier;
    if (self) {
      myBoarding = {
        role: asPassenger ? "passenger" : "courier",
        userNo: self.userId?.userNo,
        boardingOtp: self.boardingOtp,
        boardingOtpExpires: self.boardingOtpExpires,
        isBoardingVerified: !!self.isBoardingVerified,
        tripStatus: self.status || "accepted",
      };
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
        date: ride.date,
        startTime: ride.startTime,
        postponeCount: ride.postponeCount || 0,
        postponeReason: ride.postponeReason,
        postponedAt: ride.postponedAt,
        originalScheduledStart: ride.originalScheduledStart,
        cancel_reason: ride.cancel_reason,
        ride_amount: ride.ride_amount,
        availableSeats: ride.availableSeats,
        CanCarryCourier: !!ride.CanCarryCourier,
        QuickReserve: !!ride.QuickReserve,
        passengers,
        all_deliveries,
        passenger_requested_ride: ride.passenger_requested_ride,
        users_request_Couriers: ride.users_request_Couriers,
        verification: {
          total: verificationParticipants.length,
          pending: pendingVerification,
          allVerified: verificationParticipants.length === 0 || pendingVerification === 0,
          participants: verificationParticipants,
        },
        myBoarding,
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

const serializeMatchingRide = (ride, userId) => {
  if (!ride) return null;
  const { passengerPending, courierPending } = userIdOnRideRequests(ride, userId);
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
    vehicle: ride.vehicle,
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
  "from to date startTime availableSeats ride_amount status vehicle creator CanCarryCourier QuickReserve passenger_requested_ride.userId users_request_Couriers.userId";

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

  const filter = {
    from: { $regex: escapeRegex(String(from).trim()), $options: "i" },
    to: { $regex: escapeRegex(String(to).trim()), $options: "i" },
    date: { $gte: range.startDate, $lte: range.endDate },
    status: "pending",
    creator: { $ne: userId },
  };
  if (courierOnly) filter.CanCarryCourier = true;
  if (excludeRideId) filter._id = { $ne: excludeRideId };

  const rides = await Ride.find(filter)
    .select(MATCHING_RIDE_SELECT)
    .populate("creator", "name mobile profile_img")
    .sort({ date: 1, startTime: 1 })
    .limit(10)
    .lean();

  return rides.map((r) => serializeMatchingRide(r, userId));
};

const fetchLinkedRide = async (rideId, userId) => {
  if (!rideId) return null;
  const ride = await Ride.findById(rideId)
    .select(MATCHING_RIDE_SELECT)
    .populate("creator", "name mobile profile_img")
    .lean();
  return serializeMatchingRide(ride, userId);
};

const routeKey = (from, to) =>
  `${String(from || "").trim().toLowerCase()}|${String(to || "").trim().toLowerCase()}`;

const buildMyPassengerRequests = async (user) => {
  await expireStaleOpenRequests();
  const userId = new mongoose.Types.ObjectId(user._id);

  const passengerData = await PassengerRide.find({
    creator: userId,
    status: "pending",
    $or: [{ assigned_to: { $exists: false } }, { "assigned_to.rideId": null }],
  }).lean();

  const standalonePassengerRequests = passengerData.map((p) => ({
    requestId: p._id,
    passengerRideId: p._id,
    requestKind: "standalone",
    rideId: null,
    from: p.from,
    to: p.to,
    date: p.date,
    date_end: p.date_end,
    seats: p.seats_needed,
    amount: p.amount_will,
    luggage: p.luggage_included,
    requestedAt: p.createdAt,
    status: p.status,
    type: "passenger",
  }));

  const activeJoinOnRoute = await Ride.find({
    status: { $in: ["pending", "started"] },
    $or: [
      { "passenger_requested_ride.userId": userId },
      { "passengers.userId": userId },
    ],
  })
    .select("from to")
    .lean();

  const joinedRoutes = new Set(
    activeJoinOnRoute.map((r) => routeKey(r.from, r.to))
  );

  const passengerRequestsBase = standalonePassengerRequests.filter(
    (p) => !joinedRoutes.has(routeKey(p.from, p.to))
  );

  return Promise.all(
    passengerRequestsBase.map(async (req) => {
      const matchingRides = await findMatchingRidesForRequest({
        from: req.from,
        to: req.to,
        date: req.date,
        dateEnd: req.date_end,
        userId,
      });
      return { ...req, linkedRide: null, matchingRides };
    })
  );
};

const buildMyCourierRequests = async (user) => {
  await expireStaleOpenRequests();
  const userId = new mongoose.Types.ObjectId(user._id);

  const courierRequestsData = await Courier.find({
    creator: userId,
    courier_status: { $in: ["pending", "request_to_driver"] },
    $or: [
      { driver_assigned_courier: { $exists: false } },
      { "driver_assigned_courier.rideId": null },
    ],
  }).lean();

  const activeCourierOnRoute = await Ride.find({
    status: { $in: ["pending", "started"] },
    $or: [
      { "users_request_Couriers.userId": userId },
      { "all_deliveries.userId": userId },
    ],
  })
    .select("from to")
    .lean();

  const pickedRoutes = new Set(
    activeCourierOnRoute.map((r) => routeKey(r.from, r.to))
  );

  const courierRequestsBase = courierRequestsData
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
      requestedAt: c.createdAt,
      type: "courier",
    }))
    .filter((c) => !pickedRoutes.has(routeKey(c.from, c.to)));

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
      const linkedRideId = c.assignedRide || null;
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
  deleteMyPassengerRequest,
  deleteMyCourierRequest,
};
