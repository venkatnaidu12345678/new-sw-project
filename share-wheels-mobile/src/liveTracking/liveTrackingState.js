/** @typedef {{ lat: number, lng: number, latitude?: number, longitude?: number }} LocationPoint */

export const normalizeRideId = (id) => {
  if (id == null) return "";
  if (typeof id === "object") {
    return (
      id._id?.toString?.() ||
      id.id?.toString?.() ||
      id.userId?._id?.toString?.() ||
      id.userId?.toString?.() ||
      ""
    );
  }
  return id?.toString?.() || String(id);
};

const normalizeRole = (role) => {
  const r = (role || "passenger").toString().toLowerCase();
  if (r === "driver" || r === "passenger" || r === "courier") return r;
  return "passenger";
};

export const toPoint = (loc) => {
  if (!loc) return null;
  const lat = Number(loc.lat ?? loc.latitude);
  const lng = Number(loc.lng ?? loc.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, latitude: lat, longitude: lng };
};

export const hasCoords = (p) => !!toPoint(p);

const participantKey = (p) =>
  normalizeRideId(p?.userId || p?.participantId || p?.id);

const serializeParticipant = (p) => {
  const userId = participantKey(p);
  const point = toPoint(p);
  return {
    ...p,
    userId,
    role: normalizeRole(p?.role),
    ...(point || {}),
    lat: point?.lat ?? p?.lat,
    lng: point?.lng ?? p?.lng,
  };
};

/** Normalize GET /chat/tracking API body for the map. */
export const normalizeTrackingApi = (apiBody) => {
  if (!apiBody) return null;
  const lt = apiBody.liveTracking || {};
  const participants = (lt.participantLocations || []).map(serializeParticipant);
  const driverLocation = toPoint(lt.driverLocation);

  return {
    success: apiBody.success,
    role: apiBody.role,
    status: apiBody.status,
    from: apiBody.from,
    to: apiBody.to,
    myUserId: normalizeRideId(apiBody.myUserId),
    liveTracking: {
      ...lt,
      driverLocation: driverLocation
        ? { ...driverLocation, updatedAt: lt.driverLocation?.updatedAt }
        : null,
      participantLocations: participants,
      locationHistory: lt.locationHistory || [],
    },
  };
};

/** Apply socket `locationUpdate` payload (primary real-time source). */
export const mergeSocketLocation = (prev, payload) => {
  if (!payload?.rideId) return prev;

  const base = prev || normalizeTrackingApi({ success: true, liveTracking: {} });
  const lt = { ...(base.liveTracking || {}) };
  let participants = [...(lt.participantLocations || [])];

  const eventRole = normalizeRole(payload.role);
  const eventPoint =
    toPoint(payload.location) ||
    toPoint(payload.coords) ||
    toPoint({ lat: payload.lat, lng: payload.lng });

  const driverPoint =
    toPoint(payload.driverLocation) ||
    (eventRole === "driver" ? eventPoint : null);

  if (driverPoint) {
    lt.driverLocation = { ...driverPoint, updatedAt: payload.location?.updatedAt };
  }

  if (Array.isArray(payload.participantLocations) && payload.participantLocations.length) {
    const byId = new Map();
    participants.forEach((p) => {
      const k = participantKey(p);
      if (k) byId.set(k, p);
    });
    payload.participantLocations.forEach((raw) => {
      const k = participantKey(raw);
      if (!k) return;
      const point = toPoint(raw);
      byId.set(k, serializeParticipant({ ...byId.get(k), ...raw, ...(point || {}) }));
    });
    participants = Array.from(byId.values());
  }

  const actorId = normalizeRideId(
    payload.userId || payload.participantId || payload.id
  );
  if (eventPoint && actorId) {
    const idx = participants.findIndex((p) => participantKey(p) === actorId);
    const next = serializeParticipant({
      ...(idx >= 0 ? participants[idx] : {}),
      userId: actorId,
      role: eventRole,
      name: payload.name || (idx >= 0 ? participants[idx]?.name : null),
      ...eventPoint,
    });
    if (idx >= 0) participants[idx] = next;
    else participants.push(next);
  }

  return {
    ...base,
    status: payload.status ?? base.status,
    from: payload.from ?? base.from,
    to: payload.to ?? base.to,
    liveTracking: {
      ...lt,
      participantLocations: participants,
      locationHistory:
        payload.path?.length > 0 ? payload.path : lt.locationHistory || [],
    },
  };
};

/** Inject this device's GPS immediately so the map is not empty while waiting for server. */
export const applyLocalGps = (prev, { userId, role, name, latitude, longitude }) => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return prev;

  const base = prev || normalizeTrackingApi({ success: true, liveTracking: {} });
  const uid = normalizeRideId(userId);
  const r = normalizeRole(role);
  const point = { lat: latitude, lng: longitude, latitude, longitude };

  const lt = { ...(base.liveTracking || {}) };
  let participants = [...(lt.participantLocations || [])];

  if (r === "driver") {
    lt.driverLocation = { ...point, updatedAt: new Date().toISOString() };
  }

  const idx = participants.findIndex((p) => participantKey(p) === uid);
  const entry = serializeParticipant({
    ...(idx >= 0 ? participants[idx] : {}),
    userId: uid,
    role: r,
    name: name || (idx >= 0 ? participants[idx]?.name : r),
    ...point,
  });
  if (idx >= 0) participants[idx] = entry;
  else participants.push(entry);

  return {
    ...base,
    liveTracking: { ...lt, participantLocations: participants },
  };
};

export const countOnMap = (tracking) => {
  const lt = tracking?.liveTracking || {};
  let driver = hasCoords(lt.driverLocation) ? 1 : 0;
  let passengers = 0;
  let couriers = 0;
  (lt.participantLocations || []).forEach((p) => {
    if (!hasCoords(p)) return;
    if (p.role === "driver") {
      driver = 1;
      return;
    }
    if (p.role === "courier") couriers += 1;
    else passengers += 1;
  });
  return { driver, passengers, couriers, total: driver + passengers + couriers };
};
