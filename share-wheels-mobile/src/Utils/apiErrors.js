/**
 * Extract a user-facing message from API JSON or Error objects.
 */
export function getApiErrorMessage(data, fallback = "Something went wrong. Please try again.") {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data instanceof Error) return data.message || fallback;

  const detail =
    (typeof data.error === "string" && data.error.trim()) ||
    (typeof data.details === "string" && data.details.trim()) ||
    (typeof data.body === "object" && (data.body?.error || data.body?.message));

  const message =
    (typeof data.message === "string" && data.message.trim()) || "";

  if (message && message !== "Server error") return message;
  if (detail) return String(detail).trim();
  if (message) return message;
  return fallback;
}

/**
 * Standard shape for API helpers that return { success, data, message }.
 */
export function apiFail(message) {
  return { success: false, message: getApiErrorMessage(message) };
}

export function apiOk(data = {}, message) {
  return { success: true, ...data, ...(message ? { message } : {}) };
}
