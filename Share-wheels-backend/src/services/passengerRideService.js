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
const { closeStandaloneRequestsAfterJoin } = require("../utils/participantRequestCleanup");
const {
  emitToUser,
  emitRideParticipantsUpdated,
  emitMyRequestsUpdated,
  emitEnrouteRequestRemoved,
} = require("../utils/socketEmit");
const { rejectIfCourierJoiningAsPassenger } = require("../utils/rideParticipantRules");
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

const pickPassenger = async (user, { passenger_rideId, rideId }) => {
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

  if (!passenger_rideId || !rideId) return { status: 400, body: { message: "passenger_rideId and rideId are required" } };
  if (!mongoose.Types.ObjectId.isValid(passenger_rideId)) return { status: 400, body: { message: "Invalid passenger_rideId" } };
  if (!mongoose.Types.ObjectId.isValid(rideId)) return { status: 400, body: { message: "Invalid rideId" } };
  const passengerRide = await PassengerRide.findById(passenger_rideId);
  if (!passengerRide) return { status: 404, body: { message: "Passenger not found" } };
  if (passengerRide.creator.toString() === user._id.toString()) return { status: 400, body: { message: "You cannot pick your own request" } };
  if (passengerRide.status === "expired") {
    return { status: 400, body: { message: "This passenger request has expired" } };
  }
  if (passengerRide.status !== "pending") return { status: 400, body: { message: "Passenger already picked" } };
  const ride = await Ride.findById(rideId);
  if (!ride) return { status: 404, body: { message: "Ride not found" } };
  if (ride.creator.toString() !== user._id.toString()) return { status: 403, body: { message: "Unauthorized" } };
  if (ride.availableSeats < passengerRide.seats_needed) return { status: 400, body: { success: false, message: "Not enough seats" } };
  const courierConflict = rejectIfCourierJoiningAsPassenger(ride, passengerRide.creator);
  if (courierConflict.blocked) {
    return { status: 400, body: { message: courierConflict.message } };
  }

  const passengerEntry = {
    userId: passengerRide.creator,
    requires_seats: passengerRide.seats_needed,
    from: passengerRide.from || ride.from,
    to: passengerRide.to || ride.to,
    ride_amount: passengerRide.amount_will || 0,
    status: "accepted",
    joinedAt: new Date(),
  };
  await ensureParticipantBoardingOtp(passengerEntry, passengerRide.creator, {
    rideId: ride._id,
    from: ride.from,
    to: ride.to,
  });

  passengerRide.assigned_to = { userId: user._id, rideId: ride._id };
  passengerRide.status = "aisgned_passenger";
  await passengerRide.save();

  ride.passengers.push(passengerEntry);
  ride.availableSeats -= passengerRide.seats_needed;
  await ride.save();
  await closeStandaloneRequestsAfterJoin(passengerRide.creator, ride);

  await UserRides.findOneAndUpdate(
    { creator: passengerRide.creator },
    { $pull: { my_pending_ride_requests: { rideId: ride._id } } }
  );

  const driver = await User.findById(user._id);
  await notifyUser(passengerRide.creator, {
    title: "Ride request accepted",
    body: `${driver?.name || "Driver"} picked you for their ride`,
    type: "ride_accept",
    data: { rideId: ride._id.toString() },
  });

  emitRideParticipantsUpdated(ride._id, {
    action: "passenger_picked",
    passengerRideId: passengerRide._id.toString(),
    userId: passengerRide.creator.toString(),
  });
  emitToUser(user._id, "rideParticipantsUpdated", {
    rideId: ride._id.toString(),
    action: "passenger_picked",
  });
  emitMyRequestsUpdated(passengerRide.creator, {
    action: "passenger_assigned",
    passengerRideId: passengerRide._id.toString(),
    rideId: ride._id.toString(),
    from: ride.from,
    to: ride.to,
  });
  emitEnrouteRequestRemoved(ride.from, ride.to, toEnrouteDateKey(ride.date), {
    passengerRideId: passengerRide._id.toString(),
    type: "passenger",
    userId: passengerRide.creator.toString(),
  });

  await driverSubscriptionService.recordEnroutePick(user._id, rideId);

  const detailsRes = await getRideDetails(rideId, user._id);

  return {
    status: 200,
    body: {
      success: true,
      message: "Passenger picked successfully",
      ride,
      passengerRide,
      details: detailsRes.body?.data || null,
    },
  };
};

module.exports = { createPassengerRequest, getOpenRequests, pickPassenger };
