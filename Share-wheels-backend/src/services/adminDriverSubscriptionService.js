const mongoose = require("mongoose");
const User = require("../models/userModel");
const SubscriptionPlan = require("../models/subscriptionPlanModel");
const UserSubscription = require("../models/userSubscriptionModel");
const SubscriptionPaymentOrder = require("../models/subscriptionPaymentOrderModel");
const driverSubscriptionService = require("./driverSubscriptionService");

const parsePage = (raw, fallback = 1) => {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const parseLimit = (raw, fallback = 25) => {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, 100);
};

const slimUser = (user) => {
  if (!user) return null;
  const u = user._id ? user : { _id: user };
  return {
    id: u._id,
    _id: u._id,
    name: u.name || "",
    email: u.email || "",
    mobile: u.mobile || "",
    userNo: u.userNo,
    profile_img: u.profile_img,
    hasVehicle: !!(u.vehicle?.company && u.vehicle?.car_no),
  };
};

const buildUserSearchFilter = async (search) => {
  const q = String(search || "").trim();
  if (!q) return null;
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const users = await User.find({
    $or: [{ name: regex }, { email: regex }, { mobile: regex }, { userNo: regex }],
  })
    .select("_id")
    .limit(200)
    .lean();
  return users.map((u) => u._id);
};

const listSubscribedUsers = async (query = {}) => {
  const page = parsePage(query.page);
  const limit = parseLimit(query.limit);
  const skip = (page - 1) * limit;
  const status = String(query.status || "all").toLowerCase();

  const filter = {};
  if (status !== "all") {
    filter.status = status;
  }
  if (query.planId && mongoose.Types.ObjectId.isValid(query.planId)) {
    filter.planId = query.planId;
  }

  const userIds = await buildUserSearchFilter(query.search);
  if (userIds) {
    if (!userIds.length) {
      return {
        status: 200,
        body: {
          success: true,
          subscriptions: [],
          pagination: { page, limit, total: 0, pages: 0 },
        },
      };
    }
    filter.userId = { $in: userIds };
  }

  const [rows, total] = await Promise.all([
    UserSubscription.find(filter)
      .populate("userId", "name email mobile userNo profile_img vehicle")
      .populate("planId", "name slug isFree amount currency isActive")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserSubscription.countDocuments(filter),
  ]);

  const subscriptions = rows.map((row) => ({
    id: row._id,
    user: slimUser(row.userId),
    plan: row.planId
      ? {
          id: row.planId._id,
          name: row.planId.name,
          slug: row.planId.slug,
          isFree: row.planId.isFree,
          amount: row.planId.amount,
          currency: row.planId.currency,
          isActive: row.planId.isActive,
        }
      : row.planSnapshot,
    subscription: driverSubscriptionService.formatSubscription(row),
    amountPaid: row.amountPaid,
    razorpayOrderId: row.razorpayOrderId || null,
    razorpayPaymentId: row.razorpayPaymentId || null,
    assignedByAdmin: !row.razorpayOrderId && !row.razorpayPaymentId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  return {
    status: 200,
    body: {
      success: true,
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 0,
      },
    },
  };
};

const assignPlanToUser = async (userId, planId, adminId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { status: 400, body: { success: false, message: "Invalid user ID" } };
  }
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    return { status: 400, body: { success: false, message: "Invalid plan ID" } };
  }

  const user = await User.findById(userId).select(
    "name email mobile userNo profile_img vehicle"
  );
  if (!user) {
    return { status: 404, body: { success: false, message: "User not found" } };
  }

  const plan = await SubscriptionPlan.findOne({ _id: planId, isActive: true });
  if (!plan) {
    return { status: 404, body: { success: false, message: "Plan not found or inactive" } };
  }

  if (plan.isFree && (await driverSubscriptionService.userHasUsedFreePlan(userId))) {
    return {
      status: 403,
      body: {
        success: false,
        message: "This user has already used the free plan once.",
        code: "FREE_PLAN_ALREADY_USED",
      },
    };
  }

  const subscription = await driverSubscriptionService.adminAssignPlan(userId, plan);

  return {
    status: 200,
    body: {
      success: true,
      message: `Plan "${plan.name}" assigned to ${user.name}`,
      user: slimUser(user),
      subscription: driverSubscriptionService.formatSubscription(subscription),
    },
  };
};

const listSubscriptionPayments = async (query = {}) => {
  const page = parsePage(query.page);
  const limit = parseLimit(query.limit);
  const skip = (page - 1) * limit;

  const filter = {};
  const status = String(query.status || "all").toLowerCase();
  if (status !== "all") {
    filter.status = status;
  }
  if (query.userId && mongoose.Types.ObjectId.isValid(query.userId)) {
    filter.userId = query.userId;
  }

  const userIds = await buildUserSearchFilter(query.search);
  if (userIds) {
    if (!userIds.length) {
      return {
        status: 200,
        body: {
          success: true,
          payments: [],
          pagination: { page, limit, total: 0, pages: 0 },
        },
      };
    }
    filter.userId = { $in: userIds };
  }

  const [orders, total] = await Promise.all([
    SubscriptionPaymentOrder.find(filter)
      .populate("userId", "name email mobile userNo profile_img")
      .populate("planId", "name slug amount currency isFree")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SubscriptionPaymentOrder.countDocuments(filter),
  ]);

  const payments = orders.map((row) => ({
    id: row._id,
    source: "razorpay",
    user: slimUser(row.userId),
    plan: row.planId
      ? {
          id: row.planId._id,
          name: row.planId.name,
          slug: row.planId.slug,
          amount: row.planId.amount,
          currency: row.planId.currency,
          isFree: row.planId.isFree,
        }
      : null,
    amount: row.amount,
    currency: row.currency || "INR",
    status: row.status,
    razorpayOrderId: row.razorpayOrderId,
    razorpayPaymentId: row.razorpayPaymentId || null,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  return {
    status: 200,
    body: {
      success: true,
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 0,
      },
    },
  };
};

module.exports = {
  listSubscribedUsers,
  assignPlanToUser,
  listSubscriptionPayments,
};
