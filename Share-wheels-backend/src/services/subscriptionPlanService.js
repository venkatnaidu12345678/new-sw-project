const mongoose = require("mongoose");
const SubscriptionPlan = require("../models/subscriptionPlanModel");
const { PERIOD_UNITS } = require("../models/subscriptionPlanModel");

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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

  if (body.enroutePickLimit !== undefined) {
    const limit = Number(body.enroutePickLimit);
    if (!Number.isInteger(limit) || limit < 1) {
      errors.push("enroutePickLimit must be a positive integer");
    } else {
      data.enroutePickLimit = limit;
    }
  }

  if (body.rideLimit !== undefined) {
    const limit = Number(body.rideLimit);
    if (!Number.isInteger(limit) || limit < 1) {
      errors.push("rideLimit must be a positive integer");
    } else {
      data.rideLimit = limit;
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

const validatePlanFields = (data, body, { partial = false } = {}) => {
  const isFree = data.isFree ?? body.isFree;

  if (isFree) {
    data.isFree = true;
    data.amount = 0;
    if (!partial || data.rideLimit !== undefined || body.rideLimit !== undefined) {
      const rideLimit = Number(data.rideLimit ?? body.rideLimit);
      if (!Number.isInteger(rideLimit) || rideLimit < 1) {
        return "rideLimit is required for free plans";
      }
      data.rideLimit = rideLimit;
    }
    data.enroutePickLimit = undefined;
    data.periodValue = undefined;
    data.periodUnit = undefined;
    return null;
  }

  if (!partial || data.amount !== undefined || body.amount !== undefined) {
    const amount = Number(data.amount ?? body.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      return "amount is required for paid plans";
    }
    data.amount = amount;
  }

  if (!partial || data.periodValue !== undefined || body.periodValue !== undefined) {
    const periodValue = Number(data.periodValue ?? body.periodValue);
    if (!Number.isInteger(periodValue) || periodValue < 1) {
      return "periodValue is required for paid plans";
    }
    data.periodValue = periodValue;
  }

  if (!partial || data.periodUnit !== undefined || body.periodUnit !== undefined) {
    const unit = String((data.periodUnit ?? body.periodUnit) || "days").toLowerCase();
    if (!PERIOD_UNITS.includes(unit)) {
      return `periodUnit must be one of: ${PERIOD_UNITS.join(", ")}`;
    }
    data.periodUnit = unit;
  }

  if (
    !partial ||
    data.enroutePickLimit !== undefined ||
    body.enroutePickLimit !== undefined
  ) {
    const limit = Number(data.enroutePickLimit ?? body.enroutePickLimit);
    if (!Number.isInteger(limit) || limit < 1) {
      return "enroutePickLimit is required for paid plans";
    }
    data.enroutePickLimit = limit;
  }

  data.rideLimit = undefined;
  return null;
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
          message: `A free plan already exists (${existingFree.name}). Edit it to change ride count or description.`,
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
    ...data,
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

  const { data, errors } = parsePlanBody(body, { partial: true });
  if (errors.length) {
    return { status: 400, body: { success: false, message: errors.join("; ") } };
  }

  const merged = {
    isFree: data.isFree ?? existing.isFree,
    amount: data.amount ?? existing.amount,
    periodValue: data.periodValue ?? existing.periodValue,
    periodUnit: data.periodUnit ?? existing.periodUnit,
    enroutePickLimit: data.enroutePickLimit ?? existing.enroutePickLimit,
    rideLimit: data.rideLimit ?? existing.rideLimit,
  };

  const fieldError = validatePlanFields(
    { ...data, ...merged },
    { ...body, ...merged },
    { partial: false }
  );
  if (fieldError) {
    return { status: 400, body: { success: false, message: fieldError } };
  }

  if (data.slug) {
    const clash = await SubscriptionPlan.findOne({
      slug: data.slug,
      _id: { $ne: id },
    });
    if (clash) {
      return { status: 409, body: { success: false, message: "Plan slug already exists" } };
    }
  }

  const willBeFree = merged.isFree;
  if (willBeFree) {
    data.isDefault = true;
    await SubscriptionPlan.updateMany(
      { isDefault: true, _id: { $ne: id } },
      { isDefault: false }
    );
  } else {
    data.isDefault = false;
  }

  const plan = await SubscriptionPlan.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  );

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
          "The free plan cannot be deleted. Edit it to change ride count or description.",
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
