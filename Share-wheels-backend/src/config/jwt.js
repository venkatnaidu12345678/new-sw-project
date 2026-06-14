/** User/admin session length — default 1 year. Override via JWT_EXPIRES_IN (e.g. 30d, 365d). */
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "365d";

module.exports = { JWT_EXPIRES_IN };
