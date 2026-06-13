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
    fromCoords: apiBody.fromCoords || null,
    toCoords: apiBody.toCoords || null,
    routePolyline: apiBody.routePolyline || "",
    stopovers: apiBody.stopovers || [],
    myUserId: normalizeRideId(apiBody.myUserId),
    date: apiBody.date || null,
    passengers: Array.isArray(apiBody.passengers) ? apiBody.passengers : [],
    couriers: Array.isArray(apiBody.couriers) ? apiBody.couriers : [],
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
    lt.driverLocation = {
      ...driverPoint,
      updatedAt:
        payload.driverLocation?.updatedAt ??
        payload.location?.updatedAt ??
        new Date().toISOString(),
    };
  }

  if (Array.isArray(payload.participantLocations)) {
    if (payload.participantLocations.length === 0) {
      participants = [];
    } else {
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
    role: payload.role ?? base.role,
    status: payload.status ?? base.status,
    from: payload.from ?? base.from,
    to: payload.to ?? base.to,
    fromCoords: payload.fromCoords ?? base.fromCoords,
    toCoords: payload.toCoords ?? base.toCoords,
    routePolyline: payload.routePolyline ?? base.routePolyline,
    stopovers: payload.stopovers ?? base.stopovers,
    date: payload.date ?? base.date,
    passengers: payload.passengers ?? base.passengers,
    couriers: payload.couriers ?? base.couriers,
    myUserId: normalizeRideId(payload.myUserId) || base.myUserId,
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

/** Strip other participants' GPS from non-driver viewers (map + counts). */
export const filterTrackingForViewer = (tracking, viewerRole, myUserId) => {
  if (!tracking) return tracking;
  const role = normalizeRole(viewerRole);
  const isDriverView = role === "driver";
  const lt = tracking.liveTracking || {};
  const myId = normalizeRideId(myUserId);

  if (isDriverView) {
    const participants = (lt.participantLocations || []).filter(
      (p) => p.role === "passenger" || p.role === "courier"
    );
    return {
      ...tracking,
      liveTracking: {
        ...lt,
        participantLocations: participants,
      },
    };
  }

  const driverOnly = (lt.participantLocations || []).filter((p) => {
    if (p.role !== "driver") return false;
    return hasCoords(p) || hasCoords(lt.driverLocation);
  });

  return {
    ...tracking,
    liveTracking: {
      ...lt,
      participantLocations: driverOnly,
      locationHistory: lt.locationHistory || [],
    },
  };
};

export const countOnMap = (tracking, viewerRole) => {
  const filtered = filterTrackingForViewer(tracking, viewerRole, tracking?.myUserId);
  const lt = filtered?.liveTracking || {};
  const role = (viewerRole || "").toString().toLowerCase();
  const isDriverView = role === "driver";

  let driver = !isDriverView && hasCoords(lt.driverLocation) ? 1 : 0;
  let passengers = 0;
  let couriers = 0;

  if (!isDriverView) {
    return { driver, passengers: 0, couriers: 0, total: driver };
  }

  (lt.participantLocations || []).forEach((p) => {
    if (!hasCoords(p)) return;
    if (p.role === "courier") couriers += 1;
    else if (p.role === "passenger") passengers += 1;
  });
  return { driver, passengers, couriers, total: passengers + couriers };
};
