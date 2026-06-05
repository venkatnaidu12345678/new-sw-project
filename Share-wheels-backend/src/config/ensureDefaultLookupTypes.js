const LookupOption = require("../models/lookupOptionModel");
const { LOOKUP_CATEGORIES } = require("../models/lookupOptionModel");
const { DEFAULT_LOOKUP_TYPES } = require("../constants/defaultLookupTypes");
const lookupService = require("../services/lookupService");

/**
 * Ensures courier/vehicle dropdown options exist after MongoDB connects.
 * Seeds defaults only when a category has no active rows.
 */
const ensureDefaultLookupTypes = async () => {
  for (const category of LOOKUP_CATEGORIES) {
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

module.exports = { ensureDefaultLookupTypes };
