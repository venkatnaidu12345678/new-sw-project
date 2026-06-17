const mongoose = require("mongoose");

const PAYMENT_STATUSES = ["created", "paid", "failed", "expired"];

const subscriptionPaymentOrderSchema = new mongoose.Schema(
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
    razorpayOrderId: { type: String, required: true, unique: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", trim: true },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "created",
    },
    razorpayPaymentId: { type: String, trim: true },
    razorpaySignature: { type: String, trim: true },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

subscriptionPaymentOrderSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model(
  "SubscriptionPaymentOrder",
  subscriptionPaymentOrderSchema
);
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
