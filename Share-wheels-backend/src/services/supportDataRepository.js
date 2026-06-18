const mongoose = require("mongoose");
const User = require("../models/userModel");
const Ride = require("../models/rideModel");
const PassengerRide = require("../models/passengerRideModel");
const Courier = require("../models/courierModel");
const UserRides = require("../models/userRides");
const driverSubscriptionService = require("./driverSubscriptionService");

const uid = (id) => new mongoose.Types.ObjectId(id);
const str = (id) => (id ? id.toString() : "");

const slimRide = (r, role, extra = {}) => ({
  id: str(r._id),
  from: r.from,
  to: r.to,
  date: r.date,
  startTime: r.startTime,
  status: r.status,
  amount: r.ride_amount,
  seats: r.availableSeats,
  role,
  ...extra,
});

const slimPassengerReq = (p) => ({
  id: str(p._id),
  passengerRideId: p.passenger_rideId,
  from: p.from,
  to: p.to,
  date: p.date,
  seats: p.seats_needed,
  amount: p.amount_will,
  status: p.status,
  luggage: p.luggage_included,
});

const slimCourier = (c) => ({
  id: str(c._id),
  courierNumber: c.courierNumber,
  from: c.from,
  to: c.to,
  parcel: c.what_to_deliver,
  type: c.courier_type,
  amount: c.amount_will,
  status: c.courier_status,
  receiver: c.courier_receiver_details?.name,
});

/**
 * Loads all Share Wheels collections related to this user (full personal DB footprint).
 */
const buildFullUserSnapshot = async (userId) => {
  const userOid = uid(userId);
  const user = await User.findById(userOid).select(
    "name email mobile gender profile_img vehicle isTermsAndServicesAccepted isVerified createdAt"
  );

  if (!user) return null;

  const [
    ridesAsDriver,
    ridesAsPassenger,
    ridesAsCourierDelivery,
    ridesWithMyPassengerRequest,
    ridesWithMyCourierRequest,
    passengerRidesCreated,
    couriersCreated,
    userRidesDoc,
    platformStats,
    subscriptionStatus,
  ] = await Promise.all([
    Ride.find({ creator: userOid })
      .sort({ date: -1 })
      .limit(50)
      .lean(),
    Ride.find({ "passengers.userId": userOid })
      .sort({ date: -1 })
      .limit(50)
      .lean(),
    Ride.find({ "all_deliveries.userId": userOid })
      .sort({ date: -1 })
      .limit(50)
      .lean(),
    Ride.find({ "passenger_requested_ride.userId": userOid })
      .sort({ date: -1 })
      .limit(30)
      .lean(),
    Ride.find({ "users_request_Couriers.userId": userOid })
      .sort({ date: -1 })
      .limit(30)
      .lean(),
    PassengerRide.find({ creator: userOid }).sort({ createdAt: -1 }).limit(50).lean(),
    Courier.find({ creator: userOid }).sort({ createdAt: -1 }).limit(50).lean(),
    UserRides.findOne({ creator: userOid }).lean(),
    getPlatformStats(),
    driverSubscriptionService.getDriverSubscriptionStatus(userId),
  ]);

  const upcoming = [];
  const history = [];

  const classifyRide = (r, role) => {
    const item = slimRide(r, role);
    const done =
      r.status === "completed" ||
      r.status === "cancelled" ||
      r.status === "expired";
    const rideDate = r.date ? new Date(r.date) : null;
    if (done) history.push(item);
    else if (r.status === "pending" || r.status === "started") upcoming.push(item);
    else history.push(item);
    return item;
  };

  ridesAsDriver.forEach((r) => classifyRide(r, "driver"));
  ridesAsPassenger.forEach((r) => classifyRide(r, "passenger"));
  ridesAsCourierDelivery.forEach((r) => classifyRide(r, "courier"));

  const pendingPassengerOnMyRides = ridesAsDriver.flatMap((r) =>
    (r.passenger_requested_ride || []).map((req) => ({
      rideId: str(r._id),
      route: `${r.from} → ${r.to}`,
      seats: req.requires_seats,
      amount: req.ride_amount,
      userId: str(req.userId),
      requestedAt: req.requestedAt,
    }))
  );

  const pendingCourierOnMyRides = ridesAsDriver.flatMap((r) =>
    (r.users_request_Couriers || []).map((req) => ({
      rideId: str(r._id),
      route: `${r.from} → ${r.to}`,
      parcel: req.what_to_deliver,
      amount: req.amount_will,
      userId: str(req.userId),
    }))
  );

  const myPendingSeatRequests = ridesWithMyPassengerRequest.map((r) => {
    const mine = (r.passenger_requested_ride || []).find(
      (p) => str(p.userId) === str(userId)
    );
    return {
      rideId: str(r._id),
      route: `${r.from} → ${r.to}`,
      status: r.status,
      seats: mine?.requires_seats,
      amount: mine?.ride_amount,
    };
  });

  const pendingPassengerRides = passengerRidesCreated.filter(
    (p) => p.status === "pending" || p.status === "aisgned_passenger"
  );
  const pendingCouriers = couriersCreated.filter((c) =>
    ["pending", "request_to_driver", "driver_assigned", "picked_up", "in_transit"].includes(
      c.courier_status
    )
  );

  const subBody = subscriptionStatus?.body || {};
  const subscription = subBody.subscription || null;

  return {
    profile: {
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      gender: user.gender,
      verified: user.isVerified,
      termsAccepted: user.isTermsAndServicesAccepted,
      memberSince: user.createdAt,
      hasVehicle: !!(user.vehicle?.company && user.vehicle?.car_no),
      vehicle: user.vehicle
        ? {
            company: user.vehicle.company,
            model: user.vehicle.model,
            type: user.vehicle.type,
            carNo: user.vehicle.car_no,
            license: user.vehicle.license_number,
          }
        : null,
    },
    counts: {
      ridesAsDriver: ridesAsDriver.length,
      ridesAsPassenger: ridesAsPassenger.length,
      ridesAsCourier: ridesAsCourierDelivery.length,
      upcomingRides: upcoming.length,
      historyRides: history.length,
      passengerRequestsOpen: pendingPassengerRides.length,
      courierRequestsOpen: pendingCouriers.length,
      pendingPassengerOnMyDrives: pendingPassengerOnMyRides.length,
      pendingCourierOnMyDrives: pendingCourierOnMyRides.length,
      myPendingSeatRequests: myPendingSeatRequests.length,
      pendingRideBookingsFromUserRides: userRidesDoc?.my_pending_ride_requests?.length || 0,
    },
    upcoming: upcoming.slice(0, 10),
    history: history.slice(0, 10),
    passengerRequests: passengerRidesCreated.map(slimPassengerReq),
    courierRequests: couriersCreated.map(slimCourier),
    pendingPassengerOnMyRides: pendingPassengerOnMyRides.slice(0, 10),
    pendingCourierOnMyRides: pendingCourierOnMyRides.slice(0, 10),
    myPendingSeatRequests: myPendingSeatRequests.slice(0, 10),
    userRidesTracking: userRidesDoc
      ? {
          pending: userRidesDoc.my_pending_ride_requests || [],
          accepted: userRidesDoc.driver_accepted_ride_requests || [],
        }
      : { pending: [], accepted: [] },
    platform: platformStats,
    subscription,
    subscriptionMeta: {
      freePlanUsed: !!subBody.freePlanUsed,
      canSubscribeToFree: subBody.canSubscribeToFree !== false,
      razorpayConfigured: !!subBody.razorpayConfigured,
      activePlans: (subBody.plans || []).filter((p) => p.isActive !== false).length,
    },
  };
};

const getPlatformStats = async () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [openRidesToday, totalPendingRides, totalUsers, totalPassengerOpen, totalCourierOpen] =
    await Promise.all([
      Ride.countDocuments({
        status: "pending",
        date: { $gte: todayStart },
      }),
      Ride.countDocuments({ status: { $in: ["pending", "started"] } }),
      User.countDocuments({ isVerified: true }),
      PassengerRide.countDocuments({ status: "pending" }),
      Courier.countDocuments({
        courier_status: { $in: ["pending", "request_to_driver", "driver_assigned"] },
      }),
    ]);

  const popularRoutes = await Ride.aggregate([
    { $match: { status: "pending", date: { $gte: todayStart } } },
    { $group: { _id: { from: "$from", to: "$to" }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  return {
    openRidesToday,
    totalPendingRides,
    verifiedUsers: totalUsers,
    openPassengerRequests: totalPassengerOpen,
    openCourierRequests: totalCourierOpen,
    popularRoutesToday: popularRoutes.map((r) => ({
      from: r._id.from,
      to: r._id.to,
      count: r.count,
    })),
  };
};

/** Find rides/routes matching free-text (city names) */
const searchUserAndPlatformData = (snapshot, query) => {
  const q = query.toLowerCase();
  const matches = [];

  [...snapshot.upcoming, ...snapshot.history].forEach((r) => {
    if (r.from?.toLowerCase().includes(q) || r.to?.toLowerCase().includes(q)) {
      matches.push({ type: "ride", ...r });
    }
  });

  snapshot.passengerRequests.forEach((p) => {
    if (p.from?.toLowerCase().includes(q) || p.to?.toLowerCase().includes(q)) {
      matches.push({ type: "passengerRequest", ...p });
    }
  });

  snapshot.courierRequests.forEach((c) => {
    if (c.from?.toLowerCase().includes(q) || c.to?.toLowerCase().includes(q)) {
      matches.push({ type: "courierRequest", ...c });
    }
  });

  snapshot.platform.popularRoutesToday.forEach((r) => {
    if (r.from?.toLowerCase().includes(q) || r.to?.toLowerCase().includes(q)) {
      matches.push({ type: "platformRoute", ...r });
    }
  });

  return matches.slice(0, 8);
};

module.exports = {
  buildFullUserSnapshot,
  searchUserAndPlatformData,
};
