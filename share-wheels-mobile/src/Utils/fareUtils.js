/**
 * Normalize fare display across driver rides, passenger seats, and courier deliveries.
 * Prefers backend-computed admin tier fares (displayFare) over stale stored amounts.
 */
import {
  passengerCountsTowardEarnings,
  courierCountsTowardEarnings,
} from "./participantTripStatus";

const positiveNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const pickStoredAmount = (item, keys = []) => {
  if (!item) return 0;
  for (const key of keys) {
    const direct = positiveNumber(item[key]);
    if (direct != null) return direct;
    const nested = positiveNumber(item.activeData?.[key]);
    if (nested != null) return nested;
  }
  return 0;
};

const pickParticipantFare = (item, storedKeys = []) => {
  if (!item) return 0;

  const displayFare = positiveNumber(item.displayFare);
  if (displayFare != null) return displayFare;

  const computed = positiveNumber(item.computedSegmentFare);
  if (computed != null) return computed;

  const perSeat = positiveNumber(item.perSeatFare);
  if (perSeat != null) {
    const seats = Math.max(1, Number(item.requires_seats) || 1);
    return Math.round(perSeat * seats);
  }

  return pickStoredAmount(item, storedKeys);
};

export const getPassengerFare = (item) => {
  if (!item) return 0;
  // Agreed passenger total always wins over stopover segment recalculation.
  const stored = pickStoredAmount(item, ["ride_amount", "amount", "amount_will"]);
  if (stored > 0) return stored;
  const displayFare = positiveNumber(item.displayFare);
  if (displayFare != null) return displayFare;
  const perSeat = positiveNumber(item.perSeatFare);
  if (perSeat != null) {
    const seats = Math.max(1, Number(item.requires_seats) || 1);
    return Math.round(perSeat * seats);
  }
  return positiveNumber(item.computedSegmentFare) ?? 0;
};

export const getCourierFare = (item) => {
  if (!item) return 0;
  // User-declared courier price always wins over stopover segment recalculation.
  const stored = pickStoredAmount(item, ["amount_will", "amount", "ride_amount"]);
  if (stored > 0) return stored;
  const displayFare = positiveNumber(item.displayFare);
  if (displayFare != null) return displayFare;
  return positiveNumber(item.computedSegmentFare) ?? 0;
};

/** Ride card / upcoming list by role */
export const getRideDisplayFare = (ride) => {
  if (!ride) return 0;

  const viewerFare = positiveNumber(ride.viewerDisplayFare);
  if (viewerFare != null) return viewerFare;

  // Passenger/courier agreed prices before any recalculated displayFare.
  if (ride.myRole === "passenger") return getPassengerFare(ride);
  if (ride.myRole === "courier") return getCourierFare(ride);

  const displayFare = positiveNumber(ride.displayFare);
  if (displayFare != null) return displayFare;

  const perSeat = positiveNumber(ride.perSeatFare);
  if (perSeat != null) return perSeat;

  return positiveNumber(ride.ride_amount) ?? 0;
};

export const formatRupee = (amount) => `₹${Number(amount ?? 0)}`;

/**
 * Driver earnings: OTP-verified passengers (Dropped) and couriers (Delivered) only.
 */
export const getDriverTotalEarnings = (ride) => {
  const passengers = ride?.passengers || [];
  const couriers = ride?.all_deliveries || [];
  const passengerTotal = passengers.reduce(
    (sum, p) =>
      sum + (passengerCountsTowardEarnings(p) ? getPassengerFare(p) : 0),
    0
  );
  const courierTotal = couriers.reduce(
    (sum, c) => sum + (courierCountsTowardEarnings(c) ? getCourierFare(c) : 0),
    0
  );
  return passengerTotal + courierTotal;
};

/** Pending earnings after OTP but before drop/deliver */
export const getDriverPendingEarnings = (ride) => {
  const passengers = ride?.passengers || [];
  const couriers = ride?.all_deliveries || [];
  let total = 0;
  passengers.forEach((p) => {
    if (
      p?.isBoardingVerified &&
      (p?.status || "").toLowerCase() === "picked_up"
    ) {
      total += getPassengerFare(p);
    }
  });
  couriers.forEach((c) => {
    if (
      c?.isBoardingVerified &&
      (c?.status || "").toLowerCase() === "picked_up"
    ) {
      total += getCourierFare(c);
    }
  });
  return total;
};
