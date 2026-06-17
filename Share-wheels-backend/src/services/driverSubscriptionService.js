const mongoose = require("mongoose");
const SubscriptionPlan = require("../models/subscriptionPlanModel");
const UserSubscription = require("../models/userSubscriptionModel");
const SubscriptionPaymentOrder = require("../models/subscriptionPaymentOrderModel");
const User = require("../models/userModel");
const razorpayService = require("./razorpayService");

const addPeriod = (start, periodValue, periodUnit) => {
  const expiresAt = new Date(start);
  if (periodUnit === "months") {
    expiresAt.setMonth(expiresAt.getMonth() + periodValue);
  } else {
    expiresAt.setDate(expiresAt.getDate() + periodValue);
  }
  return expiresAt;
};

const normalizeRideId = (rideId) => rideId?.toString?.() || String(rideId || "");

const isLegacyFreeRidePlan = (snapshot = {}) =>
  !!snapshot.isFree &&
  snapshot.rideLimit != null &&
  snapshot.enroutePickLimit == null &&
  !snapshot.unlimitedPicks;

const buildPlanSnapshot = (plan) => ({
  name: plan.name,
  slug: plan.slug,
  amount: plan.amount,
  currency: plan.currency,
  isFree: plan.isFree,
  enroutePickLimit: plan.enroutePickLimit,
  unlimitedPicks: !!plan.unlimitedPicks,
  rideLimit: plan.rideLimit,
  periodValue: plan.periodValue,
  periodUnit: plan.periodUnit,
  description: plan.description || "",
});

const userHasUsedFreePlan = async (userId) => {
  const prior = await UserSubscription.findOne({
    userId,
    "planSnapshot.isFree": true,
  }).select("_id");
  return !!prior;
};

const formatSubscription = (subscription) => {
  if (!subscription) return null;

  const snapshot = subscription.planSnapshot || {};
  const now = new Date();
  const isExpired = subscription.expiresAt <= now;
  const legacyFree = isLegacyFreeRidePlan(snapshot);

  if (legacyFree) {
    const rideLimit = snapshot.rideLimit ?? 0;
    const usedRideIds = subscription.usedRideIds || [];
    const ridesUsed = subscription.ridesUsed ?? usedRideIds.length;
    const ridesRemaining = Math.max(0, rideLimit - ridesUsed);

    return {
      id: subscription._id,
      status: subscription.status,
      isFree: true,
      isLegacyFreeRidePlan: true,
      unlimitedPicksPerRide: true,
      rideLimit,
      ridesUsed,
      ridesRemaining,
      startsAt: subscription.startsAt,
      expiresAt: subscription.expiresAt,
      isExpired,
      plan: snapshot,
      planId: subscription.planId,
      amountPaid: subscription.amountPaid,
    };
  }

  const unlimited = !!snapshot.unlimitedPicks;
  const limit = snapshot.enroutePickLimit ?? 0;
  const used = subscription.picksUsed ?? 0;
  const remaining = unlimited ? null : Math.max(0, limit - used);
  const picksExhausted = !unlimited && used >= limit;

  return {
    id: subscription._id,
    status: subscription.status,
    isFree: !!snapshot.isFree,
    isLegacyFreeRidePlan: false,
    unlimitedPicks: unlimited,
    picksUsed: used,
    enroutePickLimit: unlimited ? null : limit,
    picksRemaining: remaining,
    picksExhausted,
    startsAt: subscription.startsAt,
    expiresAt: subscription.expiresAt,
    isExpired,
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

const createSubscriptionForPlan = async (
  userId,
  plan,
  { amountPaid, razorpayOrderId, razorpayPaymentId } = {}
) => {
  const startsAt = new Date();
  const expiresAt = addPeriod(startsAt, plan.periodValue, plan.periodUnit);

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
    amountPaid: amountPaid ?? plan.amount ?? 0,
    razorpayOrderId: razorpayOrderId || undefined,
    razorpayPaymentId: razorpayPaymentId || undefined,
  });
};

const getLatestSubscription = async (userId) =>
  UserSubscription.findOne({ userId }).sort({ createdAt: -1 });

const ensureDefaultSubscription = async (userId) => {
  await expireStaleSubscriptions(userId);

  const active = await UserSubscription.findOne({
    userId,
    status: "active",
    expiresAt: { $gt: new Date() },
  }).sort({ expiresAt: -1 });

  if (active) return active;

  const usedFree = await userHasUsedFreePlan(userId);
  if (usedFree) return getLatestSubscription(userId);

  const defaultPlan = await getDefaultPlan();
  if (!defaultPlan) return null;

  return createSubscriptionForPlan(userId, defaultPlan);
};

const getDriverSubscriptionStatus = async (userId) => {
  const subscription = await ensureDefaultSubscription(userId);
  const freePlanUsed = await userHasUsedFreePlan(userId);
  const plansRes = await SubscriptionPlan.find({ isActive: true })
    .sort({ isFree: -1, amount: 1, createdAt: -1 })
    .lean();

  return {
    status: 200,
    body: {
      success: true,
      subscription: formatSubscription(subscription),
      plans: plansRes,
      freePlanUsed,
      canSubscribeToFree: !freePlanUsed,
      razorpayConfigured: razorpayService.isRazorpayConfigured(),
      razorpayKeyId: razorpayService.getKeyId(),
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

  if (plan.isFree) {
    if (await userHasUsedFreePlan(userId)) {
      return {
        status: 403,
        body: {
          success: false,
          message:
            "The free plan can only be used once. Upgrade to a paid plan to continue picking en route.",
          code: "FREE_PLAN_ALREADY_USED",
        },
      };
    }

    const subscription = await createSubscriptionForPlan(userId, plan);
    return {
      status: 200,
      body: {
        success: true,
        message: "Free plan activated",
        subscription: formatSubscription(subscription),
      },
    };
  }

  return {
    status: 400,
    body: {
      success: false,
      message: "Paid plans require payment. Use create-order and verify-payment endpoints.",
      code: "PAYMENT_REQUIRED",
    },
  };
};

const createPaymentOrder = async (userId, planId) => {
  if (!razorpayService.isRazorpayConfigured()) {
    return {
      status: 503,
      body: {
        success: false,
        message: "Payment gateway is not configured. Contact support.",
        code: "RAZORPAY_NOT_CONFIGURED",
      },
    };
  }

  if (!mongoose.Types.ObjectId.isValid(planId)) {
    return { status: 400, body: { success: false, message: "Invalid plan ID" } };
  }

  const plan = await SubscriptionPlan.findOne({
    _id: planId,
    isActive: true,
    isFree: false,
  });
  if (!plan) {
    return {
      status: 404,
      body: { success: false, message: "Paid plan not found or inactive" },
    };
  }

  const receipt = `sub_${userId.toString().slice(-6)}_${Date.now()}`;
  const order = await razorpayService.createOrder({
    amount: plan.amount,
    currency: plan.currency || "INR",
    receipt,
    notes: {
      userId: userId.toString(),
      planId: plan._id.toString(),
      planName: plan.name,
    },
  });

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await SubscriptionPaymentOrder.create({
    userId,
    planId: plan._id,
    razorpayOrderId: order.id,
    amount: plan.amount,
    currency: plan.currency || "INR",
    status: "created",
    expiresAt,
  });

  const user = await User.findById(userId).select("name email mobile").lean();

  return {
    status: 200,
    body: {
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      keyId: razorpayService.getKeyId(),
      plan: {
        id: plan._id,
        name: plan.name,
        amount: plan.amount,
        currency: plan.currency || "INR",
      },
      prefill: {
        name: user?.name || "",
        email: user?.email || "",
        contact: user?.mobile || "",
      },
    },
  };
};

const verifyPaymentAndSubscribe = async (userId, body = {}) => {
  const {
    planId,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature,
  } = body;

  if (
    !planId ||
    !razorpayOrderId ||
    !razorpayPaymentId ||
    !razorpaySignature
  ) {
    return {
      status: 400,
      body: { success: false, message: "Missing payment verification fields" },
    };
  }

  if (!mongoose.Types.ObjectId.isValid(planId)) {
    return { status: 400, body: { success: false, message: "Invalid plan ID" } };
  }

  const paymentOrder = await SubscriptionPaymentOrder.findOne({
    userId,
    planId,
    razorpayOrderId,
    status: "created",
  });

  if (!paymentOrder) {
    return {
      status: 404,
      body: { success: false, message: "Payment order not found or already processed" },
    };
  }

  if (paymentOrder.expiresAt && paymentOrder.expiresAt <= new Date()) {
    paymentOrder.status = "expired";
    await paymentOrder.save();
    return {
      status: 400,
      body: { success: false, message: "Payment order expired. Create a new order." },
    };
  }

  const valid = razorpayService.verifyPaymentSignature({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  if (!valid) {
    paymentOrder.status = "failed";
    await paymentOrder.save();
    return {
      status: 400,
      body: { success: false, message: "Payment verification failed" },
    };
  }

  const plan = await SubscriptionPlan.findOne({
    _id: planId,
    isActive: true,
    isFree: false,
  });
  if (!plan) {
    return { status: 404, body: { success: false, message: "Plan not found or inactive" } };
  }

  paymentOrder.status = "paid";
  paymentOrder.razorpayPaymentId = razorpayPaymentId;
  paymentOrder.razorpaySignature = razorpaySignature;
  await paymentOrder.save();

  const subscription = await createSubscriptionForPlan(userId, plan, {
    amountPaid: plan.amount,
    razorpayOrderId,
    razorpayPaymentId,
  });

  return {
    status: 200,
    body: {
      success: true,
      message: "Payment verified. Subscription activated.",
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
  if (subscription.expiresAt <= now || subscription.status !== "active") {
    if (subscription.status === "active") {
      await UserSubscription.findByIdAndUpdate(subscription._id, {
        status: "expired",
      });
    }
    return {
      ok: false,
      status: 403,
      message: "Your subscription has expired. Upgrade to pick en route passengers.",
      code: "SUBSCRIPTION_EXPIRED",
      subscription: formatSubscription(subscription),
    };
  }

  const snapshot = subscription.planSnapshot || {};

  if (isLegacyFreeRidePlan(snapshot)) {
    const rideLimit = snapshot.rideLimit ?? 0;
    const rideKey = normalizeRideId(rideId);
    const usedRideIds = (subscription.usedRideIds || []).map(normalizeRideId);

    if (rideKey && usedRideIds.includes(rideKey)) {
      return { ok: true, subscription, unlimitedPicksPerRide: true };
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

  if (snapshot.unlimitedPicks) {
    return { ok: true, subscription, unlimitedPicks: true };
  }

  const limit = snapshot.enroutePickLimit ?? 0;
  const used = subscription.picksUsed ?? 0;

  if (used >= limit) {
    const upgradeMsg = snapshot.isFree
      ? "Your free plan picks are used up. Upgrade to a paid plan to continue."
      : `You have used all ${limit} en route picks on your current plan. Upgrade or wait for renewal.`;

    return {
      ok: false,
      status: 403,
      message: upgradeMsg,
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

  if (isLegacyFreeRidePlan(snapshot)) {
    const rideKey = normalizeRideId(rideId);
    if (!rideKey) return;

    const usedRideIds = (subscription.usedRideIds || []).map(normalizeRideId);
    if (usedRideIds.includes(rideKey)) return;

    await UserSubscription.findByIdAndUpdate(subscription._id, {
      $addToSet: { usedRideIds: rideKey },
      $inc: { ridesUsed: 1 },
    });
    return;
  }

  if (snapshot.unlimitedPicks) return;

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
    .select("userId planSnapshot picksUsed")
    .lean();

  const eligible = new Set();
  for (const row of activeSubs) {
    const snapshot = row.planSnapshot || {};
    if (isLegacyFreeRidePlan(snapshot)) {
      eligible.add(String(row.userId));
      continue;
    }
    if (snapshot.unlimitedPicks) {
      eligible.add(String(row.userId));
      continue;
    }
    const limit = snapshot.enroutePickLimit ?? 0;
    const used = row.picksUsed ?? 0;
    if (used < limit) {
      eligible.add(String(row.userId));
    }
  }

  return eligible;
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
        const usedFree = await userHasUsedFreePlan(driverId);
        if (usedFree) return;

        const subscription = await ensureDefaultSubscription(driverId);
        const now = new Date();
        const snapshot = subscription?.planSnapshot || {};
        if (
          !subscription ||
          subscription.status !== "active" ||
          subscription.expiresAt <= now
        ) {
          return;
        }

        if (isLegacyFreeRidePlan(snapshot)) {
          eligible.add(String(driverId));
          return;
        }

        if (snapshot.unlimitedPicks) {
          eligible.add(String(driverId));
          return;
        }

        const limit = snapshot.enroutePickLimit ?? 0;
        const used = subscription.picksUsed ?? 0;
        if (used < limit) {
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
  createPaymentOrder,
  verifyPaymentAndSubscribe,
  assertCanPickEnroute,
  recordEnroutePick,
  ensureDefaultSubscription,
  formatSubscription,
  getActiveSubscribedDriverIds,
  getEligibleRelatedRideDriverIds,
  driverHasActiveSubscription,
  userHasUsedFreePlan,
};
