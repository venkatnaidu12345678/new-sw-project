const mongoose = require("mongoose");
const VehicleFare = require("../models/vehicleFareModel");
const {
  ALLOWED_VEHICLE_TYPES,
  isAllowedVehicleType,
  normalizeAllowedVehicleType,
  vehicleTypeCandidates,
} = require("../constants/vehicleTypes");

const normalizeVehicleType = (value) => normalizeAllowedVehicleType(value) || "";

const resolveActiveFareConfig = async (vehicleType) => {
  for (const type of vehicleTypeCandidates(vehicleType)) {
    const config = await VehicleFare.findOne({ vehicleType: type, isActive: true }).lean();
    if (config) return config;
  }
  return null;
};

const parseKm = (value, fallback = null) => {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const parsePrice = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const normalizePricingType = (value) => {
  const type = String(value || "per_seat").trim().toLowerCase();
  return type === "per_km" ? "per_km" : "per_seat";
};

const computeTierPricePerSeat = (tier, distanceKm) => {
  const km = Number(distanceKm);
  const rate = Number(tier.pricePerSeat) || 0;
  if (!Number.isFinite(km) || km <= 0 || rate <= 0) return 0;
  // Ride fare = ₹/km rate × total route distance (flat tiers pick the rate band only).
  return Math.max(1, Math.round(rate * km));
};

/** Per-km tiers stack: 0–10 @ ₹10/km + remainder @ ₹5/km, etc. */
const computeProgressivePerKmFare = (tiers, distanceKm) => {
  const km = Number(distanceKm);
  if (!Number.isFinite(km) || km <= 0) return null;

  const sorted = [...(tiers || [])]
    .filter((t) => normalizePricingType(t.pricingType) === "per_km")
    .sort((a, b) => a.minKm - b.minKm);

  if (!sorted.length) return null;

  if (sorted.length === 1) {
    const tier = sorted[0];
    const start = Number(tier.minKm) || 0;
    if (km < start) return null;
    const rate = Number(tier.pricePerSeat) || 0;
    const amount = rate * km;
    return {
      pricePerSeat: Math.max(1, Math.round(amount)),
      segments: [
        {
          minKm: start,
          maxKm: tier.maxKm ?? null,
          rate,
          km: Math.round(km * 100) / 100,
          amount: Math.round(amount * 100) / 100,
          pricingType: "per_km",
        },
      ],
      pricingType: "per_km",
      progressive: false,
      minKm: start,
      maxKm: tier.maxKm ?? null,
      rate,
    };
  }

  let total = 0;
  const segments = [];

  for (const tier of sorted) {
    const start = Number(tier.minKm) || 0;
    if (km <= start) break;

    const tierCap = tier.maxKm == null ? km : Number(tier.maxKm);
    const segmentEnd = Math.min(km, tierCap);
    const kmInSegment = Math.max(0, segmentEnd - start);
    if (kmInSegment <= 0) continue;

    const rate = Number(tier.pricePerSeat) || 0;
    const amount = rate * kmInSegment;
    total += amount;
    segments.push({
      minKm: start,
      maxKm: tier.maxKm ?? null,
      rate,
      km: Math.round(kmInSegment * 100) / 100,
      amount: Math.round(amount * 100) / 100,
      pricingType: "per_km",
    });
  }

  if (!segments.length) return null;

  const first = segments[0];
  const last = segments[segments.length - 1];

  return {
    pricePerSeat: Math.max(1, Math.round(total)),
    segments,
    pricingType: "per_km",
    progressive: segments.length > 1,
    minKm: first.minKm,
    maxKm: last.maxKm ?? null,
    rate: last.rate,
  };
};

const allTiersArePerKm = (tiers) =>
  (tiers || []).length > 0 &&
  (tiers || []).every((t) => normalizePricingType(t.pricingType) === "per_km");

const normalizeTiers = (rawTiers = []) => {  if (!Array.isArray(rawTiers)) {
    return { ok: false, message: "tiers must be an array" };
  }

  const tiers = rawTiers
    .map((tier) => {
      const minKm = parseKm(tier?.minKm, 0);
      const maxKm =
        tier?.maxKm === null || tier?.maxKm === undefined || tier?.maxKm === ""
          ? null
          : parseKm(tier?.maxKm);
      const pricePerSeat = parsePrice(tier?.pricePerSeat);

      if (minKm == null || pricePerSeat == null) return null;
      if (maxKm != null && maxKm < minKm) return null;

      return {
        minKm,
        maxKm,
        pricePerSeat,
        pricingType: normalizePricingType(tier?.pricingType),
      };    })
    .filter(Boolean)
    .sort((a, b) => a.minKm - b.minKm);

  for (let i = 0; i < tiers.length; i += 1) {
    const tier = tiers[i];
    if (tier.pricePerSeat <= 0) {
      return { ok: false, message: "Each tier price must be greater than 0" };
    }
    if (i > 0) {
      const prev = tiers[i - 1];
      if (prev.maxKm == null) {
        return {
          ok: false,
          message: "Only the last tier can be open-ended (leave max km empty on the final tier only).",
        };
      }
      // Touching ranges are OK (e.g. 0–10 then 10–20); only reject true overlap.
      if (tier.minKm < prev.maxKm) {
        return {
          ok: false,
          message: "Distance tiers must not overlap. Adjust min/max km ranges.",
        };
      }
    }
  }

  const allPerKm = tiers.every((t) => normalizePricingType(t.pricingType) === "per_km");
  if (allPerKm && tiers.length > 1 && tiers[tiers.length - 1].maxKm != null) {
    return {
      ok: false,
      message:
        'For stacked per-km tiers, the last tier must be "if more" (leave max km empty) so longer routes are priced.',
    };
  }

  return { ok: true, tiers };
};

const serializeFare = (doc) => {
  if (!doc) return null;
  const row = doc.toObject ? doc.toObject() : doc;
  return {
    _id: row._id,
    vehicleType: row.vehicleType,
    vehicleLabel: row.vehicleLabel || "",
    tiers: (row.tiers || []).map((tier) => ({
      _id: tier._id,
      minKm: tier.minKm,
      maxKm: tier.maxKm ?? null,
      pricePerSeat: tier.pricePerSeat,
      pricingType: normalizePricingType(tier.pricingType),
    })),    isActive: row.isActive !== false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

const findTierForDistance = (tiers, distanceKm) => {
  const km = Number(distanceKm);
  if (!Number.isFinite(km) || km < 0) return null;

  return (tiers || []).find((tier) => {
    const minKm = Number(tier.minKm) || 0;
    const maxKm = tier.maxKm == null ? null : Number(tier.maxKm);
    if (km < minKm) return false;
    if (maxKm == null) return true;
    return km <= maxKm;
  });
};

const attachQuotePrice = (quote) => {
  if (!quote) return null;
  const price = quote.pricePerSeat ?? quote.price;
  return { ...quote, price, pricePerSeat: price };
};

const quoteFareForVehicle = (config, distanceKm) => {
  if (!config || config.isActive === false) return null;
  const tiers = config.tiers || [];
  const km = Number(distanceKm);

  if (allTiersArePerKm(tiers)) {
    const progressive = computeProgressivePerKmFare(tiers, km);
    if (!progressive) return null;

    return attachQuotePrice({
      vehicleType: config.vehicleType,
      vehicleLabel: config.vehicleLabel || config.vehicleType,
      distanceKm: km,
      minKm: progressive.minKm,
      maxKm: progressive.maxKm ?? null,
      pricingType: "per_km",
      rate: progressive.rate,
      pricePerSeat: progressive.pricePerSeat,
      progressive: progressive.progressive,
      segments: progressive.segments,
    });
  }

  const tier = findTierForDistance(tiers, km);
  if (!tier) return null;

  const rate = Number(tier.pricePerSeat) || 0;
  const computedPrice = computeTierPricePerSeat(tier, km);

  return attachQuotePrice({
    vehicleType: config.vehicleType,
    vehicleLabel: config.vehicleLabel || config.vehicleType,
    distanceKm: km,
    minKm: tier.minKm,
    maxKm: tier.maxKm ?? null,
    pricingType: "per_km",
    rate,
    pricePerSeat: computedPrice,
    progressive: false,
    segments: [
      {
        minKm: tier.minKm,
        maxKm: tier.maxKm ?? null,
        rate: tier.pricePerSeat,
        km: Math.round(km * 100) / 100,
        amount: computedPrice,
        pricingType: "per_km",
      },
    ],
  });
};
const listAllFares = async (query = {}) => {
  const filter = {};
  if (query.isActive === "true") filter.isActive = true;
  if (query.isActive === "false") filter.isActive = false;

  const fares = await VehicleFare.find(filter).sort({ vehicleType: 1 }).lean();
  return {
    status: 200,
    body: {
      success: true,
      fares: fares.map(serializeFare),
      count: fares.length,
    },
  };
};

const listActiveFares = async () => {
  const fares = await VehicleFare.find({ isActive: true }).sort({ vehicleType: 1 }).lean();
  return fares.map(serializeFare);
};

const createFare = async (adminId, body = {}) => {
  const vehicleType = normalizeVehicleType(body.vehicleType);
  if (!vehicleType) {
    return {
      status: 400,
      body: {
        success: false,
        message: `vehicleType is required and must be one of: ${ALLOWED_VEHICLE_TYPES.join(", ")}`,
      },
    };
  }

  const existing = await VehicleFare.findOne({ vehicleType });
  if (existing) {
    return {
      status: 409,
      body: {
        success: false,
        message: "Fare rules for this vehicle type already exist. Edit the existing entry.",
      },
    };
  }

  const tierResult = normalizeTiers(body.tiers);
  if (!tierResult.ok) {
    return { status: 400, body: { success: false, message: tierResult.message } };
  }
  if (!tierResult.tiers.length) {
    return { status: 400, body: { success: false, message: "Add at least one distance price tier" } };
  }

  const fare = await VehicleFare.create({
    vehicleType,
    vehicleLabel: String(body.vehicleLabel || body.vehicleType || "").trim(),
    tiers: tierResult.tiers,
    isActive: body.isActive !== false,
    createdBy: adminId,
  });

  return {
    status: 201,
    body: { success: true, fare: serializeFare(fare) },
  };
};

const updateFare = async (id, body = {}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { status: 400, body: { success: false, message: "Invalid fare ID" } };
  }

  const fare = await VehicleFare.findById(id);
  if (!fare) {
    return { status: 404, body: { success: false, message: "Fare config not found" } };
  }

  if (body.vehicleLabel != null) {
    fare.vehicleLabel = String(body.vehicleLabel || "").trim();
  }
  if (body.isActive != null) fare.isActive = !!body.isActive;

  if (body.tiers != null) {
    const tierResult = normalizeTiers(body.tiers);
    if (!tierResult.ok) {
      return { status: 400, body: { success: false, message: tierResult.message } };
    }
    if (!tierResult.tiers.length) {
      return { status: 400, body: { success: false, message: "Add at least one distance price tier" } };
    }
    fare.tiers = tierResult.tiers;
  }

  await fare.save();
  return {
    status: 200,
    body: { success: true, fare: serializeFare(fare) },
  };
};

const deleteFare = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { status: 400, body: { success: false, message: "Invalid fare ID" } };
  }

  const fare = await VehicleFare.findByIdAndDelete(id);
  if (!fare) {
    return { status: 404, body: { success: false, message: "Fare config not found" } };
  }

  return { status: 200, body: { success: true, message: "Fare config deleted" } };
};

const quoteFare = async ({ vehicleType, distanceKm, distanceMeters } = {}) => {
  const type = normalizeVehicleType(vehicleType);
  if (!type) {
    return { status: 400, body: { success: false, message: "vehicleType is required" } };
  }

  let km = parseKm(distanceKm);
  const meters = Number(distanceMeters);
  if (km == null && Number.isFinite(meters) && meters >= 0) {
    km = meters / 1000;
  }
  if (km == null) {
    return { status: 400, body: { success: false, message: "distanceKm or distanceMeters is required" } };
  }

  const config = await resolveActiveFareConfig(type);
  if (!config) {
    return {
      status: 404,
      body: {
        success: false,
        message: "No fare rules configured for this vehicle type",
      },
    };
  }

  const quote = quoteFareForVehicle(config, km);
  if (!quote) {
    return {
      status: 404,
      body: {
        success: false,
        message: "No fare tier matches this route distance",
        distanceKm: km,
      },
    };
  }

  return {
    status: 200,
    body: { success: true, quote },
  };
};

const getFareRulesForVehicle = async (vehicleType) => {
  const type = normalizeVehicleType(vehicleType);
  if (!type) {
    return { status: 400, body: { success: false, message: "vehicleType is required" } };
  }

  const config = await resolveActiveFareConfig(type);
  if (!config) {
    return {
      status: 404,
      body: { success: false, message: "No fare rules configured for this vehicle type" },
    };
  }

  return {
    status: 200,
    body: { success: true, fare: serializeFare(config) },
  };
};

module.exports = {
  listAllFares,
  listActiveFares,
  createFare,
  updateFare,
  deleteFare,
  quoteFare,
  quoteFareForVehicle,
  resolveActiveFareConfig,
  vehicleTypeCandidates,
  getFareRulesForVehicle,
  findTierForDistance,
  normalizeTiers,
  normalizePricingType,
  computeTierPricePerSeat,
  computeProgressivePerKmFare,
  allTiersArePerKm,
  PRICING_TYPES: ["per_seat", "per_km"],
};