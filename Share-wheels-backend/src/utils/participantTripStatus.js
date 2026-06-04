/** Passenger / courier trip leg status on an active ride */
const TRIP_STATUS = {
  ACCEPTED: "accepted",
  PICKED_UP: "picked_up",
  DROPPED: "dropped",
  DELIVERED: "delivered",
};

const TRIP_STATUS_LABELS = {
  accepted: "Accepted",
  picked_up: "Picked Up",
  dropped: "Dropped",
  delivered: "Delivered",
};

const normalize = (s) => (s || TRIP_STATUS.ACCEPTED).toString().toLowerCase();

const countsTowardDriverEarnings = (entry, role) => {
  if (!entry?.isBoardingVerified) return false;
  const status = normalize(entry.status);
  if (role === "passenger") return status === TRIP_STATUS.DROPPED;
  if (role === "courier") return status === TRIP_STATUS.DELIVERED;
  return false;
};

const canMarkDropped = (entry) =>
  !!entry?.isBoardingVerified && normalize(entry.status) === TRIP_STATUS.PICKED_UP;

const canMarkDelivered = (entry) =>
  !!entry?.isBoardingVerified && normalize(entry.status) === TRIP_STATUS.PICKED_UP;

const isPassengerDropped = (entry) => normalize(entry?.status) === TRIP_STATUS.DROPPED;

const isCourierDelivered = (entry) => normalize(entry?.status) === TRIP_STATUS.DELIVERED;

/** Driver may complete ride only when every passenger is dropped and every courier is delivered. */
const canDriverCompleteRide = (ride) => {
  const passengers = ride?.passengers || [];
  const couriers = ride?.all_deliveries || [];
  const pendingPassengers = passengers.filter((p) => !isPassengerDropped(p));
  const pendingCouriers = couriers.filter((c) => !isCourierDelivered(c));
  return pendingPassengers.length === 0 && pendingCouriers.length === 0;
};

const getDriverCompleteRideBlockers = (ride) => {
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
    pendingPassengers: pendingPassengers.length,
    pendingCouriers: pendingCouriers.length,
    message: parts.length ? parts.join(". ") + "." : null,
  };
};

module.exports = {
  TRIP_STATUS,
  TRIP_STATUS_LABELS,
  normalizeTripStatus: normalize,
  tripStatusLabel: (s) => TRIP_STATUS_LABELS[normalize(s)] || normalize(s),
  countsTowardDriverEarnings,
  canMarkDropped,
  canMarkDelivered,
  isPassengerDropped,
  isCourierDelivered,
  canDriverCompleteRide,
  getDriverCompleteRideBlockers,
};
