const mongoose = require("mongoose");

const toUserIdString = (ref) => {
  if (!ref) return "";
  if (typeof ref === "string") return ref;
  return ref._id?.toString?.() || ref.toString?.() || "";
};

const isUserPassengerOnRide = (ride, userId) => {
  const uid = toUserIdString(userId);
  if (!uid) return false;
  if ((ride.passengers || []).some((p) => toUserIdString(p.userId) === uid)) return true;
  if ((ride.passenger_requested_ride || []).some((p) => toUserIdString(p.userId) === uid)) {
    return true;
  }
  return false;
};

const isUserCourierOnRide = (ride, userId) => {
  const uid = toUserIdString(userId);
  if (!uid) return false;
  if ((ride.all_deliveries || []).some((c) => toUserIdString(c.userId) === uid)) return true;
  if ((ride.users_request_Couriers || []).some((c) => toUserIdString(c.userId) === uid)) {
    return true;
  }
  return false;
};

const passengerBlocksCourierMessage =
  "You are already a passenger on this ride. You cannot also join as a courier on the same trip.";

const courierBlocksPassengerMessage =
  "You are already a courier on this ride. You cannot also book a passenger seat on the same trip.";

const driverParticipantConflictMessage =
  "This user is already on your ride. Someone cannot be both a passenger and a courier on the same trip.";

const driverAlreadyPassengerMessage =
  "This user is already a passenger on your ride.";

const driverAlreadyCourierMessage =
  "This user is already a courier on your ride.";

const rejectIfPassengerJoiningAsCourier = (ride, userId) => {
  if (isUserPassengerOnRide(ride, userId)) {
    return { blocked: true, message: passengerBlocksCourierMessage };
  }
  return { blocked: false };
};

const rejectIfCourierJoiningAsPassenger = (ride, userId) => {
  if (isUserCourierOnRide(ride, userId)) {
    return { blocked: true, message: courierBlocksPassengerMessage };
  }
  return { blocked: false };
};

/** Driver enroute pick — block duplicate role or passenger+courier on same ride. */
const rejectIfAlreadyParticipantOnRide = (ride, userId) => {
  if (isUserPassengerOnRide(ride, userId)) {
    return {
      blocked: true,
      code: "ALREADY_PASSENGER",
      message: driverAlreadyPassengerMessage,
    };
  }
  if (isUserCourierOnRide(ride, userId)) {
    return {
      blocked: true,
      code: "ALREADY_COURIER",
      message: driverAlreadyCourierMessage,
    };
  }
  return { blocked: false };
};

const rejectIfEnroutePickWouldConflict = (ride, userId, pickType) => {
  const participant = rejectIfAlreadyParticipantOnRide(ride, userId);
  if (participant.blocked) {
    return {
      ...participant,
      message: driverParticipantConflictMessage,
      code: "PARTICIPANT_CONFLICT",
    };
  }

  if (pickType === "passenger") {
    return rejectIfCourierJoiningAsPassenger(ride, userId);
  }
  if (pickType === "courier") {
    return rejectIfPassengerJoiningAsCourier(ride, userId);
  }

  return { blocked: false };
};

const participantNotOnRideFilter = (userId) => {
  const uid = toUserIdString(userId);
  if (!uid) return {};
  const blockedIds = [uid];
  if (mongoose.Types.ObjectId.isValid(uid)) {
    blockedIds.push(new mongoose.Types.ObjectId(uid));
  }
  return {
    "passengers.userId": { $nin: blockedIds },
    "all_deliveries.userId": { $nin: blockedIds },
  };
};

module.exports = {
  toUserIdString,
  isUserPassengerOnRide,
  isUserCourierOnRide,
  rejectIfPassengerJoiningAsCourier,
  rejectIfCourierJoiningAsPassenger,
  rejectIfAlreadyParticipantOnRide,
  rejectIfEnroutePickWouldConflict,
  participantNotOnRideFilter,
  passengerBlocksCourierMessage,
  courierBlocksPassengerMessage,
  driverParticipantConflictMessage,
};
