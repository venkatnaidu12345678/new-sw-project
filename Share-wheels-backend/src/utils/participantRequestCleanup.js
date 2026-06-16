const mongoose = require("mongoose");
const PassengerRide = require("../models/passengerRideModel");
const Courier = require("../models/courierModel");
const Ride = require("../models/rideModel");
const {
  escapeRegex,
  toEnrouteDateKey,
  passengerOverlapsRideDay,
  courierOverlapsRideDay,
} = require("./rideDateQueryUtils");
const { buildOrderedCorridor, matchesForwardCorridor } = require("./enrouteCorridorUtils");
const {
  OPEN_PASSENGER_FILTER,
  OPEN_COURIER_FILTER,
} = require("../services/requestExpiryService");
const {
  emitEnrouteRequestRemoved,
  emitMyRequestsUpdated,
} = require("./socketEmit");

const refUserId = (ref) =>
  ref?.userId?._id?.toString?.() ||
  ref?.userId?.toString?.() ||
  ref?._id?.toString?.() ||
  ref?.toString?.() ||
  "";

/** All users already on a ride roster (pending requests + confirmed participants). */
const collectRideParticipantUserIds = (ride) => {
  const ids = new Set();
  const add = (row) => {
    const id = refUserId(row);
    if (id) ids.add(id);
  };
  (ride?.passenger_requested_ride || []).forEach(add);
  (ride?.passengers || []).forEach(add);
  (ride?.users_request_Couriers || []).forEach(add);
  (ride?.all_deliveries || []).forEach(add);
  return ids;
};

/** Confirmed passengers/couriers only — not pending booking requests on other rides. */
const collectConfirmedRideParticipantUserIds = (ride) => {
  const ids = new Set();
  const add = (row) => {
    const id = refUserId(row);
    if (id) ids.add(id);
  };
  (ride?.passengers || []).forEach(add);
  (ride?.all_deliveries || []).forEach(add);
  return ids;
};

const routesRoughlyMatch = (reqFrom, reqTo, rideFrom, rideTo) => {
  const matchDir = (aFrom, aTo, bFrom, bTo) => {
    const rf = String(aFrom || "").trim();
    const rt = String(aTo || "").trim();
    const from = String(bFrom || "").trim();
    const to = String(bTo || "").trim();
    if (!rf || !rt || !from || !to) return false;
    const fromRe = new RegExp(escapeRegex(rf), "i");
    const toRe = new RegExp(escapeRegex(rt), "i");
    return fromRe.test(from) && toRe.test(to);
  };

  if (
    matchDir(rideFrom, rideTo, reqFrom, reqTo) ||
    matchDir(reqFrom, reqTo, rideFrom, rideTo)
  ) {
    return true;
  }

  const tokenize = (label) =>
    String(label || "")
      .toLowerCase()
      .replace(/[,]/g, " ")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 2);

  const tokenOverlap = (left, right) => {
    const rightSet = new Set(tokenize(right));
    return tokenize(left).some((token) => rightSet.has(token));
  };

  return (
    tokenOverlap(reqFrom, rideFrom) &&
    tokenOverlap(reqTo, rideTo)
  );
};

const toParticipantId = (userId) => {
  const raw = userId?._id || userId;
  if (!raw) return { oid: null, str: "" };
  const str = String(raw);
  const oid = mongoose.Types.ObjectId.isValid(str)
    ? new mongoose.Types.ObjectId(str)
    : null;
  return { oid, str };
};

const getUserActiveParticipatedRides = async (userId) => {
  const { oid, str } = toParticipantId(userId);
  if (!oid && !str) return [];

  const membership = [];
  if (oid) {
    membership.push(
      { "passenger_requested_ride.userId": oid },
      { "passengers.userId": oid },
      { "users_request_Couriers.userId": oid },
      { "all_deliveries.userId": oid }
    );
  }
  if (str) {
    membership.push(
      { "passenger_requested_ride.userId": str },
      { "passengers.userId": str },
      { "users_request_Couriers.userId": str },
      { "all_deliveries.userId": str }
    );
  }

  return Ride.find({
    status: { $in: ["pending", "started"] },
    $or: membership,
  })
    .select("from to")
    .lean();
};

/** Users already on any active ride along this corridor/day (joined or picked). */
const collectActiveCorridorParticipantUserIds = async (
  corridor,
  startOfDay,
  endOfDay
) => {
  const ids = new Set();
  if (!corridor?.length || !startOfDay || !endOfDay) return ids;

  const rides = await Ride.find({
    status: { $in: ["pending", "started"] },
    date: { $gte: startOfDay, $lte: endOfDay },
  })
    .select("from to passengers all_deliveries")
    .lean();

  rides.forEach((ride) => {
    if (!matchesForwardCorridor(ride.from, ride.to, corridor)) return;
    collectConfirmedRideParticipantUserIds(ride).forEach((id) => ids.add(id));
  });

  const [assignedPassengerCreators, assignedCourierCreators] = await Promise.all([
    PassengerRide.find({
      status: { $in: ["aisgned_passenger", "in_car", "ride_finished"] },
      "assigned_to.rideId": { $exists: true, $ne: null },
      ...passengerOverlapsRideDay(startOfDay, endOfDay),
    }).distinct("creator"),
    Courier.find({
      courier_status: {
        $in: [
          "request_to_driver",
          "driver_assigned",
          "picked_up",
          "in_transit",
          "delivered",
        ],
      },
      "driver_assigned_courier.rideId": { $exists: true, $ne: null },
      ...courierOverlapsRideDay(startOfDay, endOfDay),
    }).distinct("creator"),
  ]);

  assignedPassengerCreators.forEach((id) => ids.add(id.toString()));
  assignedCourierCreators.forEach((id) => ids.add(id.toString()));

  return ids;
};

const appendExplicitDoc = (rows, openRows, explicitId) => {
  if (!explicitId || !mongoose.Types.ObjectId.isValid(explicitId)) return rows;
  const key = String(explicitId);
  if (rows.some((row) => String(row._id) === key)) return rows;
  const explicit = openRows.find((row) => String(row._id) === key);
  return explicit ? [...rows, explicit] : rows;
};

/** Link open standalone courier docs when user requests delivery on a driver ride. */
const linkStandaloneCouriersForRideRequest = async (
  userId,
  ride,
  { explicitCourierId } = {}
) => {
  const open = await Courier.find({
    creator: userId,
    courier_status: "pending",
    $or: [
      { driver_assigned_courier: { $exists: false } },
      { "driver_assigned_courier.rideId": null },
    ],
  }).lean();

  let corridor = null;
  if ((ride.stopovers || []).length > 0) {
    corridor = await buildOrderedCorridor({
      from: ride.from,
      to: ride.to,
      stopovers: ride.stopovers || [],
      routePolyline: ride.routePolyline || "",
    });
  }

  const matchesRide = (row) => {
    if (routesRoughlyMatch(row.from, row.to, ride.from, ride.to)) return true;
    if (!corridor) return false;
    return matchesForwardCorridor(row.from, row.to, corridor);
  };

  const toLink = appendExplicitDoc(
    open.filter((row) => matchesRide(row)),
    open,
    explicitCourierId
  );

  if (!toLink.length) return [];

  await Courier.updateMany(
    { _id: { $in: toLink.map((c) => c._id) } },
    {
      $set: {
        courier_status: "request_to_driver",
        driver_assigned_courier: { userId: ride.creator, rideId: ride._id },
      },
    }
  );

  emitEnrouteRemovals(ride, toLink, "courier");
  return toLink.map((c) => c._id.toString());
};

const getUserCourierParticipatedRides = async (userId) => {
  const { oid, str } = toParticipantId(userId);
  if (!oid && !str) return [];

  const membership = [];
  if (oid) {
    membership.push(
      { "users_request_Couriers.userId": oid },
      { "all_deliveries.userId": oid }
    );
  }
  if (str) {
    membership.push(
      { "users_request_Couriers.userId": str },
      { "all_deliveries.userId": str }
    );
  }

  return Ride.find({
    status: { $in: ["pending", "started"] },
    $or: membership,
  })
    .select("from to")
    .lean();
};

const getUserPassengerParticipatedRides = async (userId) => {
  const { oid, str } = toParticipantId(userId);
  if (!oid && !str) return [];

  const membership = [];
  if (oid) {
    membership.push(
      { "passenger_requested_ride.userId": oid },
      { "passengers.userId": oid }
    );
  }
  if (str) {
    membership.push(
      { "passenger_requested_ride.userId": str },
      { "passengers.userId": str }
    );
  }

  return Ride.find({
    status: { $in: ["pending", "started"] },
    $or: membership,
  })
    .select("from to")
    .lean();
};

const collectAssignedRequestDocIds = async (rideId) => {
  if (!rideId || !mongoose.Types.ObjectId.isValid(rideId)) {
    return { passengerRideIds: [], courierIds: [] };
  }
  const oid = new mongoose.Types.ObjectId(rideId);
  const [passengerRideIds, courierIds] = await Promise.all([
    PassengerRide.find({
      "assigned_to.rideId": oid,
      status: { $nin: ["cancelled", "expired"] },
    }).distinct("_id"),
    Courier.find({
      "driver_assigned_courier.rideId": oid,
      courier_status: { $nin: ["cancelled", "expired"] },
    }).distinct("_id"),
  ]);
  return {
    passengerRideIds: passengerRideIds.map((id) => id.toString()),
    courierIds: courierIds.map((id) => id.toString()),
  };
};

const emitStandaloneRemovals = (rows, type) => {
  rows.forEach((row) => {
    const dateKey =
      type === "passenger"
        ? toEnrouteDateKey(row.date)
        : toEnrouteDateKey(row.date?.startDate || row.date);
    emitEnrouteRequestRemoved(row.from, row.to, dateKey, {
      type,
      userId: row.creator?.toString?.() || String(row.creator || ""),
      ...(type === "passenger"
        ? { passengerRideId: row._id?.toString?.() || String(row._id || "") }
        : { courierId: row._id?.toString?.() || String(row._id || "") }),
    });
  });
};

/**
 * One open standalone per user: creating passenger closes open couriers and vice versa.
 */
const closeOpenOppositeRoleStandalones = async (userId, creatingRole) => {
  const { oid, str } = toParticipantId(userId);
  if (!oid && !str) return { closedPassengers: 0, closedCouriers: 0 };
  const creatorFilter = oid || str;

  if (creatingRole === "passenger") {
    const open = await Courier.find({
      ...OPEN_COURIER_FILTER,
      creator: creatorFilter,
    }).lean();
    if (!open.length) return { closedPassengers: 0, closedCouriers: 0 };
    await Courier.updateMany(
      { _id: { $in: open.map((c) => c._id) } },
      {
        $set: {
          courier_status: "cancelled",
          driver_assigned_courier: { userId: null, rideId: null },
        },
      }
    );
    emitStandaloneRemovals(open, "courier");
    return { closedPassengers: 0, closedCouriers: open.length };
  }

  if (creatingRole === "courier") {
    const open = await PassengerRide.find({
      ...OPEN_PASSENGER_FILTER,
      creator: creatorFilter,
    }).lean();
    if (!open.length) return { closedPassengers: 0, closedCouriers: 0 };
    await PassengerRide.updateMany(
      { _id: { $in: open.map((p) => p._id) } },
      {
        $set: {
          status: "cancelled",
          assigned_to: { userId: null, rideId: null },
        },
      }
    );
    emitStandaloneRemovals(open, "passenger");
    return { closedPassengers: open.length, closedCouriers: 0 };
  }

  return { closedPassengers: 0, closedCouriers: 0 };
};

/** At most one enroute row per creator — passenger wins over courier if both exist. */
const dedupeEnrouteRequestsByCreator = (requests = []) => {
  const byCreator = new Map();
  for (const req of requests) {
    const cid = String(req.creatorId || "");
    if (!cid) continue;
    const existing = byCreator.get(cid);
    if (!existing) {
      byCreator.set(cid, req);
      continue;
    }
    if (req.request_type === "passenger" && existing.request_type === "courier") {
      byCreator.set(cid, req);
    }
  }
  return Array.from(byCreator.values());
};

const emitEnrouteRemovals = (ride, rows, type) => {
  const dateKey = toEnrouteDateKey(ride?.date);
  rows.forEach((row) => {
    emitEnrouteRequestRemoved(ride.from, ride.to, dateKey, {
      type,
      userId: row.creator?.toString?.() || String(row.creator || ""),
      ...(type === "passenger"
        ? { passengerRideId: row._id?.toString?.() || String(row._id || "") }
        : {}),
      ...(type === "courier"
        ? { courierId: row._id?.toString?.() || String(row._id || "") }
        : {}),
    });
  });
};

/** Hide standalone open passenger requests once user joins a driver ride. */
const closeStandalonePassengerRequestsAfterJoin = async (
  userId,
  ride,
  { explicitPassengerRideId } = {}
) => {
  const open = await PassengerRide.find({
    creator: userId,
    status: "pending",
    $or: [{ assigned_to: { $exists: false } }, { "assigned_to.rideId": null }],
  }).lean();

  const toClose = appendExplicitDoc(
    open.filter((row) =>
      routesRoughlyMatch(row.from, row.to, ride.from, ride.to)
    ),
    open,
    explicitPassengerRideId
  );

  if (!toClose.length) return;

  await PassengerRide.updateMany(
    { _id: { $in: toClose.map((p) => p._id) } },
    {
      $set: {
        status: "cancelled",
        assigned_to: { userId: ride.creator, rideId: ride._id },
      },
    }
  );

  emitEnrouteRemovals(ride, toClose, "passenger");
};

/** Hide standalone open courier requests once user joins a driver ride. */
const closeStandaloneCourierRequestsAfterJoin = async (
  userId,
  ride,
  { explicitCourierId } = {}
) => {
  const open = await Courier.find({
    creator: userId,
    courier_status: { $in: ["pending", "request_to_driver"] },
    $or: [
      { driver_assigned_courier: { $exists: false } },
      { "driver_assigned_courier.rideId": null },
    ],
  }).lean();

  const toClose = appendExplicitDoc(
    open.filter((row) =>
      routesRoughlyMatch(row.from, row.to, ride.from, ride.to)
    ),
    open,
    explicitCourierId
  );

  if (!toClose.length) return;

  await Courier.updateMany(
    { _id: { $in: toClose.map((c) => c._id) } },
    {
      $set: {
        courier_status: "driver_assigned",
        driver_assigned_courier: { userId: ride.creator, rideId: ride._id },
      },
    }
  );

  emitEnrouteRemovals(ride, toClose, "courier");
};

const closeStandaloneRequestsAfterJoin = async (userId, ride, options = {}) => {
  await closeStandalonePassengerRequestsAfterJoin(userId, ride, options);
  await closeStandaloneCourierRequestsAfterJoin(userId, ride, options);
};

/**
 * After a driver enroute pick, close every other open standalone request from that user
 * (passenger + courier) so they cannot be picked twice on the same ride.
 */
const closeSiblingStandalonesAfterEnroutePick = async (
  userId,
  ride,
  { pickedPassengerRideId, pickedCourierId } = {}
) => {
  const { oid, str } = toParticipantId(userId);
  if (!oid && !str) return;

  const creatorFilter = oid || str;
  const keepPassengerId = String(pickedPassengerRideId || "");
  const keepCourierId = String(pickedCourierId || "");

  const openPassengers = await PassengerRide.find({
    ...OPEN_PASSENGER_FILTER,
    creator: creatorFilter,
  }).lean();

  const passengersToClose = openPassengers.filter(
    (row) => String(row._id) !== keepPassengerId
  );

  if (passengersToClose.length) {
    await PassengerRide.updateMany(
      { _id: { $in: passengersToClose.map((p) => p._id) } },
      {
        $set: {
          status: "cancelled",
          assigned_to: { userId: null, rideId: null },
        },
      }
    );
    emitEnrouteRemovals(ride, passengersToClose, "passenger");
  }

  const openCouriers = await Courier.find({
    ...OPEN_COURIER_FILTER,
    creator: creatorFilter,
  }).lean();

  const couriersToClose = openCouriers.filter(
    (row) => String(row._id) !== keepCourierId
  );

  if (couriersToClose.length) {
    await Courier.updateMany(
      { _id: { $in: couriersToClose.map((c) => c._id) } },
      {
        $set: {
          courier_status: "cancelled",
          driver_assigned_courier: { userId: null, rideId: null },
        },
      }
    );
    emitEnrouteRemovals(ride, couriersToClose, "courier");
  }
};

const shouldHideStandaloneByParticipation = (req, participatedRides = []) =>
  participatedRides.some((ride) =>
    routesRoughlyMatch(req.from, req.to, ride.from, ride.to)
  );

module.exports = {
  collectRideParticipantUserIds,
  collectConfirmedRideParticipantUserIds,
  routesRoughlyMatch,
  getUserActiveParticipatedRides,
  getUserCourierParticipatedRides,
  getUserPassengerParticipatedRides,
  collectActiveCorridorParticipantUserIds,
  shouldHideStandaloneByParticipation,
  collectAssignedRequestDocIds,
  linkStandaloneCouriersForRideRequest,
  closeStandalonePassengerRequestsAfterJoin,
  closeStandaloneCourierRequestsAfterJoin,
  closeStandaloneRequestsAfterJoin,
  closeSiblingStandalonesAfterEnroutePick,
  closeOpenOppositeRoleStandalones,
  dedupeEnrouteRequestsByCreator,
};
