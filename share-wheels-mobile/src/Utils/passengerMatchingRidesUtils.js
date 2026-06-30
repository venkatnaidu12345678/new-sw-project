import {
  ALLOWED_VEHICLE_TYPES,
  normalizeVehicleType,
} from "../hooks/useLookupOptions";

const normalizePassengerVehicleType = (value) => {
  const type = normalizeVehicleType(value);
  if (!type || !ALLOWED_VEHICLE_TYPES.includes(type)) return null;
  return type;
};

export const getPassengerRequestVehicleType = (raw) =>
  raw?.vehicle_type || raw?.vehicleType || "";

export const passengerVehicleTypeMatchesRide = (
  passengerVehicleType,
  rideVehicleType
) => {
  const passenger = normalizePassengerVehicleType(passengerVehicleType);
  const ride = normalizePassengerVehicleType(rideVehicleType);
  if (!passenger) return true;
  if (!ride) return true;
  return passenger === ride;
};

export const getRideVehicleType = (ride) =>
  ride?.vehicleType || ride?.vehicle?.type || "";

export const filterMatchingRidesByVehicleType = (
  matchingRides = [],
  vehicleType,
  { excludeRideId } = {}
) => {
  const rides = Array.isArray(matchingRides) ? matchingRides : [];
  return rides.filter((ride) => {
    if (excludeRideId && String(ride._id) === String(excludeRideId)) {
      return false;
    }
    return passengerVehicleTypeMatchesRide(vehicleType, getRideVehicleType(ride));
  });
};

export const resolvePassengerRelatedRides = (raw) => {
  const vehicleType = getPassengerRequestVehicleType(raw);
  const linkedRideId = raw?.linkedRide?._id || raw?.lockedRideId || null;
  const matchingRides = filterMatchingRidesByVehicleType(
    raw?.matchingRides || [],
    vehicleType,
    { excludeRideId: linkedRideId }
  );

  let linkedRide = raw?.linkedRide || null;
  if (
    linkedRide &&
    !passengerVehicleTypeMatchesRide(vehicleType, getRideVehicleType(linkedRide)) &&
    !raw?.lockedRideId
  ) {
    linkedRide = null;
  }

  return { matchingRides, linkedRide, vehicleType };
};

export const countPassengerRelatedRides = (raw) => {
  const { matchingRides, linkedRide } = resolvePassengerRelatedRides(raw);
  return matchingRides.length + (linkedRide ? 1 : 0);
};
