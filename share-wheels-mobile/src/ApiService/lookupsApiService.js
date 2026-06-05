import { baseUrl } from "../Config";
import { wakeBackendIfRemote } from "../Utils/wakeBackend";

/** Render cold start can exceed 12s; allow time to wake + fetch. */
const FETCH_TIMEOUT_MS = 45000;
const RETRY_COUNT = 2;
const RETRY_DELAY_MS = 1500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithTimeout = async (url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

export const getActiveLookupTypes = async (category) => {
  const cat = String(category || "").trim();
  if (!cat) return [];

  await wakeBackendIfRemote();

  const params = new URLSearchParams({ category: cat });
  const url = `${baseUrl}/lookups/active?${params}`;

  let lastError;
  for (let attempt = 0; attempt <= RETRY_COUNT; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || `Failed to load options (${response.status})`);
      }
      return Array.isArray(data?.types) ? data.types : [];
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_COUNT) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw lastError || new Error("Failed to load dropdown options");
};
