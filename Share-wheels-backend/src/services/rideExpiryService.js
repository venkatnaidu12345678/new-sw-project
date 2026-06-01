const Ride = require("../models/rideModel");
const UserRides = require("../models/userRides");
const { isRidePastStartGracePeriod } = require("../utils/rideScheduleUtils");
const { notifyUser } = require("./notificationService");
const { emitRideParticipantsUpdated } = require("../utils/socketEmit");

const EXPIRE_REASON =
  "Ride expired: driver did not start within 2 hours of the scheduled time";

const refIdStr = (ref) =>
  ref?._id?.toString?.() || ref?.toString?.() || "";

const collectParticipantIds = (ride) => {
  const ids = new Set();
  const add = (id) => {
    const s = refIdStr(id);
    if (s) ids.add(s);
  };
  add(ride.creator);
  (ride.passengers || []).forEach((p) => add(p.userId));
  (ride.all_deliveries || []).forEach((d) => add(d.userId));
  (ride.passenger_requested_ride || []).forEach((r) => add(r.userId));
  (ride.users_request_Couriers || []).forEach((c) => add(c.userId));
  return [...ids];
};

const expireRide = async (rideInput) => {
  const ride =
    rideInput?.save && typeof rideInput.save === "function"
      ? rideInput
      : await Ride.findById(rideInput?._id || rideInput);

  if (!ride || ride.status !== "pending") return false;
  if (!isRidePastStartGracePeriod(ride)) return false;

  ride.status = "expired";
  ride.cancel_reason = EXPIRE_REASON;
  await ride.save();

  await UserRides.updateMany(
    {},
    {
      $pull: {
        my_pending_ride_requests: { rideId: ride._id },
        driver_accepted_ride_requests: { rideId: ride._id },
      },
    }
  );

  const route = `${ride.from} → ${ride.to}`;
  const driverId = refIdStr(ride.creator);
  const participantIds = collectParticipantIds(ride);

  await Promise.all(
    participantIds.map((uid) =>
      notifyUser(uid, {
        title: "Ride expired",
        body:
          uid === driverId
            ? `Your scheduled ride (${route}) expired because it was not started within 2 hours.`
            : `Ride (${route}) expired because the driver did not start within 2 hours of the scheduled time.`,
        type: "ride_expired",
        data: { rideId: ride._id.toString() },
      })
    )
  );

  if (global.io) {
    global.io.emit("rideExpired", { rideId: ride._id.toString() });
    emitRideParticipantsUpdated(ride._id, { action: "expired" });
  }

  return true;
};

/** Mark pending rides as expired when scheduled start + grace window has passed without a start. */
const expireStalePendingRides = async () => {
  const candidates = await Ride.find({ status: "pending" }).lean();
  let expiredCount = 0;
  for (const candidate of candidates) {
    if (!isRidePastStartGracePeriod(candidate)) continue;
    const didExpire = await expireRide(candidate);
    if (didExpire) expiredCount += 1;
  }
  return expiredCount;
};

/** Expire one pending ride if past the grace window; returns updated status. */
const expirePendingRideIfStale = async (rideInput) => {
  if (!rideInput) return { expired: false, ride: null };
  const ride =
    rideInput?.save && typeof rideInput.save === "function"
      ? rideInput
      : await Ride.findById(rideInput?._id || rideInput);
  if (!ride || ride.status !== "pending") {
    return { expired: false, ride };
  }
  if (!isRidePastStartGracePeriod(ride)) {
    return { expired: false, ride };
  }
  const didExpire = await expireRide(ride);
  if (!didExpire) return { expired: false, ride };
  const refreshed = await Ride.findById(ride._id);
  return { expired: true, ride: refreshed };
};

module.exports = {
  expireRide,
  expireStalePendingRides,
  expirePendingRideIfStale,
  EXPIRE_REASON,
};
