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
    /** Max enroute picks per billing period (free and paid). Ignored when unlimitedPicks is true. */
    enroutePickLimit: { type: Number, min: 1 },
    /** When true, driver may pick unlimited enroute passengers/couriers during the plan period. */
    unlimitedPicks: { type: Boolean, default: false },
    /** @deprecated Legacy free plan — rides with unlimited picks per ride. Kept for old snapshots. */
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
