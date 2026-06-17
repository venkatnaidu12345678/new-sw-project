const SubscriptionPlan = require("../models/subscriptionPlanModel");

const ensureDefaultSubscriptionPlan = async () => {
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
    if (!existing.periodValue) {
      existing.periodValue = 30;
      changed = true;
    }
    if (!existing.periodUnit) {
      existing.periodUnit = "days";
      changed = true;
    }
    if (!existing.enroutePickLimit && !existing.rideLimit) {
      existing.enroutePickLimit = 5;
      changed = true;
    }
    if (existing.rideLimit && !existing.enroutePickLimit) {
      existing.enroutePickLimit = existing.rideLimit * 3;
      changed = true;
    }
    existing.unlimitedPicks = false;
    if (changed) await existing.save();
    return existing;
  }

  await SubscriptionPlan.updateMany({ isDefault: true }, { isDefault: false });

  const plan = await SubscriptionPlan.create({
    name: "Free Plan",
    slug: "free",
    description:
      "Try en route picking with a limited number of picks during your trial period.",
    isFree: true,
    amount: 0,
    currency: "INR",
    periodValue: 30,
    periodUnit: "days",
    enroutePickLimit: 5,
    unlimitedPicks: false,
    isActive: true,
    isDefault: true,
  });

  console.log("Default subscription plan seeded:", plan.name);
  return plan;
};

module.exports = { ensureDefaultSubscriptionPlan };
