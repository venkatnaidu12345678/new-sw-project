export const refUserId = (ref) =>
  ref?._id?.toString?.() || ref?.toString?.() || "";

export const isUserPassengerOnRide = (ride, userId) => {
  const uid = refUserId(userId);
  if (!uid || !ride) return false;
  if ((ride.passengers || []).some((p) => refUserId(p.userId) === uid)) return true;
  if ((ride.passenger_requested_ride || []).some((p) => refUserId(p.userId) === uid)) {
    return true;
  }
  return false;
};

export const isUserCourierOnRide = (ride, userId) => {
  const uid = refUserId(userId);
  if (!uid || !ride) return false;
  if ((ride.all_deliveries || []).some((c) => refUserId(c.userId) === uid)) return true;
  if ((ride.users_request_Couriers || []).some((c) => refUserId(c.userId) === uid)) {
    return true;
  }
  return false;
};

export const getPassengerBookingBlockReason = (ride, userId, { isOwnRide } = {}) => {
  if (isOwnRide) {
    return "You are the driver for this ride and cannot book a seat on your own trip.";
  }
  if (isUserCourierOnRide(ride, userId)) {
    return "You are already a courier on this ride and cannot also book a passenger seat.";
  }
  if (isUserPassengerOnRide(ride, userId)) {
    return "You are already on this ride as a passenger.";
  }
  return null;
};

export const getCourierBookingBlockReason = (ride, userId, { isOwnRide, canCarryCourier } = {}) => {
  if (!canCarryCourier) {
    return "This ride does not accept courier deliveries.";
  }
  if (isOwnRide) {
    return "You are the driver for this ride and cannot add a courier delivery on your own trip.";
  }
  if (isUserCourierOnRide(ride, userId)) {
    return "You are already a courier on this ride.";
  }
  if (isUserPassengerOnRide(ride, userId)) {
    return "You are already a passenger on this ride and cannot also join as a courier.";
  }
  return null;
};
