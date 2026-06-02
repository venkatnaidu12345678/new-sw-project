const googleMapsService = require("../services/googleMapsService");

const handle = async (res, fn) => {
  try {
    const result = await fn();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  autocomplete: async (req, res) =>
    handle(res, () =>
      googleMapsService.autocompletePlaces(req.query.input, req.query.sessionToken)
    ),

  placeDetails: async (req, res) =>
    handle(res, () => googleMapsService.getPlaceDetails(req.query.placeId)),

  directions: async (req, res) =>
    handle(res, () =>
      googleMapsService.getDirections({
        originLat: req.query.originLat,
        originLng: req.query.originLng,
        destLat: req.query.destLat,
        destLng: req.query.destLng,
      })
    ),
};
