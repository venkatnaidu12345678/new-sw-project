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

/** Legacy passenger requests without vehicle_type still match any ride. */
const passengerVehicleTypeMatchesRide = (passengerVehicleType, rideVehicleType) => {
  const passenger = normalizeAllowedVehicleType(passengerVehicleType);
  const ride = normalizeAllowedVehicleType(rideVehicleType);
  if (!passenger) return true;
  if (!ride) return true;
  return passenger === ride;
};

const getMaxSeatsForVehicleType = (vehicleType) => {
  const type = normalizeAllowedVehicleType(vehicleType);
  if (type === "bike") return 1;
  return 6;
};

const vehicleTypeCandidates = (vehicleType) => {
  const canonical = normalizeAllowedVehicleType(vehicleType);
  return canonical ? [canonical] : [];
};

module.exports = {
  ALLOWED_VEHICLE_TYPES,
  LEGACY_VEHICLE_TYPE_ALIASES,
  normalizeAllowedVehicleType,
  isAllowedVehicleType,
  passengerVehicleTypeMatchesRide,
  getMaxSeatsForVehicleType,
  vehicleTypeCandidates,
};

