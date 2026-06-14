import { formatLocalISODate } from "./dateUtils";

export const formatEnrouteItems = (list, from, to) => {
  if (!Array.isArray(list)) return [];

  return list.map((item, index) => {
    const isCourier = item.request_type?.toLowerCase().includes("courier");

    return {
      id: item.passengerId || item.courierId || item._id || `row-${index}`,
      rideId: item.rideId || item.ride_id,
      courierId: item.courierId || item.courier_id,
      passengerId: item.passengerId || item.passenger_id,
      creatorId: item.creatorId || item.creator?._id,
      name: item.name || "Unknown",
      profile: item.profile || null,
      gender: item.gender || "",
      timeSlot: item.timeSlot || "",
      details: isCourier
        ? item.what_to_deliver || "Courier Item"
        : `Seats: ${item.seats_needed || 1}`,
      route: `${item.from || from} → ${item.to || to}`,
      price: item.amount ?? item.amount_will ?? 0,
      type: isCourier ? "courier" : "passenger",
      raw: item,
    };
  });
};

export const countEnrouteByType = (data = []) => {
  let passengers = 0;
  let couriers = 0;

  for (const item of data) {
    if (item.type === "courier") couriers += 1;
    else passengers += 1;
  }

  return { passengers, couriers, total: data.length };
};

const normalizeStopoversForPayload = (stopovers) => {
  if (!Array.isArray(stopovers)) return [];
  return stopovers
    .map((stop) => {
      const label = String(stop?.label || "").trim();
      const lat = Number(stop?.lat ?? stop?.latitude);
      const lng = Number(stop?.lng ?? stop?.longitude);
      if (!label) return null;
      return {
        label,
        ...(Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {}),
      };
    })
    .filter(Boolean);
};

export const buildEnrouteFetchPayload = ({
  from,
  to,
  date,
  rideId,
  stopovers,
  routePolyline,
}) => {
  const rideDate = formatLocalISODate(date) || "";
  if (!from?.trim() || !to?.trim() || !rideDate) return null;

  const normalizedStops = normalizeStopoversForPayload(stopovers);
  const polyline = String(routePolyline || "").trim();

  return {
    from: from.trim(),
    to: to.trim(),
    date: rideDate,
    ...(rideId ? { rideId } : {}),
    ...(normalizedStops.length ? { stopovers: normalizedStops } : {}),
    ...(polyline ? { routePolyline: polyline } : {}),
  };
};

export const shouldRemoveEnrouteRow = (row, payload) => {
  if (!payload || !row) return false;

  const passengerRideId = payload.passengerRideId || payload.passenger_rideId;
  if (
    passengerRideId &&
    String(row.passengerId || "") === String(passengerRideId)
  ) {
    return true;
  }

  if (
    payload.courierId &&
    String(row.courierId || "") === String(payload.courierId)
  ) {
    return true;
  }

  if (payload.userId && String(row.creatorId || "") === String(payload.userId)) {
    return true;
  }

  if (payload.id && String(row.id || "") === String(payload.id)) {
    return true;
  }

  return false;
};
