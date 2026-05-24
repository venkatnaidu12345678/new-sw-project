const rideService = require("../services/rideService");

const handle = async (res, fn) => {
  try {
    const result = await fn();
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getRidesData: async (req, res) => handle(res, () => rideService.getRidesData(req.body)),
  createRide: async (req, res) => handle(res, () => rideService.createRide(req.user, req.body)),
  getRides: async (req, res) => handle(res, () => rideService.getRides(req.query)),
  cancelRide: async (req, res) => handle(res, () => rideService.cancelRide(req.user, req.body)),
  sendPassengerRequest: async (req, res) => handle(res, () => rideService.sendPassengerRequest(req.user, req.body)),
  upcomingRides: async (req, res) => handle(res, () => rideService.listRidesByPhase(req.user, false)),
  historyRides: async (req, res) => handle(res, () => rideService.listRidesByPhase(req.user, true)),
  rideDetails: async (req, res) => handle(res, () => rideService.getRideDetails(req.params.rideId)),
  myRequests: async (req, res) => handle(res, () => rideService.getMyRequests(req.user)),
};
