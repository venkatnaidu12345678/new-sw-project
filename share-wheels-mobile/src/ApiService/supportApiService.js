import { baseUrl, endPoints } from "../Config";

const authHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

export const getSupportContext = async (token) => {
  const response = await fetch(`${baseUrl}${endPoints.supportContexturl}`, {
    method: "GET",
    headers: authHeaders(token),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to load support context");
  return data;
};

export const sendSupportMessage = async (token, { message, history }) => {
  const response = await fetch(`${baseUrl}${endPoints.supportChaturl}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ message, history }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Support chat failed");
  return data;
};
