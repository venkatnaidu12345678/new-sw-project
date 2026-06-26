import { LOOKUP_FALLBACKS, normalizeVehicleType } from "../hooks/useLookupOptions";

const TYPE_ICONS = {
  bike: "bicycle-outline",
  auto: "car-outline",
  car: "car-sport-outline",
};

const TYPE_COLORS = {
  bike: "#059669",
  auto: "#D97706",
  car: "#2563EB",
};

const TYPE_BG = {
  bike: "#D1FAE5",
  auto: "#FEF3C7",
  car: "#DBEAFE",
};

export const getVehicleTypeMeta = (type) => {
  const key = normalizeVehicleType(type);
  if (!key) {
    return {
      key: "",
      label: "",
      icon: "car-outline",
      color: "#64748B",
      bg: "#F1F5F9",
    };
  }
  const label =
    LOOKUP_FALLBACKS.vehicle_type.find((o) => o.value === key)?.label ||
    key.charAt(0).toUpperCase() + key.slice(1);
  return {
    key,
    label,
    icon: TYPE_ICONS[key] || "car-outline",
    color: TYPE_COLORS[key] || "#64748B",
    bg: TYPE_BG[key] || "#F1F5F9",
  };
};

export const resolveRideVehicle = (data) => {
  const candidates = [data?.vehicle, data?.creator?.vehicle].filter(Boolean);
  for (const vehicle of candidates) {
    if (
      vehicle.type ||
      vehicle.company ||
      vehicle.model ||
      vehicle.car_no ||
      vehicle.car_image
    ) {
      return vehicle;
    }
  }
  return candidates[0] || null;
};

export const formatVehicleTitle = (vehicle) => {
  if (!vehicle) return "";
  const company = String(vehicle.company || "").trim();
  const model = String(vehicle.model || "").trim();
  if (company && model && company.toLowerCase() !== model.toLowerCase()) {
    return `${company} ${model}`;
  }
  return company || model || "";
};

export const formatVehicleLabel = (vehicle) => {
  const title = formatVehicleTitle(vehicle);
  const meta = getVehicleTypeMeta(vehicle?.type);
  if (title && meta.label) return `${meta.label} · ${title}`;
  return title || meta.label || "";
};
