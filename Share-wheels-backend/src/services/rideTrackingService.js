const mongoose = require("mongoose");
const Ride = require("../models/rideModel");
const { getRideParticipantRole } = require("./rideAccessHelper");
const { pickDriverLocation, parseCoordsFromBody } = require("../utils/trackingUtils");
const { notifyUser } = require("./notificationService");

const MAX_HISTORY = 120;

const emitLocation = (rideId, payload) => {
  if (global.io) {
    global.io.to(`ride:${rideId}`).emit("locationUpdate", payload);
    global.io.to("admin:tracking").emit("locationUpdate", payload);
  }
};

const upsertParticipantLocation = (liveTracking, user, role, lat, lng, now) => {
  if (!liveTracking.participantLocations) liveTracking.participantLocations = [];
  const uid = user._id.toString();
  const idx = liveTracking.participantLocations.findIndex(
    (p) => p.userId?.toString() === uid
  );
  const entry = {
    userId: user._id,
    role,
    name: user.name || "User",
    lat,
    lng,
    updatedAt: now,
  };
  if (idx >= 0) {
    liveTracking.participantLocations[idx] = entry;
  } else {
    liveTracking.participantLocations.push(entry);
  }
};

const buildTrackingPayload = (ride, user, role, lat, lng, now) => ({
  rideId: ride._id.toString(),
  from: ride.from,
  to: ride.to,
  status: ride.status,
  role,
  userId: user._id.toString(),
  participantId: user._id.toString(),
  name: user.name || "User",
  driver: {
    id:
      ride.creator?._id?.toString?.() ||
      ride.creator?.toString?.() ||
      null,
    name:
      role === "driver"
        ? user.name || "Driver"
        : ride.creator?.name || "Driver",
  },
  location: { lat, lng, updatedAt: now },
  driverLocation: pickDriverLocation(ride.liveTracking),
  participantLocations: ride.liveTracking?.participantLocations || [],
  path: ride.liveTracking?.locationHistory || [],
});

const updateParticipantLocation = async (user, rideId, body) => {
  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    return { status: 400, body: { success: false, message: "Invalid ride ID" } };
  }
  const { lat, lng } = parseCoordsFromBody(body);
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { status: 400, body: { success: false, message: "Valid lat and lng required" } };
  }

  const ride = await Ride.findById(rideId).select(
    "status creator passengers all_deliveries liveTracking from to"
  );
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };

  const role = getRideParticipantRole(ride, user._id);
  if (!role) {
    return { status: 403, body: { success: false, message: "Not on this ride" } };
  }
  if (ride.status !== "started") {
    return { status: 400, body: { success: false, message: "Ride must be started to share location" } };
  }

  const now = new Date();
  const point = { lat: latitude, lng: longitude, at: now };

  if (!ride.liveTracking) ride.liveTracking = {};
  ride.liveTracking.isActive = true;
  if (!ride.liveTracking.startedAt) ride.liveTracking.startedAt = now;

  upsertParticipantLocation(ride.liveTracking, user, role, latitude, longitude, now);

  if (role === "driver") {
    ride.liveTracking.driverLocation = { lat: latitude, lng: longitude, updatedAt: now };
    if (!ride.liveTracking.locationHistory) ride.liveTracking.locationHistory = [];
    ride.liveTracking.locationHistory.push(point);
    if (ride.liveTracking.locationHistory.length > MAX_HISTORY) {
      ride.liveTracking.locationHistory = ride.liveTracking.locationHistory.slice(-MAX_HISTORY);
    }
  }

  const payload = buildTrackingPayload(ride, user, role, latitude, longitude, now);
  emitLocation(rideId, payload);

  ride.markModified("liveTracking");
  await ride.save();

  return { status: 200, body: { success: true, tracking: payload } };
};

const requestParticipantLocationAccess = async (driverUser, { rideId, targetUserId }) => {
  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    return { status: 400, body: { success: false, message: "Invalid ride ID" } };
  }
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    return { status: 400, body: { success: false, message: "Invalid participant ID" } };
  }

  const ride = await Ride.findById(rideId).populate("creator", "name");
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };

  const driverRole = getRideParticipantRole(ride, driverUser._id);
  if (driverRole !== "driver") {
    return {
      status: 403,
      body: { success: false, message: "Only the driver can request participant location" },
    };
  }
  if (ride.status !== "started") {
    return {
      status: 400,
      body: { success: false, message: "Ride must be started to request location sharing" },
    };
  }

  const targetRole = getRideParticipantRole(ride, targetUserId);
  if (!targetRole || targetRole === "driver") {
    return {
      status: 400,
      body: { success: false, message: "User is not a passenger or courier on this ride" },
    };
  }

  const driverName = driverUser.name || ride.creator?.name || "Driver";
  const payload = {
    rideId: ride._id.toString(),
    driverName,
    driverId: driverUser._id.toString(),
    targetUserId: targetUserId.toString(),
    role: targetRole,
  };

  if (global.io) {
    global.io.to(`user:${targetUserId}`).emit("locationAccessRequested", payload);
    global.io.to(`ride:${ride._id}`).emit("locationAccessRequested", payload);
  }

  await notifyUser(targetUserId, {
    title: "Location requested",
    body: `${driverName} asked you to enable location for the live ride map.`,
    type: "location_access_requested",
    data: { rideId: ride._id.toString(), driverName },
  });

  return {
    status: 200,
    body: {
      success: true,
      message: "Location request sent to participant",
    },
  };
};

const getActiveRidesForAdmin = async () => {
  const rides = await Ride.find({
    status: "started",
  })
    .populate("creator", "name mobile")
    .populate("passengers.userId", "name")
    .select("from to status liveTracking passengers date startTime")
    .lean();

  const list = rides.map((r) => ({
    rideId: r._id.toString(),
    from: r.from,
    to: r.to,
    status: r.status,
    date: r.date,
    startTime: r.startTime,
    driver: r.creator,
    passengerCount: r.passengers?.length || 0,
    location: pickDriverLocation(r.liveTracking),
    participants: (r.liveTracking?.participantLocations || []).map((p) => ({
      userId: p.userId?.toString?.() || String(p.userId),
      role: p.role,
      name: p.name,
      location:
        Number.isFinite(p.lat) && Number.isFinite(p.lng)
          ? { lat: p.lat, lng: p.lng, updatedAt: p.updatedAt }
          : null,
    })),
    path: (r.liveTracking?.locationHistory || []).filter(
      (pt) => Number.isFinite(pt.lat) && Number.isFinite(pt.lng)
    ),
    startedAt: r.liveTracking?.startedAt,
    isTracking: !!r.liveTracking?.isActive,
  }));

  return { status: 200, body: { success: true, rides: list } };
};

const getRideTracking = async (rideId) => {
  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    return { status: 400, body: { success: false, message: "Invalid ride ID" } };
  }
  const ride = await Ride.findById(rideId)
    .populate("creator", "name mobile email")
    .populate("passengers.userId", "name mobile")
    .select("from to status liveTracking passengers fromCoords toCoords date startTime")
    .lean();

  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };

  const liveTracking = ride.liveTracking
    ? {
        ...ride.liveTracking,
        driverLocation: pickDriverLocation(ride.liveTracking),
      }
    : null;

  return {
    status: 200,
    body: {
      success: true,
      ride: {
        rideId: ride._id.toString(),
        from: ride.from,
        to: ride.to,
        status: ride.status,
        driver: ride.creator,
        passengers: ride.passengers,
        fromCoords: ride.fromCoords,
        toCoords: ride.toCoords,
        liveTracking,
        location: pickDriverLocation(ride.liveTracking),
        participants: liveTracking?.participantLocations || [],
      },
    },
  };
};

const serializeParticipantRow = (p) => ({
  userId: p.userId?._id?.toString?.() || p.userId?.toString?.() || String(p.userId),
  role: p.role,
  name: p.name,
  lat: p.lat,
  lng: p.lng,
  updatedAt: p.updatedAt,
});

const getTrackingForUser = async (user, rideId) => {
  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    return { status: 400, body: { success: false, message: "Invalid ride ID" } };
  }
  const ride = await Ride.findById(rideId)
    .select("creator passengers.userId all_deliveries.userId status liveTracking from to")
    .lean();
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };

  const role = getRideParticipantRole(ride, user._id);
  if (!role) return { status: 403, body: { success: false, message: "Not on this ride" } };

  const liveTracking = ride.liveTracking || {};
  const byUserId = new Map();
  (liveTracking.participantLocations || []).forEach((p) => {
    const row = serializeParticipantRow(p);
    if (row.userId) byUserId.set(row.userId, row);
  });

  const ensureEntry = (uid, entryRole, name) => {
    const id = uid?.toString?.() || String(uid);
    if (!id || byUserId.has(id)) return;
    byUserId.set(id, {
      userId: id,
      role: entryRole,
      name: name || entryRole,
      lat: null,
      lng: null,
      updatedAt: null,
    });
  };

  const driverId = ride.creator?.toString?.();
  if (driverId) ensureEntry(driverId, "driver", "Driver");
  (ride.passengers || []).forEach((p) => {
    ensureEntry(p.userId, "passenger", "Passenger");
  });
  (ride.all_deliveries || []).forEach((d) => {
    ensureEntry(d.userId, "courier", "Courier");
  });

  return {
    status: 200,
    body: {
      success: true,
      role,
      status: ride.status,
      from: ride.from,
      to: ride.to,
      myUserId: user._id.toString(),
      liveTracking: {
        ...liveTracking,
        driverLocation: pickDriverLocation(liveTracking),
        participantLocations: Array.from(byUserId.values()),
      },
    },
  };
};

const activeRosterUserIds = (ride) => {
  const ids = new Set();
  const add = (ref) => {
    const s = ref?._id?.toString?.() || ref?.toString?.();
    if (s) ids.add(s);
  };
  add(ride.creator);
  (ride.passengers || []).forEach((p) => add(p.userId));
  (ride.all_deliveries || []).forEach((d) => add(d.userId));
  return ids;
};

/** After roster change (remove passenger/courier), prune stale map pins and broadcast. */
const syncLiveTrackingRoster = async (rideId) => {
  if (!mongoose.Types.ObjectId.isValid(rideId)) return;
  const ride = await Ride.findById(rideId).select(
    "creator passengers.userId all_deliveries.userId status liveTracking from to"
  );
  if (!ride || ride.status !== "started" || !ride.liveTracking?.isActive) return;

  const allowed = activeRosterUserIds(ride);
  const pruned = (ride.liveTracking.participantLocations || []).filter((p) => {
    const uid = p.userId?.toString?.() || String(p.userId || "");
    return uid && allowed.has(uid);
  });

  ride.liveTracking.participantLocations = pruned;
  ride.markModified("liveTracking");
  await ride.save();

  const payload = {
    rideId: ride._id.toString(),
    from: ride.from,
    to: ride.to,
    status: ride.status,
    driverLocation: pickDriverLocation(ride.liveTracking),
    participantLocations: pruned.map(serializeParticipantRow),
    path: ride.liveTracking.locationHistory || [],
  };
  emitLocation(ride._id, payload);
};

module.exports = {
  updateDriverLocation: updateParticipantLocation,
  updateParticipantLocation,
  requestParticipantLocationAccess,
  getActiveRidesForAdmin,
  getRideTracking,
  getTrackingForUser,
  emitLocation,
  syncLiveTrackingRoster,
};
