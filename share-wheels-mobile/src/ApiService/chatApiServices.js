import { baseUrl } from "../Config";

const authHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

export const getRideChatMessages = async (token, rideId) => {
  const res = await fetch(`${baseUrl}/rides/${rideId}/chat/messages`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to load messages");
  return data;
};

export const sendRideChatMessage = async (token, rideId, message) => {
  const res = await fetch(`${baseUrl}/rides/${rideId}/chat/messages`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ message }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to send message");
  return data;
};

export const updateRideLocation = async (token, rideId, lat, lng) => {
  const res = await fetch(`${baseUrl}/rides/${rideId}/chat/location`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ lat, lng }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to update location");
  return data;
};

export const getRideTracking = async (token, rideId) => {
  const res = await fetch(`${baseUrl}/rides/${rideId}/chat/tracking`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to load tracking");
  return data;
};
