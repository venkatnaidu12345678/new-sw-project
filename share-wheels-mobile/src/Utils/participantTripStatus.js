export const TRIP_STATUS = {
  ACCEPTED: "accepted",
  PICKED_UP: "picked_up",
  DROPPED: "dropped",
  DELIVERED: "delivered",
};

const LABELS = {
  accepted: "Accepted",
  picked_up: "Picked Up",
  dropped: "Dropped",
  delivered: "Delivered",
};

export const tripStatusLabel = (status) =>
  LABELS[(status || "").toLowerCase()] || status || "Accepted";

export const passengerCountsTowardEarnings = (p) =>
  !!p?.isBoardingVerified &&
  (p?.status || "").toLowerCase() === TRIP_STATUS.DROPPED;

export const courierCountsTowardEarnings = (c) =>
  !!c?.isBoardingVerified &&
  (c?.status || "").toLowerCase() === TRIP_STATUS.DELIVERED;

export const canDropPassenger = (p, rideStarted) =>
  rideStarted &&
  !!p?.isBoardingVerified &&
  (p?.status || "").toLowerCase() === TRIP_STATUS.PICKED_UP;

export const canDeliverCourier = (c, rideStarted) =>
  rideStarted &&
  !!c?.isBoardingVerified &&
  (c?.status || "").toLowerCase() === TRIP_STATUS.PICKED_UP;
