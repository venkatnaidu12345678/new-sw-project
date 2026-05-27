const legalPolicyService = require("../services/legalPolicyService");

const legalController = {
  getPolicies: async (_req, res) => {
    const result = await legalPolicyService.listActivePolicies();
    return res.status(result.status).json(result.body);
  },
};

module.exports = legalController;

