const User = require("../models/userModel");

const generateCandidate = () =>
  String(Math.floor(100000 + Math.random() * 900000));

/** Unique 6-digit user number (immutable per user). */
const generateUniqueUserNo = async () => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const userNo = generateCandidate();
    const exists = await User.exists({ userNo });
    if (!exists) return userNo;
  }
  throw new Error("Could not generate unique user number");
};

const assignUserNoIfMissing = async (userDoc) => {
  if (!userDoc || userDoc.userNo) return userDoc?.userNo;
  const userNo = await generateUniqueUserNo();
  userDoc.userNo = userNo;
  await userDoc.save();
  return userNo;
};

module.exports = {
  generateUniqueUserNo,
  assignUserNoIfMissing,
};
