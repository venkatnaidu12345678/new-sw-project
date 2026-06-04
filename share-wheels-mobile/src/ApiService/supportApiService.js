import { baseUrl, endPoints } from "../Config";

const authHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

export const getSupportContext = async (token) => {
  if (!token) throw new Error("Not logged in");
  let response;
  try {
    response = await fetch(`${baseUrl}${endPoints.supportContexturl}`, {
      method: "GET",
      headers: authHeaders(token),
    });
  } catch (e) {
    throw new Error(`Cannot reach server at ${baseUrl}. Check your connection.`);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Failed to load support context");
  return data;
};

export const sendSupportMessage = async (token, { message, history }) => {
  if (!token) throw new Error("Not logged in");
  let response;
  try {
    response = await fetch(`${baseUrl}${endPoints.supportChaturl}`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ message, history }),
    });
  } catch (e) {
    throw new Error(`Cannot reach server at ${baseUrl}. Check your connection.`);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Support chat failed");
  return data;
};
