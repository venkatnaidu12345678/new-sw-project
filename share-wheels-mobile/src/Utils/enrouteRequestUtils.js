import { formatLocalISODate } from "./dateUtils";

export const formatEnrouteItems = (list, from, to) => {
  if (!Array.isArray(list)) return [];

  return list.map((item, index) => {
    const isCourier = item.request_type?.toLowerCase().includes("courier");

    return {
      id:
        item.passengerId ||
        item.courierId ||
        item._id ||
        `${item.creatorId || "user"}-${item.from || ""}-${item.to || ""}-${index}`,
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

const normalizeUserId = (value) => {
  const id = value?._id || value?.userId?._id || value?.userId || value;
  return id != null && id !== "" ? String(id) : "";
};

export const collectRideParticipantUserIds = ({
  passengers = [],
  couriers = [],
  passengerRequests = [],
  courierRequests = [],
} = {}) => {
  const ids = new Set();
  const add = (row) => {
    const id = normalizeUserId(row?.creatorId || row?.creator || row);
    if (id) ids.add(id);
  };

  passengers.forEach(add);
  couriers.forEach(add);
  passengerRequests.forEach(add);
  courierRequests.forEach(add);
  return ids;
};

export const filterEnrouteByParticipants = (data = [], participantUserIds) => {
  // Keep all corridor-matched requests visible; pick conflicts are handled at pick time.
  void participantUserIds;
  return data;
};

export const getEnroutePickConflict = (item, participantUserIds) => {
  if (!item) return null;

  const creatorId = normalizeUserId(item.creatorId);
  if (!creatorId) return null;

  if (participantUserIds?.has?.(creatorId)) {
    return {
      code: "PARTICIPANT_CONFLICT",
      message: `${item.name || "This user"} is already on your ride. Someone cannot be both passenger and courier on the same trip.`,
    };
  }

  return null;
};

export const getEnrouteSiblingNote = (item, enrouteData = []) => {
  if (!item) return "";
  const creatorId = normalizeUserId(item.creatorId);
  if (!creatorId) return "";

  const oppositeType = item.type === "courier" ? "passenger" : "courier";
  const hasSibling = (enrouteData || []).some(
    (row) =>
      normalizeUserId(row.creatorId) === creatorId &&
      row.type === oppositeType
  );

  if (!hasSibling) return "";
  return `${item.name || "This user"} also has an open ${oppositeType} request. Only one role can be added to your ride.`;
};

export const ENROUTE_ALREADY_PICKED_MESSAGE =
  "This request is already picked by another driver.";

export const isEnrouteRequestUnavailableError = (response) => {
  const code = String(response?.code || "").toUpperCase();
  if (code === "ALREADY_PICKED") return true;

  const message = String(response?.message || response?.error || "").toLowerCase();
  return (
    message.includes("already picked") ||
    message.includes("another driver") ||
    message.includes("no longer available") ||
    message.includes("passenger not found") ||
    message.includes("courier not found") ||
    message.includes("request not found")
  );
};

const ENROUTE_SUBSCRIPTION_ERROR_CODES = new Set([
  "PICK_LIMIT_REACHED",
  "SUBSCRIPTION_EXPIRED",
  "NO_PLAN",
]);

export const isEnrouteSubscriptionError = (response) => {
  const code = String(response?.code || "").toUpperCase();
  return ENROUTE_SUBSCRIPTION_ERROR_CODES.has(code);
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

  if (payload.id && String(row.id || "") === String(payload.id)) {
    return true;
  }

  return false;
};
