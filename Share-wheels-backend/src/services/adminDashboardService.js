const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const Ride = require("../models/rideModel");
const PassengerRide = require("../models/passengerRideModel");
const Courier = require("../models/courierModel");
const UserSubscription = require("../models/userSubscriptionModel");
const SubscriptionPaymentOrder = require("../models/subscriptionPaymentOrderModel");

const { mapUserForAdmin } = require("./adminUserService");
const { clearRideChatMessages } = require("./rideChatService");

const buildDailySeries = async (Model, days = 7) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const rows = await Model.aggregate([
    { $match: { createdAt: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const map = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const series = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    series.push({
      date: key,
      label: d.toLocaleDateString("en-IN", { weekday: "short" }),
      count: map[key] || 0,
    });
  }
  return series;
};

const PLAN_CHART_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];

const getSubscriptionDashboardData = async () => {
  const now = new Date();

  const [
    activeSubscriptions,
    expiredSubscriptions,
    cancelledSubscriptions,
    totalSubscriptions,
    paidPayments,
    failedPayments,
    pendingPayments,
    revenueAgg,
    planRows,
    recentSubscriptions,
    subscriptionActivity,
  ] = await Promise.all([
    UserSubscription.countDocuments({ status: "active", expiresAt: { $gt: now } }),
    UserSubscription.countDocuments({ status: "expired" }),
    UserSubscription.countDocuments({ status: "cancelled" }),
    UserSubscription.countDocuments(),
    SubscriptionPaymentOrder.countDocuments({ status: "paid" }),
    SubscriptionPaymentOrder.countDocuments({ status: "failed" }),
    SubscriptionPaymentOrder.countDocuments({ status: { $in: ["created", "expired"] } }),
    SubscriptionPaymentOrder.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    UserSubscription.aggregate([
      { $match: { status: "active", expiresAt: { $gt: now } } },
      {
        $group: {
          _id: { $ifNull: ["$planSnapshot.name", "Unknown plan"] },
          count: { $sum: 1 },
          isFree: { $max: { $cond: ["$planSnapshot.isFree", 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    UserSubscription.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("userId", "name email mobile")
      .select("status planSnapshot startsAt expiresAt amountPaid createdAt userId")
      .lean(),
    buildDailySeries(UserSubscription, 7),
  ]);

  const subscriptionRevenue = revenueAgg[0]?.total || 0;

  const freeActive = planRows
    .filter((row) => row.isFree)
    .reduce((sum, row) => sum + row.count, 0);
  const paidActive = Math.max(0, activeSubscriptions - freeActive);

  const subscriptionStatusBreakdown = [
    { name: "Active", value: activeSubscriptions, color: "#10b981" },
    { name: "Expired", value: expiredSubscriptions, color: "#f59e0b" },
    { name: "Cancelled", value: cancelledSubscriptions, color: "#94a3b8" },
  ].filter((row) => row.value > 0);

  const subscriptionPlanBreakdown = planRows.map((row, index) => ({
    name: row._id || "Unknown plan",
    value: row.count,
    color: PLAN_CHART_COLORS[index % PLAN_CHART_COLORS.length],
  }));

  const subscriptionPaymentBreakdown = [
    { name: "Paid", value: paidPayments, color: "#10b981" },
    { name: "Failed", value: failedPayments, color: "#f43f5e" },
    { name: "Pending / expired", value: pendingPayments, color: "#f59e0b" },
  ].filter((row) => row.value > 0);

  const subscriptionTypeBreakdown = [
    { name: "Paid active", value: paidActive, color: "#6366f1" },
    { name: "Free active", value: freeActive, color: "#10b981" },
  ].filter((row) => row.value > 0);

  return {
    stats: {
      activeSubscriptions,
      expiredSubscriptions,
      totalSubscriptions,
      subscriptionRevenue,
      paidPayments,
      paidActiveSubscriptions: paidActive,
      freeActiveSubscriptions: freeActive,
    },
    subscriptionStatusBreakdown,
    subscriptionPlanBreakdown,
    subscriptionPaymentBreakdown,
    subscriptionTypeBreakdown,
    subscriptionActivityChart: subscriptionActivity,
    recentSubscriptions: recentSubscriptions.map((row) => ({
      id: String(row._id),
      user: row.userId?.name || "—",
      email: row.userId?.email || row.userId?.mobile || "",
      plan: row.planSnapshot?.name || "—",
      status: row.status,
      amountPaid: row.amountPaid ?? 0,
      isFree: !!row.planSnapshot?.isFree,
      startsAt: row.startsAt,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    })),
  };
};

const getDashboardStats = async () => {
  const [
    totalUsers,
    verifiedUsers,
    totalRides,
    activeRides,
    completedRides,
    openPassengerRequests,
    openCouriers,
    pendingRides,
    startedRides,
    cancelledRides,
    expiredRides,
    recentRides,
    rideActivity,
    userActivity,
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
    Ride.countDocuments({ status: "pending" }),
    Ride.countDocuments({ status: "started" }),
    Ride.countDocuments({ status: "cancelled" }),
    Ride.countDocuments({ status: "expired" }),
    Ride.find()
      .sort({ updatedAt: -1 })
      .limit(8)
      .populate("creator", "name email")
      .select("from to status date startTime updatedAt creator")
      .lean(),
    buildDailySeries(Ride, 7),
    buildDailySeries(User, 7),
  ]);

  const subscriptionData = await getSubscriptionDashboardData();

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
        pendingRides,
        startedRides,
        ...subscriptionData.stats,
      },
      rideStatusBreakdown: [
        { name: "Pending", value: pendingRides, color: "#f59e0b" },
        { name: "In progress", value: startedRides, color: "#3b82f6" },
        { name: "Completed", value: completedRides, color: "#10b981" },
        { name: "Cancelled", value: cancelledRides, color: "#f43f5e" },
        { name: "Expired", value: expiredRides, color: "#94a3b8" },
      ],
      activityChart: rideActivity.map((row, i) => ({
        ...row,
        users: userActivity[i]?.count || 0,
        subscriptions: subscriptionData.subscriptionActivityChart[i]?.count || 0,
      })),
      subscriptionStatusBreakdown: subscriptionData.subscriptionStatusBreakdown,
      subscriptionPlanBreakdown: subscriptionData.subscriptionPlanBreakdown,
      subscriptionPaymentBreakdown: subscriptionData.subscriptionPaymentBreakdown,
      subscriptionTypeBreakdown: subscriptionData.subscriptionTypeBreakdown,
      subscriptionActivityChart: subscriptionData.subscriptionActivityChart,
      recentSubscriptions: subscriptionData.recentSubscriptions,
      recentRides: recentRides.map((r) => ({
        id: String(r._id),
        from: r.from,
        to: r.to,
        status: r.status,
        driver: r.creator?.name || "—",
        date: r.date,
        startTime: r.startTime,
        updatedAt: r.updatedAt,
      })),
      generatedAt: new Date().toISOString(),
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
      .select("+passwordPlain")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    status: 200,
    body: {
      success: true,
      total,
      page: Number(page),
      users: users.map(mapUserForAdmin),
    },
  };
};

/** Dev/admin: fill missing passwordPlain so the admin table can show passwords for legacy users. */
const backfillUserPasswords = async ({ defaultPassword } = {}) => {
  const plain =
    String(defaultPassword || process.env.BACKFILL_USER_PASSWORD || "password123").trim();
  if (plain.length < 6) {
    return {
      status: 400,
      body: { message: "Default password must be at least 6 characters" },
    };
  }

  const missing = await User.find({
    $or: [
      { passwordPlain: { $exists: false } },
      { passwordPlain: null },
      { passwordPlain: "" },
    ],
  }).select("+password");

  const hash = await bcrypt.hash(plain, 10);
  let updated = 0;

  for (const user of missing) {
    user.passwordPlain = plain;
    user.password = hash;
    await user.save();
    updated += 1;
  }

  return {
    status: 200,
    body: {
      success: true,
      updated,
      defaultPassword: plain,
      message:
        updated > 0
          ? `Updated ${updated} user(s). All use password: ${plain}`
          : "All users already have passwords stored for admin display.",
    },
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
  const allowed = ["pending", "started", "completed", "cancelled", "expired"];
  if (!allowed.includes(status)) {
    return { status: 400, body: { message: "Invalid status" } };
  }
  const ride = await Ride.findByIdAndUpdate(rideId, { status }, { returnDocument: "after" });
  if (!ride) return { status: 404, body: { message: "Ride not found" } };
  if (status === "completed") {
    await clearRideChatMessages(rideId);
  }
  return { status: 200, body: { success: true, ride } };
};

const updateUserVerification = async (userId, isVerified) => {
  const user = await User.findByIdAndUpdate(userId, { isVerified }, { returnDocument: "after" }).select(
    "-password -otp -otpExpires"
  );
  if (!user) return { status: 404, body: { message: "User not found" } };
  return { status: 200, body: { success: true, user } };
};

const rideTrackingService = require("./rideTrackingService");
const googleMapsService = require("./googleMapsService");

const getActiveTracking = async () => rideTrackingService.getActiveRidesForAdmin();

const getTrackingDetail = async (rideId) => rideTrackingService.getRideTracking(rideId);

const getRouteDirections = async (query = {}) =>
  googleMapsService.getDirections({
    originLat: query.originLat,
    originLng: query.originLng,
    destLat: query.destLat,
    destLng: query.destLng,
    from: query.from,
    to: query.to,
    waypoints: query.waypoints,
  });

module.exports = {
  getDashboardStats,
  listUsers,
  backfillUserPasswords,
  listRides,
  listPassengerRides,
  listCouriers,
  updateRideStatus,
  updateUserVerification,
  getActiveTracking,
  getTrackingDetail,
  getRouteDirections,
};
