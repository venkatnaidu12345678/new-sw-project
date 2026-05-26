const rideService = require("../services/rideService");

const handle = async (res, fn) => {
  try {
    const result = await fn();
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("[rideController]", error.message, error.stack);
    const detail = error.message || "Unexpected server error";
    return res.status(500).json({
      success: false,
      message: detail,
      error: detail,
    });
  }
};

module.exports = {
  getRidesData: async (req, res) => handle(res, () => rideService.getRidesData(req.body)),
  createRide: async (req, res) => handle(res, () => rideService.createRide(req.user, req.body)),
  getRides: async (req, res) => handle(res, () => rideService.getRides(req.query, req.user)),
  cancelRide: async (req, res) => handle(res, () => rideService.cancelRide(req.user, req.body)),
  sendPassengerRequest: async (req, res) => handle(res, () => rideService.sendPassengerRequest(req.user, req.body)),
  upcomingRides: async (req, res) => handle(res, () => rideService.listRidesByPhase(req.user, false)),
  historyRides: async (req, res) => handle(res, () => rideService.listRidesByPhase(req.user, true)),
  rideDetails: async (req, res) => handle(res, () => rideService.getRideDetails(req.params.rideId, req.user._id)),
  myRequests: async (req, res) => handle(res, () => rideService.getMyRequests(req.user)),
};
