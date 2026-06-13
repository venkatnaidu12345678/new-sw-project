const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const { findUserByEmail } = require("../utils/authCredentials");
const { validateUserFields, normalizeEmail, normalizeMobile } = require("../utils/userValidation");
const { deleteUserCascade } = require("./userDeletionService");

const mapUserForAdmin = (u) => {
  const doc = u?.toObject ? u.toObject() : u;
  if (!doc) return null;
  const { password, otp, otpExpires, ...safe } = doc;
  return {
    ...safe,
    password: doc.passwordPlain || null,
  };
};

const assertUniqueEmailMobile = async (email, mobile, excludeUserId = null) => {
  const emailUser = await findUserByEmail(email);
  if (emailUser && String(emailUser._id) !== String(excludeUserId)) {
    return "Email is already in use";
  }
  const mobileQuery = { mobile };
  if (excludeUserId) {
    mobileQuery._id = { $ne: excludeUserId };
  }
  const mobileUser = await User.findOne(mobileQuery);
  if (mobileUser) {
    return "Mobile number is already in use";
  }
  return null;
};

const createUser = async (body) => {
  const validated = validateUserFields({ ...body, requirePassword: true });
  if (!validated.ok) {
    return { status: 400, body: { success: false, message: validated.message } };
  }

  const conflict = await assertUniqueEmailMobile(validated.email, validated.mobile);
  if (conflict) {
    return { status: 400, body: { success: false, message: conflict } };
  }

  const hash = await bcrypt.hash(validated.password, 10);
  const user = await User.create({
    name: validated.name,
    email: validated.email,
    mobile: validated.mobile,
    gender: validated.gender,
    password: hash,
    passwordPlain: validated.password,
    isVerified: body.isVerified !== false,
    isTermsAndServicesAccepted: !!body.isTermsAndServicesAccepted,
  });

  try {
    const { ensureDefaultSubscription } = require("./driverSubscriptionService");
    await ensureDefaultSubscription(user._id);
  } catch (subErr) {
    console.warn("[Admin createUser] Free plan assignment skipped:", subErr?.message);
  }

  return {
    status: 201,
    body: {
      success: true,
      message: "User created successfully",
      user: mapUserForAdmin(await User.findById(user._id).select("+passwordPlain")),
    },
  };
};

const updateUser = async (userId, body) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { status: 400, body: { success: false, message: "Invalid user id" } };
  }

  const user = await User.findById(userId).select("+password +passwordPlain");
  if (!user) {
    return { status: 404, body: { success: false, message: "User not found" } };
  }

  const validated = validateUserFields({
    name: body.name ?? user.name,
    email: body.email ?? user.email,
    mobile: body.mobile ?? user.mobile,
    gender: body.gender ?? user.gender,
    password: body.password,
    requirePassword: false,
  });

  if (!validated.ok) {
    return { status: 400, body: { success: false, message: validated.message } };
  }

  const conflict = await assertUniqueEmailMobile(
    validated.email,
    validated.mobile,
    userId
  );
  if (conflict) {
    return { status: 400, body: { success: false, message: conflict } };
  }

  user.name = validated.name;
  user.email = validated.email;
  user.mobile = validated.mobile;
  user.gender = validated.gender;

  if (body.isVerified !== undefined) {
    user.isVerified = !!body.isVerified;
  }
  if (body.isTermsAndServicesAccepted !== undefined) {
    user.isTermsAndServicesAccepted = !!body.isTermsAndServicesAccepted;
  }

  if (validated.password) {
    user.password = await bcrypt.hash(validated.password, 10);
    user.passwordPlain = validated.password;
  }

  await user.save();

  return {
    status: 200,
    body: {
      success: true,
      message: "User updated successfully",
      user: mapUserForAdmin(await User.findById(userId).select("+passwordPlain")),
    },
  };
};

const deleteUser = async (userId) => {
  const result = await deleteUserCascade(userId);
  if (!result.ok) {
    const status = result.message === "User not found" ? 404 : 400;
    return { status, body: { success: false, message: result.message } };
  }
  return {
    status: 200,
    body: {
      success: true,
      message: `User ${result.deleted.user} and related data removed`,
      deleted: result.deleted,
    },
  };
};

module.exports = {
  mapUserForAdmin,
  createUser,
  updateUser,
  deleteUser,
};
