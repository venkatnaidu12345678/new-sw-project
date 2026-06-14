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

  const joinedActions = new Set([
    "passenger_assigned",
    "courier_assigned",
    "ride_request_accepted",
    "passenger_joined",
    "courier_joined",
    "passenger_request_sent",
    "courier_request_sent",
  ]);
  if (!joinedActions.has(String(payload.action || ""))) return false;

  const payloadFrom = String(payload.from || "").trim().toLowerCase();
  const payloadTo = String(payload.to || "").trim().toLowerCase();
  if (!payloadFrom || !payloadTo) return false;

  const rowFrom = String(row.from || row.raw?.from || "").trim().toLowerCase();
  const rowTo = String(row.to || row.raw?.to || "").trim().toLowerCase();
  if (!rowFrom || !rowTo) return false;

  const fromMatch =
    rowFrom.includes(payloadFrom) || payloadFrom.includes(rowFrom);
  const toMatch = rowTo.includes(payloadTo) || payloadTo.includes(rowTo);
  return fromMatch && toMatch;
};

export const filterOpenPassengerRequests = (items = []) =>
  items.filter(isOpenPassengerRequest);

export const filterOpenCourierRequests = (items = []) =>
  items.filter(isOpenCourierRequest);
