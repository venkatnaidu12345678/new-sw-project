/**
 * Fixes duplicate open passenger+courier standalones and stale assignment fields.
 * Usage: node scripts/cleanupDuplicateRequests.js [--yes]
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const PassengerRide = require("../src/models/passengerRideModel");
const Courier = require("../src/models/courierModel");
const Ride = require("../src/models/rideModel");
const { connectMongo, disconnectMongo, mongoUriHint } = require("./mongoConnect");
const {
  OPEN_PASSENGER_FILTER,
  OPEN_COURIER_FILTER,
} = require("../src/services/requestExpiryService");
const { closeOpenOppositeRoleStandalones } = require("../src/utils/participantRequestCleanup");

const refUserId = (ref) =>
  ref?.userId?._id?.toString?.() ||
  ref?.userId?.toString?.() ||
  ref?._id?.toString?.() ||
  ref?.toString?.() ||
  "";

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

const run = async () => {
  const confirmed =
    process.argv.includes("--yes") || process.env.CONFIRM_CLEANUP_REQUESTS === "yes";
  if (!confirmed) {
    console.error(
      "Refusing to run. Pass --yes or set CONFIRM_CLEANUP_REQUESTS=yes to apply fixes."
    );
    process.exit(1);
  }

  console.log("Connecting to:", mongoUriHint());
  await connectMongo();

  const stats = {
    duplicateUsersFixed: 0,
    cancelledAssignmentsCleared: 0,
    orphanedAssignmentsReset: 0,
  };

  const openPassengers = await PassengerRide.find(OPEN_PASSENGER_FILTER).select("creator").lean();
  const openCouriers = await Courier.find(OPEN_COURIER_FILTER).select("creator").lean();

  const openPassengerByUser = new Map();
  openPassengers.forEach((row) => {
    const id = String(row.creator);
    openPassengerByUser.set(id, (openPassengerByUser.get(id) || 0) + 1);
  });

  const dualRoleUsers = new Set();
  openCouriers.forEach((row) => {
    const id = String(row.creator);
    if (openPassengerByUser.has(id)) dualRoleUsers.add(id);
  });

  for (const userId of dualRoleUsers) {
    await closeOpenOppositeRoleStandalones(userId, "passenger");
    stats.duplicateUsersFixed += 1;
  }

  const clearedPassengers = await PassengerRide.updateMany(
    {
      status: "cancelled",
      "assigned_to.rideId": { $exists: true, $ne: null },
    },
    { $set: { assigned_to: { userId: null, rideId: null } } }
  );
  const clearedCouriers = await Courier.updateMany(
    {
      courier_status: "cancelled",
      "driver_assigned_courier.rideId": { $exists: true, $ne: null },
    },
    { $set: { driver_assigned_courier: { userId: null, rideId: null } } }
  );
  stats.cancelledAssignmentsCleared =
    (clearedPassengers.modifiedCount || 0) + (clearedCouriers.modifiedCount || 0);

  const activeRides = await Ride.find({
    status: { $in: ["pending", "started"] },
  })
    .select("passengers all_deliveries passenger_requested_ride users_request_Couriers")
    .lean();

  const participantByRide = new Map(
    activeRides.map((ride) => [String(ride._id), collectRideParticipantUserIds(ride)])
  );

  const assignedPassengers = await PassengerRide.find({
    "assigned_to.rideId": { $exists: true, $ne: null },
    status: { $nin: ["cancelled", "expired"] },
  }).lean();

  for (const doc of assignedPassengers) {
    const rideId = String(doc.assigned_to?.rideId || "");
    const userId = String(doc.creator);
    const participants = participantByRide.get(rideId);
    if (!participants || !participants.has(userId)) {
      await PassengerRide.updateOne(
        { _id: doc._id },
        {
          $set: {
            status: "pending",
            assigned_to: { userId: null, rideId: null },
          },
        }
      );
      stats.orphanedAssignmentsReset += 1;
    }
  }

  const assignedCouriers = await Courier.find({
    "driver_assigned_courier.rideId": { $exists: true, $ne: null },
    courier_status: { $nin: ["cancelled", "expired"] },
  }).lean();

  for (const doc of assignedCouriers) {
    const rideId = String(doc.driver_assigned_courier?.rideId || "");
    const userId = String(doc.creator);
    const participants = participantByRide.get(rideId);
    if (!participants || !participants.has(userId)) {
      await Courier.updateOne(
        { _id: doc._id },
        {
          $set: {
            courier_status: "pending",
            driver_assigned_courier: { userId: null, rideId: null },
          },
        }
      );
      stats.orphanedAssignmentsReset += 1;
    }
  }

  console.log("Cleanup complete:", stats);
  await disconnectMongo();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("Failed:", err.message);
  try {
    await disconnectMongo();
  } catch (_) {}
  process.exit(1);
});
