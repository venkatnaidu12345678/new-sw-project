const API_BASE = import.meta.env.VITE_API_URL || "/api";

const getToken = () => localStorage.getItem("adminToken");

export const api = async (path, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || data.error || `Request failed (${res.status})`);
  }

  return data;
};

export const adminLogin = (email, password) =>
  api("/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const adminRegister = (body) =>
  api("/admin/register", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const getStats = () => api("/admin/dashboard/stats");
export const getUsers = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return api(`/admin/users?${q}`);
};
export const getRides = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return api(`/admin/rides?${q}`);
};
export const getPassengerRides = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return api(`/admin/passenger-rides?${q}`);
};
export const getCouriers = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return api(`/admin/couriers?${q}`);
};
export const updateRideStatus = (id, status) =>
  api(`/admin/rides/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
export const updateUserVerification = (id, isVerified) =>
  api(`/admin/users/${id}/verify`, {
    method: "PATCH",
    body: JSON.stringify({ isVerified }),
  });

export const getActiveTracking = () => api("/admin/tracking/active");
export const getTrackingDetail = (id) => api(`/admin/tracking/${id}`);

export const getAdsMeta = () => api("/admin/ads/meta");
export const getAds = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return api(`/admin/ads?${q}`);
};
export const createAd = (body) =>
  api("/admin/ads", { method: "POST", body: JSON.stringify(body) });
export const updateAd = (id, body) =>
  api(`/admin/ads/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const deleteAd = (id) => api(`/admin/ads/${id}`, { method: "DELETE" });

export const uploadAdMedia = async (file, mediaType = "image") => {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mediaType", mediaType);
  const res = await fetch(`${API_BASE}/admin/ads/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Upload failed");
  return data;
};
