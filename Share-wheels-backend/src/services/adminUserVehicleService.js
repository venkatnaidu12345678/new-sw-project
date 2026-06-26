const mongoose = require("mongoose");
const User = require("../models/userModel");

const VEHICLE_DATA_FILTER = {
  $or: [
    { "vehicle.company": { $nin: [null, ""] } },
    { "vehicle.model": { $nin: [null, ""] } },
    { "vehicle.car_no": { $nin: [null, ""] } },
    { "vehicle.car_image": { $nin: [null, ""] } },
    { "vehicle.license_image": { $nin: [null, ""] } },
    { "vehicle.rc_image": { $nin: [null, ""] } },
  ],
};

const COMPLETE_VEHICLE_FILTER = {
  "vehicle.company": { $nin: [null, ""] },
  "vehicle.car_no": { $nin: [null, ""] },
};

const mapVehicleForAdmin = (vehicle = {}) => ({
  company: vehicle.company || "",
  model: vehicle.model || "",
  type: vehicle.type || "",
  licenseNumber: vehicle.license_number || "",
  carNo: vehicle.car_no || "",
  ownerName: vehicle.owner_name || "",
  carImage: vehicle.car_image || "",
  licenseImage: vehicle.license_image || "",
  rcImage: vehicle.rc_image || "",
  issueDate: vehicle.issue_date || null,
  expiryDate: vehicle.expiry_date || null,
});

const isCompleteVehicle = (vehicle = {}) =>
  !!(String(vehicle.company || "").trim() && String(vehicle.car_no || "").trim());

const mapUserVehicleRow = (userDoc) => {
  const vehicle = mapVehicleForAdmin(userDoc?.vehicle);
  return {
    id: userDoc._id,
    user: {
      _id: userDoc._id,
      name: userDoc.name || "",
      email: userDoc.email || "",
      mobile: userDoc.mobile || "",
      userNo: userDoc.userNo || "",
      profile_img: userDoc.profile_img || "",
      isVerified: !!userDoc.isVerified,
    },
    vehicle,
    hasVehicle: isCompleteVehicle(userDoc?.vehicle),
    hasDocuments: !!(vehicle.carImage || vehicle.licenseImage || vehicle.rcImage),
    updatedAt: userDoc.updatedAt,
    createdAt: userDoc.createdAt,
  };
};

const buildListFilter = ({ search = "", vehicleType = "", hasVehicle = "" }) => {
  const filter = { ...VEHICLE_DATA_FILTER };

  if (hasVehicle === "complete") {
    Object.assign(filter, COMPLETE_VEHICLE_FILTER);
  } else if (hasVehicle === "partial") {
    filter.$and = [
      { ...VEHICLE_DATA_FILTER },
      {
        $nor: [{ ...COMPLETE_VEHICLE_FILTER }],
      },
    ];
    delete filter.$or;
  }

  if (vehicleType && vehicleType !== "all") {
    filter["vehicle.type"] = String(vehicleType).trim().toLowerCase();
  }

  const term = String(search || "").trim();
  if (term) {
    const searchFilter = {
      $or: [
        { name: { $regex: term, $options: "i" } },
        { email: { $regex: term, $options: "i" } },
        { mobile: { $regex: term, $options: "i" } },
        { userNo: { $regex: term, $options: "i" } },
        { "vehicle.car_no": { $regex: term, $options: "i" } },
        { "vehicle.license_number": { $regex: term, $options: "i" } },
        { "vehicle.company": { $regex: term, $options: "i" } },
        { "vehicle.model": { $regex: term, $options: "i" } },
        { "vehicle.owner_name": { $regex: term, $options: "i" } },
      ],
    };
    return { $and: [filter, searchFilter] };
  }

  return filter;
};

const listUsersWithVehicles = async ({
  page = 1,
  limit = 20,
  search = "",
  vehicleType = "",
  hasVehicle = "",
}) => {
  const filter = buildListFilter({ search, vehicleType, hasVehicle });
  const skip = (Number(page) - 1) * Number(limit);

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("name email mobile userNo profile_img isVerified vehicle createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    status: 200,
    body: {
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      rows: users.map(mapUserVehicleRow),
    },
  };
};

const getUserVehicleDetail = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { status: 400, body: { success: false, message: "Invalid user id" } };
  }

  const user = await User.findById(userId)
    .select("name email mobile userNo profile_img isVerified vehicle createdAt updatedAt")
    .lean();

  if (!user) {
    return { status: 404, body: { success: false, message: "User not found" } };
  }

  const row = mapUserVehicleRow(user);
  if (!row.hasVehicle && !row.hasDocuments && !row.vehicle.company && !row.vehicle.model) {
    return { status: 404, body: { success: false, message: "No vehicle information for this user" } };
  }

  return {
    status: 200,
    body: {
      success: true,
      ...row,
    },
  };
};

module.exports = {
  listUsersWithVehicles,
  getUserVehicleDetail,
};
