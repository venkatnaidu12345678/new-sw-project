const driverRideService = require("../services/driverRideService");

const handle = async (res, fn) => {
  try {
    const result = await fn();
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  acceptPassengerRequest: async (req, res) => handle(res, () => driverRideService.acceptPassengerRequest(req.user, req.body)),
  rejectPassengerRequest: async (req, res) => handle(res, () => driverRideService.rejectPassengerRequest(req.user, req.body)),
  removePassenger: async (req, res) => handle(res, () => driverRideService.removePassenger(req.user, req.body)),
  startRide: async (req, res) => handle(res, () => driverRideService.startRide(req.user, req.body)),
  endRide: async (req, res) => handle(res, () => driverRideService.endRide(req.user, req.body)),
  enrouteRequests: async (req, res) => handle(res, () => driverRideService.enrouteRequests(req.user, req.body)),
  pickCourier: async (req, res) => handle(res, () => driverRideService.pickCourier(req.user, req.body)),
  updateRideSeats: async (req, res) =>
    handle(res, () => driverRideService.updateRideSeats(req.user, req.body)),
};
