const normalizePricingType = (value) =>
  String(value || "per_seat").trim().toLowerCase() === "per_km" ? "per_km" : "per_seat";

const findTierForDistance = (tiers, distanceKm) => {
  const km = Number(distanceKm);
  if (!Number.isFinite(km) || km < 0) return null;
  return (tiers || []).find((tier) => {
    const minKm = Number(tier.minKm) || 0;
    const maxKm = tier.maxKm == null || tier.maxKm === "" ? null : Number(tier.maxKm);
    if (km < minKm) return false;
    if (maxKm == null) return true;
    return km <= maxKm;
  });
};

const computeProgressivePerKmFare = (tiers, distanceKm) => {
  const km = Number(distanceKm);
  if (!Number.isFinite(km) || km <= 0) return null;

  const sorted = [...(tiers || [])]
    .filter((t) => normalizePricingType(t.pricingType) === "per_km")
    .sort((a, b) => Number(a.minKm) - Number(b.minKm));

  if (!sorted.length) return null;

  if (sorted.length === 1) {
    const tier = sorted[0];
    const start = Number(tier.minKm) || 0;
    if (km < start) return null;
    const rate = Number(tier.pricePerSeat) || 0;
    const amount = rate * km;
    return {
      price: Math.max(1, Math.round(amount)),
      pricingType: "per_km",
      rate,
      progressive: false,
      segments: [
        {
          minKm: start,
          maxKm: tier.maxKm ?? null,
          rate,
          km: Math.round(km * 100) / 100,
          pricingType: "per_km",
        },
      ],
      minKm: start,
      maxKm: tier.maxKm ?? null,
    };
  }

  let total = 0;
  const segments = [];

  for (const tier of sorted) {
    const start = Number(tier.minKm) || 0;
    if (km <= start) break;
    const tierCap = tier.maxKm == null || tier.maxKm === "" ? km : Number(tier.maxKm);
    const segmentEnd = Math.min(km, tierCap);
    const kmInSegment = Math.max(0, segmentEnd - start);
    if (kmInSegment <= 0) continue;
    const rate = Number(tier.pricePerSeat) || 0;
    total += rate * kmInSegment;
    segments.push({
      minKm: start,
      maxKm: tier.maxKm ?? null,
      rate,
      km: Math.round(kmInSegment * 100) / 100,
      pricingType: "per_km",
    });
  }

  if (!segments.length) return null;
  const last = segments[segments.length - 1];
  return {
    price: Math.max(1, Math.round(total)),
    pricingType: "per_km",
    rate: last.rate,
    progressive: segments.length > 1,
    segments,
    minKm: segments[0].minKm,
    maxKm: last.maxKm ?? null,
  };
};

/** Ride fare = rate × route km (stacked bands when all tiers are per_km). */
export const computeFareQuoteLocal = (tiers, distanceKm) => {
  const km = Number(distanceKm);
  if (!Number.isFinite(km) || km <= 0 || !tiers?.length) return null;

  const allPerKm = tiers.every((t) => normalizePricingType(t.pricingType) === "per_km");
  if (allPerKm && tiers.length > 1) {
    return computeProgressivePerKmFare(tiers, km);
  }

  const tier = findTierForDistance(tiers, km);
  if (!tier) return null;

  const rate = Number(tier.pricePerSeat) || 0;
  const price = Math.max(1, Math.round(rate * km));

  return {
    price,
    pricingType: "per_km",
    rate,
    progressive: false,
    minKm: tier.minKm,
    maxKm: tier.maxKm ?? null,
    segments: [
      {
        minKm: tier.minKm,
        maxKm: tier.maxKm ?? null,
        rate,
        km: Math.round(km * 100) / 100,
        pricingType: "per_km",
      },
    ],
  };
};
