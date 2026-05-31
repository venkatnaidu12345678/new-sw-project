/** Normalize ride id for comparisons */
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

const normalizeRole = (value) => {
  const role = (value || "").toString().toLowerCase();
  if (role === "driver" || role === "passenger" || role === "courier") return role;
  return "passenger";
};

const toLocationPoint = (loc) => {
  if (!loc) return null;
  const lat = Number(loc.lat ?? loc.latitude);
  const lng = Number(loc.lng ?? loc.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { ...loc, lat, lng, latitude: lat, longitude: lng };
};

const participantKey = (p) =>
  normalizeRideId(p?.userId || p?.participantId || p?.id);

const extractRideId = (payload) =>
  payload?.rideId ||
  payload?.rideID ||
  payload?.ride?._id ||
  payload?.ride?.id ||
  payload?.ride;

/**
 * Merge a socket `locationUpdate` payload into getRideTracking() shape.
 */
export const mergeTrackingFromSocket = (prev, payload) => {
  if (!extractRideId(payload)) return prev;

  const base = prev || {};
  const lt = base.liveTracking || {};
  const prevParticipants = Array.isArray(lt.participantLocations)
    ? lt.participantLocations
    : [];

  const eventRole = normalizeRole(payload?.role);
  const eventLocation =
    toLocationPoint(payload?.location) ||
    toLocationPoint(payload?.coords) ||
    toLocationPoint({
      lat: payload?.lat,
      lng: payload?.lng,
      latitude: payload?.latitude,
      longitude: payload?.longitude,
    });

  const driverFromPayload =
    toLocationPoint(payload?.driverLocation) ||
    (eventRole === "driver" ? eventLocation : null);

  const incomingParticipants = Array.isArray(payload?.participantLocations)
    ? payload.participantLocations
        .map((p) => {
          const point = toLocationPoint(p);
          const userId = participantKey(p);
          if (!userId) return null;
          const role = normalizeRole(p?.role);
          return {
            ...p,
            ...(point || {}),
            role,
            userId,
            name: p?.name || payload?.name,
            lat: point?.lat ?? p?.lat,
            lng: point?.lng ?? p?.lng,
          };
        })
        .filter(Boolean)
    : [];

  let mergedParticipants = prevParticipants;
  if (incomingParticipants.length > 0) {
    const byId = new Map();
    prevParticipants.forEach((p) => {
      const key = participantKey(p);
      if (key) byId.set(key, p);
    });
    incomingParticipants.forEach((p) => {
      const key = participantKey(p);
      if (!key) return;
      const prevEntry = byId.get(key) || {};
      const merged = { ...prevEntry, ...p };
      if (!toLocationPoint(merged) && toLocationPoint(prevEntry)) {
        merged.lat = prevEntry.lat;
        merged.lng = prevEntry.lng;
      }
      byId.set(key, merged);
    });
    mergedParticipants = Array.from(byId.values());
  }

  const actorId = normalizeRideId(
    payload?.userId || payload?.participantId || payload?.id
  );

  if (eventLocation && actorId) {
    const idx = mergedParticipants.findIndex(
      (p) => participantKey(p) === actorId
    );
    const nextActor = {
      ...(idx >= 0 ? mergedParticipants[idx] : {}),
      userId: actorId,
      role: eventRole,
      name: payload?.name || (idx >= 0 ? mergedParticipants[idx]?.name : null),
      ...eventLocation,
    };
    if (idx >= 0) {
      mergedParticipants = [...mergedParticipants];
      mergedParticipants[idx] = nextActor;
    } else {
      mergedParticipants = [...mergedParticipants, nextActor];
    }
  }

  return {
    ...base,
    status: payload.status ?? base.status,
    from: payload.from ?? base.from,
    to: payload.to ?? base.to,
    liveTracking: {
      ...lt,
      driverLocation: driverFromPayload || lt.driverLocation,
      participantLocations: mergedParticipants,
      locationHistory:
        payload.path?.length > 0 ? payload.path : lt.locationHistory || [],
    },
  };
};
