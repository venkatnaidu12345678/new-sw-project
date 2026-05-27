import { baseUrl } from "../Config";
import { endPoints } from "../Config";

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

export const getLegalPolicies = async () => {
  const url = `${baseUrl}${endPoints.legalPoliciesurl}`;
  const response = await fetchWithTimeout(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `Failed to load legal policies (${response.status})`);
  }
  // backend returns: { success:true, policies:{ terms, privacy, disclaimer } }
  return data?.policies || data;
};

