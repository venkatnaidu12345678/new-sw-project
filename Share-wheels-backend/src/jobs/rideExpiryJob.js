const { expireStalePendingRides } = require("../services/rideExpiryService");
const { expireStaleOpenRequests } = require("../services/requestExpiryService");
const { processScheduledRideStartReminders } = require("../services/rideStartReminderService");

const INTERVAL_MS = 5 * 60 * 1000;

let timer = null;

const startRideExpiryJob = () => {
  if (timer) return;

  const run = async () => {
    try {
      const startReminders = await processScheduledRideStartReminders();
      const ridesExpired = await expireStalePendingRides();
      const requestResult = await expireStaleOpenRequests();
      const requestsExpired = requestResult.total || 0;
      if (startReminders > 0 || ridesExpired > 0 || requestsExpired > 0) {
        console.log(
          `Scheduled ride job: ${startReminders} start reminder(s), ${ridesExpired} ride(s) expired, ${requestsExpired} open request(s) expired`
        );
      }
    } catch (err) {
      console.error("Scheduled expiry job error:", err.message);
    }
  };

  run();
  timer = setInterval(run, INTERVAL_MS);
  console.log(
    "Scheduled ride job started (every 5 min: start reminders, ride expiry, request expiry)"
  );
};

module.exports = { startRideExpiryJob };
