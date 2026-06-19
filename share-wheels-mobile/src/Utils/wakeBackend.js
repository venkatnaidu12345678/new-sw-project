import { baseUrl } from "../Config";

const LOCAL_HOST_PATTERNS = [
  /localhost/i,
  /127\.0\.0\.1/,
  /10\.0\.2\.2/, // Android emulator → host machine
  /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}/,
  /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
  /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}/,
];

const isRemoteApi = () => {
  const url = String(baseUrl || "").trim();
  if (!url) return false;
  return !LOCAL_HOST_PATTERNS.some((pattern) => pattern.test(url));
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Render Free tier sleeps after ~15 min. Wake the API with a lightweight /ping
 * before requests that must not fail on cold start (FCM sync, lookups).
 */
export async function wakeBackendIfRemote(timeoutMs = 45000) {
  if (!isRemoteApi()) return false;

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(8000, remaining));

    try {
      const res = await fetch(`${baseUrl}/ping`, {
        method: "GET",
        signal: controller.signal,
      });
      if (res.ok) return true;
    } catch {
      // Render may still be booting — retry until timeout.
    } finally {
      clearTimeout(timer);
    }

    await sleep(1200);
  }

  return false;
}
