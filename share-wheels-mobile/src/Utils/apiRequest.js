import { parseApiResponse } from "./parseApiResponse";
import { getApiErrorMessage } from "./apiErrors";

/**
 * JSON fetch with consistent error parsing.
 */
export async function apiRequest(url, options = {}) {
  const { token, method = "GET", body, headers: extraHeaders = {} } = options;

  const headers = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    const errMsg = err?.message || "";
    if (/network request failed|failed to fetch/i.test(errMsg)) {
      throw new Error(
        "Cannot reach the server. Check your internet connection and that the backend is running."
      );
    }
    throw err;
  }

  const data = await parseApiResponse(response);

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(data, `Request failed (${response.status})`)
    );
  }

  return data;
}
