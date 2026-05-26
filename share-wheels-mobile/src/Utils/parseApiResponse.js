/**
 * Safely parse fetch response as JSON. Avoids "Unexpected token <" when server returns HTML.
 */
export async function parseApiResponse(response) {
  const text = await response.text();
  if (!text?.trim()) return {};

  try {
    return JSON.parse(text);
  } catch {
    const isHtml = text.trimStart().startsWith("<");
    const message = isHtml
      ? "Server returned an error page instead of JSON. Check that the backend is running and the API URL is correct."
      : text.slice(0, 200);
    throw new Error(message);
  }
}
