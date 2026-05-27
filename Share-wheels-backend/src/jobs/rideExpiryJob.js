const { expireStalePendingRides } = require("../services/rideExpiryService");

const INTERVAL_MS = 10 * 60 * 1000;

let timer = null;

const startRideExpiryJob = () => {
  if (timer) return;

  const run = () => {
    expireStalePendingRides().catch((err) => {
      console.error("Ride expiry job error:", err.message);
    });
  };

  run();
  timer = setInterval(run, INTERVAL_MS);
  console.log("Ride expiry job started (every 10 minutes)");
};

module.exports = { startRideExpiryJob };
