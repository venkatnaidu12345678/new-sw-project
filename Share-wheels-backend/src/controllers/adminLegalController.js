const legalPolicyService = require("../services/legalPolicyService");

const handle = async (res, fn) => {
  try {
    const result = await fn();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  listPolicies: async (_req, res) =>
    handle(res, () => legalPolicyService.listActivePolicies()),
  upsertPolicies: async (req, res) =>
    handle(res, () => legalPolicyService.upsertPolicies(req.body)),
};

