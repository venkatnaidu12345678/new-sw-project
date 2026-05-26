const rideVerificationService = require("../services/rideVerificationService");

const handle = async (res, fn) => {
  try {
    const result = await fn();
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  listParticipants: async (req, res) =>
    handle(res, () => rideVerificationService.listVerificationParticipants(req.user, req.params.rideId)),
  verifyParticipant: async (req, res) =>
    handle(res, () =>
      rideVerificationService.verifyParticipant(req.user, {
        rideId: req.params.rideId,
        userNo: req.body.userNo,
        otp: req.body.otp,
      })
    ),
};
