const User = require("../models/userModel");
const { assignUserNoIfMissing } = require("../utils/userNoHelper");

/** Backfill permanent userNo for accounts created before the field existed. */
const ensureUserNos = async () => {
  const missing = await User.find({
    $or: [{ userNo: { $exists: false } }, { userNo: null }, { userNo: "" }],
  })
    .select("_id userNo")
    .limit(500);

  if (!missing.length) return;

  let updated = 0;
  for (const user of missing) {
    try {
      await assignUserNoIfMissing(user);
      updated += 1;
    } catch (err) {
      console.error(`userNo assign failed for ${user._id}:`, err.message);
    }
  }
  console.log(`userNo migration: assigned ${updated}/${missing.length} user(s)`);
};

module.exports = { ensureUserNos };
