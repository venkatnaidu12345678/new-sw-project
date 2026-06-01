const { purgeExpiredNotifications } = require("../services/notificationService");

const INTERVAL_MS = 60 * 60 * 1000;

let timer = null;

const startNotificationCleanupJob = () => {
  if (timer) return;

  const run = () => {
    purgeExpiredNotifications()
      .then((deleted) => {
        if (deleted > 0) {
          console.log(`Notification cleanup: removed ${deleted} expired`);
        }
      })
      .catch((err) => {
        console.error("Notification cleanup job error:", err.message);
      });
  };

  run();
  timer = setInterval(run, INTERVAL_MS);
  console.log("Notification cleanup job started (every hour, 24h TTL)");
};

module.exports = { startNotificationCleanupJob };
