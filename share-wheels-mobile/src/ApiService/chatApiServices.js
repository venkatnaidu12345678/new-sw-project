import { baseUrl } from "../Config";

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
  const res = await fetch(`${baseUrl}/rides/${id}/chat/location`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      lat,
      lng,
      latitude: lat,
      longitude: lng,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data.message ||
      data.error ||
      `Failed to update location (${res.status})`;
    if (__DEV__) console.warn("[GPS] API error:", msg, data);
    throw new Error(msg);
  }
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
