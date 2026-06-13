const subscriptionPlanService = require("../services/subscriptionPlanService");

const handle = async (res, fn) => {
  try {
    const result = await fn();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  listPlans: async (req, res) =>
    handle(res, () => subscriptionPlanService.listAllPlans(req.query)),
  createPlan: async (req, res) =>
    handle(res, () => subscriptionPlanService.createPlan(req.admin._id, req.body)),
  updatePlan: async (req, res) =>
    handle(res, () => subscriptionPlanService.updatePlan(req.params.id, req.body)),
  deletePlan: async (req, res) =>
    handle(res, () => subscriptionPlanService.deletePlan(req.params.id)),
  getMeta: async (_req, res) =>
    res.status(200).json({
      success: true,
      periodUnits: subscriptionPlanService.PERIOD_UNITS,
    }),
};
