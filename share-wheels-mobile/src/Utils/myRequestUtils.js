/** Keep only open standalone requests — hide joined/picked/assigned rows. */
export const isOpenPassengerRequest = (item) => {
  const raw = item?.raw || item || {};
  const status = String(raw.status || item?.status || "pending").toLowerCase();
  if (status !== "pending") return false;
  if (raw.assigned_to?.rideId || raw.assignedRide) return false;
  return true;
};

export const isOpenCourierRequest = (item) => {
  const raw = item?.raw || item || {};
  const status = String(raw.status || item?.status || "pending").toLowerCase();
  if (status !== "pending") return false;
  if (raw.driver_assigned_courier?.rideId || raw.assignedRide) return false;
  return true;
};

export const REQUEST_LOCKED_TO_DRIVER_MESSAGE =
  "This request is already picked by another driver.";

/** Ride this My Request row is locked to (picked or pending with one driver). */
export const getRequestLockedRideId = (item) => {
  const raw = item?.raw || item || {};
  const assigned =
    raw.lockedRideId ||
    raw.assignedRide ||
    raw.assigned_to?.rideId ||
    raw.driver_assigned_courier?.rideId ||
    raw.linkedRide?._id;
  if (assigned) return String(assigned);

  const joins = raw.join_requested_By || raw.joinRequestedBy || [];
  for (let i = joins.length - 1; i >= 0; i -= 1) {
    const rideId = joins[i]?.rideId;
    if (rideId) return String(rideId);
  }
  return null;
};

export const isRequestLockedToOtherDriver = (requestItem, rideId) => {
  const lockedRideId = getRequestLockedRideId(requestItem);
  if (!lockedRideId || rideId == null) return false;
  return String(lockedRideId) !== String(rideId);
};

export const shouldRemoveMyRequestRow = (row, payload = {}) => {
  if (!row || !payload) return false;

  const passengerRideId = payload.passengerRideId || payload.passenger_rideId;
  if (
    passengerRideId &&
    String(row.id || row.raw?.passengerRideId || row.raw?.requestId || "") ===
      String(passengerRideId)
  ) {
    return true;
  }

  if (
    payload.courierId &&
    String(row.id || row.raw?.requestId || "") === String(payload.courierId)
  ) {
    return true;
  }
  return false;
};

export const filterOpenPassengerRequests = (items = []) =>
  items.filter(isOpenPassengerRequest);

export const filterOpenCourierRequests = (items = []) =>
  items.filter(isOpenCourierRequest);
