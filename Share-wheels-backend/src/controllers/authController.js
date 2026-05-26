const authService = require("../services/authService");

const handle = async (res, fn) => {
  try {
    const result = await fn();
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const register = async (req, res) => handle(res, () => authService.register(req.body));
const login = async (req, res) => handle(res, () => authService.login(req.body));
const verifyOtp = async (req, res) => handle(res, () => authService.verifyOtp(req.body));
const verifyToken = async (req, res) => handle(res, () => authService.verifyToken(req.headers.authorization));
const registerFcmToken = async (req, res) => handle(res, () => authService.registerFcmToken(req.user, req.body.fcmToken));
const updateProfileImage = async (req, res) => handle(res, () => authService.updateProfileImage(req.user, req.body.profile_img));
const sendNotification = async (req, res) => handle(res, () => authService.sendNotification(req.body));
const addVehicle = async (req, res) =>
  handle(res, () => authService.addVehicle(req.user, req.body, req.files));
const editVehicle = async (req, res) =>
  handle(res, () => authService.editVehicle(req.user, req.body, req.files));
const updateTerms = async (req, res) => handle(res, () => authService.updateTerms(req.user.id, req.body.isAccepted));
const getUsersData = async (req, res) => handle(res, () => authService.getUsersData(req.body.userIds));
const getUserProfile = async (req, res) => handle(res, () => authService.getUserProfile(req.user._id));

const getMyVehicle = async (req, res) => {
  const user = req.user;
  if (!user.vehicle || !user.vehicle.car_no) return res.json({ hasVehicle: false, vehicle: {} });
  return res.json({ hasVehicle: true, vehicle: user.vehicle });
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
  getMyVehicle,
};
