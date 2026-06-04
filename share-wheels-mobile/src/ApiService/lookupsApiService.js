import { baseUrl } from "../Config";

const FETCH_TIMEOUT_MS = 12000;

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

export const getActiveLookupTypes = async (category) => {
  const cat = String(category || "").trim();
  if (!cat) return [];

  const params = new URLSearchParams({ category: cat });
  const url = `${baseUrl}/lookups/active?${params}`;
  const response = await fetchWithTimeout(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `Failed to load options (${response.status})`);
  }
  return Array.isArray(data?.types) ? data.types : [];
};
