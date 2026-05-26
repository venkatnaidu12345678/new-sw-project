const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    mobile: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: "admin" },
  },
  { timestamps: true }
);

adminSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model("Admin", adminSchema);
