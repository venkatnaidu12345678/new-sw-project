const dns = require("dns");
const mongoose = require("mongoose");

const connectDatabase = () => {
  if (process.env.DNS_SERVERS) {
    dns.setServers(process.env.DNS_SERVERS.split(",").map((s) => s.trim()));
  } else if (process.platform === "win32") {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  }

  const { ensureDefaultAdmin } = require("./ensureDefaultAdmin");
  const { ensureUserNos } = require("./ensureUserNos");
  const { startRideExpiryJob } = require("../jobs/rideExpiryJob");
  const { startNotificationCleanupJob } = require("../jobs/notificationCleanupJob");

  mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
      console.log("MongoDB Connected");
      try {
        await ensureDefaultAdmin();
        await ensureUserNos();
        startRideExpiryJob();
        startNotificationCleanupJob();
      } catch (err) {
        console.error("Startup seed error:", err.message);
      }
    })
    .catch((err) => console.log("MongoDB Error:", err.message));

  console.log("MONGO_URI exists:", !!process.env.MONGO_URI);
  if (process.env.MONGO_URI && process.env.MONGO_URI.includes("@")) {
    console.log("Using DB:", process.env.MONGO_URI.split("@")[1]);
  }
};

module.exports = {
  connectDatabase,
};
