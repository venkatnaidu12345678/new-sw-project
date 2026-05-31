/**
 * Normalize fare display across driver rides, passenger seats, and courier deliveries.
 */
import {
  passengerCountsTowardEarnings,
  courierCountsTowardEarnings,
} from "./participantTripStatus";

export const getPassengerFare = (item) => {
  if (!item) return 0;
  return Number(
    item.ride_amount ??
      item.activeData?.ride_amount ??
      item.amount ??
      item.amount_will ??
      0
  );
};

export const getCourierFare = (item) => {
  if (!item) return 0;
  return Number(
    item.amount_will ??
      item.activeData?.amount_will ??
      item.amount ??
      item.ride_amount ??
      0
  );
};

/** Ride card / upcoming list by role */
export const getRideDisplayFare = (ride) => {
  if (!ride) return 0;
  if (ride.myRole === "passenger") return getPassengerFare(ride);
  if (ride.myRole === "courier") return getCourierFare(ride);
  return Number(ride.ride_amount ?? 0);
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
