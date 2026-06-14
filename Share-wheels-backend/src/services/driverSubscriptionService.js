const mongoose = require("mongoose");
const SubscriptionPlan = require("../models/subscriptionPlanModel");
const UserSubscription = require("../models/userSubscriptionModel");

const FREE_PLAN_YEARS = 10;

const addPeriod = (start, periodValue, periodUnit) => {
  const expiresAt = new Date(start);
  if (periodUnit === "months") {
    expiresAt.setMonth(expiresAt.getMonth() + periodValue);
  } else {
    expiresAt.setDate(expiresAt.getDate() + periodValue);
  }
  return expiresAt;
};

const farFutureExpiry = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + FREE_PLAN_YEARS);
  return d;
};

const normalizeRideId = (rideId) => rideId?.toString?.() || String(rideId || "");

const buildPlanSnapshot = (plan) => ({
  name: plan.name,
  slug: plan.slug,
  amount: plan.amount,
  currency: plan.currency,
  isFree: plan.isFree,
  enroutePickLimit: plan.enroutePickLimit,
  rideLimit: plan.rideLimit,
  periodValue: plan.periodValue,
  periodUnit: plan.periodUnit,
  description: plan.description || "",
});

const formatSubscription = (subscription) => {
  if (!subscription) return null;

  const snapshot = subscription.planSnapshot || {};
  const isFree = !!snapshot.isFree;
  const now = new Date();
  const usedRideIds = subscription.usedRideIds || [];

  if (isFree) {
    const rideLimit = snapshot.rideLimit ?? 0;
    const ridesUsed = subscription.ridesUsed ?? usedRideIds.length;
    const ridesRemaining = Math.max(0, rideLimit - ridesUsed);

    return {
      id: subscription._id,
      status: subscription.status,
      isFree: true,
      unlimitedPicksPerRide: true,
      rideLimit,
      ridesUsed,
      ridesRemaining,
      startsAt: subscription.startsAt,
      expiresAt: subscription.expiresAt,
      isExpired: subscription.expiresAt <= now,
      plan: snapshot,
      planId: subscription.planId,
      amountPaid: subscription.amountPaid,
    };
  }

  const limit = snapshot.enroutePickLimit ?? 0;
  const used = subscription.picksUsed ?? 0;
  const remaining = Math.max(0, limit - used);

  return {
    id: subscription._id,
    status: subscription.status,
    isFree: false,
    unlimitedPicksPerRide: false,
    picksUsed: used,
    enroutePickLimit: limit,
    picksRemaining: remaining,
    startsAt: subscription.startsAt,
    expiresAt: subscription.expiresAt,
    isExpired: subscription.expiresAt <= now,
    plan: snapshot,
    planId: subscription.planId,
    amountPaid: subscription.amountPaid,
  };
};

const expireStaleSubscriptions = async (userId) => {
  const now = new Date();
  await UserSubscription.updateMany(
    {
      userId,
      status: "active",
      expiresAt: { $lte: now },
    },
    { $set: { status: "expired" } }
  );
};

/** New drivers always start on the free plan — never a paid default. */
const getDefaultPlan = async () => {
  const flagged = await SubscriptionPlan.findOne({
    isActive: true,
    isFree: true,
    isDefault: true,
  }).sort({ createdAt: 1 });
  if (flagged) return flagged;

  return SubscriptionPlan.findOne({ isActive: true, isFree: true }).sort({
    createdAt: 1,
  });
};

const createSubscriptionForPlan = async (userId, plan) => {
  const startsAt = new Date();
  const expiresAt = plan.isFree
    ? farFutureExpiry()
    : addPeriod(startsAt, plan.periodValue, plan.periodUnit);

  await UserSubscription.updateMany(
    { userId, status: "active" },
    { $set: { status: "cancelled" } }
  );

  return UserSubscription.create({
    userId,
    planId: plan._id,
    planSnapshot: buildPlanSnapshot(plan),
    status: "active",
    picksUsed: 0,
    ridesUsed: 0,
    usedRideIds: [],
    startsAt,
    expiresAt,
    amountPaid: plan.amount || 0,
  });
};

const ensureDefaultSubscription = async (userId) => {
  await expireStaleSubscriptions(userId);

  const active = await UserSubscription.findOne({
    userId,
    status: "active",
    expiresAt: { $gt: new Date() },
  }).sort({ expiresAt: -1 });

  if (active) return active;

  const defaultPlan = await getDefaultPlan();
  if (!defaultPlan) return null;

  return createSubscriptionForPlan(userId, defaultPlan);
};

const getDriverSubscriptionStatus = async (userId) => {
  const subscription = await ensureDefaultSubscription(userId);
  const plansRes = await SubscriptionPlan.find({ isActive: true })
    .sort({ isFree: -1, amount: 1, createdAt: -1 })
    .lean();

  return {
    status: 200,
    body: {
      success: true,
      subscription: formatSubscription(subscription),
      plans: plansRes,
    },
  };
};

const subscribeToPlan = async (userId, planId) => {
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    return { status: 400, body: { success: false, message: "Invalid plan ID" } };
  }

  const plan = await SubscriptionPlan.findOne({ _id: planId, isActive: true });
  if (!plan) {
    return { status: 404, body: { success: false, message: "Plan not found or inactive" } };
  }

  const subscription = await createSubscriptionForPlan(userId, plan);

  return {
    status: 200,
    body: {
      success: true,
      message: plan.isFree
        ? "Free plan activated"
        : "Subscription activated",
      subscription: formatSubscription(subscription),
    },
  };
};

const assertCanPickEnroute = async (userId, rideId) => {
  const subscription = await ensureDefaultSubscription(userId);

  if (!subscription) {
    return {
      ok: false,
      status: 403,
      message:
        "No subscription plan is available. Ask admin to configure driver subscription plans.",
      code: "NO_PLAN",
    };
  }

  const now = new Date();
  if (subscription.expiresAt <= now) {
    await UserSubscription.findByIdAndUpdate(subscription._id, {
      status: "expired",
    });
    return {
      ok: false,
      status: 403,
      message: "Your subscription has expired. Renew to pick en route passengers.",
      code: "SUBSCRIPTION_EXPIRED",
      subscription: formatSubscription(subscription),
    };
  }

  const snapshot = subscription.planSnapshot || {};

  if (snapshot.isFree) {
    const rideLimit = snapshot.rideLimit ?? 0;
    const rideKey = normalizeRideId(rideId);
    const usedRideIds = (subscription.usedRideIds || []).map(normalizeRideId);

    if (rideKey && usedRideIds.includes(rideKey)) {
      return {
        ok: true,
        subscription,
        unlimitedPicksPerRide: true,
      };
    }

    const ridesUsed = subscription.ridesUsed ?? usedRideIds.length;
    if (ridesUsed >= rideLimit) {
      return {
        ok: false,
        status: 403,
        message: `You have used all ${rideLimit} free rides on your plan. Upgrade to pick on more rides.`,
        code: "RIDE_LIMIT_REACHED",
        subscription: formatSubscription(subscription),
      };
    }

    return {
      ok: true,
      subscription,
      unlimitedPicksPerRide: true,
      ridesRemaining: rideLimit - ridesUsed,
    };
  }

  const limit = snapshot.enroutePickLimit ?? 0;
  const used = subscription.picksUsed ?? 0;

  if (used >= limit) {
    return {
      ok: false,
      status: 403,
      message: `You have used all ${limit} en route picks on your current plan. Upgrade or wait for renewal.`,
      code: "PICK_LIMIT_REACHED",
      subscription: formatSubscription(subscription),
    };
  }

  return {
    ok: true,
    subscription,
    remaining: limit - used,
  };
};

const recordEnroutePick = async (userId, rideId) => {
  const subscription = await ensureDefaultSubscription(userId);
  if (!subscription) return;

  const snapshot = subscription.planSnapshot || {};
  const rideKey = normalizeRideId(rideId);

  if (snapshot.isFree) {
    if (!rideKey) return;

    const usedRideIds = (subscription.usedRideIds || []).map(normalizeRideId);
    if (usedRideIds.includes(rideKey)) return;

    await UserSubscription.findByIdAndUpdate(subscription._id, {
      $addToSet: { usedRideIds: rideKey },
      $inc: { ridesUsed: 1 },
    });
    return;
  }

  await UserSubscription.findByIdAndUpdate(subscription._id, {
    $inc: { picksUsed: 1 },
  });
};

/** Driver IDs with a non-expired active subscription (paid or free). */
const getActiveSubscribedDriverIds = async (driverIds) => {
  const unique = [
    ...new Set(
      (driverIds || [])
        .map((id) => id?._id?.toString?.() || id?.toString?.() || String(id || ""))
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    ),
  ];
  if (!unique.length) return new Set();

  const now = new Date();
  const activeSubs = await UserSubscription.find({
    userId: { $in: unique.map((id) => new mongoose.Types.ObjectId(id)) },
    status: "active",
    expiresAt: { $gt: now },
  })
    .select("userId")
    .lean();

  return new Set(activeSubs.map((row) => String(row.userId)));
};

/**
 * Drivers eligible for related-ride discovery: active paid/free subscription,
 * or auto-provisioned active free plan when the platform free plan is on.
 */
const getEligibleRelatedRideDriverIds = async (driverIds) => {
  const eligible = await getActiveSubscribedDriverIds(driverIds);
  const unique = [
    ...new Set(
      (driverIds || [])
        .map((id) => id?._id?.toString?.() || id?.toString?.() || String(id || ""))
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    ),
  ];
  const missing = unique.filter((id) => !eligible.has(id));
  if (!missing.length) return eligible;

  const freePlan = await getDefaultPlan();
  if (!freePlan?.isActive) return eligible;

  await Promise.all(
    missing.map(async (driverId) => {
      try {
        const subscription = await ensureDefaultSubscription(driverId);
        const now = new Date();
        if (
          subscription &&
          subscription.status === "active" &&
          subscription.expiresAt > now
        ) {
          eligible.add(String(driverId));
        }
      } catch {
        /* ignore per-driver provisioning errors */
      }
    })
  );

  return eligible;
};

const driverHasActiveSubscription = async (driverId) => {
  const key = driverId?._id?.toString?.() || driverId?.toString?.() || String(driverId || "");
  if (!mongoose.Types.ObjectId.isValid(key)) return false;

  const subscribed = await getEligibleRelatedRideDriverIds([key]);
  return subscribed.has(key);
};

module.exports = {
  getDriverSubscriptionStatus,
  subscribeToPlan,
  assertCanPickEnroute,
  recordEnroutePick,
  ensureDefaultSubscription,
  formatSubscription,
  getActiveSubscribedDriverIds,
  getEligibleRelatedRideDriverIds,
  driverHasActiveSubscription,
};
