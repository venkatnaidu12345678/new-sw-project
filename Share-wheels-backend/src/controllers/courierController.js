const courierService = require("../services/courierService");

const handle = async (res, fn) => {
  try {
    const result = await fn();
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  createCourierRequest: async (req, res) => handle(res, () => courierService.createCourierRequest(req.user, req.body)),
  requestCourier: async (req, res) => handle(res, () => courierService.requestCourier(req.user, req.body)),
  acceptCourier: async (req, res) => handle(res, () => courierService.acceptCourier(req.user, req.body)),
  rejectCourier: async (req, res) => handle(res, () => courierService.rejectCourier(req.user, req.body)),
  removeDelivery: async (req, res) => handle(res, () => courierService.removeDelivery(req.user, req.body)),
};
