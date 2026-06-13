const SubscriptionPlan = require("../models/subscriptionPlanModel");

const ensureDefaultSubscriptionPlan = async () => {
  // Only the free plan may be default for new drivers.
  await SubscriptionPlan.updateMany(
    { isFree: { $ne: true } },
    { $set: { isDefault: false } }
  );

  const existing = await SubscriptionPlan.findOne({ slug: "free" });
  if (existing) {
    let changed = false;
    if (!existing.isFree) {
      existing.isFree = true;
      existing.amount = 0;
      changed = true;
    }
    if (!existing.isDefault) {
      await SubscriptionPlan.updateMany(
        { isDefault: true, _id: { $ne: existing._id } },
        { isDefault: false }
      );
      existing.isDefault = true;
      changed = true;
    }
    if (!existing.rideLimit) {
      existing.rideLimit = 3;
      changed = true;
    }
    if (existing.enroutePickLimit) {
      existing.enroutePickLimit = undefined;
      changed = true;
    }
    if (changed) await existing.save();
    return existing;
  }

  await SubscriptionPlan.updateMany({ isDefault: true }, { isDefault: false });

  const plan = await SubscriptionPlan.create({
    name: "Free Plan",
    slug: "free",
    description:
      "Pick unlimited en route passengers and couriers on a limited number of your rides.",
    isFree: true,
    amount: 0,
    currency: "INR",
    rideLimit: 3,
    isActive: true,
    isDefault: true,
  });

  console.log("Default subscription plan seeded:", plan.name);
  return plan;
};

module.exports = { ensureDefaultSubscriptionPlan };
