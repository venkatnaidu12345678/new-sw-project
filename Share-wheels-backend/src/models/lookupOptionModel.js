const mongoose = require("mongoose");

const CATEGORIES = ["courier_type", "vehicle_type"];

const lookupOptionSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: CATEGORIES,
    },
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true, lowercase: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

lookupOptionSchema.index({ category: 1, value: 1 }, { unique: true });
lookupOptionSchema.index({ category: 1, isActive: 1, sortOrder: 1 });

module.exports = mongoose.model("LookupOption", lookupOptionSchema);
module.exports.LOOKUP_CATEGORIES = CATEGORIES;
