import { baseUrl } from "../Config";
import { parseApiResponse } from "../Utils/parseApiResponse";

const authHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

export const fetchNotifications = async (token) => {
  const res = await fetch(`${baseUrl}/notifications`, {
    headers: authHeaders(token),
  });
  return parseApiResponse(res);
};

export const markNotificationRead = async (token, notificationId) => {
  const res = await fetch(`${baseUrl}/notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
  return parseApiResponse(res);
};

export const markAllNotificationsRead = async (token) => {
  const res = await fetch(`${baseUrl}/notifications/read-all`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
  return parseApiResponse(res);
};
