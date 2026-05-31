import { baseUrl } from "../Config";
import { apiRequest } from "../Utils/apiRequest";

const authHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

export const getRideChatMessages = async (token, rideId, peerId) => {
  const qs = peerId ? `?peerId=${encodeURIComponent(peerId)}` : "";
  const res = await fetch(`${baseUrl}/rides/${rideId}/chat/messages${qs}`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to load messages");
  return data;
};

export const sendRideChatMessage = async (token, rideId, message, recipientId) => {
  const body = { message };
  if (recipientId) body.recipientId = recipientId;
  const res = await fetch(`${baseUrl}/rides/${rideId}/chat/messages`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to send message");
  return data;
};

export const updateRideLocation = async (token, rideId, lat, lng) => {
  const id = rideId?.toString?.() || rideId;
  return apiRequest(`${baseUrl}/rides/${id}/chat/location`, {
    token,
    method: "POST",
    body: { lat, lng, latitude: lat, longitude: lng },
    timeoutMs: 10000,
  });
};

export const getRideTracking = async (token, rideId) => {
  const id = rideId?.toString?.() || rideId;
  return apiRequest(`${baseUrl}/rides/${id}/chat/tracking`, {
    token,
    method: "GET",
    timeoutMs: 8000,
  });
};
