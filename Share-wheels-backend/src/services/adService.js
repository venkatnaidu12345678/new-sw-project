const mongoose = require("mongoose");
const Ad = require("../models/adModel");
const { AD_TYPES, AD_PLACEMENTS } = require("../models/adModel");
const { uploadImageBuffer, uploadVideoBuffer, resolveFolder } = require("../config/cloudinary");
const {
  isAdVisibleOnMobile,
  validateAdFields,
} = require("../utils/adPlacementRules");

const parseScheduleDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const isScheduledActive = (ad, now = new Date()) => {
  if (!ad.isActive) return false;
  const startsAt = parseScheduleDate(ad.startsAt);
  const endsAt = parseScheduleDate(ad.endsAt);
  if (startsAt && startsAt > now) return false;
  if (endsAt && endsAt < now) return false;
  return true;
};

const listActiveAds = async (query = {}) => {
  const { placement, type } = query;
  const filter = { isActive: true };
  if (placement) filter.placement = placement;
  if (type) filter.type = type;

  const now = new Date();
  const ads = await Ad.find(filter).sort({ priority: -1, createdAt: -1 }).lean();

  const active = ads.filter((ad) => isScheduledActive(ad, now));

  const visible = active.filter(isAdVisibleOnMobile);

  return {
    status: 200,
    body: { success: true, count: visible.length, ads: visible },
  };
};

const listAllAds = async (query = {}) => {
  const filter = {};
  if (query.placement) filter.placement = query.placement;
  if (query.type) filter.type = query.type;
  if (query.isActive === "true") filter.isActive = true;
  if (query.isActive === "false") filter.isActive = false;

  const ads = await Ad.find(filter).sort({ priority: -1, createdAt: -1 }).lean();
  return { status: 200, body: { success: true, count: ads.length, ads } };
};

const createAd = async (adminId, body) => {
  const {
    type,
    title,
    description,
    mediaUrl,
    posterUrl,
    ctaLabel,
    ctaUrl,
    placement,
    priority,
    isActive,
    startsAt,
    endsAt,
  } = body;

  if (!AD_TYPES.includes(type)) {
    return { status: 400, body: { success: false, message: "Invalid ad type" } };
  }
  if (!AD_PLACEMENTS.includes(placement)) {
    return { status: 400, body: { success: false, message: "Invalid placement" } };
  }
  if (!mediaUrl?.trim()) {
    return { status: 400, body: { success: false, message: "mediaUrl is required" } };
  }

  const validationError = validateAdFields({ type, placement, mediaUrl });
  if (validationError) {
    return { status: 400, body: { success: false, message: validationError.message } };
  }

  const ad = await Ad.create({
    type,
    title: title || "",
    description: description || "",
    mediaUrl: mediaUrl.trim(),
    posterUrl: posterUrl?.trim() || "",
    ctaLabel: ctaLabel || "Learn more",
    ctaUrl: ctaUrl?.trim() || "",
    placement,
    priority: Number(priority) || 0,
    isActive: isActive !== false,
    startsAt: startsAt ? parseScheduleDate(startsAt) : undefined,
    endsAt: endsAt ? parseScheduleDate(endsAt) : undefined,
    createdBy: adminId,
  });

  return { status: 201, body: { success: true, message: "Ad created", ad } };
};

const updateAd = async (id, body) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { status: 400, body: { success: false, message: "Invalid ad ID" } };
  }
  const allowed = [
    "type",
    "title",
    "description",
    "mediaUrl",
    "posterUrl",
    "ctaLabel",
    "ctaUrl",
    "placement",
    "priority",
    "isActive",
    "startsAt",
    "endsAt",
  ];
  const update = {};
  allowed.forEach((key) => {
    if (body[key] !== undefined) update[key] = body[key];
  });
  if (update.type && !AD_TYPES.includes(update.type)) {
    return { status: 400, body: { success: false, message: "Invalid ad type" } };
  }
  if (update.placement && !AD_PLACEMENTS.includes(update.placement)) {
    return { status: 400, body: { success: false, message: "Invalid placement" } };
  }
  if (update.startsAt !== undefined) {
    update.startsAt = update.startsAt ? parseScheduleDate(update.startsAt) : null;
  }
  if (update.endsAt !== undefined) {
    update.endsAt = update.endsAt ? parseScheduleDate(update.endsAt) : null;
  }
  if (update.priority !== undefined) update.priority = Number(update.priority) || 0;

  const existing = await Ad.findById(id).lean();
  if (!existing) return { status: 404, body: { success: false, message: "Ad not found" } };

  const merged = {
    type: update.type ?? existing.type,
    placement: update.placement ?? existing.placement,
    mediaUrl: update.mediaUrl ?? existing.mediaUrl,
  };
  const validationError = validateAdFields(merged);
  if (validationError) {
    return { status: 400, body: { success: false, message: validationError.message } };
  }

  const ad = await Ad.findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: true });
  if (!ad) return { status: 404, body: { success: false, message: "Ad not found" } };
  return { status: 200, body: { success: true, message: "Ad updated", ad } };
};

const deleteAd = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { status: 400, body: { success: false, message: "Invalid ad ID" } };
  }
  const ad = await Ad.findByIdAndDelete(id);
  if (!ad) return { status: 404, body: { success: false, message: "Ad not found" } };
  return { status: 200, body: { success: true, message: "Ad deleted" } };
};

const recordClick = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { status: 400, body: { success: false, message: "Invalid ad ID" } };
  }
  const ad = await Ad.findByIdAndUpdate(id, { $inc: { clicks: 1 } }, { returnDocument: "after" });
  if (!ad) return { status: 404, body: { success: false, message: "Ad not found" } };
  return { status: 200, body: { success: true } };
};

const recordImpression = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { status: 400, body: { success: false, message: "Invalid ad ID" } };
  }
  await Ad.findByIdAndUpdate(id, { $inc: { impressions: 1 } });
  return { status: 200, body: { success: true } };
};

const uploadAdMedia = async (file, mediaType = "image") => {
  if (!file?.buffer?.length) {
    return { status: 400, body: { success: false, message: "No file provided" } };
  }
  const folder = resolveFolder("ads");
  try {
    if (mediaType === "video") {
      const result = await uploadVideoBuffer(file.buffer, folder);
      return {
        status: 200,
        body: {
          success: true,
          url: result.url,
          posterUrl: result.posterUrl,
          mediaType: "video",
        },
      };
    }
    const url = await uploadImageBuffer(file.buffer, folder);
    return { status: 200, body: { success: true, url, mediaType: "image" } };
  } catch (err) {
    return { status: 500, body: { success: false, message: err.message || "Upload failed" } };
  }
};

module.exports = {
  listActiveAds,
  listAllAds,
  createAd,
  updateAd,
  deleteAd,
  recordClick,
  recordImpression,
  uploadAdMedia,
  AD_TYPES,
  AD_PLACEMENTS,
};
