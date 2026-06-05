/**
 * Seeds default courier and vehicle type dropdown options for the mobile app.
 * Run: node scripts/seedLookupTypes.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { connectMongo, disconnectMongo } = require("./mongoConnect");
const lookupService = require("../src/services/lookupService");
const { DEFAULT_LOOKUP_TYPES } = require("../src/constants/defaultLookupTypes");

(async () => {
  await connectMongo();
  for (const [category, items] of Object.entries(DEFAULT_LOOKUP_TYPES)) {
    const res = await lookupService.bulkUpsert(category, items);
    console.log(category, res.body.message || res.body);
  }
  await disconnectMongo();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
