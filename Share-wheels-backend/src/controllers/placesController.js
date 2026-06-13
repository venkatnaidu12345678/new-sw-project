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
      googleMapsService.autocompletePlaces(req.query.input, req.query.sessionToken, {
        // Defaults to India + cities, but supports broader India results.
        // Example: /locations/places/autocomplete?input=ban&mode=all&country=in
        mode: req.query.mode,
        country: req.query.country,
      })
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
        from: req.query.from,
        to: req.query.to,
        waypoints: req.query.waypoints,
      })
    ),

  alternativeRoutes: async (req, res) =>
    handle(res, () =>
      googleMapsService.getAlternativeRoutes({
        originLat: req.query.originLat,
        originLng: req.query.originLng,
        destLat: req.query.destLat,
        destLng: req.query.destLng,
        from: req.query.from,
        to: req.query.to,
      })
    ),

  stopoverCandidates: async (req, res) =>
    handle(res, () =>
      googleMapsService.getStopoverCandidates({
        polyline: req.body?.polyline || req.query.polyline,
        max: req.body?.max || req.query.max,
      })
    ),
};
