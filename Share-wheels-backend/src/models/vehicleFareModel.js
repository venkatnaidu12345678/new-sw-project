const mongoose = require("mongoose");

const PRICING_TYPES = ["per_seat", "per_km"];

const fareTierSchema = new mongoose.Schema(
  {
    minKm: { type: Number, required: true, min: 0 },
    /** Inclusive upper bound; omit or null for open-ended (e.g. 50+ km). */
    maxKm: { type: Number, min: 0, default: null },
    /** Flat ride fare, or ₹ per km when pricingType is per_km. */
    pricePerSeat: { type: Number, required: true, min: 0 },
    pricingType: {
      type: String,
      enum: PRICING_TYPES,
      default: "per_seat",
    },
  },
  { _id: true }
);
const vehicleFareSchema = new mongoose.Schema(
  {
    vehicleType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    vehicleLabel: { type: String, trim: true, default: "" },
    tiers: { type: [fareTierSchema], default: [] },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

vehicleFareSchema.index({ isActive: 1, vehicleType: 1 });

module.exports = mongoose.model("VehicleFare", vehicleFareSchema);
module.exports.PRICING_TYPES = PRICING_TYPES;