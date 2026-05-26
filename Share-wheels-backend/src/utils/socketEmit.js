const normalizeRouteKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const enrouteRoomKey = (from, to, date) => {
  const d = date ? new Date(date).toISOString().split("T")[0] : "any";
  return `enroute:${normalizeRouteKey(from)}:${normalizeRouteKey(to)}:${d}`;
};

const emitToUser = (userId, event, payload) => {
  if (!global.io || !userId) return;
  global.io.to(`user:${userId.toString()}`).emit(event, payload);
};

const emitRideParticipantsUpdated = (rideId, payload = {}) => {
  if (!global.io || !rideId) return;
  const data = { rideId: rideId.toString(), ...payload };
  global.io.to(`ride:${rideId.toString()}`).emit("rideParticipantsUpdated", data);
};

const emitMyRequestsUpdated = (userId, payload = {}) => {
  emitToUser(userId, "myRequestsUpdated", payload);
};

const emitEnrouteRequestRemoved = (from, to, date, payload = {}) => {
  if (!global.io) return;
  global.io
    .to(enrouteRoomKey(from, to, date))
    .emit("enrouteRequestRemoved", payload);
};

const emitRideRequestUpdated = (rideId, payload = {}) => {
  if (!global.io || !rideId) return;
  global.io
    .to(`ride:${rideId.toString()}`)
    .emit("rideRequestUpdated", { rideId: rideId.toString(), ...payload });
};

module.exports = {
  enrouteRoomKey,
  emitToUser,
  emitRideParticipantsUpdated,
  emitMyRequestsUpdated,
  emitEnrouteRequestRemoved,
  emitRideRequestUpdated,
};
