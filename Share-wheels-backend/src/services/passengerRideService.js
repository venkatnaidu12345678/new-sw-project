const mongoose = require("mongoose");
const Ride = require("../models/rideModel");
const PassengerRide = require("../models/passengerRideModel");
const UserRides = require("../models/userRides");
const User = require("../models/userModel");
const { parseAmount } = require("../schemas/commonSchemas");
const { ensureParticipantBoardingOtp } = require("./rideVerificationService");
const { notifyUser } = require("./notificationService");
const { getRideDetails } = require("./rideService");
const {
  emitToUser,
  emitRideParticipantsUpdated,
  emitMyRequestsUpdated,
  emitEnrouteRequestRemoved,
} = require("../utils/socketEmit");

const createPassengerRequest = async (user, { from, to, ride_need_date, seats_needed, date, luggage_included, amount_will }) => {
  if (!from || !to || !ride_need_date || !seats_needed) return { status: 400, body: { error: "All fields are required" } };
  const amount = parseAmount(amount_will);
  if (amount === null || amount <= 0) {
    return { status: 400, body: { error: "Valid price (amount_will) is required" } };
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
    date: date ? new Date(date) : new Date(),
  });
  return { status: 200, body: { message: "Passenger request created", passengerRide } };
};

const getOpenRequests = async (user) => {
  const driverRides = await Ride.find({ creator: user._id });
  if (!driverRides || driverRides.length === 0) return { status: 200, body: [] };
  const dateQueries = driverRides.filter((ride) => ride.date).map((ride) => {
    const start = new Date(ride.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(ride.date);
    end.setHours(23, 59, 59, 999);
    return { date: { $gte: start, $lte: end } };
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

const pickPassenger = async (user, { passenger_rideId, rideId }) => {
  if (!passenger_rideId || !rideId) return { status: 400, body: { message: "passenger_rideId and rideId are required" } };
  if (!mongoose.Types.ObjectId.isValid(passenger_rideId)) return { status: 400, body: { message: "Invalid passenger_rideId" } };
  if (!mongoose.Types.ObjectId.isValid(rideId)) return { status: 400, body: { message: "Invalid rideId" } };
  const passengerRide = await PassengerRide.findById(passenger_rideId);
  if (!passengerRide) return { status: 404, body: { message: "Passenger not found" } };
  if (passengerRide.creator.toString() === user._id.toString()) return { status: 400, body: { message: "You cannot pick your own request" } };
  if (passengerRide.status !== "pending") return { status: 400, body: { message: "Passenger already picked" } };
  const ride = await Ride.findById(rideId);
  if (!ride) return { status: 404, body: { message: "Ride not found" } };
  if (ride.creator.toString() !== user._id.toString()) return { status: 403, body: { message: "Unauthorized" } };
  if (ride.availableSeats < passengerRide.seats_needed) return { status: 400, body: { success: false, message: "Not enough seats" } };

  const passengerEntry = {
    userId: passengerRide.creator,
    requires_seats: passengerRide.seats_needed,
    ride_amount: passengerRide.amount_will || 0,
    status: "accepted",
    joinedAt: new Date(),
  };
  await ensureParticipantBoardingOtp(passengerEntry, passengerRide.creator);
  ride.passengers.push(passengerEntry);
  ride.availableSeats -= passengerRide.seats_needed;
  await ride.save();

  passengerRide.assigned_to = { userId: user._id, rideId: ride._id };
  passengerRide.status = "aisgned_passenger";
  await passengerRide.save();

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
  });
  emitEnrouteRequestRemoved(passengerRide.from, passengerRide.to, passengerRide.date, {
    passengerRideId: passengerRide._id.toString(),
    type: "passenger",
  });

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
