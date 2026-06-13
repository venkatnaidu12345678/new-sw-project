const adminService = require("../services/adminService");
const adminDashboardService = require("../services/adminDashboardService");
const adminUserService = require("../services/adminUserService");

const handle = async (res, fn) => {
  try {
    const result = await fn();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ message: "Error", error: err.message });
  }
};

module.exports = {
  register: async (req, res) => handle(res, () => adminService.register(req.body)),
  login: async (req, res) => handle(res, () => adminService.login(req.body)),
  dashboardStats: async (req, res) => handle(res, () => adminDashboardService.getDashboardStats()),
  listUsers: async (req, res) => handle(res, () => adminDashboardService.listUsers(req.query)),
  createUser: async (req, res) => handle(res, () => adminUserService.createUser(req.body)),
  updateUser: async (req, res) => handle(res, () => adminUserService.updateUser(req.params.id, req.body)),
  deleteUser: async (req, res) => handle(res, () => adminUserService.deleteUser(req.params.id)),
  backfillUserPasswords: async (req, res) =>
    handle(res, () => adminDashboardService.backfillUserPasswords(req.body)),
  listRides: async (req, res) => handle(res, () => adminDashboardService.listRides(req.query)),
  listPassengerRides: async (req, res) =>
    handle(res, () => adminDashboardService.listPassengerRides(req.query)),
  listCouriers: async (req, res) => handle(res, () => adminDashboardService.listCouriers(req.query)),
  updateRideStatus: async (req, res) =>
    handle(res, () => adminDashboardService.updateRideStatus(req.params.id, req.body.status)),
  updateUserVerification: async (req, res) =>
    handle(res, () =>
      adminDashboardService.updateUserVerification(req.params.id, req.body.isVerified)
    ),
  activeTracking: async (req, res) => handle(res, () => adminDashboardService.getActiveTracking()),
  trackingDetail: async (req, res) =>
    handle(res, () => adminDashboardService.getTrackingDetail(req.params.id)),
  routeDirections: async (req, res) =>
    handle(res, () => adminDashboardService.getRouteDirections(req.query)),
};
