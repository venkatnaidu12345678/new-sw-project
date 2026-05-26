const Admin = require("../models/adminModel");

/**
 * Ensures the single admin from .env exists (runs after MongoDB connects).
 */
const ensureDefaultAdmin = async () => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const name = process.env.ADMIN_NAME?.trim() || "Share Wheels Admin";
  const mobile = process.env.ADMIN_MOBILE?.trim() || "9999999999";

  if (!email || !password) {
    console.warn(
      "ADMIN_EMAIL and ADMIN_PASSWORD not set in .env — admin login will not work until you run npm run db:setup"
    );
    return;
  }

  let admin = await Admin.findOne();
  if (!admin) {
    admin = await Admin.create({ name, email, mobile, password });
    console.log("Default admin created from .env:", email);
    return;
  }

  const needsSync =
    admin.email?.toLowerCase() !== email ||
    admin.mobile !== mobile ||
    admin.name !== name;

  if (needsSync) {
    admin.name = name;
    admin.email = email;
    admin.mobile = mobile;
    await admin.save();
    console.log("Admin profile synced from .env:", email);
  }
};

module.exports = { ensureDefaultAdmin };
