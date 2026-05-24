/**
 * Drops all data in the database configured by MONGO_URI in .env
 * Usage: node scripts/clearDatabase.js
 * Requires: CONFIRM_CLEAR_DB=yes in environment or pass --yes flag
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");

const run = async () => {
  const confirmed =
    process.argv.includes("--yes") ||
    process.env.CONFIRM_CLEAR_DB === "yes";

  if (!confirmed) {
    console.error(
      "Refusing to run. Pass --yes or set CONFIRM_CLEAR_DB=yes to wipe the database."
    );
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set in .env");
    process.exit(1);
  }

  const dbHint = process.env.MONGO_URI.includes("@")
    ? process.env.MONGO_URI.split("@")[1]
    : process.env.MONGO_URI;

  console.log("Connecting to:", dbHint);

  await mongoose.connect(process.env.MONGO_URI);
  const dbName = mongoose.connection.db.databaseName;

  console.log(`Dropping database: ${dbName}`);
  await mongoose.connection.dropDatabase();
  console.log("Done — all collections and data removed.");

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
