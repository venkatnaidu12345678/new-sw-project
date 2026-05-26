require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const User = require("../src/models/userModel");
const { listRidesByPhase } = require("../src/services/rideService");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne();
    if (!user) {
      console.log("No users in DB");
      process.exit(0);
    }
    console.log("Testing with user", user._id.toString());
    const result = await listRidesByPhase(user, false);
    console.log("OK", result.status, result.body.count);
  } catch (e) {
    console.error("FAILED:", e.message);
    console.error(e.stack);
  } finally {
    await mongoose.disconnect();
  }
})();
