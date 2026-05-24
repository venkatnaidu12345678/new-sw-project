const User = require("../models/userModel");
const Ride = require("../models/rideModel");
const PassengerRide = require("../models/passengerRideModel");
const Courier = require("../models/courierModel");

const getDashboardStats = async () => {
  const [
    totalUsers,
    verifiedUsers,
    totalRides,
    activeRides,
    completedRides,
    openPassengerRequests,
    openCouriers,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isVerified: true }),
    Ride.countDocuments(),
    Ride.countDocuments({ status: { $in: ["pending", "started"] } }),
    Ride.countDocuments({ status: "completed" }),
    PassengerRide.countDocuments({ status: "pending" }),
    Courier.countDocuments({
      courier_status: { $in: ["pending", "request_to_driver", "driver_assigned"] },
    }),
  ]);

  return {
    status: 200,
    body: {
      success: true,
      stats: {
        totalUsers,
        verifiedUsers,
        totalRides,
        activeRides,
        completedRides,
        openPassengerRequests,
        openCouriers,
      },
    },
  };
};

const listUsers = async ({ page = 1, limit = 20, search = "" }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const filter = search
    ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { mobile: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password -otp -otpExpires")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    status: 200,
    body: { success: true, total, page: Number(page), users },
  };
};

const listRides = async ({ page = 1, limit = 20, status }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const filter = status ? { status } : {};

  const [rides, total] = await Promise.all([
    Ride.find(filter)
      .populate("creator", "name email mobile")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Ride.countDocuments(filter),
  ]);

  return {
    status: 200,
    body: { success: true, total, page: Number(page), rides },
  };
};

const listPassengerRides = async ({ page = 1, limit = 20, status }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const filter = status ? { status } : {};

  const [requests, total] = await Promise.all([
    PassengerRide.find(filter)
      .populate("creator", "name email mobile")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    PassengerRide.countDocuments(filter),
  ]);

  return {
    status: 200,
    body: { success: true, total, page: Number(page), passengerRides: requests },
  };
};

const listCouriers = async ({ page = 1, limit = 20, status }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const filter = status ? { courier_status: status } : {};

  const [couriers, total] = await Promise.all([
    Courier.find(filter)
      .populate("creator", "name email mobile")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Courier.countDocuments(filter),
  ]);

  return {
    status: 200,
    body: { success: true, total, page: Number(page), couriers },
  };
};

const updateRideStatus = async (rideId, status) => {
  const allowed = ["pending", "started", "completed", "cancelled"];
  if (!allowed.includes(status)) {
    return { status: 400, body: { message: "Invalid status" } };
  }
  const ride = await Ride.findByIdAndUpdate(rideId, { status }, { new: true });
  if (!ride) return { status: 404, body: { message: "Ride not found" } };
  return { status: 200, body: { success: true, ride } };
};

const updateUserVerification = async (userId, isVerified) => {
  const user = await User.findByIdAndUpdate(userId, { isVerified }, { new: true }).select(
    "-password -otp -otpExpires"
  );
  if (!user) return { status: 404, body: { message: "User not found" } };
  return { status: 200, body: { success: true, user } };
};

const rideTrackingService = require("./rideTrackingService");

const getActiveTracking = async () => rideTrackingService.getActiveRidesForAdmin();

const getTrackingDetail = async (rideId) => rideTrackingService.getRideTracking(rideId);

module.exports = {
  getDashboardStats,
  listUsers,
  listRides,
  listPassengerRides,
  listCouriers,
  updateRideStatus,
  updateUserVerification,
  getActiveTracking,
  getTrackingDetail,
};
