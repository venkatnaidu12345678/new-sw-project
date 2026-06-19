const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const generateOtpWithExpiry = require("../utils/otpHelper");
const {
  ensureFirebaseAuthUser,
  updateFirebaseAuthPassword,
  requestFirebasePasswordReset,
  signInWithFirebasePassword,
} = require("../utils/firebaseAuthAdmin");
const {
  ALLOWED_VEHICLE_TYPES,
  normalizeAllowedVehicleType,
} = require("../constants/vehicleTypes");
// const sendOtp = require("../utils/sendOtp");

const FORGOT_PASSWORD_MESSAGE =
  "Password reset email sent. If you do not see it in your inbox within a few minutes, check your spam or junk folder and mark it as Not spam.";

const resolveVehicleTypeInput = (type) => {
  const normalized = normalizeAllowedVehicleType(type);
  if (!normalized) {
    return {
      ok: false,
      message: `Vehicle type must be one of: ${ALLOWED_VEHICLE_TYPES.join(", ")}`,
    };
  }
  return { ok: true, value: normalized };
};
const { notifyUser } = require("./notificationService");
const { assignUserNoIfMissing } = require("../utils/userNoHelper");
const { findUserByEmail, findUserByMobile, verifyUserPassword } = require("../utils/authCredentials");
const { validateUserFields, EMAIL_RE, MOBILE_RE, normalizeEmail, normalizeMobile } = require("../utils/userValidation");
const { JWT_EXPIRES_IN } = require("../config/jwt");
const vehicleDocumentOcrService = require("./vehicleDocumentOcrService");

const toAuthUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  mobile: user.mobile,
  gender: user.gender,
  profile_img: user.profile_img,
  userNo: user.userNo,
});

const issueToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const register = async ({ name, email, mobile, gender, password }) => {
  const validated = validateUserFields({ name, email, mobile, gender, password, requirePassword: true });
  if (!validated.ok) {
    return { status: 400, body: { success: false, message: validated.message } };
  }

  const emailTaken = await findUserByEmail(validated.email);
  if (emailTaken) {
    return { status: 400, body: { success: false, message: "Email is already registered" } };
  }
  const mobileTaken = await User.findOne({ mobile: validated.mobile });
  if (mobileTaken) {
    return { status: 400, body: { success: false, message: "Mobile number is already registered" } };
  }

  const hashedPassword = await bcrypt.hash(validated.password, 10);
  let user;
  try {
    user = await User.create({
      name: validated.name,
      email: validated.email,
      mobile: validated.mobile,
      gender: validated.gender,
      password: hashedPassword,
      passwordPlain: validated.password,
      isVerified: true,
      otp: null,
      otpExpires: null,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return { status: 400, body: { success: false, message: "Email or mobile already registered" } };
    }
    throw err;
  }

  const firebaseOnRegister = await ensureFirebaseAuthUser(validated.email, validated.password);
  if (!firebaseOnRegister.ok) {
    console.warn(
      "[Register] Firebase Auth user not created:",
      firebaseOnRegister.reason || "unknown"
    );
  }

  try {
    const { ensureDefaultSubscription } = require("./driverSubscriptionService");
    await ensureDefaultSubscription(user._id);
  } catch (subErr) {
    console.warn("[Register] Free plan assignment skipped:", subErr?.message);
  }

  const token = issueToken(user);
  return {
    status: 200,
    body: {
      success: true,
      message: "Registration successful",
      token,
      user: toAuthUser(user),
    },
  };
};

const login = async ({ email, mobile, password, fcmToken }) => {
  if (!password) {
    return {
      status: 400,
      body: { success: false, message: "Password is required" },
    };
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedMobile = normalizeMobile(mobile);
  const emailLooksLikeMobile =
    normalizedEmail && !normalizedEmail.includes("@") && MOBILE_RE.test(normalizeMobile(normalizedEmail));

  let user = null;
  if (normalizedEmail && EMAIL_RE.test(normalizedEmail)) {
    user = await findUserByEmail(normalizedEmail);
  } else if (normalizedMobile && MOBILE_RE.test(normalizedMobile)) {
    user = await findUserByMobile(normalizedMobile);
  } else if (emailLooksLikeMobile) {
    user = await findUserByMobile(normalizeMobile(normalizedEmail));
  } else {
    return {
      status: 400,
      body: { success: false, message: "Enter a valid email or 10-digit mobile number" },
    };
  }

  if (!user) {
    return {
      status: 401,
      body: { success: false, message: "Invalid email/mobile or password" },
    };
  }

  const passwordStr = String(password);
  if (!user.password && !user.passwordPlain) {
    return {
      status: 400,
      body: {
        success: false,
        message: "This account has no password set. Please sign up again or contact support.",
      },
    };
  }

  let valid = await verifyUserPassword(user, passwordStr);
  if (
    !valid &&
    normalizedEmail &&
    EMAIL_RE.test(normalizedEmail) &&
    user.email
  ) {
    const firebaseLogin = await signInWithFirebasePassword(user.email, passwordStr);
    if (firebaseLogin.ok) {
      user.password = await bcrypt.hash(passwordStr, 10);
      user.passwordPlain = passwordStr;
      valid = true;
    }
  }
  if (!valid) {
    return { status: 401, body: { success: false, message: "Invalid email/mobile or password" } };
  }

  if (normalizedEmail && EMAIL_RE.test(normalizedEmail) && user.email !== normalizedEmail) {
    user.email = normalizedEmail;
  }
  user.isVerified = true;
  user.passwordPlain = passwordStr;
  if (fcmToken) {
    user.fcmToken = String(fcmToken).trim();
  }
  await user.save();

  const token = issueToken(user);
  return {
    status: 200,
    body: {
      success: true,
      message: "Login successful",
      token,
      user: toAuthUser(user),
      fcmRegistered: !!user.fcmToken,
    },
  };
};

const verifyOtp = async ({ userId, otp, fcmToken }) => {
  if (!userId || !otp) {
    return { status: 400, body: { success: false, message: "User ID and OTP are required" } };
  }
  const user = await User.findById(userId);
  if (!user) return { status: 404, body: { success: false, message: "User not found" } };
  if (!user.otp) {
    return {
      status: 400,
      body: { success: false, message: "No OTP pending for this account. Sign in with email instead." },
    };
  }
  if (user.otpPurpose === "password_reset") {
    return {
      status: 400,
      body: {
        success: false,
        message: "This code is for password reset. Use Forgot password on the sign-in screen.",
      },
    };
  }
  if (String(user.otp) !== String(otp).trim()) {
    return { status: 400, body: { success: false, message: "Invalid OTP" } };
  }
  if (!user.otpExpires || user.otpExpires < Date.now()) {
    return { status: 400, body: { success: false, message: "OTP expired. Request a new code." } };
  }

  user.isVerified = true;
  user.otp = null;
  user.otpExpires = null;
  user.otpPurpose = null;
  if (fcmToken) user.fcmToken = String(fcmToken).trim();
  await user.save();

  const token = issueToken(user);
  return {
    status: 200,
    body: {
      success: true,
      message: "OTP verified successfully",
      token,
      user: toAuthUser(user),
    },
  };
};

const verifyToken = async (authHeader) => {
  const token = authHeader?.split(" ")[1];
  if (!token) return { status: 401, body: { success: false, message: "Token missing" } };
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return { status: 404, body: { success: false, message: "User not found" } };
    return {
      status: 200,
      body: { success: true, message: "Token valid", user: { id: user._id, name: user.name, mobile: user.mobile } },
    };
  } catch (err) {
    const expired = err?.name === "TokenExpiredError";
    return {
      status: 401,
      body: {
        success: false,
        message: expired ? "Token expired" : "Invalid token",
        code: expired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
      },
    };
  }
};

const registerFcmToken = async (user, fcmToken) => {
  if (!fcmToken) return { status: 400, body: { message: "fcmToken is required" } };
  user.fcmToken = String(fcmToken).trim();
  await user.save();
  return {
    status: 200,
    body: {
      success: true,
      message: "FCM token saved successfully",
      fcmRegistered: true,
      tokenLength: user.fcmToken.length,
    },
  };
};

const clearFcmToken = async (user) => {
  user.fcmToken = undefined;
  await user.save();
  return {
    status: 200,
    body: { success: true, message: "FCM token cleared" },
  };
};

const getPushStatus = async (user) => {
  const { isFirebaseReady } = require("../utils/firebaseAdmin");
  return {
    status: 200,
    body: {
      success: true,
      hasFcmToken: !!user.fcmToken,
      tokenLength: user.fcmToken ? user.fcmToken.length : 0,
      serverCanSendPush: isFirebaseReady(),
    },
  };
};

const updateProfileImage = async (user, profile_img) => {
  if (!profile_img) {
    return { status: 400, body: { success: false, message: "Profile image URL is required" } };
  }
  const url = String(profile_img).trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Upload image via /auth/upload-image first, then send the returned URL",
      },
    };
  }
  const isUpdate = !!user.profile_img;
  user.profile_img = url;
  await user.save();
  return {
    status: 200,
    body: {
      message: isUpdate ? "Profile image updated successfully" : "Profile image added successfully",
      profile_img: user.profile_img,
    },
  };
};

const sendNotification = async ({ userId, title, body, data, type }) => {
  if (!userId || !title || !body) {
    return { status: 400, body: { message: "userId, title, and body are required" } };
  }
  const targetUser = await User.findById(userId);
  if (!targetUser) return { status: 404, body: { message: "Target user not found" } };
  const result = await notifyUser(userId, {
    title,
    body,
    type: type || data?.type || "general",
    data: data || {},
  });
  return {
    status: 200,
    body: {
      success: true,
      message: "Notification sent successfully",
      pushed: result.pushed,
      saved: result.saved,
    },
  };
};

const { resolveImageUrl } = require("../config/cloudinary");

const buildVehicleImages = async (body, files = {}) => {
  const uploadOne = (file, existing, subfolder) =>
    resolveImageUrl(file, existing, subfolder);
  const car_image = await uploadOne(
    files.car_image?.[0],
    body.car_image,
    "vehicles"
  );
  const license_image = await uploadOne(
    files.license_image?.[0],
    body.license_image,
    "vehicles"
  );
  const rc_image = await uploadOne(files.rc_image?.[0], body.rc_image, "vehicles");
  return { car_image, license_image, rc_image };
};

const addVehicle = async (user, body, files = {}) => {
  const { company, model, type, license_number, issue_date, expiry_date, car_no, owner_name } =
    body || {};

  if (!company?.trim() || !model?.trim() || !type?.trim()) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Company, model, and vehicle type are required",
      },
    };
  }

  const typeCheck = resolveVehicleTypeInput(type);
  if (!typeCheck.ok) {
    return { status: 400, body: { success: false, message: typeCheck.message } };
  }

  if (!car_no?.trim() && !license_number?.trim()) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Licence number or vehicle registration number is required",
      },
    };
  }

  let images;
  try {
    images = await buildVehicleImages(body, files);
  } catch (err) {
    return {
      status: 500,
      body: { success: false, message: err.message || "Image upload failed" },
    };
  }

  if (!images.license_image && !images.rc_image) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Upload and verify at least your driving licence or RC photo",
      },
    };
  }
  if (images.license_image && !license_number?.trim()) {
    return {
      status: 400,
      body: { success: false, message: "Driving licence number is required when licence photo is uploaded" },
    };
  }
  if (images.rc_image && !car_no?.trim()) {
    return {
      status: 400,
      body: { success: false, message: "Registration number is required when RC photo is uploaded" },
    };
  }
  if (!images.car_image) {
    return {
      status: 400,
      body: { success: false, message: "Vehicle photo is required" },
    };
  }
  if (issue_date && expiry_date && new Date(issue_date) > new Date(expiry_date)) {
    return {
      status: 400,
      body: { success: false, message: "Issue date cannot be after expiry date" },
    };
  }

  user.vehicle = {
    company: company.trim(),
    model: model.trim(),
    type: typeCheck.value,
    license_number: license_number?.trim() || "",
    car_no: car_no?.trim() || "",
    owner_name: owner_name?.trim() || "",
    car_image: images.car_image || "",
    license_image: images.license_image,
    rc_image: images.rc_image,
    issue_date: issue_date || undefined,
    expiry_date: expiry_date || undefined,
  };
  await user.save();
  return {
    status: 200,
    body: {
      success: true,
      message: "Vehicle added/updated successfully",
      vehicle: user.vehicle,
    },
  };
};

const scanVehicleDocument = async (file, documentType) => {
  if (!file?.buffer?.length) {
    return {
      status: 400,
      body: { success: false, ok: false, message: "Image file is required (field: image)" },
    };
  }

  return vehicleDocumentOcrService.scanDocumentBuffer(
    file.buffer,
    documentType,
    file.mimetype || "image/jpeg"
  );
};

const editVehicle = async (user, body, files = {}) => {
  if (!user.vehicle) {
    return { status: 404, body: { success: false, message: "No vehicle found to update" } };
  }

  const { company, model, type, license_number, issue_date, expiry_date, car_no, owner_name } =
    body || {};

  let images;
  try {
    images = await buildVehicleImages(body, files);
  } catch (err) {
    return {
      status: 500,
      body: { success: false, message: err.message || "Image upload failed" },
    };
  }

  if (company !== undefined) user.vehicle.company = company;
  if (model !== undefined) user.vehicle.model = model;
  if (type !== undefined) {
    const typeCheck = resolveVehicleTypeInput(type);
    if (!typeCheck.ok) {
      return { status: 400, body: { success: false, message: typeCheck.message } };
    }
    user.vehicle.type = typeCheck.value;
  }
  if (license_number !== undefined) user.vehicle.license_number = license_number;
  if (car_no !== undefined) user.vehicle.car_no = car_no;
  if (owner_name !== undefined) user.vehicle.owner_name = String(owner_name || "").trim();
  if (issue_date !== undefined) user.vehicle.issue_date = issue_date;
  if (expiry_date !== undefined) user.vehicle.expiry_date = expiry_date;
  if (images.car_image) user.vehicle.car_image = images.car_image;
  if (images.license_image) user.vehicle.license_image = images.license_image;
  if (images.rc_image) user.vehicle.rc_image = images.rc_image;

  if (user.vehicle.issue_date && user.vehicle.expiry_date && new Date(user.vehicle.issue_date) > new Date(user.vehicle.expiry_date)) {
    return { status: 400, body: { success: false, message: "Issue date cannot be after expiry date" } };
  }

  await user.save();
  return {
    status: 200,
    body: { success: true, message: "Vehicle updated successfully", vehicle: user.vehicle },
  };
};

const updateTerms = async (userId, isAccepted) => {
  if (typeof isAccepted !== "boolean") return { status: 400, body: { success: false, message: "isAccepted must be true or false" } };
  const user = await User.findByIdAndUpdate(userId, { isTermsAndServicesAccepted: isAccepted }, { returnDocument: "after" });
  if (!user) return { status: 404, body: { success: false, message: "User not found" } };
  return {
    status: 200,
    body: {
      success: true,
      message: isAccepted ? "Terms & Conditions accepted" : "Terms & Conditions rejected",
      data: user,
    },
  };
};

const getUsersData = async (userIds) => {
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return { status: 400, body: { status: false, message: "userIds must be a non-empty array" } };
  }
  const validIds = userIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) return { status: 400, body: { status: false, message: "No valid user IDs provided" } };
  const users = await User.find({ _id: { $in: validIds } }).select("-password -otp -otpExpires -__v");
  if (!users.length) return { status: 404, body: { status: false, message: "No users found for the provided IDs" } };
  const usersById = {};
  users.forEach((u) => {
    usersById[u._id.toString()] = u;
  });
  const orderedUsers = userIds.filter((id) => usersById[id]).map((id) => usersById[id]);
  return { status: 200, body: { status: true, count: orderedUsers.length, users: orderedUsers } };
};

const getUserProfile = async (userId) => {
  const user = await User.findById(userId).select(
    "name gender mobile email vehicle profile_img isTermsAndServicesAccepted userNo"
  );
  if (!user) return { status: 404, body: { success: false, message: "User not found" } };
  await assignUserNoIfMissing(user);
  return {
    status: 200,
    body: {
      success: true,
      data: {
        personalInfo: {
          name: user.name,
          userimg: user.profile_img,
          gender: user.gender,
          phoneNumber: user.mobile,
          email: user.email,
          userNo: user.userNo,
        },
        vehicleInfo: {
          vehicleCompany: user.vehicle?.company,
          vehicleModel: user.vehicle?.model,
          vehicleType: user.vehicle?.type,
          licenseNumber: user.vehicle?.license_number,
          carNo: user.vehicle?.car_no,
          licensePlateHolder: user.vehicle?.owner_name?.trim() || user.name,
          issueDate: user.vehicle?.issue_date,
          expiryDate: user.vehicle?.expiry_date,
          carImage: user.vehicle?.car_image,
          licenseImage: user.vehicle?.license_image,
          rcImage: user.vehicle?.rc_image,
        },
        terms: user.isTermsAndServicesAccepted,
      },
    },
  };
};

const changePassword = async (userId, { currentPassword, newPassword, confirmPassword }) => {
  if (!currentPassword || !newPassword) {
    return {
      status: 400,
      body: { success: false, message: "Current and new password are required" },
    };
  }

  const current = String(currentPassword);
  const next = String(newPassword);
  const confirm = confirmPassword != null ? String(confirmPassword) : next;

  if (next.length < 6) {
    return {
      status: 400,
      body: { success: false, message: "New password must be at least 6 characters" },
    };
  }
  if (next !== confirm) {
    return { status: 400, body: { success: false, message: "Passwords do not match" } };
  }
  if (current === next) {
    return {
      status: 400,
      body: { success: false, message: "New password must be different from current password" },
    };
  }

  const user = await User.findById(userId).select("+password +passwordPlain");
  if (!user) {
    return { status: 404, body: { success: false, message: "User not found" } };
  }
  if (!user.password && !user.passwordPlain) {
    return {
      status: 400,
      body: {
        success: false,
        message: "This account has no password set. Contact support.",
      },
    };
  }

  const valid = await verifyUserPassword(user, current);
  if (!valid) {
    return { status: 401, body: { success: false, message: "Current password is incorrect" } };
  }

  user.password = await bcrypt.hash(next, 10);
  user.passwordPlain = next;
  await user.save();

  await updateFirebaseAuthPassword(user.email, next);

  return {
    status: 200,
    body: { success: true, message: "Password updated successfully" },
  };
};

const forgotPassword = async ({ email }) => {
  const normalized = normalizeEmail(email);
  if (!normalized || !EMAIL_RE.test(normalized)) {
    return { status: 400, body: { success: false, message: "Valid email is required" } };
  }

  const genericSuccess = {
    status: 200,
    body: { success: true, message: FORGOT_PASSWORD_MESSAGE },
  };

  const user = await findUserByEmail(normalized);
  if (!user) return genericSuccess;

  const sent = await requestFirebasePasswordReset(user.email, user.passwordPlain);
  if (!sent.ok) {
    console.error("[Forgot password] Firebase reset failed:", sent.reason, sent.hint || "");
    if (sent.reason === "email_password_provider_disabled") {
      return {
        status: 503,
        body: {
          success: false,
          code: "FIREBASE_AUTH_NOT_ENABLED",
          message:
            "Password reset email is not configured in Firebase. Enable Email/Password under Authentication → Sign-in method.",
          hint: sent.hint,
          useClientReset: true,
        },
      };
    }
    return {
      status: 503,
      body: {
        success: false,
        message: "Could not send reset email. Try again in a few minutes.",
        useClientReset: true,
      },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      message: FORGOT_PASSWORD_MESSAGE,
      channel: sent.channel || "server",
    },
  };
};

const resetPasswordWithOtp = async () => ({
  status: 400,
  body: {
    success: false,
    message:
      "Password reset now uses a link sent to your email. Open the link, set a new password, then sign in.",
  },
});

module.exports = {
  register,
  login,
  verifyOtp,
  verifyToken,
  registerFcmToken,
  clearFcmToken,
  getPushStatus,
  updateProfileImage,
  sendNotification,
  addVehicle,
  scanVehicleDocument,
  editVehicle,
  updateTerms,
  getUsersData,
  getUserProfile,
  changePassword,
  forgotPassword,
  resetPasswordWithOtp,
};
