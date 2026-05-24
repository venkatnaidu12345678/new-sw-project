const mongoose = require("mongoose");
const Ride = require("../models/rideModel");
const { getRideParticipantRole } = require("./rideAccessHelper");

const MAX_HISTORY = 120;

const emitLocation = (rideId, payload) => {
  if (global.io) {
    global.io.to(`ride:${rideId}`).emit("locationUpdate", payload);
    global.io.to("admin:tracking").emit("locationUpdate", payload);
  }
};

const updateDriverLocation = async (user, rideId, { lat, lng }) => {
  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    return { status: 400, body: { success: false, message: "Invalid ride ID" } };
  }
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { status: 400, body: { success: false, message: "Valid lat and lng required" } };
  }

  const ride = await Ride.findById(rideId);
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };
  if (ride.creator.toString() !== user._id.toString()) {
    return { status: 403, body: { success: false, message: "Only driver can update location" } };
  }
  if (ride.status !== "started") {
    return { status: 400, body: { success: false, message: "Ride must be started to share location" } };
  }

  const now = new Date();
  const point = { lat: latitude, lng: longitude, at: now };

  if (!ride.liveTracking) ride.liveTracking = {};
  ride.liveTracking.isActive = true;
  ride.liveTracking.driverLocation = { lat: latitude, lng: longitude, updatedAt: now };
  if (!ride.liveTracking.locationHistory) ride.liveTracking.locationHistory = [];
  ride.liveTracking.locationHistory.push(point);
  if (ride.liveTracking.locationHistory.length > MAX_HISTORY) {
    ride.liveTracking.locationHistory = ride.liveTracking.locationHistory.slice(-MAX_HISTORY);
  }

  await ride.save();

  const payload = {
    rideId: ride._id.toString(),
    from: ride.from,
    to: ride.to,
    status: ride.status,
    driver: { id: user._id.toString(), name: user.name },
    location: { lat: latitude, lng: longitude, updatedAt: now },
    path: ride.liveTracking.locationHistory,
  };

  emitLocation(rideId, payload);

  return { status: 200, body: { success: true, tracking: payload } };
};

const getActiveRidesForAdmin = async () => {
  const rides = await Ride.find({
    status: "started",
    "liveTracking.isActive": true,
  })
    .populate("creator", "name mobile")
    .populate("passengers.userId", "name")
    .select("from to status liveTracking passengers date startTime")
    .lean();

  const list = rides.map((r) => ({
    rideId: r._id,
    from: r.from,
    to: r.to,
    status: r.status,
    date: r.date,
    startTime: r.startTime,
    driver: r.creator,
    passengerCount: r.passengers?.length || 0,
    location: r.liveTracking?.driverLocation || null,
    path: r.liveTracking?.locationHistory || [],
    startedAt: r.liveTracking?.startedAt,
  }));

  return { status: 200, body: { success: true, rides: list } };
};

const getRideTracking = async (rideId) => {
  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    return { status: 400, body: { success: false, message: "Invalid ride ID" } };
  }
  const ride = await Ride.findById(rideId)
    .populate("creator", "name mobile email")
    .populate("passengers.userId", "name mobile")
    .select("from to status liveTracking passengers fromCoords toCoords date startTime")
    .lean();

  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };

  return {
    status: 200,
    body: {
      success: true,
      ride: {
        rideId: ride._id,
        from: ride.from,
        to: ride.to,
        status: ride.status,
        driver: ride.creator,
        passengers: ride.passengers,
        fromCoords: ride.fromCoords,
        toCoords: ride.toCoords,
        liveTracking: ride.liveTracking,
      },
    },
  };
};

const getTrackingForUser = async (user, rideId) => {
  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    return { status: 400, body: { success: false, message: "Invalid ride ID" } };
  }
  const ride = await Ride.findById(rideId).select("creator passengers status liveTracking from to");
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };

  const role = getRideParticipantRole(ride, user._id);
  if (!role) return { status: 403, body: { success: false, message: "Not on this ride" } };

  return {
    status: 200,
    body: {
      success: true,
      role,
      status: ride.status,
      from: ride.from,
      to: ride.to,
      liveTracking: ride.liveTracking,
    },
  };
};

module.exports = {
  updateDriverLocation,
  getActiveRidesForAdmin,
  getRideTracking,
  getTrackingForUser,
  emitLocation,
};
