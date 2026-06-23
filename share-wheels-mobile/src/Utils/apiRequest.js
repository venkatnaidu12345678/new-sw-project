import { parseApiResponse } from "./parseApiResponse";
import { getApiErrorMessage } from "./apiErrors";
import { reportError } from "../services/crashlytics";

const DEFAULT_TIMEOUT_MS = 20000;

function apiPathFromUrl(url) {
  return String(url).replace(/^https?:\/\/[^/]+/, "").split("?")[0].slice(0, 80);
}

/**
 * JSON fetch with timeout and consistent error parsing.
 */
export async function apiRequest(url, options = {}) {
  const {
    token,
    method = "GET",
    body,
    headers: extraHeaders = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const headers = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      signal: controller.signal,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    if (err?.name !== "AbortError") {
      reportError(err, {
        scope: "apiRequest",
        path: apiPathFromUrl(url),
        method,
      }).catch(() => {});
    }
    if (err?.name === "AbortError") {
      throw new Error(
        "Request timed out. Check that the backend is running and LOCAL_API_URL in .env matches your PC IP (same Wi‑Fi as the phone)."
      );
    }
    const errMsg = err?.message || "";
    if (/network request failed|failed to fetch/i.test(errMsg)) {
      throw new Error(
        "Cannot reach the server. Check Wi‑Fi, backend on port 3001, and LOCAL_API_URL in .env."
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const data = await parseApiResponse(response);

  if (!response.ok) {
    const error = new Error(
      getApiErrorMessage(data, `Request failed (${response.status})`)
    );
    if (data?.code) error.code = data.code;
    error.status = response.status;
    if (response.status >= 500) {
      reportError(error, {
        scope: "apiRequest",
        path: apiPathFromUrl(url),
        method,
        status: response.status,
      }).catch(() => {});
    }
    throw error;
  }

  return data;
}
