const mongoose = require("mongoose");

const POLICY_TYPES = ["terms", "privacy", "disclaimer"];

const legalPolicySchema = new mongoose.Schema(
  {
    type: { type: String, enum: POLICY_TYPES, required: true, unique: true },
    content: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

legalPolicySchema.index({ type: 1, isActive: 1 });

module.exports = mongoose.model("LegalPolicy", legalPolicySchema);
module.exports.POLICY_TYPES = POLICY_TYPES;

