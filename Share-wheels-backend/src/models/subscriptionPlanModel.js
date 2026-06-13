const mongoose = require("mongoose");

const PERIOD_UNITS = ["days", "months"];

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: { type: String, trim: true, default: "" },
    isFree: { type: Boolean, default: false },
    amount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR", trim: true },
    periodValue: { type: Number, min: 1 },
    periodUnit: { type: String, enum: PERIOD_UNITS },
    /** Paid plans — max enroute picks per billing period */
    enroutePickLimit: { type: Number, min: 1 },
    /** Free plan — how many rides can use unlimited enroute picking */
    rideLimit: { type: Number, min: 1 },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

subscriptionPlanSchema.index({ isActive: 1, isFree: 1 });

module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
module.exports.PERIOD_UNITS = PERIOD_UNITS;
