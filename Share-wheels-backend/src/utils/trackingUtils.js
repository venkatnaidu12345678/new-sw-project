/** Normalize driver GPS from DB subdocument or socket payload */
const pickDriverLocation = (liveTracking) => {
  const loc = liveTracking?.driverLocation;
  if (!loc || typeof loc !== "object") return null;

  const lat = Number(loc.lat ?? loc.latitude);
  const lng = Number(loc.lng ?? loc.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    updatedAt: loc.updatedAt || null,
  };
};

const parseCoordsFromBody = (body = {}) => {
  const lat = body.lat ?? body.latitude ?? body.coords?.lat ?? body.coords?.latitude;
  const lng = body.lng ?? body.longitude ?? body.coords?.lng ?? body.coords?.longitude;
  return { lat, lng };
};

module.exports = { pickDriverLocation, parseCoordsFromBody };
