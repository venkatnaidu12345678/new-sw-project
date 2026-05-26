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
  listAds: async (req, res) => handle(res, () => adService.listAllAds(req.query)),
  createAd: async (req, res) => handle(res, () => adService.createAd(req.admin._id, req.body)),
  updateAd: async (req, res) => handle(res, () => adService.updateAd(req.params.id, req.body)),
  deleteAd: async (req, res) => handle(res, () => adService.deleteAd(req.params.id)),
  uploadMedia: async (req, res) =>
    handle(res, () =>
      adService.uploadAdMedia(req.file, req.body?.mediaType || req.query?.mediaType)
    ),
  getMeta: async (_req, res) =>
    res.status(200).json({
      success: true,
      types: adService.AD_TYPES,
      placements: adService.AD_PLACEMENTS,
    }),
};
