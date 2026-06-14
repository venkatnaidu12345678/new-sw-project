const vehicleFareService = require("../services/vehicleFareService");

const handle = async (res, fn) => {
  try {
    const result = await fn();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  listFares: async (req, res) => handle(res, () => vehicleFareService.listAllFares(req.query)),

  createFare: async (req, res) =>
    handle(res, () => vehicleFareService.createFare(req.admin._id, req.body)),

  updateFare: async (req, res) =>
    handle(res, () => vehicleFareService.updateFare(req.params.id, req.body)),

  deleteFare: async (req, res) =>
    handle(res, () => vehicleFareService.deleteFare(req.params.id)),

  quote: async (req, res) =>
    handle(res, () =>
      vehicleFareService.quoteFare({
        vehicleType: req.query.vehicleType,
        distanceKm: req.query.distanceKm,
        distanceMeters: req.query.distanceMeters,
      })
    ),

  rules: async (req, res) =>
    handle(res, () => vehicleFareService.getFareRulesForVehicle(req.query.vehicleType)),
};
