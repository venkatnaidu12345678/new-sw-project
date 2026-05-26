/**
 * Normalize fare display across driver rides, passenger seats, and courier deliveries.
 */

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

/** Driver earnings from confirmed passengers on a completed ride */
export const getDriverTotalEarnings = (ride) => {
  const passengers = ride?.passengers || [];
  if (!passengers.length) {
    return Number(ride?.ride_amount ?? 0);
  }
  return passengers.reduce((sum, p) => sum + getPassengerFare(p), 0);
};
