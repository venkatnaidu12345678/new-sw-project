import {
  LOOKUP_FALLBACKS,
  normalizeVehicleType,
} from "../hooks/useLookupOptions";

export const VEHICLE_TYPE_ICONS = {
  bike: "bicycle-outline",
  auto: "car-outline",
  car: "car-sport-outline",
};

export const VEHICLE_TYPE_COLORS = {
  bike: { bg: "#ECFDF5", border: "#A7F3D0", text: "#059669" },
  auto: { bg: "#EFF6FF", border: "#BFDBFE", text: "#2563EB" },
  car: { bg: "#F5F3FF", border: "#DDD6FE", text: "#7C3AED" },
};

export const getVehicleTypeLabel = (type) => {
  const normalized = normalizeVehicleType(type);
  if (!normalized) return "";
  return (
    LOOKUP_FALLBACKS.vehicle_type.find((o) => o.value === normalized)?.label ||
    normalized.charAt(0).toUpperCase() + normalized.slice(1)
  );
};

export const getVehicleTypeIcon = (type) =>
  VEHICLE_TYPE_ICONS[normalizeVehicleType(type)] || "car-sport-outline";

export const getVehicleTypeColors = (type) =>
  VEHICLE_TYPE_COLORS[normalizeVehicleType(type)] || VEHICLE_TYPE_COLORS.car;

/** Normalize vehicle from ride / upcoming list / profile shapes. */
export const resolveRideVehicle = (data) => {
  const raw = data?.vehicle || data?.creator?.vehicle || null;
  if (!raw) return null;

  const type = raw.type || raw.vehicleType || "";
  const company = String(raw.company || raw.vehicleCompany || "").trim();
  const model = String(raw.model || raw.vehicleModel || "").trim();
  const car_no = String(raw.car_no || raw.carNo || "").trim();
  const car_image = raw.car_image || raw.carImage || "";

  if (!type && !company && !model && !car_no && !car_image) return null;

  return { type, company, model, car_no, car_image };
};

export const formatVehicleTitle = (vehicle) => {
  if (!vehicle) return "";
  const company = String(vehicle.company || "").trim();
  const model = String(vehicle.model || "").trim();
  if (company && model && company !== model) return `${company} ${model}`;
  return company || model || "";
};

export const hasVehicleDetails = (vehicle) =>
  !!(
    vehicle &&
    (vehicle.type ||
      vehicle.company ||
      vehicle.model ||
      vehicle.car_no ||
      vehicle.car_image)
  );
