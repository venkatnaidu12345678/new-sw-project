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

/** After OTP verify (picked_up) — show Drop / Delivered (ride must be started to complete action). */
export const canDropPassenger = (p) =>
  !!p?.isBoardingVerified &&
  (p?.status || "").toLowerCase() === TRIP_STATUS.PICKED_UP;

export const canDeliverCourier = (c) =>
  !!c?.isBoardingVerified &&
  (c?.status || "").toLowerCase() === TRIP_STATUS.PICKED_UP;

const normalizeStatus = (s) => (s || TRIP_STATUS.ACCEPTED).toString().toLowerCase();

const isPassengerDropped = (p) => normalizeStatus(p?.status) === TRIP_STATUS.DROPPED;

const isCourierDelivered = (c) => normalizeStatus(c?.status) === TRIP_STATUS.DELIVERED;

/** Driver may complete ride only when every passenger is dropped and every courier is delivered. */
export const canDriverCompleteRide = (ride) => {
  const passengers = ride?.passengers || [];
  const couriers = ride?.all_deliveries || [];
  const pendingPassengers = passengers.filter((p) => !isPassengerDropped(p));
  const pendingCouriers = couriers.filter((c) => !isCourierDelivered(c));
  return pendingPassengers.length === 0 && pendingCouriers.length === 0;
};

export const getDriverCompleteRideBlockers = (ride) => {
  const passengers = ride?.passengers || [];
  const couriers = ride?.all_deliveries || [];
  const pendingPassengers = passengers.filter((p) => !isPassengerDropped(p));
  const pendingCouriers = couriers.filter((c) => !isCourierDelivered(c));
  const parts = [];
  if (pendingPassengers.length > 0) {
    parts.push(
      `${pendingPassengers.length} passenger(s) still need to be marked Dropped`
    );
  }
  if (pendingCouriers.length > 0) {
    parts.push(
      `${pendingCouriers.length} courier(s) still need to be marked Delivered`
    );
  }
  return {
    ok: parts.length === 0,
    message: parts.length ? `${parts.join(". ")}.` : null,
  };
};
