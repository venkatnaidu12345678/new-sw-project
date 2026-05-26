const adService = require("../services/adService");

const handle = async (res, fn) => {
  try {
    const result = await fn();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getActiveAds: async (req, res) => handle(res, () => adService.listActiveAds(req.query)),
  recordClick: async (req, res) => handle(res, () => adService.recordClick(req.params.id)),
  recordImpression: async (req, res) =>
    handle(res, () => adService.recordImpression(req.params.id)),
};
