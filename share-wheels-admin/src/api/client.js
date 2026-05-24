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
