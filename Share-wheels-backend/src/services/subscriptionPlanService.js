const mongoose = require("mongoose");
const SubscriptionPlan = require("../models/subscriptionPlanModel");
const { PERIOD_UNITS } = require("../models/subscriptionPlanModel");

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const stripUndefined = (obj) => {
  const out = {};
  for (const [key, value] of Object.entries(obj || {})) {
    if (value !== undefined) out[key] = value;
  }
  return out;
};

const parsePlanBody = (body = {}, { partial = false } = {}) => {
  const errors = [];
  const data = {};

  if (!partial || body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (!name) errors.push("name is required");
    else data.name = name;
  }

  if (!partial || body.slug !== undefined) {
    const slug = slugify(body.slug || body.name);
    if (!slug) errors.push("slug is required");
    else data.slug = slug;
  }

  if (body.description !== undefined) {
    data.description = String(body.description || "").trim();
  }

  if (body.isFree !== undefined) data.isFree = !!body.isFree;

  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (Number.isNaN(amount) || amount < 0) errors.push("amount must be >= 0");
    else data.amount = amount;
  }

  if (body.currency !== undefined) {
    data.currency = String(body.currency || "INR").trim().toUpperCase() || "INR";
  }

  if (body.periodValue !== undefined) {
    const periodValue = Number(body.periodValue);
    if (!Number.isInteger(periodValue) || periodValue < 1) {
      errors.push("periodValue must be a positive integer");
    } else {
      data.periodValue = periodValue;
    }
  }

  if (body.periodUnit !== undefined) {
    const unit = String(body.periodUnit).trim().toLowerCase();
    if (!PERIOD_UNITS.includes(unit)) {
      errors.push(`periodUnit must be one of: ${PERIOD_UNITS.join(", ")}`);
    } else {
      data.periodUnit = unit;
    }
  }

  if (body.unlimitedPicks !== undefined) {
    data.unlimitedPicks = !!body.unlimitedPicks;
  }

  if (body.enroutePickLimit !== undefined && body.enroutePickLimit !== null) {
    const limit = Number(body.enroutePickLimit);
    if (!Number.isInteger(limit) || limit < 1) {
      errors.push("enroutePickLimit must be a positive integer");
    } else {
      data.enroutePickLimit = limit;
    }
  }

  if (body.isActive !== undefined) data.isActive = !!body.isActive;
  if (body.isDefault !== undefined) data.isDefault = !!body.isDefault;

  const isFree = data.isFree ?? body.isFree;
  const amount = data.amount ?? body.amount;
  if (isFree && amount > 0) {
    errors.push("Free plans must have amount 0");
  }

  return { data, errors };
};

const applyEnroutePickupRules = (data, source = {}) => {
  const unlimitedPicks = !!(data.unlimitedPicks ?? source.unlimitedPicks);
  data.unlimitedPicks = unlimitedPicks;

  if (unlimitedPicks) {
    data.enroutePickLimit = undefined;
    return null;
  }

  const limit = Number(data.enroutePickLimit ?? source.enroutePickLimit);
  if (!Number.isInteger(limit) || limit < 1) {
    return "enroutePickLimit is required when enroute pickups are not unlimited";
  }
  data.enroutePickLimit = limit;
  return null;
};

const validatePlanFields = (data, source = {}, { partial = false } = {}) => {
  const isFree = data.isFree ?? source.isFree;

  const periodValue = Number(data.periodValue ?? source.periodValue);
  if (!Number.isInteger(periodValue) || periodValue < 1) {
    return "periodValue is required";
  }
  data.periodValue = periodValue;

  const unit = String((data.periodUnit ?? source.periodUnit) || "days").toLowerCase();
  if (!PERIOD_UNITS.includes(unit)) {
    return `periodUnit must be one of: ${PERIOD_UNITS.join(", ")}`;
  }
  data.periodUnit = unit;

  const pickupError = applyEnroutePickupRules(data, source);
  if (pickupError) return pickupError;

  if (isFree) {
    data.isFree = true;
    data.amount = 0;
    return null;
  }

  const amount = Number(data.amount ?? source.amount);
  if (Number.isNaN(amount) || amount <= 0) {
    return "amount is required for paid plans";
  }
  data.amount = amount;
  data.isFree = false;

  return null;
};

const buildUpdatePayload = (existing, body) => {
  const { data, errors } = parsePlanBody(body, { partial: true });
  if (errors.length) {
    return { error: errors.join("; ") };
  }

  const source = {
    isFree: existing.isFree,
    amount: existing.amount,
    periodValue: existing.periodValue ?? 30,
    periodUnit: existing.periodUnit ?? "days",
    enroutePickLimit: existing.enroutePickLimit ?? 5,
    unlimitedPicks: !!existing.unlimitedPicks,
    ...data,
  };

  const updateData = { ...data };
  const fieldError = validatePlanFields(updateData, source, { partial: false });
  if (fieldError) {
    return { error: fieldError };
  }

  const $set = stripUndefined(updateData);
  const $unset = {};

  if (updateData.enroutePickLimit === undefined && existing.enroutePickLimit != null) {
    $unset.enroutePickLimit = "";
  }
  if (updateData.unlimitedPicks === true) {
    $unset.enroutePickLimit = "";
  }
  $unset.rideLimit = "";

  return { $set, $unset: Object.keys($unset).length ? $unset : null };
};

const listActivePlans = async () => {
  const plans = await SubscriptionPlan.find({ isActive: true })
    .sort({ isFree: -1, amount: 1, createdAt: -1 })
    .lean();

  return {
    status: 200,
    body: { success: true, count: plans.length, plans },
  };
};

const listAllPlans = async (query = {}) => {
  const filter = {};
  if (query.isActive === "true") filter.isActive = true;
  if (query.isActive === "false") filter.isActive = false;
  if (query.isFree === "true") filter.isFree = true;
  if (query.isFree === "false") filter.isFree = false;

  const plans = await SubscriptionPlan.find(filter)
    .sort({ isFree: -1, amount: 1, createdAt: -1 })
    .lean();

  return {
    status: 200,
    body: { success: true, count: plans.length, plans },
  };
};

const createPlan = async (adminId, body) => {
  const { data, errors } = parsePlanBody(body);
  if (errors.length) {
    return { status: 400, body: { success: false, message: errors.join("; ") } };
  }

  const fieldError = validatePlanFields(data, body);
  if (fieldError) {
    return { status: 400, body: { success: false, message: fieldError } };
  }

  const existing = await SubscriptionPlan.findOne({ slug: data.slug });
  if (existing) {
    return {
      status: 409,
      body: {
        success: false,
        message: `A plan with slug "${data.slug}" already exists (${existing.name}). Edit that plan instead of creating a new one.`,
        existingPlanId: existing._id,
      },
    };
  }

  if (data.isFree) {
    const existingFree = await SubscriptionPlan.findOne({ isFree: true });
    if (existingFree) {
      return {
        status: 409,
        body: {
          success: false,
          message: `A free plan already exists (${existingFree.name}). Edit it to change pick count or duration.`,
          existingPlanId: existingFree._id,
        },
      };
    }
  }

  if (data.isFree) {
    data.isDefault = true;
    await SubscriptionPlan.updateMany({ isDefault: true }, { isDefault: false });
  } else {
    data.isDefault = false;
  }

  const plan = await SubscriptionPlan.create({
    ...stripUndefined(data),
    createdBy: adminId,
  });

  return {
    status: 201,
    body: { success: true, message: "Subscription plan created", plan },
  };
};

const updatePlan = async (id, body) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { status: 400, body: { success: false, message: "Invalid plan ID" } };
  }

  const existing = await SubscriptionPlan.findById(id);
  if (!existing) {
    return { status: 404, body: { success: false, message: "Plan not found" } };
  }

  const built = buildUpdatePayload(existing, body);
  if (built.error) {
    return { status: 400, body: { success: false, message: built.error } };
  }

  if (built.$set.slug) {
    const clash = await SubscriptionPlan.findOne({
      slug: built.$set.slug,
      _id: { $ne: id },
    });
    if (clash) {
      return { status: 409, body: { success: false, message: "Plan slug already exists" } };
    }
  }

  const willBeFree = built.$set.isFree ?? existing.isFree;
  if (willBeFree) {
    built.$set.isDefault = true;
    await SubscriptionPlan.updateMany(
      { isDefault: true, _id: { $ne: id } },
      { isDefault: false }
    );
  } else if (built.$set.isFree === false || existing.isFree) {
    built.$set.isDefault = false;
  }

  const updateQuery = { $set: built.$set };
  if (built.$unset) updateQuery.$unset = built.$unset;

  const plan = await SubscriptionPlan.findByIdAndUpdate(id, updateQuery, {
    new: true,
    runValidators: true,
  });

  return {
    status: 200,
    body: { success: true, message: "Subscription plan updated", plan },
  };
};

const deletePlan = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { status: 400, body: { success: false, message: "Invalid plan ID" } };
  }

  const plan = await SubscriptionPlan.findById(id);
  if (!plan) {
    return { status: 404, body: { success: false, message: "Plan not found" } };
  }

  if (plan.isFree) {
    return {
      status: 400,
      body: {
        success: false,
        message:
          "The free plan cannot be deleted. Edit it to change pick count or duration.",
      },
    };
  }

  await SubscriptionPlan.findByIdAndDelete(id);

  return {
    status: 200,
    body: { success: true, message: "Subscription plan deleted" },
  };
};

module.exports = {
  PERIOD_UNITS,
  listActivePlans,
  listAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
};
