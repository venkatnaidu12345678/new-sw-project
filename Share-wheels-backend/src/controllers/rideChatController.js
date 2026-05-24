const rideChatService = require("../services/rideChatService");
const rideTrackingService = require("../services/rideTrackingService");

const handle = async (res, fn) => {
  try {
    const result = await fn();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ message: "Error", error: err.message });
  }
};

module.exports = {
  getMessages: async (req, res) =>
    handle(res, () => rideChatService.getMessages(req.user, req.params.rideId)),
  sendMessage: async (req, res) =>
    handle(res, () => rideChatService.sendMessage(req.user, req.params.rideId, req.body)),
  updateLocation: async (req, res) =>
    handle(res, () => rideTrackingService.updateDriverLocation(req.user, req.params.rideId, req.body)),
  getTracking: async (req, res) =>
    handle(res, () => rideTrackingService.getTrackingForUser(req.user, req.params.rideId)),
};
