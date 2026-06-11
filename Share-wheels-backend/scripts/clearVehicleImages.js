/**
 * Clears vehicle.car_image, vehicle.license_image, vehicle.rc_image for all users.
 * Usage: node scripts/clearVehicleImages.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const User = require("../src/models/userModel");
const { connectMongo, disconnectMongo, mongoUriHint } = require("./mongoConnect");

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set in .env");
    process.exit(1);
  }

  console.log("Connecting to:", mongoUriHint());
  await connectMongo();

  const before = await User.countDocuments({
    $or: [
      { "vehicle.car_image": { $exists: true, $nin: ["", null] } },
      { "vehicle.license_image": { $exists: true, $nin: ["", null] } },
      { "vehicle.rc_image": { $exists: true, $nin: ["", null] } },
    ],
  });

  const result = await User.updateMany(
    {},
    {
      $set: {
        "vehicle.car_image": "",
        "vehicle.license_image": "",
        "vehicle.rc_image": "",
      },
    }
  );

  console.log("Users with vehicle images before:", before);
  console.log("Users matched:", result.matchedCount);
  console.log("Users modified:", result.modifiedCount);

  await disconnectMongo();
  process.exit(0);
};

run().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
