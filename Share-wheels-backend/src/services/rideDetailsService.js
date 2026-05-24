const mongoose = require("mongoose");
const UserRides = require("../models/userRides");

const getUserRideDetails = async (authUser, { userId }) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return { status: 400, body: { message: "Valid userId is required" } };
  }
  if (userId !== authUser._id.toString()) return { status: 403, body: { message: "Access denied" } };

  const userRides = await UserRides.findOne({ creator: userId })
    .populate("my_pending_ride_requests.rideId", "from to date startTime endTime")
    .populate("my_pending_ride_requests.driverId", "name mobile")
    .populate("driver_accepted_ride_requests.rideId", "from to date startTime endTime")
    .populate("driver_accepted_ride_requests.driverId", "name mobile");

  if (!userRides) return { status: 404, body: { status: false, message: "No ride data found for this user" } };
  return { status: 200, body: { status: true, data: userRides } };
};

module.exports = { getUserRideDetails };
