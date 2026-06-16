const LookupOption = require("../models/lookupOptionModel");
const { LOOKUP_CATEGORIES } = require("../models/lookupOptionModel");
const { DEFAULT_LOOKUP_TYPES } = require("../constants/defaultLookupTypes");
const { ALLOWED_VEHICLE_TYPES } = require("../constants/vehicleTypes");
const lookupService = require("../services/lookupService");

const syncVehicleTypeLookupOptions = async () => {
  const defaults = DEFAULT_LOOKUP_TYPES.vehicle_type || [];
  await lookupService.bulkUpsert("vehicle_type", defaults);

  await LookupOption.updateMany(
    { category: "vehicle_type", value: { $nin: ALLOWED_VEHICLE_TYPES } },
    { $set: { isActive: false } }
  );

  for (let i = 0; i < defaults.length; i += 1) {
    await LookupOption.updateOne(
      { category: "vehicle_type", value: defaults[i].value },
      { $set: { sortOrder: i, isActive: true, label: defaults[i].label } }
    );
  }

  console.log(`Synced vehicle_type options: ${ALLOWED_VEHICLE_TYPES.join(", ")}`);
};

/**
 * Ensures courier/vehicle dropdown options exist after MongoDB connects.
 * Vehicle types are always synced to bike, auto, car.
 */
const ensureDefaultLookupTypes = async () => {
  await syncVehicleTypeLookupOptions();

  for (const category of LOOKUP_CATEGORIES) {
    if (category === "vehicle_type") continue;

    const activeCount = await LookupOption.countDocuments({
      category,
      isActive: true,
    });
    if (activeCount > 0) continue;

    const defaults = DEFAULT_LOOKUP_TYPES[category] || [];
    if (!defaults.length) continue;

    await lookupService.bulkUpsert(category, defaults);
    console.log(`Seeded default ${category} options (${defaults.length})`);
  }
};

module.exports = { ensureDefaultLookupTypes, syncVehicleTypeLookupOptions };
