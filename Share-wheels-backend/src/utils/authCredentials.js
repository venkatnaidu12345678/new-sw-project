const bcrypt = require("bcryptjs");
const User = require("../models/userModel");

const BCRYPT_HASH_RE = /^\$2[aby]\$\d{2}\$.+/;

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Find user by email (exact lowercase, then case-insensitive fallback for legacy rows). */
const findUserByEmail = async (email) => {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return null;

  let user = await User.findOne({ email: normalized }).select("+password +passwordPlain");
  if (user) return user;

  return User.findOne({
    email: { $regex: new RegExp(`^${escapeRegExp(normalized)}$`, "i") },
  }).select("+password +passwordPlain");
};

/**
 * Verify password for legacy accounts (plain text) and re-hash when needed.
 */
const verifyUserPassword = async (user, passwordStr) => {
  const stored = user.password;
  let valid = false;
  let shouldRehash = false;

  if (stored && BCRYPT_HASH_RE.test(stored)) {
    valid = await bcrypt.compare(passwordStr, stored);
  } else if (stored && stored === passwordStr) {
    valid = true;
    shouldRehash = true;
  }

  if (!valid && user.passwordPlain && user.passwordPlain === passwordStr) {
    valid = true;
    shouldRehash = true;
  }

  if (valid && shouldRehash) {
    user.password = await bcrypt.hash(passwordStr, 10);
  }

  return valid;
};

/** Find user by 10-digit Indian mobile stored on the account. */
const findUserByMobile = async (mobile) => {
  const normalized = String(mobile || "").replace(/\D/g, "").slice(-10);
  if (!normalized) return null;
  return User.findOne({ mobile: normalized }).select("+password +passwordPlain");
};

module.exports = {
  findUserByEmail,
  findUserByMobile,
  verifyUserPassword,
};
