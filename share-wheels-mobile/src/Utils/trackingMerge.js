/** Normalize ride id for comparisons */
export const normalizeRideId = (id) =>
  id == null ? "" : id?.toString?.() || String(id);

/**
 * Merge a socket `locationUpdate` payload into getRideTracking() shape.
 */
export const mergeTrackingFromSocket = (prev, payload) => {
  if (!payload?.rideId) return prev;

  const base = prev || {};
  const lt = base.liveTracking || {};
  const driverFromPayload =
    payload.driverLocation ||
    (payload.role === "driver" ? payload.location : null);

  return {
    ...base,
    status: payload.status ?? base.status,
    from: payload.from ?? base.from,
    to: payload.to ?? base.to,
    liveTracking: {
      ...lt,
      driverLocation: driverFromPayload || lt.driverLocation,
      participantLocations:
        payload.participantLocations?.length > 0
          ? payload.participantLocations
          : lt.participantLocations || [],
      locationHistory:
        payload.path?.length > 0 ? payload.path : lt.locationHistory || [],
    },
  };
};
