/**
 * Seeds initial data after a fresh wipe (default admin account).
 * Override via ADMIN_NAME, ADMIN_EMAIL, ADMIN_MOBILE, ADMIN_PASSWORD in .env
 * Usage: node scripts/setupDatabase.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { connectMongo, disconnectMongo, mongoUriHint } = require("./mongoConnect");
const Admin = require("../src/models/adminModel");
const lookupService = require("../src/services/lookupService");
const { DEFAULT_LOOKUP_TYPES } = require("../src/constants/defaultLookupTypes");

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set in .env");
    process.exit(1);
  }

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before running db:setup");
    process.exit(1);
  }

  const admin = {
    name: process.env.ADMIN_NAME || "Share Wheels Admin",
    email: process.env.ADMIN_EMAIL.trim().toLowerCase(),
    mobile: process.env.ADMIN_MOBILE || "9999999999",
    password: process.env.ADMIN_PASSWORD,
  };

  console.log("Connecting to:", mongoUriHint());

  const connection = await connectMongo();
  const dbName = connection.db.databaseName;
  console.log(`Database: ${dbName}`);

  const existing = await Admin.findOne();
  if (existing) {
    existing.name = admin.name;
    existing.email = admin.email;
    existing.mobile = admin.mobile;
    existing.password = admin.password;
    await existing.save();
    console.log("Single admin synced from .env:");
  } else {
    await Admin.create(admin);
    console.log("Single admin created from .env:");
  }
  console.log(`  email: ${admin.email}`);
  console.log(`  mobile: ${admin.mobile}`);
  console.log(`  password: ${admin.password}`);

  for (const [category, items] of Object.entries(DEFAULT_LOOKUP_TYPES)) {
    const res = await lookupService.bulkUpsert(category, items);
    console.log(`Lookup ${category}:`, res.body.message || "ok");
  }

  await disconnectMongo();
  process.exit(0);
};

run().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
