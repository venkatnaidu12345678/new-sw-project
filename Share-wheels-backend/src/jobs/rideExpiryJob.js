const { expireStalePendingRides } = require("../services/rideExpiryService");
const { expireStaleOpenRequests } = require("../services/requestExpiryService");

const INTERVAL_MS = 5 * 60 * 1000;

let timer = null;

const startRideExpiryJob = () => {
  if (timer) return;

  const run = async () => {
    try {
      const ridesExpired = await expireStalePendingRides();
      const requestResult = await expireStaleOpenRequests();
      const requestsExpired = requestResult.total || 0;
      if (ridesExpired > 0 || requestsExpired > 0) {
        console.log(
          `Expiry job: ${ridesExpired} ride(s), ${requestsExpired} open request(s) marked expired`
        );
      }
    } catch (err) {
      console.error("Scheduled expiry job error:", err.message);
    }
  };

  run();
  timer = setInterval(run, INTERVAL_MS);
  console.log(
    "Scheduled expiry job started (every 5 min: rides after 2h grace, requests after date range, notifications via TTL)"
  );
};

module.exports = { startRideExpiryJob };
