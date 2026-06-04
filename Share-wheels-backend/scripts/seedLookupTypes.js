/**
 * Seeds default courier and vehicle type dropdown options for the mobile app.
 * Run: node scripts/seedLookupTypes.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { connectDatabase } = require("../src/config/database");
const lookupService = require("../src/services/lookupService");

const DEFAULTS = {
  courier_type: [
    { label: "Document", value: "document" },
    { label: "Parcel", value: "parcel" },
    { label: "Package", value: "package" },
  ],
  vehicle_type: [
    { label: "Car", value: "car" },
    { label: "SUV", value: "suv" },
    { label: "Hatchback", value: "hatchback" },
    { label: "Bike", value: "bike" },
    { label: "Van", value: "van" },
  ],
};

(async () => {
  await connectDatabase();
  for (const [category, items] of Object.entries(DEFAULTS)) {
    const res = await lookupService.bulkUpsert(category, items);
    console.log(category, res.body.message || res.body);
  }
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
