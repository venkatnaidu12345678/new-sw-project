const mongoose = require("mongoose");
const Ride = require("../models/rideModel");
const PassengerRide = require("../models/passengerRideModel");
const UserRides = require("../models/userRides");
const User = require("../models/userModel");
const { parseAmount } = require("../schemas/commonSchemas");
const { ensureParticipantBoardingOtp } = require("./rideVerificationService");
const { notifyUser } = require("./notificationService");
const { getRideDetails } = require("./rideService");
const { toEnrouteDateKey } = require("../utils/rideDateQueryUtils");
const { closeSiblingStandalonesAfterEnroutePick, resolvePassengerLockedRideId, LOCKED_TO_OTHER_DRIVER_MESSAGE } = require("../utils/participantRequestCleanup");
const {
  emitToUser,
  emitRideParticipantsUpdated,
  emitMyRequestsUpdated,
  emitEnrouteRequestRemoved,
} = require("../utils/socketEmit");
const {
  rejectIfEnroutePickWouldConflict,
  participantNotOnRideFilter,
} = require("../utils/rideParticipantRules");
const { withRidePickLock } = require("../utils/ridePickLock");
const { expireStalePassengerRequests } = require("./requestExpiryService");

const createPassengerRequest = async (user, { from, to, ride_need_date, seats_needed, date, luggage_included, amount_will }) => {
  if (!from || !to || !ride_need_date || !seats_needed) {
    return { status: 400, body: { error: "All fields are required" } };
  }
  const amount = parseAmount(amount_will);
  if (amount === null || amount <= 0) {
    return { status: 400, body: { error: "Valid price (amount_will) is required" } };
  }
  const startDateRaw = date?.startDate ?? date;
  const endDateRaw = date?.endDate ?? null;

  if (!startDateRaw) {
    return { status: 400, body: { error: "Start date is required" } };
  }

  const passengerRide = await PassengerRide.create({
    creator: user._id,
    passenger_rideId: new mongoose.Types.ObjectId().toString(),
    from,
    to,
    seats_needed,
    amount_will: amount,
    ride_need_date,
    luggage_included,
    date: new Date(startDateRaw),
    date_end: endDateRaw ? new Date(endDateRaw) : null,
  });
  emitMyRequestsUpdated(user._id);
  return { status: 200, body: { message: "Passenger request created", passengerRide } };
};

const getOpenRequests = async (user) => {
  await expireStalePassengerRequests();
  const driverRides = await Ride.find({ creator: user._id });
  if (!driverRides || driverRides.length === 0) return { status: 200, body: [] };

  // Build overlap conditions: passenger date range overlaps a driver's ride day.
  // Passenger considered open if: passenger.date <= dayEnd AND (passenger.date_end is null OR passenger.date_end >= dayStart)
  const dateQueries = driverRides
    .filter((ride) => ride.date)
    .map((ride) => {
      const dayStart = new Date(ride.date);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(ride.date);
      dayEnd.setHours(23, 59, 59, 999);

      return {
        $and: [
          { date: { $lte: dayEnd } },
          {
            $or: [{ date_end: null }, { date_end: { $gte: dayStart } }],
          },
        ],
      };
    });
  const openRequests = await PassengerRide.find({
    status: "pending",
    creator: { $ne: user._id },
    $and: [
      {
        $or: [
          { assigned_to: { $exists: false } },
          { "assigned_to.rideId": null },
        ],
      },
      ...(dateQueries.length ? [{ $or: dateQueries }] : []),
    ],
  }).populate("creator", "name mobile profile_img");
  return { status: 200, body: openRequests };
};

const driverSubscriptionService = require("./driverSubscriptionService");

const ENROUTE_REQUEST_UNAVAILABLE_MESSAGE =
  "This request is no longer available. It may have already been picked by another driver.";

const pickPassenger = async (user, { passenger_rideId, rideId }) => {
  if (!passenger_rideId || !rideId) {
    return { status: 400, body: { message: "passenger_rideId and rideId are required" } };
  }
  if (!mongoose.Types.ObjectId.isValid(passenger_rideId)) {
    return { status: 400, body: { message: "Invalid passenger_rideId" } };
  }
  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    return { status: 400, body: { message: "Invalid rideId" } };
  }

  return withRidePickLock(rideId, async () => {
  const passengerRide = await PassengerRide.findById(passenger_rideId);
  if (!passengerRide) {
    return {
      status: 404,
      body: {
        success: false,
        message: ENROUTE_REQUEST_UNAVAILABLE_MESSAGE,
        code: "ALREADY_PICKED",
      },
    };
  }
  if (passengerRide.creator.toString() === user._id.toString()) {
    return { status: 400, body: { message: "You cannot pick your own request" } };
  }
  if (passengerRide.status === "expired") {
    return { status: 400, body: { message: "This passenger request has expired" } };
  }
  if (passengerRide.status !== "pending") {
    return {
      status: 409,
      body: {
        success: false,
        message: LOCKED_TO_OTHER_DRIVER_MESSAGE,
        code: "ALREADY_PICKED",
      },
    };
  }

  const lockedRideId = resolvePassengerLockedRideId(passengerRide);
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
  if (!ride) return { status: 404, body: { message: "Ride not found" } };
  if (ride.creator.toString() !== user._id.toString()) return { status: 403, body: { message: "Unauthorized" } };
  if (ride.availableSeats < passengerRide.seats_needed) return { status: 400, body: { success: false, message: "Not enough seats" } };

  const participantConflict = rejectIfEnroutePickWouldConflict(
    ride,
    passengerRide.creator,
    "passenger"
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

  const claimedPassengerRide = await PassengerRide.findOneAndUpdate(
    {
      _id: passenger_rideId,
      status: "pending",
      $or: [{ assigned_to: { $exists: false } }, { "assigned_to.rideId": null }],
    },
    {
      $set: {
        assigned_to: { userId: user._id, rideId: ride._id },
        status: "aisgned_passenger",
      },
    },
    { new: true }
  );
  if (!claimedPassengerRide) {
    return {
      status: 409,
      body: {
        success: false,
        message: LOCKED_TO_OTHER_DRIVER_MESSAGE,
        code: "ALREADY_PICKED",
      },
    };
  }

  const perSeatOffer = Math.round(Number(claimedPassengerRide.amount_will) || 0);
  const seatsNeeded = Math.max(1, Number(claimedPassengerRide.seats_needed) || 1);
  const totalOffer = perSeatOffer * seatsNeeded;

  const passengerEntry = {
    userId: claimedPassengerRide.creator,
    requires_seats: seatsNeeded,
    from: claimedPassengerRide.from || ride.from,
    to: claimedPassengerRide.to || ride.to,
    ride_amount: totalOffer,
    status: "accepted",
    joinedAt: new Date(),
  };
  await ensureParticipantBoardingOtp(passengerEntry, claimedPassengerRide.creator, {
    rideId: ride._id,
    from: ride.from,
    to: ride.to,
  });

  const updatedRide = await Ride.findOneAndUpdate(
    {
      _id: rideId,
      creator: user._id,
      availableSeats: { $gte: claimedPassengerRide.seats_needed },
      ...participantNotOnRideFilter(claimedPassengerRide.creator),
    },
    {
      $push: { passengers: passengerEntry },
      $inc: { availableSeats: -claimedPassengerRide.seats_needed },
    },
    { new: true }
  );

  if (!updatedRide) {
    await PassengerRide.findByIdAndUpdate(claimedPassengerRide._id, {
      $set: {
        status: "pending",
        assigned_to: { userId: null, rideId: null },
      },
    });
    const latestRide = await Ride.findById(rideId);
    const retryConflict = rejectIfEnroutePickWouldConflict(
      latestRide,
      claimedPassengerRide.creator,
      "passenger"
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
      body: { success: false, message: "Not enough seats or ride changed. Try again." },
    };
  }

  ride = updatedRide;

  await closeSiblingStandalonesAfterEnroutePick(claimedPassengerRide.creator, ride, {
    pickedPassengerRideId: claimedPassengerRide._id,
  });

  await UserRides.findOneAndUpdate(
    { creator: claimedPassengerRide.creator },
    { $pull: { my_pending_ride_requests: { rideId: ride._id } } }
  );

  const driver = await User.findById(user._id);
  await notifyUser(claimedPassengerRide.creator, {
    title: "Ride request accepted",
    body: `${driver?.name || "Driver"} picked you for their ride`,
    type: "ride_accept",
    data: { rideId: ride._id.toString() },
  });

  emitRideParticipantsUpdated(ride._id, {
    action: "passenger_picked",
    passengerRideId: claimedPassengerRide._id.toString(),
    userId: claimedPassengerRide.creator.toString(),
  });
  emitToUser(user._id, "rideParticipantsUpdated", {
    rideId: ride._id.toString(),
    action: "passenger_picked",
  });
  emitMyRequestsUpdated(claimedPassengerRide.creator, {
    action: "passenger_assigned",
    passengerRideId: claimedPassengerRide._id.toString(),
    rideId: ride._id.toString(),
  });
  emitEnrouteRequestRemoved(ride.from, ride.to, toEnrouteDateKey(ride.date), {
    passengerRideId: claimedPassengerRide._id.toString(),
    type: "passenger",
    userId: claimedPassengerRide.creator.toString(),
  });

  await driverSubscriptionService.recordEnroutePick(user._id, rideId);

  const detailsRes = await getRideDetails(rideId, user._id);

  return {
    status: 200,
    body: {
      success: true,
      message: "Passenger picked successfully",
      ride,
      passengerRide: claimedPassengerRide,
      details: detailsRes.body?.data || null,
    },
  };
  });
};

module.exports = { createPassengerRequest, getOpenRequests, pickPassenger };
