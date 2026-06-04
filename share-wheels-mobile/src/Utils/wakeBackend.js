import { baseUrl } from "../Config";

const isRemoteApi = () =>
  !/localhost|127\.0\.0\.1|10\.0\.2\.2/i.test(String(baseUrl || ""));

/**
 * Render Free tier sleeps after ~15 min. Wake the API before FCM token sync
 * so register-fcm-token does not fail on the first cold-start request.
 */
export async function wakeBackendIfRemote(timeoutMs = 90000) {
  if (!isRemoteApi()) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
