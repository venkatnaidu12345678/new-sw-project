const mongoose = require("mongoose");

const AD_TYPES = ["banner", "video", "native"];
const AD_PLACEMENTS = [
  "home_banner",
  "home_video",
  "home_native",
  "search_results",
  "ride_history",
  "profile",
];

const adSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: AD_TYPES,
      required: true,
    },
    title: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    /** Banner image / native image / video file URL */
    mediaUrl: { type: String, required: true },
    /** Video poster thumbnail */
    posterUrl: { type: String, default: "" },
    ctaLabel: { type: String, trim: true, default: "Learn more" },
    ctaUrl: { type: String, trim: true, default: "" },
    placement: {
      type: String,
      enum: AD_PLACEMENTS,
      required: true,
    },
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

adSchema.index({ placement: 1, isActive: 1, priority: -1 });

module.exports = mongoose.model("Ad", adSchema);
module.exports.AD_TYPES = AD_TYPES;
module.exports.AD_PLACEMENTS = AD_PLACEMENTS;
