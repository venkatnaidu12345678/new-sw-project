const lookupService = require("../services/lookupService");

const handle = async (res, fn) => {
  try {
    const result = await fn();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getActiveTypes: async (req, res) =>
    handle(res, () => lookupService.listActiveByCategory(req.query.category)),
};
