const jwt = require("jsonwebtoken");
const { JWT_EXPIRES_IN } = require("../config/jwt");
const bcrypt = require("bcryptjs");
const Admin = require("../models/adminModel");

const register = async ({ name, email, mobile, password }) => {
  const adminCount = await Admin.countDocuments();
  if (adminCount > 0) {
    return {
      status: 403,
      body: {
        message:
          "Only one admin is allowed. Use credentials from .env (ADMIN_EMAIL / ADMIN_PASSWORD).",
      },
    };
  }
  const exists = await Admin.findOne({ $or: [{ email }, { mobile }] });
  if (exists) return { status: 400, body: { message: "Admin already exists" } };
  const admin = await Admin.create({ name, email, mobile, password });
  return { status: 200, body: { message: "Admin registered successfully", adminId: admin._id } };
};

const login = async ({ email, password }) => {
  if (!email || !password) return { status: 400, body: { message: "Email & password required" } };
  const normalizedEmail = String(email).trim().toLowerCase();
  const admin = await Admin.findOne({ email: normalizedEmail });
  if (!admin) {
    const hint = process.env.ADMIN_EMAIL
      ? ` Use ADMIN_EMAIL from .env: ${process.env.ADMIN_EMAIL.trim().toLowerCase()}`
      : "";
    return { status: 404, body: { message: `Admin not found.${hint}` } };
  }
  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) return { status: 401, body: { message: "Invalid credentials" } };
  const token = jwt.sign({ id: admin._id, role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
  return {
    status: 200,
    body: {
      message: "Admin login successful",
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email, mobile: admin.mobile },
    },
  };
};

module.exports = { register, login };
