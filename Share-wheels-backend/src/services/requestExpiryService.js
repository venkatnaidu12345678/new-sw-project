const PassengerRide = require("../models/passengerRideModel");
const Courier = require("../models/courierModel");
const {
  getPassengerRequestRangeEnd,
  getCourierRequestRangeEnd,
  isPastRequestRangeEnd,
} = require("../utils/requestDateUtils");
const { toEnrouteDateKey } = require("../utils/rideDateQueryUtils");
const { notifyUser } = require("./notificationService");
const {
  emitEnrouteRequestRemoved,
  emitMyRequestsUpdated,
} = require("../utils/socketEmit");

const OPEN_PASSENGER_FILTER = {
  status: "pending",
  $or: [{ assigned_to: { $exists: false } }, { "assigned_to.rideId": null }],
};

const OPEN_COURIER_FILTER = {
  courier_status: { $in: ["pending", "request_to_driver"] },
  $or: [
    { driver_assigned_courier: { $exists: false } },
    { "driver_assigned_courier.rideId": null },
  ],
};

const expirePassengerRequestDoc = async (doc) => {
  const updated = await PassengerRide.findOneAndUpdate(
    { _id: doc._id, status: "pending" },
    { $set: { status: "expired" } },
    { returnDocument: "after" }
  );
  if (!updated) return false;

  const dateKey = toEnrouteDateKey(updated.date);
  emitEnrouteRequestRemoved(updated.from, updated.to, dateKey, {
    passengerRideId: updated._id.toString(),
    type: "passenger",
  });
  emitMyRequestsUpdated(updated.creator, {
    action: "passenger_request_expired",
    passengerRideId: updated._id.toString(),
  });
  await notifyUser(updated.creator, {
    title: "Passenger request expired",
    body: `Your request (${updated.from} → ${updated.to}) expired because the travel date range ended.`,
    type: "passenger_request_expired",
    data: { passengerRideId: updated._id.toString() },
  }).catch(() => {});

  return true;
};

const expireCourierRequestDoc = async (doc) => {
  const updated = await Courier.findOneAndUpdate(
    {
      _id: doc._id,
      courier_status: { $in: ["pending", "request_to_driver"] },
    },
    { $set: { courier_status: "expired" } },
    { returnDocument: "after" }
  );
  if (!updated) return false;

  const dateKey = toEnrouteDateKey(updated.date?.startDate || updated.date);
  emitEnrouteRequestRemoved(updated.from, updated.to, dateKey, {
    courierId: updated._id.toString(),
    type: "courier",
  });
  emitMyRequestsUpdated(updated.creator, {
    action: "courier_request_expired",
    courierId: updated._id.toString(),
  });
  await notifyUser(updated.creator, {
    title: "Courier request expired",
    body: `Your delivery request (${updated.from} → ${updated.to}) expired because the date range ended.`,
    type: "courier_request_expired",
    data: { courierId: updated._id.toString() },
  }).catch(() => {});

  return true;
};

/** Mark open passenger requests expired once their date range has ended. */
const expireStalePassengerRequests = async () => {
  const candidates = await PassengerRide.find(OPEN_PASSENGER_FILTER).lean();
  let expiredCount = 0;
  for (const doc of candidates) {
    const rangeEnd = getPassengerRequestRangeEnd(doc);
    if (!isPastRequestRangeEnd(rangeEnd)) continue;
    const didExpire = await expirePassengerRequestDoc(doc);
    if (didExpire) expiredCount += 1;
  }
  return expiredCount;
};

/** Mark open courier requests expired once their date range has ended. */
const expireStaleCourierRequests = async () => {
  const candidates = await Courier.find(OPEN_COURIER_FILTER).lean();
  let expiredCount = 0;
  for (const doc of candidates) {
    const rangeEnd = getCourierRequestRangeEnd(doc);
    if (!isPastRequestRangeEnd(rangeEnd)) continue;
    const didExpire = await expireCourierRequestDoc(doc);
    if (didExpire) expiredCount += 1;
  }
  return expiredCount;
};

const expireStaleOpenRequests = async () => {
  const [passengers, couriers] = await Promise.all([
    expireStalePassengerRequests(),
    expireStaleCourierRequests(),
  ]);
  return { passengers, couriers, total: passengers + couriers };
};

module.exports = {
  expireStalePassengerRequests,
  expireStaleCourierRequests,
  expireStaleOpenRequests,
  OPEN_PASSENGER_FILTER,
  OPEN_COURIER_FILTER,
};
