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
  listTypes: async (req, res) => {
    const category = req.query.category;
    if (category) {
      return handle(res, () => lookupService.listByCategory(category));
    }
    return handle(res, () => lookupService.listAll());
  },
  createType: async (req, res) =>
    handle(res, () => lookupService.createOption(req.body)),
  updateType: async (req, res) =>
    handle(res, () => lookupService.updateOption(req.params.id, req.body)),
  deleteType: async (req, res) =>
    handle(res, () => lookupService.deleteOption(req.params.id)),
  bulkUpsertTypes: async (req, res) =>
    handle(res, () =>
      lookupService.bulkUpsert(req.body?.category, req.body?.items)
    ),
};
