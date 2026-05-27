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
  const raw = await res.text();
  let data = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      const snippet = raw.replace(/<[^>]+>/g, " ").trim().slice(0, 120);
      if (/cannot (GET|POST|PUT|PATCH|DELETE)/i.test(snippet)) {
        throw new Error(
          `${snippet}. Restart the Share Wheels backend (port 3001) so admin location routes load.`
        );
      }
      throw new Error(snippet || `Invalid response (${res.status})`);
    }
  }

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

export const getLocations = () => api("/admin/locations");
export const createLocation = (body) =>
  api("/admin/locations", { method: "POST", body: JSON.stringify(body) });
export const updateLocation = (id, body) =>
  api(`/admin/locations/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const deleteLocation = (id) =>
  api(`/admin/locations/${id}`, { method: "DELETE" });
export const bulkUpsertLocations = (names) =>
  api("/admin/locations/bulk", {
    method: "POST",
    body: JSON.stringify({ names }),
  });
export const clearAllLocations = () => api("/admin/locations/all", { method: "DELETE" });

export const getFeedbacks = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return api(`/admin/feedback?${q}`);
};
export const updateFeedback = (id, body) =>
  api(`/admin/feedback/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const getLegalPolicies = () => api("/legal/policies");
export const updateLegalPolicies = (policies) =>
  api("/admin/legal/policies", {
    method: "PUT",
    body: JSON.stringify(policies),
  });

export const uploadAdMedia = async (file, mediaType = "image") => {
  const token = getToken();
  const formData = new FormData();
  // mediaType must be sent before file so multer can read it in fileFilter
  formData.append("mediaType", mediaType);
  formData.append("file", file);
  const res = await fetch(
    `${API_BASE}/admin/ads/upload?mediaType=${encodeURIComponent(mediaType)}`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Upload failed");
  return data;
};
