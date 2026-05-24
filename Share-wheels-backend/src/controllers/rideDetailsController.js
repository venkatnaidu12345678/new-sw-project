const rideDetailsService = require("../services/rideDetailsService");

module.exports = {
  getUserRideDetails: async (req, res) => {
    try {
      const result = await rideDetailsService.getUserRideDetails(req.user, req.body);
      return res.status(result.status).json(result.body);
    } catch (err) {
      return res.status(500).json({ status: false, error: err.message });
    }
  },
};
