const getRideParticipantRole = (ride, userId) => {
  const uid = userId.toString();
  if (ride.creator?.toString() === uid || ride.creator?._id?.toString() === uid) {
    return "driver";
  }
  const passenger = ride.passengers?.find(
    (p) => p.userId?.toString() === uid || p.userId?._id?.toString() === uid
  );
  if (passenger) return "passenger";
  const courier = ride.all_deliveries?.find(
    (d) => d.userId?.toString() === uid || d.userId?._id?.toString() === uid
  );
  if (courier) return "courier";
  return null;
};

const canAccessRideChat = (ride, userId) => {
  const role = getRideParticipantRole(ride, userId);
  return role === "driver" || role === "passenger" || role === "courier";
};

module.exports = { getRideParticipantRole, canAccessRideChat };
