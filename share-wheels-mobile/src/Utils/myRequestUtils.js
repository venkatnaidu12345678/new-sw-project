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
