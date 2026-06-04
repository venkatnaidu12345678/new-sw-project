const Ride = require("../models/rideModel");
const { parseRideScheduledStart, formatStartTimeHHmm } = require("../utils/rideScheduleUtils");
const { notifyUser } = require("./notificationService");

/**
 * Notify drivers when a pending ride's scheduled start time has been reached.
 * Sends once per ride (tracked via scheduledStartNotifiedAt).
 */
const processScheduledRideStartReminders = async () => {
  const now = Date.now();
  const candidates = await Ride.find({
    status: "pending",
    scheduledStartNotifiedAt: null,
  })
    .select("creator from to date startTime scheduledStartNotifiedAt status")
    .lean();

  let notified = 0;

  for (const ride of candidates) {
    const scheduledStart = parseRideScheduledStart(ride);
    if (!scheduledStart || Number.isNaN(scheduledStart.getTime())) continue;
    if (scheduledStart.getTime() > now) continue;

    const route = `${ride.from || ""} → ${ride.to || ""}`.trim() || "your ride";
    const timeLabel = formatStartTimeHHmm(scheduledStart) || ride.startTime || "";

    try {
      await notifyUser(ride.creator, {
        title: "Start Ride",
        body: `Your scheduled ride (${route}) is ready to start${timeLabel ? ` — ${timeLabel}` : ""}.`,
        type: "ride_start_reminder",
        data: { rideId: ride._id.toString(), action: "start_ride" },
      });

      await Ride.updateOne(
        { _id: ride._id, status: "pending", scheduledStartNotifiedAt: null },
        { $set: { scheduledStartNotifiedAt: new Date() } }
      );
      notified += 1;
    } catch (err) {
      console.warn(
        `[rideStartReminder] ride ${ride._id}:`,
        err?.message || err
      );
    }
  }

  return notified;
};

module.exports = { processScheduledRideStartReminders };
