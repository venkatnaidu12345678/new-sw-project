/** Canonical vehicle types supported by ShareWheels. */
const ALLOWED_VEHICLE_TYPES = ["bike", "auto", "car"];

/** Map legacy stored values to a canonical type for fare lookup. */
const LEGACY_VEHICLE_TYPE_ALIASES = {
  scooter: "bike",
  hatchback: "car",
  sedan: "car",
  suv: "car",
  muv: "car",
  van: "car",
};

const normalizeVehicleTypeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeAllowedVehicleType = (value) => {
  const type = normalizeVehicleTypeKey(value);
  if (!type) return null;
  if (ALLOWED_VEHICLE_TYPES.includes(type)) return type;
  return LEGACY_VEHICLE_TYPE_ALIASES[type] || null;
};

const isAllowedVehicleType = (value) => !!normalizeAllowedVehicleType(value);

const vehicleTypeCandidates = (vehicleType) => {
  const canonical = normalizeAllowedVehicleType(vehicleType);
  return canonical ? [canonical] : [];
};

module.exports = {
  ALLOWED_VEHICLE_TYPES,
  LEGACY_VEHICLE_TYPE_ALIASES,
  normalizeAllowedVehicleType,
  isAllowedVehicleType,
  vehicleTypeCandidates,
};
