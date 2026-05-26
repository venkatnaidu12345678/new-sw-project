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

export const getActiveAds = async (placement, type) => {
  const params = new URLSearchParams();
  if (placement) params.set("placement", placement);
  if (type) params.set("type", type);
  const qs = params.toString();
  const url = `${baseUrl}/ads/active${qs ? `?${qs}` : ""}`;

  if (__DEV__) {
    console.log("[Ads] GET", url);
  }

  const response = await fetchWithTimeout(url);
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("Invalid ads response from server");
  }

  if (!response.ok) {
    throw new Error(data?.message || `Failed to load ads (${response.status})`);
  }

  return data;
};

export const recordAdClick = async (adId) => {
  try {
    await fetchWithTimeout(`${baseUrl}/ads/${adId}/click`, { method: "POST" });
  } catch {
    /* non-blocking */
  }
};

export const recordAdImpression = async (adId) => {
  try {
    await fetchWithTimeout(`${baseUrl}/ads/${adId}/impression`, { method: "POST" });
  } catch {
    /* non-blocking */
  }
};
