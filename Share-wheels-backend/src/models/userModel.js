const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, unique: true, required: true },
    mobile: { type: String, unique: true, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    password: { type: String, select: false },
    profile_img: { type: String, default: "" },
    vehicle: {
      company: { type: String, default: "" },
      model: { type: String, default: "" },
      type: { type: String, default: "" },
      license_number: { type: String, default: "" },
      car_image: { type: String, default: "" },
      car_no: { type: String, default: "" },
      issue_date: { type: Date },
      expiry_date: { type: Date },
    },
    fcmToken: { type: String },
    otp: { type: String },
    otpExpires: { type: Date },
    isVerified: { type: Boolean, default: false },
    isTermsAndServicesAccepted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
