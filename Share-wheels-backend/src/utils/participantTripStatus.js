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

module.exports = {
  TRIP_STATUS,
  TRIP_STATUS_LABELS,
  normalizeTripStatus: normalize,
  tripStatusLabel: (s) => TRIP_STATUS_LABELS[normalize(s)] || normalize(s),
  countsTowardDriverEarnings,
  canMarkDropped,
  canMarkDelivered,
};
