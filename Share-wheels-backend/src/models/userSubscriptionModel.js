const mongoose = require("mongoose");

const SUBSCRIPTION_STATUSES = ["active", "expired", "cancelled"];

const userSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true,
    },
    planSnapshot: {
      name: String,
      slug: String,
      amount: Number,
      currency: String,
      isFree: Boolean,
      enroutePickLimit: Number,
      unlimitedPicks: Boolean,
      periodValue: Number,
      periodUnit: String,
      description: String,
    },
    razorpayOrderId: { type: String, trim: true },
    razorpayPaymentId: { type: String, trim: true },
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: "active",
    },
    picksUsed: { type: Number, default: 0, min: 0 },
    startsAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    amountPaid: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

userSubscriptionSchema.index({ userId: 1, status: 1, expiresAt: -1 });

module.exports = mongoose.model("UserSubscription", userSubscriptionSchema);
module.exports.SUBSCRIPTION_STATUSES = SUBSCRIPTION_STATUSES;
