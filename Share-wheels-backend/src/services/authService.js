const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const generateOtpWithExpiry = require("../utils/otpHelper");
// const sendOtp = require("../utils/sendOtp");
const { notifyUser } = require("./notificationService");
const { assignUserNoIfMissing } = require("../utils/userNoHelper");
const { findUserByEmail, verifyUserPassword } = require("../utils/authCredentials");
const { validateUserFields, EMAIL_RE } = require("../utils/userValidation");

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
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
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

const login = async ({ email, password }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return {
      status: 400,
      body: { success: false, message: "Email and password are required" },
    };
  }
  if (!EMAIL_RE.test(normalizedEmail)) {
    return { status: 400, body: { success: false, message: "Invalid email address" } };
  }

  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    return { status: 401, body: { success: false, message: "Invalid email or password" } };
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

  const valid = await verifyUserPassword(user, passwordStr);
  if (!valid) {
    return { status: 401, body: { success: false, message: "Invalid email or password" } };
  }

  if (user.email !== normalizedEmail) {
    user.email = normalizedEmail;
  }
  user.isVerified = true;
  user.passwordPlain = passwordStr;
  await user.save();

  const token = issueToken(user);
  return {
    status: 200,
    body: {
      success: true,
      message: "Login successful",
      token,
      user: toAuthUser(user),
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
  if (String(user.otp) !== String(otp).trim()) {
    return { status: 400, body: { success: false, message: "Invalid OTP" } };
  }
  if (!user.otpExpires || user.otpExpires < Date.now()) {
    return { status: 400, body: { success: false, message: "OTP expired. Request a new code." } };
  }

  user.isVerified = true;
  user.otp = null;
  user.otpExpires = null;
  if (fcmToken) user.fcmToken = fcmToken;
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
  } catch {
    return { status: 401, body: { success: false, message: "Invalid token" } };
  }
};

const registerFcmToken = async (user, fcmToken) => {
  if (!fcmToken) return { status: 400, body: { message: "fcmToken is required" } };
  user.fcmToken = fcmToken;
  await user.save();
  return { status: 200, body: { success: true, message: "FCM token saved successfully" } };
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
  const { company, model, type, license_number, issue_date, expiry_date, car_no } =
    body || {};

  if (!company?.trim() || !model?.trim() || !type?.trim() || !license_number?.trim()) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Company, model, vehicle type and license number are required",
      },
    };
  }
  if (!car_no?.trim()) {
    return {
      status: 400,
      body: { success: false, message: "Vehicle registration number (RC) is required" },
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

  if (!images.license_image) {
    return {
      status: 400,
      body: { success: false, message: "Driving license image is required" },
    };
  }
  if (!images.rc_image) {
    return {
      status: 400,
      body: { success: false, message: "RC (registration certificate) image is required" },
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
    type: type.trim(),
    license_number: license_number.trim(),
    car_no: car_no.trim(),
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

const editVehicle = async (user, body, files = {}) => {
  if (!user.vehicle) {
    return { status: 404, body: { success: false, message: "No vehicle found to update" } };
  }

  const { company, model, type, license_number, issue_date, expiry_date, car_no } =
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
  if (type !== undefined) user.vehicle.type = type;
  if (license_number !== undefined) user.vehicle.license_number = license_number;
  if (car_no !== undefined) user.vehicle.car_no = car_no;
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
          licensePlateHolder: user.name,
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

module.exports = {
  register,
  login,
  verifyOtp,
  verifyToken,
  registerFcmToken,
  updateProfileImage,
  sendNotification,
  addVehicle,
  editVehicle,
  updateTerms,
  getUsersData,
  getUserProfile,
};
