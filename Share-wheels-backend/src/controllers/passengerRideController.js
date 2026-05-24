const passengerRideService = require("../services/passengerRideService");

const handle = async (res, fn) => {
  try {
    const result = await fn();
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({ error: "Server error", details: error.message });
  }
};

module.exports = {
  createPassengerRequest: async (req, res) => handle(res, () => passengerRideService.createPassengerRequest(req.user, req.body)),
  getOpenRequests: async (req, res) => handle(res, () => passengerRideService.getOpenRequests(req.user)),
  pickPassenger: async (req, res) => handle(res, () => passengerRideService.pickPassenger(req.user, req.body)),
};
