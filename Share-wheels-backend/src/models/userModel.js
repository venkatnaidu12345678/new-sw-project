const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    mobile: { type: String, unique: true, required: true },
    /** Permanent rider ID for OTP verification (immutable) */
    userNo: {
      type: String,
      unique: true,
      sparse: true,
      immutable: true,
      index: true,
    },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    password: { type: String, select: false },
    /** Plain password copy for admin panel only (set at registration). Login hash stays in `password`. */
    passwordPlain: { type: String, select: false },
    profile_img: { type: String, default: "" },
    vehicle: {
      company: { type: String, default: "" },
      model: { type: String, default: "" },
      type: { type: String, default: "" },
      license_number: { type: String, default: "" },
      car_image: { type: String, default: "" },
      license_image: { type: String, default: "" },
      rc_image: { type: String, default: "" },
      car_no: { type: String, default: "" },
      owner_name: { type: String, default: "" },
      issue_date: { type: Date },
      expiry_date: { type: Date },
    },
    fcmToken: { type: String },
    otp: { type: String },
    otpExpires: { type: Date },
    /** Distinguishes login/signup OTP from password reset OTP */
    otpPurpose: { type: String, enum: ["login", "password_reset"], default: null },
    isVerified: { type: Boolean, default: false },
    isTermsAndServicesAccepted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function assignUserNo() {
  if (!this.isNew || this.userNo) return;
  const User = this.constructor;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = String(Math.floor(100000 + Math.random() * 900000));
    if (!(await User.exists({ userNo: candidate }))) {
      this.userNo = candidate;
      return;
    }
  }
  throw new Error("Could not generate unique user number");
});

userSchema.pre("findOneAndUpdate", function blockUserNoChange() {
  const update = this.getUpdate() || {};
  const set = update.$set || update;
  if (set.userNo !== undefined) {
    throw new Error("userNo cannot be changed");
  }
});

module.exports = mongoose.model("User", userSchema);
