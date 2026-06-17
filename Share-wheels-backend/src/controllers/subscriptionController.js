const subscriptionPlanService = require("../services/subscriptionPlanService");
const driverSubscriptionService = require("../services/driverSubscriptionService");

const handle = async (res, fn) => {
  try {
    const result = await fn();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  listPlans: async (_req, res) =>
    handle(res, () => subscriptionPlanService.listActivePlans()),
  getMySubscription: async (req, res) =>
    handle(res, () =>
      driverSubscriptionService.getDriverSubscriptionStatus(req.user._id)
    ),
  subscribe: async (req, res) =>
    handle(res, () =>
      driverSubscriptionService.subscribeToPlan(req.user._id, req.body.planId)
    ),
  createOrder: async (req, res) =>
    handle(res, () =>
      driverSubscriptionService.createPaymentOrder(req.user._id, req.body.planId)
    ),
  verifyPayment: async (req, res) =>
    handle(res, () =>
      driverSubscriptionService.verifyPaymentAndSubscribe(req.user._id, req.body)
    ),
};
