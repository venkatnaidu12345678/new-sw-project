import { getParticipantUserId } from "./participantIds";

const normalizeId = (value) => {
  if (value == null) return "";
  return String(value._id || value.id || value);
};

export const getParticipantRouteLabels = (item, role, rideFrom = "", rideTo = "") => {
  const from = String(item?.from || rideFrom || "").trim();
  const to = String(item?.to || rideTo || "").trim();
  return { from, to };
};

/** Build selectable participant rows for driver route map. */
export const buildDriverParticipantRoutes = ({
  passengers = [],
  couriers = [],
  rideFrom = "",
  rideTo = "",
}) => {
  const rows = [];

  passengers.forEach((item, index) => {
    const userId = getParticipantUserId(item);
    const { from, to } = getParticipantRouteLabels(item, "passenger", rideFrom, rideTo);
    if (!from && !to) return;
    rows.push({
      id: item._id || userId || `passenger-${index}`,
      userId,
      role: "passenger",
      name: item?.userId?.name || "Passenger",
      from,
      to,
      status: item?.status || "accepted",
      routeLabel: `${from} → ${to}`,
    });
  });

  couriers.forEach((item, index) => {
    const userId = getParticipantUserId(item);
    const { from, to } = getParticipantRouteLabels(item, "courier", rideFrom, rideTo);
    if (!from && !to) return;
    rows.push({
      id: item._id || userId || `courier-${index}`,
      userId,
      role: "courier",
      name: item?.userId?.name || "Courier",
      from,
      to,
      status: item?.status || "accepted",
      routeLabel: `${from} → ${to}`,
    });
  });

  return rows;
};

export const findParticipantRouteByKey = (rows, key) => {
  if (!key || !Array.isArray(rows)) return null;
  const id = String(key);
  return (
    rows.find((row) => String(row.id) === id) ||
    rows.find((row) => normalizeId(row.userId) === id) ||
    null
  );
};

const toCoord = (value) => {
  if (!value) return null;
  const lat = Number(value.lat ?? value.latitude);
  const lng = Number(value.lng ?? value.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

/** Where the driver should head next for this participant (pickup or drop). */
export const getDriverNavigateTarget = (participant, liveTracking = null) => {
  if (!participant) return null;

  const status = String(participant.status || "").toLowerCase();
  if (status === "dropped" || status === "delivered") return null;

  const headingToDrop = status === "picked_up" || status === "in_transit";
  const label = String(
    headingToDrop ? participant.to : participant.from
  ).trim();
  const kind = headingToDrop ? "drop" : "pickup";

  const storedCoords = toCoord(
    headingToDrop ? participant.toCoords : participant.fromCoords
  );
  if (storedCoords) {
    return { ...storedCoords, label: label || (kind === "drop" ? "Drop" : "Pickup"), kind };
  }

  const uid = normalizeId(participant.userId);
  const role = String(participant.role || "").toLowerCase();
  const liveList = liveTracking?.participantLocations || [];
  const live = liveList.find((p) => {
    const pid = normalizeId(p.userId);
    const prole = String(p.role || "").toLowerCase();
    if (prole === "driver") return false;
    return pid && uid && pid === uid && prole === role;
  });
  const liveCoords = toCoord(live);
  if (!headingToDrop && liveCoords) {
    return {
      ...liveCoords,
      label: label || live?.name || "Pickup",
      kind: "pickup",
    };
  }

  if (!label) return null;
  return { lat: null, lng: null, label, kind };
};

/** Next navigation label for driver toward this participant. */
export const getDriverNavigateLabel = (participant, liveTracking = null) =>
  getDriverNavigateTarget(participant, liveTracking)?.label || "";
