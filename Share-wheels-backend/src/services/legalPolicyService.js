const LegalPolicy = require("../models/legalPolicyModel");

const POLICY_TYPES = LegalPolicy.POLICY_TYPES || ["terms", "privacy", "disclaimer"];

const getPoliciesAsObject = (policies) => {
  const out = {};
  for (const t of POLICY_TYPES) out[t] = null;
  for (const p of policies || []) out[p.type] = p;
  return out;
};

const upsertPolicy = async (type, content) => {
  const cleaned = String(content ?? "").toString();
  const normalized = cleaned.trimEnd();

  let doc = await LegalPolicy.findOne({ type });
  if (!doc) {
    doc = await LegalPolicy.create({ type, content: normalized, isActive: true });
    return doc;
  }

  doc.content = normalized;
  doc.isActive = true;
  await doc.save();
  return doc;
};

const listActivePolicies = async () => {
  const policies = await LegalPolicy.find({ isActive: true })
    .select("type content updatedAt isActive")
    .sort({ updatedAt: -1 })
    .lean();

  const byType = getPoliciesAsObject(policies);
  return {
    status: 200,
    body: {
      success: true,
      policies: {
        terms: byType.terms
          ? { type: byType.terms.type, content: byType.terms.content, updatedAt: byType.terms.updatedAt }
          : null,
        privacy: byType.privacy
          ? {
              type: byType.privacy.type,
              content: byType.privacy.content,
              updatedAt: byType.privacy.updatedAt,
            }
          : null,
        disclaimer: byType.disclaimer
          ? {
              type: byType.disclaimer.type,
              content: byType.disclaimer.content,
              updatedAt: byType.disclaimer.updatedAt,
            }
          : null,
      },
    },
  };
};

const upsertPolicies = async ({ terms, privacy, disclaimer }) => {
  const allowed = new Set(POLICY_TYPES);
  const input = { terms, privacy, disclaimer };

  // Ensure we only upsert known keys
  for (const k of Object.keys(input)) {
    if (!allowed.has(k)) delete input[k];
  }

  const result = await Promise.all([
    upsertPolicy("terms", input.terms),
    upsertPolicy("privacy", input.privacy),
    upsertPolicy("disclaimer", input.disclaimer),
  ]);

  return {
    status: 200,
    body: {
      success: true,
      message: "Legal policies updated",
      policies: {
        terms: { type: result[0].type, content: result[0].content, updatedAt: result[0].updatedAt },
        privacy: { type: result[1].type, content: result[1].content, updatedAt: result[1].updatedAt },
        disclaimer: { type: result[2].type, content: result[2].content, updatedAt: result[2].updatedAt },
      },
    },
  };
};

module.exports = {
  listActivePolicies,
  upsertPolicies,
};

