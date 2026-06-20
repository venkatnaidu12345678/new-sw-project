const mongoose = require("mongoose");
const Ride = require("../models/rideModel");
const PassengerRide = require("../models/passengerRideModel");
const UserRides = require("../models/userRides");
const Courier = require("../models/courierModel");
const User = require("../models/userModel");
const { notifyUser } = require("./notificationService");
const { notifyRideParticipants } = require("../utils/rideNotificationUtils");
const { getDriverCompleteRideBlockers } = require("../utils/participantTripStatus");
const { getRideDetails } = require("./rideService");
const { toEnrouteDateKey } = require("../utils/rideDateQueryUtils");
const {
  collectRideParticipantUserIds,
  closeStandaloneRequestsAfterJoin,
  closeSiblingStandalonesAfterEnroutePick,
  collectAssignedRequestDocIds,
  dedupeEnrouteRequestsByRequestId,
  resolveCourierLockedRideId,
  resolvePassengerLockedRideId,
  LOCKED_TO_OTHER_DRIVER_MESSAGE,
} = require("../utils/participantRequestCleanup");
const {
  emitToUser,
  emitRideParticipantsUpdated,
  emitMyRequestsUpdated,
  emitEnrouteRequestRemoved,
  emitEnrouteRequestAdded,
  emitRideRequestUpdated,
} = require("../utils/socketEmit");
const {
  ensureParticipantBoardingOtp,
  assertAllParticipantsVerified,
} = require("./rideVerificationService");
const {
  canStartOutsideSchedule,
  isRidePastStartGracePeriod,
} = require("../utils/rideScheduleUtils");
const { expireRide, expirePendingRideIfStale } = require("./rideExpiryService");
const {
  syncLiveTrackingRoster,
  getActiveRideRowById,
} = require("./rideTrackingService");
const { expireStaleOpenRequests, OPEN_PASSENGER_FILTER, OPEN_COURIER_FILTER } = require("./requestExpiryService");

const isPassengerOpenForDriverEnroute = (doc, driverRideId) => {
  if (!doc || doc.status !== "pending") return false;
  const lockedRideId = resolvePassengerLockedRideId(doc);
  if (!lockedRideId) return true;
  return !!(driverRideId && lockedRideId === String(driverRideId));
};

const isCourierOpenForDriverEnroute = (doc, driverRideId) => {
  if (!doc) return false;
  const status = String(doc.courier_status || "");
  if (!["pending", "request_to_driver"].includes(status)) return false;
  const lockedRideId = resolveCourierLockedRideId(doc);
  if (!lockedRideId) return true;
  return !!(driverRideId && lockedRideId === String(driverRideId));
};
const { clearRideChatMessages } = require("./rideChatService");
const { withRidePickLock } = require("../utils/ridePickLock");
const {
  rejectIfPassengerJoiningAsCourier,
  rejectIfCourierJoiningAsPassenger,
  rejectIfEnroutePickWouldConflict,
  participantNotOnRideFilter,
} = require("../utils/rideParticipantRules");
const {
  getRideDayBounds,
  passengerOverlapsRideDay,
  courierOverlapsRideDay,
  mergeMongoAndClauses,
} = require("../utils/rideDateQueryUtils");
const {
  normalizeStopoverRows,
  buildOrderedCorridor,
  requestMatchesDriverCorridor,
} = require("../utils/enrouteCorridorUtils");
const googleMapsService = require("./googleMapsService");

/** Hide phone numbers until the driver picks the request onto their ride. */
const sanitizeEnrouteReceiverDetails = (receiver) => {
  if (!receiver || typeof receiver !== "object") return receiver;
  const copy = { ...receiver };
  delete copy.mobile;
  delete copy.alternate_mobile;
  return copy;
};
const { getActiveBookedSeats } = require("../utils/rideSeatUtils");

const getBookedSeats = getActiveBookedSeats;
const buildCreatorFilter = (value) => {
  const sid = value?.toString?.() || String(value || "");
  if (!sid) return { $in: [] };
  if (mongoose.Types.ObjectId.isValid(sid)) {
    return { $in: [sid, new mongoose.Types.ObjectId(sid)] };
  }
  return { $in: [sid] };
};

const acceptPassengerRequest = async (user, { rideId, passenger_userId }) => {
  if (!rideId || !passenger_userId) return { status: 400, body: { message: "rideId & passenger_userId required" } };
  let ride = await Ride.findById(rideId);
  if (!ride) return { status: 404, body: { message: "Ride not found" } };
  const stale = await expirePendingRideIfStale(ride);
  ride = stale.ride || ride;
  if (ride.status === "expired") {
    return { status: 400, body: { message: "This ride has expired" } };
  }
  if (ride.status !== "pending") {
    return { status: 400, body: { message: "Ride is not open for new bookings" } };
  }
  if (ride.creator.toString() !== user._id.toString()) return { status: 403, body: { message: "Only ride creator can accept requests" } };
  const reqObj = ride.passenger_requested_ride.find((item) => item.userId.toString() === passenger_userId.toString());
  if (!reqObj) return { status: 404, body: { message: "Passenger request not found" } };
  const courierConflict = rejectIfCourierJoiningAsPassenger(ride, passenger_userId);
  if (courierConflict.blocked) {
    return { status: 400, body: { message: courierConflict.message } };
  }
  const seatsNeeded = Number(reqObj.requires_seats) || 1;
  if (seatsNeeded > ride.availableSeats) {
    return {
      status: 400,
      body: {
        message: `Not enough seats available (only ${ride.availableSeats} left)`,
      },
    };
  }

  let segFrom = String(reqObj.from || "").trim() || ride.from;
  let segTo = String(reqObj.to || "").trim() || ride.to;
  let linkedPassengerRideId = null;
  const fullRideSegment =
    segFrom.toLowerCase() === String(ride.from || "").trim().toLowerCase() &&
    segTo.toLowerCase() === String(ride.to || "").trim().toLowerCase();
  const linkedPassengerRide = await PassengerRide.findOne({
    creator: reqObj.userId,
    $or: [
      { "assigned_to.rideId": ride._id },
      { join_requested_By: { $elemMatch: { rideId: ride._id } } },
    ],
  })
    .sort({ updatedAt: -1 })
    .select("_id from to")
    .lean();
  if (linkedPassengerRide?._id) {
    linkedPassengerRideId = String(linkedPassengerRide._id);
  }
  if (fullRideSegment) {
    if (linkedPassengerRide?.from && linkedPassengerRide?.to) {
      segFrom = linkedPassengerRide.from;
      segTo = linkedPassengerRide.to;
    }
  }

  const passengerEntry = {
    userId: reqObj.userId,
    requires_seats: reqObj.requires_seats,
    from: segFrom,
    to: segTo,
    ride_amount: reqObj.ride_amount,
    status: "accepted",
    joinedAt: new Date(),
  };
  await ensureParticipantBoardingOtp(passengerEntry, reqObj.userId, {
    rideId: ride._id,
    from: segFrom,
    to: segTo,
  });
  ride.passengers.push(passengerEntry);
  ride.availableSeats -= seatsNeeded;
  ride.passenger_requested_ride = ride.passenger_requested_ride.filter((item) => item.userId.toString() !== passenger_userId.toString());
  await ride.save();
  await closeStandaloneRequestsAfterJoin(passenger_userId, ride, {
    explicitPassengerRideId: linkedPassengerRideId,
  });
  await UserRides.findOneAndUpdate(
    { creator: passenger_userId },
    {
      $pull: { my_pending_ride_requests: { rideId: ride._id } },
      $push: { driver_accepted_ride_requests: { rideId: ride._id, driverId: ride.creator, amount_requested: reqObj.ride_amount, seats_requested: reqObj.requires_seats, status: "accepted" } },
    },
    { upsert: true }
  );
  const cancelledStandalone = await PassengerRide.find({
    creator: passenger_userId,
    status: "cancelled",
    "assigned_to.rideId": ride._id,
  })
    .select("_id")
    .lean();
  emitEnrouteRequestRemoved(ride.from, ride.to, toEnrouteDateKey(ride.date), {
    type: "passenger",
    userId: passenger_userId.toString(),
    ...(cancelledStandalone[0]
      ? { passengerRideId: cancelledStandalone[0]._id.toString() }
      : {}),
  });
  const driver = await User.findById(user._id);
  await notifyUser(passenger_userId, {
    title: "Ride request accepted",
    body: `${driver?.name || "Driver"} accepted your request`,
    type: "ride_accept",
    data: { rideId: ride._id.toString() },
  });
  emitRideParticipantsUpdated(ride._id, {
    action: "passenger_accepted",
    userId: passenger_userId.toString(),
  });
  emitRideRequestUpdated(ride._id, { action: "passenger_accepted" });
  emitMyRequestsUpdated(passenger_userId, {
    action: "ride_request_accepted",
    rideId: ride._id.toString(),
    ...(cancelledStandalone[0]
      ? { passengerRideId: cancelledStandalone[0]._id.toString() }
      : {}),
  });
  return {
    status: 200,
    body: { success: true, status: true, message: "Passenger request accepted", passengers: ride.passengers },
  };
};

const rejectPassengerRequest = async (user, { rideId, passenger_userId }) => {
  if (!rideId || !passenger_userId) return { status: 400, body: { message: "rideId & passenger_userId required" } };
  const ride = await Ride.findById(rideId);
  if (!ride) return { status: 404, body: { message: "Ride not found" } };
  if (ride.creator.toString() !== user._id.toString()) return { status: 403, body: { message: "Only ride creator can reject requests" } };
  const reqObj = ride.passenger_requested_ride.find((item) => item.userId.toString() === passenger_userId.toString());
  if (!reqObj) return { status: 404, body: { message: "Passenger request not found" } };
  ride.droput_Passengers.push({ userId: reqObj.userId, requires_seats: reqObj.requires_seats, ride_amount: reqObj.ride_amount, status: "rejected", joinedAt: new Date() });
  ride.passenger_requested_ride = ride.passenger_requested_ride.filter((item) => item.userId.toString() !== passenger_userId.toString());
  await ride.save();
  await UserRides.findOneAndUpdate(
    { creator: passenger_userId },
    { $pull: { my_pending_ride_requests: { rideId: ride._id } } }
  );
  await PassengerRide.updateMany(
    { creator: passenger_userId, "join_requested_By.rideId": ride._id },
    { $pull: { join_requested_By: { rideId: ride._id } } }
  );
  const driver = await User.findById(user._id);
  await notifyUser(passenger_userId, {
    title: "Ride request declined",
    body: `${driver?.name || "Driver"} declined your request`,
    type: "ride_reject",
    data: { rideId: ride._id.toString() },
  });
  emitRideRequestUpdated(ride._id, { action: "passenger_rejected" });
  emitMyRequestsUpdated(passenger_userId, {
    action: "ride_request_rejected",
    rideId: ride._id.toString(),
  });
  return {
    status: 200,
    body: { success: true, status: true, message: "Passenger request rejected & moved to droput list", droput_Passengers: ride.droput_Passengers },
  };
};

const removePassenger = async (user, { rideId, passenger_userId }) => {
  if (!rideId || !passenger_userId) return { status: 400, body: { status: false, message: "rideId & passenger_userId required" } };
  const ride = await Ride.findById(rideId);
  if (!ride) return { status: 404, body: { status: false, message: "Ride not found" } };
  if (ride.creator.toString() !== user._id.toString()) return { status: 403, body: { status: false, message: "Only ride creator can remove passengers" } };
  const passenger = ride.passengers.find((p) => p.userId.toString() === passenger_userId.toString());
  if (!passenger) return { status: 404, body: { status: false, message: "Passenger not found in ride" } };
  const creatorFilter = buildCreatorFilter(passenger.userId);
  ride.availableSeats += passenger.requires_seats;
  ride.droput_Passengers.push({ userId: passenger.userId, requires_seats: passenger.requires_seats, ride_amount: passenger.ride_amount, status: "removed", joinedAt: new Date() });
  ride.passengers = ride.passengers.filter((p) => p.userId.toString() !== passenger_userId.toString());
  await ride.save();
  const reopenedPassengerDocs = await PassengerRide.updateMany(
    {
      creator: creatorFilter,
      "assigned_to.rideId": ride._id,
      status: { $in: ["aisgned_passenger", "in_car", "ride_finished", "cancelled"] },
    },
    {
      $set: {
        status: "pending",
        assigned_to: { userId: null, rideId: null },
      },
    }
  );
  const reopenedCourierDocs = await Courier.updateMany(
    {
      creator: creatorFilter,
      "driver_assigned_courier.rideId": ride._id,
      courier_status: {
        $in: ["driver_assigned", "request_to_driver", "picked_up", "in_transit", "cancelled"],
      },
    },
    {
      $set: {
        courier_status: "pending",
        driver_assigned_courier: { userId: null, rideId: null },
      },
    }
  );
  await UserRides.findOneAndUpdate({ creator: passenger_userId }, { $pull: { driver_accepted_ride_requests: { rideId: ride._id } } });
  emitMyRequestsUpdated(passenger_userId, {
    action: "participant_reopened",
    rideId: ride._id.toString(),
    from: ride.from,
    to: ride.to,
    reopenedPassengers: reopenedPassengerDocs.modifiedCount || 0,
    reopenedCouriers: reopenedCourierDocs.modifiedCount || 0,
  });
  emitEnrouteRequestAdded(ride.from, ride.to, ride.date, {
    action: "participant_reopened",
    rideId: ride._id.toString(),
    userId: passenger_userId.toString(),
    reopenedPassengers: reopenedPassengerDocs.modifiedCount || 0,
    reopenedCouriers: reopenedCourierDocs.modifiedCount || 0,
  });
  await notifyUser(passenger_userId, {
    title: "Removed from ride",
    body: "You have been removed from the ride by the driver. Your open requests are visible again.",
    type: "ride_removed",
    data: { rideId: ride._id.toString() },
  });
  emitRideParticipantsUpdated(ride._id, {
    action: "passenger_removed",
    userId: passenger_userId.toString(),
  });
  await syncLiveTrackingRoster(ride._id);
  return { status: 200, body: { status: true, message: "Passenger removed successfully", availableSeats: ride.availableSeats, passengers: ride.passengers } };
};

const startRide = async (user, { rideId }) => {
  const userId = new mongoose.Types.ObjectId(user._id);
  const activeRide = await Ride.findOne({ creator: userId, status: "started" });
  if (activeRide) return { status: 400, body: { success: false, message: "You already have an active ride. Complete it before starting another." } };
  let ride = await Ride.findById(rideId);
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };
  if (ride.creator.toString() !== userId.toString()) return { status: 403, body: { success: false, message: "Only ride creator can start the ride" } };

  if (isRidePastStartGracePeriod(ride)) {
    const stale = await expirePendingRideIfStale(ride);
    ride = stale.ride || ride;
    if (ride.status === "expired") {
      return {
        status: 400,
        body: {
          success: false,
          message:
            "This ride has expired because it was not started within 2 hours of the scheduled time",
        },
      };
    }
  }

  if (ride.status !== "pending") {
    return {
      status: 400,
      body: {
        success: false,
        message:
          ride.status === "started"
            ? "Ride is already in progress"
            : ride.status === "completed"
              ? "Ride is already completed"
              : ride.status === "expired"
                ? "This ride has expired and can no longer be started"
                : "Ride cannot be started in its current state",
      },
    };
  }

  // Allow start before or after scheduled time — skip OTP gate when not exactly on schedule
  if (!canStartOutsideSchedule(ride)) {
    const verifyBlock = assertAllParticipantsVerified(ride);
    if (verifyBlock) return verifyBlock;
  }
  ride.status = "started";
  ride.liveTracking = {
    isActive: true,
    startedAt: new Date(),
    driverLocation: ride.liveTracking?.driverLocation || null,
    locationHistory: ride.liveTracking?.locationHistory || [],
  };
  ride.markModified("liveTracking");
  await ride.save();

  const driverName = user.name || "Driver";
  emitRideParticipantsUpdated(ride._id, { action: "started" });
  notifyRideParticipants(ride, {
    title: "Ride started",
    body: `${driverName} has started the ride ({route}).`,
    driverMessage: `You started the ride ({route}).`,
    type: "ride_started",
    excludeDriver: false,
  }).catch((err) => {
    console.warn("[startRide] notify participants:", err?.message || err);
  });

  if (global.io) {
    const row = await getActiveRideRowById(ride._id);
    global.io.to("admin:tracking").emit("rideStarted", row || {
      rideId: ride._id.toString(),
      from: ride.from,
      to: ride.to,
      driver: { id: user._id.toString(), name: user.name },
      startedAt: ride.liveTracking.startedAt,
    });
  }

  return { status: 200, body: { success: true, message: "Ride started successfully", ride } };
};

const endRide = async (user, { rideId }) => {
  const userId = new mongoose.Types.ObjectId(user._id);
  const ride = await Ride.findById(rideId);
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };
  if (ride.creator.toString() !== userId.toString()) return { status: 403, body: { success: false, message: "Only ride creator can end the ride" } };
  if (ride.status !== "started") return { status: 400, body: { success: false, message: "Ride is not in progress" } };

  const completionCheck = getDriverCompleteRideBlockers(ride);
  if (!completionCheck.ok) {
    return {
      status: 400,
      body: {
        success: false,
        message:
          completionCheck.message ||
          "Mark all passengers Dropped and all couriers Delivered before completing the ride",
        pendingPassengers: completionCheck.pendingPassengers,
        pendingCouriers: completionCheck.pendingCouriers,
      },
    };
  }
  ride.status = "completed";
  if (ride.liveTracking) {
    ride.liveTracking.isActive = false;
    ride.liveTracking.endedAt = new Date();
  }
  await ride.save();
  await clearRideChatMessages(ride._id);

  const driverName = user.name || "Driver";
  await notifyRideParticipants(ride, {
    title: "Ride completed",
    body: `${driverName} has completed the ride ({route}). Thank you for riding with Share Wheels.`,
    driverMessage: `You completed the ride ({route}).`,
    type: "ride_completed",
    excludeDriver: false,
  });
  emitRideParticipantsUpdated(ride._id, { action: "completed" });

  if (global.io) {
    global.io.to("admin:tracking").emit("rideEnded", { rideId: ride._id.toString() });
  }

  return { status: 200, body: { success: true, message: "Ride ended successfully", ride } };
};

const loadPolylineTownLabels = async (polyline) => {
  const result = await googleMapsService.getStopoverCandidates({
    polyline,
    max: 20,
  });
  if (result.status !== 200) return [];
  return (result.body.candidates || [])
    .map((row) => String(row.label || "").trim())
    .filter(Boolean);
};

const enrouteRequests = async (user, { from, to, date, rideId, stopovers, routePolyline }) => {
  if (!from || !to || !date) {
    return { status: 400, body: { success: false, message: "from, to and date are required" } };
  }

  await expireStaleOpenRequests();

  let fromTrim = String(from).trim();
  let toTrim = String(to).trim();
  let stopoverRows = normalizeStopoverRows(stopovers);
  let polyline = String(routePolyline || "").trim();
  let rideDayDate = date;
  let excludePassengerRideIds = new Set();
  let excludeCourierIds = new Set();

  if (rideId && mongoose.Types.ObjectId.isValid(rideId)) {
    const ride = await Ride.findById(rideId)
      .select(
        "stopovers from to routePolyline date"
      )
      .lean();
    if (ride) {
      const assigned = await collectAssignedRequestDocIds(rideId);
      assigned.passengerRideIds.forEach((id) => excludePassengerRideIds.add(id));
      assigned.courierIds.forEach((id) => excludeCourierIds.add(id));
      fromTrim = String(ride.from || fromTrim).trim();
      toTrim = String(ride.to || toTrim).trim();
      if (ride.date) rideDayDate = ride.date;
      if (!stopoverRows.length && ride.stopovers?.length) {
        stopoverRows = normalizeStopoverRows(ride.stopovers);
      }
      if (!polyline && ride.routePolyline) {
        polyline = String(ride.routePolyline).trim();
      }
    }
  }

  const bounds = getRideDayBounds(rideDayDate);
  if (!bounds) {
    return { status: 400, body: { success: false, message: "Invalid date" } };
  }
  const { start: startOfDay, end: endOfDay } = bounds;

  const corridor = await buildOrderedCorridor({
    from: fromTrim,
    to: toTrim,
    stopovers: stopoverRows,
    routePolyline: polyline,
    loadPolylineTowns: loadPolylineTownLabels,
  });

  const excludePassengerIds = Array.from(excludePassengerRideIds).filter((id) =>
    mongoose.Types.ObjectId.isValid(id)
  );
  const excludeCourierDocIds = Array.from(excludeCourierIds).filter((id) =>
    mongoose.Types.ObjectId.isValid(id)
  );

  const matchesCorridor = (reqFrom, reqTo) =>
    requestMatchesDriverCorridor(reqFrom, reqTo, corridor, fromTrim, toTrim);

  const driverRideIdStr =
    rideId && mongoose.Types.ObjectId.isValid(rideId) ? String(rideId) : null;

  const passengers = await PassengerRide.find({
    ...OPEN_PASSENGER_FILTER,
    creator: { $ne: user._id },
    ...(excludePassengerIds.length
      ? { _id: { $nin: excludePassengerIds.map((id) => new mongoose.Types.ObjectId(id)) } }
      : {}),
    ...mergeMongoAndClauses(passengerOverlapsRideDay(startOfDay, endOfDay)),
  }).populate("creator", "name gender profile_img");

  const passengerRequests = passengers
    .filter(
      (p) =>
        !excludePassengerRideIds.has(String(p._id)) &&
        isPassengerOpenForDriverEnroute(p, driverRideIdStr) &&
        matchesCorridor(p.from, p.to)
    )
    .map((p) => ({
    request_type: "passenger",
    passengerId: p._id,
    creatorId: p.creator?._id || p.creator,
    name: p.creator?.name || "",
    gender: p.creator?.gender || "",
    profile: p.creator?.profile_img || "",
    seats_needed: p.seats_needed,
    luggage: p.luggage_included,
    amount: p.amount_will,
    date: p.date,
    from: p.from,
    to: p.to,
    status: p.status,
  }));

  const couriers = await Courier.find({
    ...OPEN_COURIER_FILTER,
    creator: { $ne: user._id },
    ...(excludeCourierDocIds.length
      ? { _id: { $nin: excludeCourierDocIds.map((id) => new mongoose.Types.ObjectId(id)) } }
      : {}),
    ...mergeMongoAndClauses(courierOverlapsRideDay(startOfDay, endOfDay)),
  }).populate("creator", "name gender profile_img");

  const courierRequests = couriers
    .filter(
      (c) =>
        !excludeCourierIds.has(String(c._id)) &&
        isCourierOpenForDriverEnroute(c, driverRideIdStr) &&
        matchesCorridor(c.from, c.to)
    )
    .map((c) => ({
    request_type: "courier",
    courierId: c._id,
    creatorId: c.creator?._id || c.creator,
    courierNumber: c.courierNumber,
    name: c.creator?.name || "",
    gender: c.creator?.gender || "",
    profile: c.creator?.profile_img || "",
    courier_type: c.courier_type,
    what_to_deliver: c.what_to_deliver,
    courier_img: c.courier_img,
    amount: c.amount_will,
    from: c.from,
    to: c.to,
    date: c.date,
    courier_status: c.courier_status,
    courier_receiver_details: sanitizeEnrouteReceiverDetails(
      c.courier_receiver_details
    ),
  }));
  const allRequests = dedupeEnrouteRequestsByRequestId([
    ...passengerRequests,
    ...courierRequests,
  ]);
  return {
    status: 200,
    body: {
      success: true,
      total: allRequests.length,
      passengers: allRequests.filter((r) => r.request_type === "passenger").length,
      couriers: allRequests.filter((r) => r.request_type === "courier").length,
      corridor,
      data: allRequests,
    },
  };
};

const driverSubscriptionService = require("./driverSubscriptionService");

const pickCourier = async (user, { rideId, courierId }) => {
  if (!mongoose.Types.ObjectId.isValid(rideId) || !mongoose.Types.ObjectId.isValid(courierId)) {
    return { status: 400, body: { success: false, message: "Invalid IDs" } };
  }

  return withRidePickLock(rideId, async () => {
  const courier = await Courier.findById(courierId);
  if (!courier) {
    return {
      status: 404,
      body: {
        success: false,
        message:
          "This request is no longer available. It may have already been picked by another driver.",
        code: "ALREADY_PICKED",
      },
    };
  }
  if (courier.courier_status !== "pending" && courier.courier_status !== "request_to_driver") {
    return {
      status: 409,
      body: {
        success: false,
        message: LOCKED_TO_OTHER_DRIVER_MESSAGE,
        code: "ALREADY_PICKED",
      },
    };
  }

  const lockedRideId = resolveCourierLockedRideId(courier);
  if (lockedRideId && lockedRideId !== String(rideId)) {
    return {
      status: 409,
      body: {
        success: false,
        message: LOCKED_TO_OTHER_DRIVER_MESSAGE,
        code: "ALREADY_PICKED",
      },
    };
  }

  const entitlement = await driverSubscriptionService.assertCanPickEnroute(
    user._id,
    rideId
  );
  if (!entitlement.ok) {
    return {
      status: entitlement.status || 403,
      body: {
        success: false,
        message: entitlement.message,
        code: entitlement.code,
        subscription: entitlement.subscription || null,
      },
    };
  }

  let ride = await Ride.findById(rideId);
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };

  if (ride.creator.toString() !== user._id.toString()) {
    return { status: 403, body: { success: false, message: "Unauthorized" } };
  }

  const participantConflict = rejectIfEnroutePickWouldConflict(
    ride,
    courier.creator,
    "courier"
  );
  if (participantConflict.blocked) {
    return {
      status: 400,
      body: {
        success: false,
        message: participantConflict.message,
        code: participantConflict.code || "PARTICIPANT_CONFLICT",
      },
    };
  }

  const claimedCourier = await Courier.findOneAndUpdate(
    {
      _id: courierId,
      courier_status: { $in: ["pending", "request_to_driver"] },
      $or: [
        { driver_assigned_courier: { $exists: false } },
        { "driver_assigned_courier.rideId": null },
      ],
    },
    {
      $set: {
        driver_assigned_courier: { userId: user._id, rideId: ride._id },
        courier_status: "driver_assigned",
      },
    },
    { new: true }
  );
  if (!claimedCourier) {
    return {
      status: 409,
      body: {
        success: false,
        message: LOCKED_TO_OTHER_DRIVER_MESSAGE,
        code: "ALREADY_PICKED",
      },
    };
  }

  const courierEntry = {
    userId: claimedCourier.creator,
    courierId: claimedCourier._id,
    courierNumber: claimedCourier.courierNumber,
    from: claimedCourier.from,
    to: claimedCourier.to,
    courier_type: claimedCourier.courier_type,
    what_to_deliver: claimedCourier.what_to_deliver,
    courier_img: claimedCourier.courier_img,
    amount_will: claimedCourier.amount_will,
    date: { startDate: claimedCourier.date?.startDate, endDate: claimedCourier.date?.endDate },
    courier_receiver_details: claimedCourier.courier_receiver_details,
    assignedAt: new Date(),
  };
  await ensureParticipantBoardingOtp(courierEntry, claimedCourier.creator, {
    rideId: ride._id,
    from: courier.from,
    to: courier.to,
  });

  const updatedRide = await Ride.findOneAndUpdate(
    {
      _id: rideId,
      creator: user._id,
      ...participantNotOnRideFilter(claimedCourier.creator),
    },
    {
      $push: { all_deliveries: courierEntry },
      $pull: {
        users_request_Couriers: {
          userId: claimedCourier.creator,
        },
      },
    },
    { new: true }
  );

  if (!updatedRide) {
    await Courier.findByIdAndUpdate(claimedCourier._id, {
      $set: {
        courier_status: "pending",
        driver_assigned_courier: { userId: null, rideId: null },
      },
    });
    const latestRide = await Ride.findById(rideId);
    const retryConflict = rejectIfEnroutePickWouldConflict(
      latestRide,
      claimedCourier.creator,
      "courier"
    );
    if (retryConflict.blocked) {
      return {
        status: 400,
        body: {
          success: false,
          message: retryConflict.message,
          code: retryConflict.code || "PARTICIPANT_CONFLICT",
        },
      };
    }
    return {
      status: 400,
      body: {
        success: false,
        message: "Could not add courier. This user may already be on your ride.",
      },
    };
  }

  ride = updatedRide;

  await closeSiblingStandalonesAfterEnroutePick(claimedCourier.creator, ride, {
    pickedCourierId: claimedCourier._id,
  });

  await UserRides.findOneAndUpdate(
    { creator: claimedCourier.creator },
    { $pull: { my_pending_ride_requests: { rideId: ride._id } } }
  );
  const driver = await User.findById(user.id);
  await notifyUser(claimedCourier.creator, {
    title: "Courier assigned",
    body: `${driver?.name || "Driver"} picked your courier delivery`,
    type: "courier_assigned",
    data: {
      rideId: ride._id.toString(),
      courierId: claimedCourier._id.toString(),
    },
  });

  emitRideParticipantsUpdated(ride._id, {
    action: "courier_picked",
    courierId: claimedCourier._id.toString(),
    userId: claimedCourier.creator.toString(),
  });
  emitMyRequestsUpdated(claimedCourier.creator, {
    action: "courier_assigned",
    courierId: claimedCourier._id.toString(),
    rideId: ride._id.toString(),
  });
  emitEnrouteRequestRemoved(ride.from, ride.to, toEnrouteDateKey(ride.date), {
    courierId: claimedCourier._id.toString(),
    type: "courier",
    userId: claimedCourier.creator.toString(),
  });
  emitToUser(user._id, "rideParticipantsUpdated", {
    rideId: ride._id.toString(),
    action: "courier_picked",
  });

  await driverSubscriptionService.recordEnroutePick(user._id, rideId);

  const detailsRes = await getRideDetails(rideId, user._id);

  return {
    status: 200,
    body: {
      success: true,
      message: "Courier picked successfully",
      data: { courier: claimedCourier, ride },
      details: detailsRes.body?.data || null,
    },
  };
  });
};

/**
 * Driver sets total vehicle seat capacity (available + already booked).
 */
const updateRideSeats = async (user, { rideId, totalSeats }) => {
  if (!rideId) {
    return { status: 400, body: { success: false, message: "rideId is required" } };
  }
  const total = Number(totalSeats);
  if (!Number.isFinite(total) || total < 1) {
    return {
      status: 400,
      body: { success: false, message: "totalSeats must be at least 1" },
    };
  }
  if (total > 20) {
    return {
      status: 400,
      body: { success: false, message: "Maximum 20 seats allowed per ride" },
    };
  }

  const ride = await Ride.findById(rideId);
  if (!ride) {
    return { status: 404, body: { success: false, message: "Ride not found" } };
  }
  if (ride.creator.toString() !== user._id.toString()) {
    return {
      status: 403,
      body: { success: false, message: "Only the driver can update seats" },
    };
  }
  if (!["pending", "started"].includes(ride.status)) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Seats can only be updated before the ride is completed",
      },
    };
  }

  const bookedSeats = getBookedSeats(ride);
  if (total < bookedSeats) {
    return {
      status: 400,
      body: {
        success: false,
        message: `Cannot set below ${bookedSeats} seat(s) already booked by passengers`,
      },
    };
  }

  ride.availableSeats = total - bookedSeats;
  await ride.save();

  return {
    status: 200,
    body: {
      success: true,
      message: "Seats updated",
      totalSeats: total,
      bookedSeats,
      availableSeats: ride.availableSeats,
    },
  };
};

/**
 * Driver toggles courier / quick-reserve after ride creation.
 */
const updateRideOptions = async (user, { rideId, CanCarryCourier, QuickReserve }) => {
  if (!rideId) {
    return { status: 400, body: { success: false, message: "rideId is required" } };
  }

  const ride = await Ride.findById(rideId);
  if (!ride) {
    return { status: 404, body: { success: false, message: "Ride not found" } };
  }
  if (ride.creator.toString() !== user._id.toString()) {
    return {
      status: 403,
      body: { success: false, message: "Only the driver can update ride options" },
    };
  }
  if (!["pending", "started"].includes(ride.status)) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Options can only be changed while the ride is pending or in progress",
      },
    };
  }

  if (typeof CanCarryCourier === "boolean") {
    ride.CanCarryCourier = CanCarryCourier;
  }
  if (typeof QuickReserve === "boolean") {
    ride.QuickReserve = QuickReserve;
  }

  await ride.save();

  emitRideRequestUpdated(ride._id, {
    action: "ride_options_updated",
    CanCarryCourier: ride.CanCarryCourier,
    QuickReserve: ride.QuickReserve,
  });
  emitToUser(user._id, "rideParticipantsUpdated", {
    rideId: ride._id.toString(),
    action: "ride_options_updated",
  });

  return {
    status: 200,
    body: {
      success: true,
      message: "Ride options updated",
      CanCarryCourier: ride.CanCarryCourier,
      QuickReserve: ride.QuickReserve,
    },
  };
};

module.exports = {
  acceptPassengerRequest,
  rejectPassengerRequest,
  removePassenger,
  startRide,
  endRide,
  enrouteRequests,
  pickCourier,
  updateRideSeats,
  updateRideOptions,
};
