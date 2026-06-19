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

/** Record a pending related-ride join without closing the standalone My Request row. */
const linkStandalonePassengersForRideRequest = async (
  userId,
  ride,
  { explicitPassengerRideId } = {}
) => {
  if (!explicitPassengerRideId || !mongoose.Types.ObjectId.isValid(explicitPassengerRideId)) {
    return [];
  }

  const passengerRide = await PassengerRide.findOne({
    _id: explicitPassengerRideId,
    creator: userId,
    status: "pending",
    $or: [{ assigned_to: { $exists: false } }, { "assigned_to.rideId": null }],
  }).lean();

  if (!passengerRide) return [];

  await PassengerRide.updateOne(
    { _id: passengerRide._id },
    {
      $addToSet: {
        join_requested_By: { userId, rideId: ride._id },
      },
    }
  );

  return [passengerRide._id.toString()];
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
 * Legacy cleanup helper for admin scripts only.
 * Do not call on create-request — users may keep passenger and courier standalones open together.
 * Same-ride role conflicts are enforced at pick/join time.
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

/** Remove exact duplicate rows only (same passenger/courier document id). */
const dedupeEnrouteRequestsByRequestId = (requests = []) => {
  const seen = new Set();
  const out = [];

  for (const req of requests) {
    const key =
      req.request_type === "passenger" && req.passengerId
        ? `passenger:${req.passengerId}`
        : req.request_type === "courier" && req.courierId
          ? `courier:${req.courierId}`
          : "";

    if (!key) {
      out.push(req);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(req);
  }

  return out;
};

/** @deprecated Use dedupeEnrouteRequestsByRequestId — kept for backwards compatibility. */
const dedupeEnrouteRequestsByCreator = dedupeEnrouteRequestsByRequestId;

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

/** Hide standalone open passenger requests linked to this join (explicit doc only when provided). */
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

  const toClose = explicitPassengerRideId
    ? open.filter((row) => String(row._id) === String(explicitPassengerRideId))
    : [];

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

/** Hide standalone open courier requests linked to this join (explicit doc only when provided). */
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

  const toClose = explicitCourierId
    ? open.filter((row) => String(row._id) === String(explicitCourierId))
    : [];

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
 * Previously closed all sibling standalones after an enroute pick.
 * Other open requests must stay active for other rides / drivers.
 * Duplicate picks on the same ride are blocked by rejectIfEnroutePickWouldConflict.
 */
const closeSiblingStandalonesAfterEnroutePick = async () => {};

const shouldHideStandaloneByParticipation = (req, participatedRides = []) =>
  participatedRides.some((ride) =>
    routesRoughlyMatch(req.from, req.to, ride.from, ride.to)
  );

const LOCKED_TO_OTHER_DRIVER_MESSAGE =
  "This request is already picked by another driver";

const resolvePassengerLockedRideId = (doc) => {
  if (!doc) return null;
  const assigned = doc.assigned_to?.rideId?.toString?.();
  if (assigned) return assigned;
  const joins = doc.join_requested_By || [];
  for (let i = joins.length - 1; i >= 0; i -= 1) {
    const rideId = joins[i]?.rideId?.toString?.();
    if (rideId) return rideId;
  }
  return null;
};

const resolveCourierLockedRideId = (doc) =>
  doc?.driver_assigned_courier?.rideId?.toString?.() || null;

/** Block linking a standalone My Request row to a second driver ride. */
const assertStandalonePassengerAvailableForRide = async (
  userId,
  passengerRideId,
  targetRideId
) => {
  if (!passengerRideId || !mongoose.Types.ObjectId.isValid(passengerRideId)) {
    return { ok: true };
  }
  if (!targetRideId) {
    return { ok: false, message: LOCKED_TO_OTHER_DRIVER_MESSAGE };
  }

  const doc = await PassengerRide.findOne({
    _id: passengerRideId,
    creator: userId,
  })
    .select("status assigned_to join_requested_By")
    .lean();

  if (!doc) {
    return { ok: false, message: "Passenger request not found" };
  }
  if (doc.status !== "pending") {
    return { ok: false, message: LOCKED_TO_OTHER_DRIVER_MESSAGE };
  }

  const lockedRideId = resolvePassengerLockedRideId(doc);
  if (lockedRideId && lockedRideId !== String(targetRideId)) {
    return { ok: false, message: LOCKED_TO_OTHER_DRIVER_MESSAGE };
  }

  return { ok: true };
};

/** Block linking a standalone courier My Request row to a second driver ride. */
const assertStandaloneCourierAvailableForRide = async (
  userId,
  courierId,
  targetRideId
) => {
  if (!courierId || !mongoose.Types.ObjectId.isValid(courierId)) {
    return { ok: true };
  }
  if (!targetRideId) {
    return { ok: false, message: LOCKED_TO_OTHER_DRIVER_MESSAGE };
  }

  const doc = await Courier.findOne({
    _id: courierId,
    creator: userId,
  })
    .select("courier_status driver_assigned_courier")
    .lean();

  if (!doc) {
    return { ok: false, message: "Courier request not found" };
  }
  if (!["pending", "request_to_driver"].includes(String(doc.courier_status || ""))) {
    return { ok: false, message: LOCKED_TO_OTHER_DRIVER_MESSAGE };
  }

  const lockedRideId = resolveCourierLockedRideId(doc);
  if (lockedRideId && lockedRideId !== String(targetRideId)) {
    return { ok: false, message: LOCKED_TO_OTHER_DRIVER_MESSAGE };
  }

  return { ok: true };
};

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
  linkStandalonePassengersForRideRequest,
  linkStandaloneCouriersForRideRequest,
  closeStandalonePassengerRequestsAfterJoin,
  closeStandaloneCourierRequestsAfterJoin,
  closeStandaloneRequestsAfterJoin,
  closeSiblingStandalonesAfterEnroutePick,
  closeOpenOppositeRoleStandalones,
  dedupeEnrouteRequestsByCreator,
  dedupeEnrouteRequestsByRequestId,
  LOCKED_TO_OTHER_DRIVER_MESSAGE,
  resolvePassengerLockedRideId,
  resolveCourierLockedRideId,
  assertStandalonePassengerAvailableForRide,
  assertStandaloneCourierAvailableForRide,
};
