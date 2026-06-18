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

const buildPlanSnapshot = (plan) => ({
  name: plan.name,
  slug: plan.slug,
  amount: plan.amount,
  currency: plan.currency,
  isFree: plan.isFree,
  enroutePickLimit: plan.enroutePickLimit,
  unlimitedPicks: !!plan.unlimitedPicks,
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
  const isTimeExpired =
    subscription.expiresAt <= now || subscription.status === "expired";
  const unlimited = !!snapshot.unlimitedPicks;
  const limit = snapshot.enroutePickLimit ?? 0;
  const used = subscription.picksUsed ?? 0;
  const remaining = unlimited ? null : Math.max(0, limit - used);
  const picksExhausted = !unlimited && used >= limit;
  const isDeactivated =
    subscription.status !== "active" || isTimeExpired || picksExhausted;
  const isActive = !isDeactivated;

  let deactivationReason = null;
  if (isDeactivated) {
    if (subscription.status === "cancelled") deactivationReason = "cancelled";
    else if (isTimeExpired) deactivationReason = "expired";
    else if (picksExhausted) deactivationReason = "picks_exhausted";
    else deactivationReason = "inactive";
  }

  return {
    id: subscription._id,
    status: subscription.status,
    isFree: !!snapshot.isFree,
    unlimitedPicks: unlimited,
    picksUsed: used,
    enroutePickLimit: unlimited ? null : limit,
    picksRemaining: remaining,
    picksExhausted,
    startsAt: subscription.startsAt,
    expiresAt: subscription.expiresAt,
    isExpired: isTimeExpired,
    isActive,
    isDeactivated,
    deactivationReason,
    plan: snapshot,
    planId: subscription.planId,
    amountPaid: subscription.amountPaid,
  };
};

const syncSubscriptionLifecycle = async (subscription) => {
  if (!subscription?._id || subscription.status !== "active") {
    return subscription;
  }

  const now = new Date();
  const snapshot = subscription.planSnapshot || {};
  const unlimited = !!snapshot.unlimitedPicks;
  const limit = snapshot.enroutePickLimit ?? 0;
  const used = subscription.picksUsed ?? 0;
  const timeExpired = subscription.expiresAt <= now;
  const picksExhausted = !unlimited && used >= limit;

  if (!timeExpired && !picksExhausted) {
    return subscription;
  }

  await UserSubscription.findByIdAndUpdate(subscription._id, {
    $set: { status: "expired" },
  });
  subscription.status = "expired";
  return subscription;
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

  const activeRows = await UserSubscription.find({
    userId,
    status: "active",
    expiresAt: { $gt: now },
  }).select("planSnapshot picksUsed");

  for (const row of activeRows) {
    const snapshot = row.planSnapshot || {};
    if (snapshot.unlimitedPicks) continue;
    const limit = snapshot.enroutePickLimit ?? 0;
    const used = row.picksUsed ?? 0;
    if (used >= limit) {
      await UserSubscription.findByIdAndUpdate(row._id, {
        $set: { status: "expired" },
      });
    }
  }
};

const findUsableActiveSubscription = async (userId) => {
  const now = new Date();
  const candidate = await UserSubscription.findOne({
    userId,
    status: "active",
    expiresAt: { $gt: now },
  }).sort({ expiresAt: -1 });

  if (!candidate) return null;

  await syncSubscriptionLifecycle(candidate);
  const refreshed = await UserSubscription.findById(candidate._id);
  if (!refreshed || refreshed.status !== "active") return null;

  const snapshot = refreshed.planSnapshot || {};
  if (snapshot.unlimitedPicks) return refreshed;

  const limit = snapshot.enroutePickLimit ?? 0;
  const used = refreshed.picksUsed ?? 0;
  if (used < limit) return refreshed;

  await UserSubscription.findByIdAndUpdate(refreshed._id, {
    $set: { status: "expired" },
  });
  return null;
};

const resolveDriverSubscription = async (userId, { autoProvisionFree = false } = {}) => {
  await expireStaleSubscriptions(userId);

  const usable = await findUsableActiveSubscription(userId);
  if (usable) return usable;

  const anyPrior = await UserSubscription.exists({ userId });
  if (!anyPrior && autoProvisionFree) {
    const defaultPlan = await getDefaultPlan();
    if (defaultPlan) {
      return createSubscriptionForPlan(userId, defaultPlan);
    }
  }

  return getLatestSubscription(userId);
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
    startsAt,
    expiresAt,
    amountPaid: amountPaid ?? plan.amount ?? 0,
    razorpayOrderId: razorpayOrderId || undefined,
    razorpayPaymentId: razorpayPaymentId || undefined,
  });
};

const getLatestSubscription = async (userId) =>
  UserSubscription.findOne({ userId }).sort({ createdAt: -1 });

const ensureDefaultSubscription = async (userId) =>
  resolveDriverSubscription(userId, { autoProvisionFree: true });

const getDriverSubscriptionStatus = async (userId) => {
  const subscription = await resolveDriverSubscription(userId, {
    autoProvisionFree: true,
  });
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

/** Admin assigns a plan without Razorpay (complimentary / manual upgrade). */
const adminAssignPlan = async (userId, plan) =>
  createSubscriptionForPlan(userId, plan, {
    amountPaid: plan.isFree ? 0 : plan.amount ?? 0,
  });

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

  if (!Number.isFinite(Number(plan.amount)) || Number(plan.amount) < 1) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Plan price must be at least ₹1 for online payment",
        code: "INVALID_PLAN_AMOUNT",
      },
    };
  }

  await SubscriptionPaymentOrder.updateMany(
    { userId, status: "created" },
    { $set: { status: "expired" } }
  );

  const receipt = `sub_${userId.toString().slice(-6)}_${Date.now()}`.slice(0, 40);
  let order;
  try {
    order = await razorpayService.createOrder({
      amount: plan.amount,
      currency: plan.currency || "INR",
      receipt,
      notes: {
        userId: userId.toString(),
        planId: plan._id.toString(),
        planName: plan.name,
      },
    });
  } catch (err) {
    return {
      status: 502,
      body: {
        success: false,
        message: err?.message || "Could not create Razorpay order. Try again.",
        code: "RAZORPAY_ORDER_FAILED",
      },
    };
  }

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
        amountPaise: order.amount,
        amountInr: plan.amount,
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

  const orderId = String(razorpayOrderId || "").trim();
  const paymentId = String(razorpayPaymentId || "").trim();
  const signature = String(razorpaySignature || "").trim();
  const planIdStr = String(planId || "").trim();

  if (!planIdStr || !orderId || !paymentId || !signature) {
    return {
      status: 400,
      body: { success: false, message: "Missing payment verification fields" },
    };
  }

  if (!mongoose.Types.ObjectId.isValid(planIdStr)) {
    return { status: 400, body: { success: false, message: "Invalid plan ID" } };
  }

  const planObjectId = new mongoose.Types.ObjectId(planIdStr);

  const existingSubscription = await UserSubscription.findOne({
    userId,
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
  }).sort({ createdAt: -1 });

  if (existingSubscription) {
    return {
      status: 200,
      body: {
        success: true,
        message: "Subscription already activated for this payment",
        subscription: formatSubscription(existingSubscription),
      },
    };
  }

  let paymentOrder = await SubscriptionPaymentOrder.findOne({
    userId,
    razorpayOrderId: orderId,
  });

  if (!paymentOrder) {
    return {
      status: 404,
      body: { success: false, message: "Payment order not found" },
    };
  }

  if (String(paymentOrder.planId) !== planIdStr) {
    return {
      status: 400,
      body: { success: false, message: "Plan does not match payment order" },
    };
  }

  if (paymentOrder.status === "paid") {
    const linkedSub = await UserSubscription.findOne({
      userId,
      razorpayOrderId: orderId,
    }).sort({ createdAt: -1 });
    if (linkedSub) {
      return {
        status: 200,
        body: {
          success: true,
          message: "Subscription already activated",
          subscription: formatSubscription(linkedSub),
        },
      };
    }
  }

  if (paymentOrder.status !== "created") {
    return {
      status: 400,
      body: {
        success: false,
        message: "Payment order is no longer valid. Create a new order.",
        code: "ORDER_NOT_OPEN",
      },
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
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: signature,
  });

  if (!valid) {
    paymentOrder.status = "failed";
    await paymentOrder.save();
    return {
      status: 400,
      body: { success: false, message: "Payment verification failed" },
    };
  }

  const expectedAmountPaise = Math.round(Number(paymentOrder.amount) * 100);
  try {
    const paymentCheck = await razorpayService.validateCapturedPayment({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      expectedAmountPaise,
    });
    if (!paymentCheck.ok) {
      paymentOrder.status = "failed";
      await paymentOrder.save();
      return {
        status: 400,
        body: {
          success: false,
          message: "Payment could not be confirmed with Razorpay",
          code: paymentCheck.reason,
        },
      };
    }
  } catch (err) {
    console.warn("[subscription] Razorpay payment fetch failed:", err?.message || err);
    return {
      status: 502,
      body: {
        success: false,
        message: "Could not confirm payment with Razorpay. Try again in a moment.",
        code: "RAZORPAY_VERIFY_FAILED",
      },
    };
  }

  const plan = await SubscriptionPlan.findOne({
    _id: planObjectId,
    isActive: true,
    isFree: false,
  });
  if (!plan) {
    return { status: 404, body: { success: false, message: "Plan not found or inactive" } };
  }

  paymentOrder.status = "paid";
  paymentOrder.razorpayPaymentId = paymentId;
  paymentOrder.razorpaySignature = signature;
  await paymentOrder.save();

  const subscription = await createSubscriptionForPlan(userId, plan, {
    amountPaid: plan.amount,
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
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
  const subscription = await resolveDriverSubscription(userId, {
    autoProvisionFree: true,
  });

  if (!subscription) {
    return {
      ok: false,
      status: 403,
      message:
        "No subscription plan is available. Ask admin to configure driver subscription plans.",
      code: "NO_PLAN",
    };
  }

  const formatted = formatSubscription(subscription);
  if (!formatted?.isActive) {
    const upgradeMsg = formatted?.isFree
      ? "Your free plan is no longer active. Upgrade to a paid plan to continue."
      : formatted?.deactivationReason === "picks_exhausted"
        ? "Your plan pickups are used up. Renew or choose another plan."
        : "Your subscription has expired. Renew or choose another plan.";

    return {
      ok: false,
      status: 403,
      message: upgradeMsg,
      code:
        formatted?.deactivationReason === "picks_exhausted"
          ? "PICK_LIMIT_REACHED"
          : "SUBSCRIPTION_EXPIRED",
      subscription: formatted,
    };
  }

  const snapshot = subscription.planSnapshot || {};

  if (snapshot.unlimitedPicks) {
    return { ok: true, subscription, unlimitedPicks: true };
  }

  const limit = snapshot.enroutePickLimit ?? 0;
  const used = subscription.picksUsed ?? 0;

  if (used >= limit) {
    await UserSubscription.findByIdAndUpdate(subscription._id, {
      $set: { status: "expired" },
    });
    const upgradeMsg = snapshot.isFree
      ? "Your free plan enroute pickups are used up. Upgrade to a paid plan to continue."
      : `You have used all ${limit} enroute pickups on your current plan. Renew or choose another plan.`;

    return {
      ok: false,
      status: 403,
      message: upgradeMsg,
      code: "PICK_LIMIT_REACHED",
      subscription: formatSubscription({
        ...subscription.toObject?.() || subscription,
        status: "expired",
        picksUsed: used,
      }),
    };
  }

  return {
    ok: true,
    subscription,
    remaining: limit - used,
  };
};

const recordEnroutePick = async (userId) => {
  const subscription = await findUsableActiveSubscription(userId);
  if (!subscription) return;

  const snapshot = subscription.planSnapshot || {};
  if (snapshot.unlimitedPicks) return;

  const updated = await UserSubscription.findOneAndUpdate(
    {
      _id: subscription._id,
      status: "active",
    },
    { $inc: { picksUsed: 1 } },
    { new: true }
  );
  if (!updated) return;

  const limit = snapshot.enroutePickLimit ?? 0;
  if ((updated.picksUsed ?? 0) >= limit) {
    await UserSubscription.findByIdAndUpdate(updated._id, {
      $set: { status: "expired" },
    });
  }
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

        const subscription = await resolveDriverSubscription(driverId, {
          autoProvisionFree: true,
        });
        const now = new Date();
        const snapshot = subscription?.planSnapshot || {};
        if (
          !subscription ||
          subscription.status !== "active" ||
          subscription.expiresAt <= now
        ) {
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
  adminAssignPlan,
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
