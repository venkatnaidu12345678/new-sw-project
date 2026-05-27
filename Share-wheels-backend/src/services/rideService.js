const mongoose = require("mongoose");
const Ride = require("../models/rideModel");
const UserRides = require("../models/userRides");
const User = require("../models/userModel");
const Courier = require("../models/courierModel");
const PassengerRide = require("../models/passengerRideModel");
const { parseAmount } = require("../schemas/commonSchemas");
const { ensureParticipantBoardingOtp } = require("./rideVerificationService");
const { notifyUser } = require("./notificationService");
const {
  isRideScheduledTimePassed,
  isRideScheduledTimeFuture,
} = require("../utils/rideScheduleUtils");
const { expireStalePendingRides } = require("./rideExpiryService");

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseCalendarDateParts = (dateStr) => {
  const parts = String(dateStr).trim().split("-").map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  return { year: parts[0], month: parts[1], day: parts[2] };
};

/** Match rides stored as UTC midnight or local calendar day (legacy). */
const calendarDayRange = (dateStr) => {
  const p = parseCalendarDateParts(dateStr);
  if (!p) return null;
  const { year, month, day } = p;
  const utcStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const utcEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  const localStart = new Date(year, month - 1, day, 0, 0, 0, 0);
  const localEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
  return {
    startDate: new Date(Math.min(utcStart.getTime(), localStart.getTime())),
    endDate: new Date(Math.max(utcEnd.getTime(), localEnd.getTime())),
  };
};

const parseRideDateForStorage = (dateStr) => {
  const p = parseCalendarDateParts(dateStr);
  if (!p) return null;
  return new Date(Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0, 0));
};

const getRidesData = async ({ rideIds }) => {
  if (!rideIds || !Array.isArray(rideIds)) {
    return { status: 400, body: { status: false, message: "rideIds must be an array" } };
  }
  const rides = await Ride.find({ _id: { $in: rideIds } })
    .populate("creator", "name mobile profile_img")
    .populate("users_request_Couriers.userId", "name mobile profile_img")
    .populate("all_deliveries.userId", "name mobile profile_img")
    .populate("passenger_requested_ride.userId", "name mobile profile_img")
    .populate("passengers.userId", "name mobile profile_img");
  return { status: 200, body: { status: true, count: rides.length, rides } };
};

const createRide = async (user, payload) => {
  const { from, to, availableSeats, ride_amount, date, startTime, AlternatePhoneNumber, CanCarryCourier, QuickReserve } = payload;
  if (!from || !to || !date || !startTime || !ride_amount) {
    return { status: 400, body: { error: "All required ride fields are missing" } };
  }
  const vehicle = user.vehicle;
  if (!vehicle || !vehicle.company || !vehicle.car_no) {
    return { status: 400, body: { error: "Please add your vehicle details first" } };
  }
  const rideDate = parseRideDateForStorage(date);
  if (!rideDate || isNaN(rideDate.getTime())) {
    return { status: 400, body: { error: "Invalid date format" } };
  }

  const parsedAmount = parseAmount(ride_amount);
  if (parsedAmount === null || parsedAmount <= 0) {
    return { status: 400, body: { error: "Valid ride_amount is required" } };
  }

  const ride = await Ride.create({
    creator: user._id,
    from,
    to,
    availableSeats: availableSeats || 1,
    date: rideDate,
    AlternatePhoneNumber: AlternatePhoneNumber ? String(AlternatePhoneNumber) : undefined,
    startTime,
    vehicle: {
      type: vehicle.type || "car",
      company: vehicle.company || "",
      model: vehicle.model || "",
      car_image: vehicle.car_image || "",
      car_no: vehicle.car_no || "",
    },
    ride_amount: parsedAmount,
    CanCarryCourier,
    QuickReserve,
  });
  if (global.io) global.io.emit("newRide", ride);
  return { status: 200, body: { message: "Ride created successfully", ride } };
};

const getRides = async (query, authUser) => {
  let { from, to, date } = query;
  if (!from || !to || !date) {
    return { status: 400, body: { message: "from, to and date are required" } };
  }
  from = String(from).trim();
  to = String(to).trim();
  const range = calendarDayRange(date);
  if (!range) {
    return { status: 400, body: { message: "Invalid date format" } };
  }

  const findFilter = {
    from: { $regex: escapeRegex(from), $options: "i" },
    to: { $regex: escapeRegex(to), $options: "i" },
    date: { $gte: range.startDate, $lte: range.endDate },
    status: "pending",
  };
  if (authUser?._id) {
    findFilter.creator = { $ne: authUser._id };
  }

  const rides = await Ride.find(findFilter)
    .populate("creator", "name email mobile profile_img")
    .sort({ createdAt: -1 })
    .lean();

  // Original API: JSON array of rides (empty array when none)
  return { status: 200, body: rides };
};

const cancelRide = async (user, { rideId, reason }) => {
  const ride = await Ride.findById(rideId);
  if (!ride) return { status: 404, body: { message: "Ride not found" } };
  if (ride.creator.toString() !== user._id.toString()) {
    return { status: 403, body: { message: "Only ride creator can cancel this ride" } };
  }
  const [hours, minutes] = ride.startTime.split(":");
  const rideStart = new Date(ride.date);
  rideStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  if (rideStart - new Date() < 60 * 60 * 1000) {
    return {
      status: 400,
      body: { status: false, message: "Ride can only be cancelled at least 1 hour before the start time" },
    };
  }
  ride.status = "cancelled";
  ride.cancel_reason = reason || "No reason provided";
  await ride.save();
  return { status: 200, body: { status: true, message: "Ride cancelled successfully", ride } };
};

const addPassengerDirectly = async (ride, user, seats, total_amount) => {
  const userId = user._id;
  const passengerEntry = {
    userId,
    requires_seats: seats,
    ride_amount: total_amount,
    status: "accepted",
    joinedAt: new Date(),
  };
  await ensureParticipantBoardingOtp(passengerEntry, userId);
  ride.passengers.push(passengerEntry);
  ride.availableSeats -= seats;
  await ride.save();

  await UserRides.findOneAndUpdate(
    { creator: userId },
    {
      $pull: { my_pending_ride_requests: { rideId: ride._id } },
      $push: {
        driver_accepted_ride_requests: {
          rideId: ride._id,
          driverId: ride.creator,
          amount_requested: total_amount,
          seats_requested: seats,
          status: "accepted",
        },
      },
    },
    { upsert: true }
  );

  await notifyUser(ride.creator, {
    title: "New passenger (Quick Reserve)",
    body: `${user.name || "A passenger"} booked ${seats} seat(s) on your ride`,
    type: "passenger_joined",
    data: { rideId: ride._id.toString() },
  });

  return passengerEntry;
};

const sendPassengerRequest = async (user, { rideId, requires_seats }) => {
  const userId = user._id;
  const seats = Number(requires_seats);
  if (!rideId || !Number.isFinite(seats) || seats < 1) {
    return {
      status: 400,
      body: { success: false, message: "rideId and requires_seats (min 1) are required" },
    };
  }
  const ride = await Ride.findById(rideId);
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };

  if (ride.creator.toString() === userId.toString()) {
    return {
      status: 400,
      body: {
        success: false,
        message: "You cannot book a seat on your own ride. You are the driver for this trip.",
      },
    };
  }

  const alreadyRequested = ride.passenger_requested_ride.some(
    (reqObj) => reqObj.userId.toString() === userId.toString()
  );
  if (alreadyRequested) {
    return { status: 400, body: { success: false, message: "Request already sent" } };
  }
  const alreadyPassenger = ride.passengers.some(
    (p) => p.userId.toString() === userId.toString()
  );
  if (alreadyPassenger) {
    return { status: 400, body: { success: false, message: "Already a passenger" } };
  }
  if (seats > ride.availableSeats) {
    return {
      status: 400,
      body: {
        success: false,
        message: `Not enough seats available (only ${ride.availableSeats} left)`,
      },
    };
  }

  const total_amount = ride.ride_amount * seats;

  if (ride.QuickReserve) {
    await addPassengerDirectly(ride, user, seats, total_amount);
    return {
      status: 200,
      body: {
        success: true,
        bookingStatus: "confirmed",
        message: `Booking confirmed! ${seats} seat(s) reserved (₹${total_amount}).`,
        calculated_amount: total_amount,
        ride,
      },
    };
  }

  ride.passenger_requested_ride.push({
    userId,
    requires_seats: seats,
    ride_amount: total_amount,
    requestedAt: new Date(),
  });
  await ride.save();

  await UserRides.findOneAndUpdate(
    { creator: userId },
    {
      $push: {
        my_pending_ride_requests: {
          rideId: ride._id,
          driverId: ride.creator,
          amount_requested: total_amount,
          seats_requested: seats,
          status: "pending",
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await notifyUser(ride.creator, {
    title: "New passenger request",
    body: `${user.name || "Someone"} requested ${seats} seat(s)`,
    type: "passenger_request",
    data: { rideId: ride._id.toString() },
  });

  return {
    status: 200,
    body: {
      success: true,
      bookingStatus: "pending_approval",
      message: "Request sent. The driver must accept your booking.",
      calculated_amount: total_amount,
      ride,
    },
  };
};

const refIdStr = (ref) =>
  ref?._id?.toString?.() || ref?.toString?.() || "";

/** Inclusion-only — cannot mix `-password` exclusions with named fields in MongoDB projections */
const USER_PUBLIC_FIELDS = "name email mobile profile_img gender userNo";

const listRidesByPhase = async (user, completed) => {
  if (!completed) {
    await expireStalePendingRides();
  }

  const userIdRaw = user?._id || user?.id;
  if (!userIdRaw) {
    return { status: 401, body: { success: false, message: "User not authenticated" } };
  }

  let userId;
  try {
    userId = new mongoose.Types.ObjectId(userIdRaw);
  } catch {
    return { status: 400, body: { success: false, message: "Invalid user id" } };
  }

  const userIdStr = userId.toString();
  const membership = {
    $or: [
      { creator: userId },
      { "passengers.userId": userId },
      { "all_deliveries.userId": userId },
      { "passenger_requested_ride.userId": userId },
      { "users_request_Couriers.userId": userId },
    ],
  };

  const query = completed
    ? {
        status: { $in: ["completed", "cancelled", "expired"] },
        ...membership,
      }
    : {
        status: { $in: ["pending", "started"] },
        ...membership,
      };

  const rides = await Ride.find(query)
    .populate({ path: "creator", select: USER_PUBLIC_FIELDS, strictPopulate: false })
    .populate({
      path: "passengers.userId",
      select: USER_PUBLIC_FIELDS,
      strictPopulate: false,
    })
    .populate({
      path: "all_deliveries.userId",
      select: USER_PUBLIC_FIELDS,
      strictPopulate: false,
    })
    .populate({
      path: "passenger_requested_ride.userId",
      select: USER_PUBLIC_FIELDS,
      strictPopulate: false,
    })
    .populate({
      path: "users_request_Couriers.userId",
      select: USER_PUBLIC_FIELDS,
      strictPopulate: false,
    })
    .sort(completed ? { date: -1, startTime: -1 } : { date: 1, startTime: 1 })
    .lean();

  const allowedStatuses = completed
    ? ["completed", "cancelled", "expired"]
    : ["pending", "started"];

  const updatedRides = rides
    .filter((ride) => allowedStatuses.includes(ride.status))
    .flatMap((ride) => {
      const results = [];
      const passengers = ride.passengers || [];
      const deliveries = ride.all_deliveries || [];
      const passengerRequests = ride.passenger_requested_ride || [];
      const courierRequests = ride.users_request_Couriers || [];

      const isDriver = refIdStr(ride.creator) === userIdStr;
      const passengerData = passengers.find((p) => refIdStr(p.userId) === userIdStr);
      const courierData = deliveries.find((d) => refIdStr(d.userId) === userIdStr);
      const pendingPassengerReq = passengerRequests.find(
        (r) => refIdStr(r.userId) === userIdStr
      );
      const pendingCourierReq = courierRequests.find(
        (r) => refIdStr(r.userId) === userIdStr
      );

      const scheduleMeta = {
        isSchedulePassed: isRideScheduledTimePassed(ride),
        isScheduleFuture: isRideScheduledTimeFuture(ride),
        canStartLate: ride.status === "pending" && isRideScheduledTimePassed(ride),
        canStartEarly: ride.status === "pending" && isRideScheduledTimeFuture(ride),
      };

      if (isDriver) {
        results.push({
          ...ride,
          ...scheduleMeta,
          myRole: "driver",
          roleContext: "creator",
          activeData: ride.creator,
        });
      }
      if (passengerData) {
        results.push({
          ...ride,
          ...scheduleMeta,
          myRole: "passenger",
          roleContext: "passengers",
          bookingStatus: "confirmed",
          activeData: passengerData,
          ride_amount: passengerData.ride_amount ?? ride.ride_amount,
          requires_seats: passengerData.requires_seats,
        });
      } else if (pendingPassengerReq) {
        results.push({
          ...ride,
          ...scheduleMeta,
          myRole: "passenger",
          roleContext: "passenger_requested_ride",
          bookingStatus: "pending_approval",
          activeData: pendingPassengerReq,
          ride_amount: pendingPassengerReq.ride_amount ?? ride.ride_amount,
          requires_seats: pendingPassengerReq.requires_seats,
        });
      }
      if (courierData) {
        results.push({
          ...ride,
          ...scheduleMeta,
          myRole: "courier",
          roleContext: "all_deliveries",
          bookingStatus: "confirmed",
          activeData: courierData,
          ride_amount: courierData.amount_will ?? ride.ride_amount,
        });
      } else if (pendingCourierReq) {
        results.push({
          ...ride,
          ...scheduleMeta,
          myRole: "courier",
          roleContext: "users_request_Couriers",
          bookingStatus: "pending_approval",
          activeData: pendingCourierReq,
          ride_amount: pendingCourierReq.amount_will ?? ride.ride_amount,
        });
      }
      return results;
    });
  return { status: 200, body: { success: true, count: updatedRides.length, rides: updatedRides } };
};

const USER_FIELDS = USER_PUBLIC_FIELDS;

const sanitizeParticipant = (entry, viewerId) => {
  const doc = entry.toObject ? entry.toObject() : { ...entry };
  const uid = doc.userId?._id?.toString?.() || doc.userId?.toString?.();
  const isSelf = viewerId && uid === viewerId.toString();
  if (!isSelf) {
    delete doc.boardingOtp;
    delete doc.boardingOtpExpires;
  }
  return doc;
};

const getRideDetails = async (rideId, viewerId) => {
  if (!mongoose.Types.ObjectId.isValid(rideId)) return { status: 400, body: { success: false, message: "Invalid Ride ID" } };
  const ride = await Ride.findById(rideId)
    .select(
      "passengers all_deliveries passenger_requested_ride users_request_Couriers status creator vehicle from to date startTime ride_amount availableSeats CanCarryCourier QuickReserve"
    )
    .populate("creator", USER_FIELDS)
    .populate("passengers.userId", USER_FIELDS)
    .populate("all_deliveries.userId", USER_FIELDS)
    .populate("passenger_requested_ride.userId", USER_FIELDS)
    .populate("users_request_Couriers.userId", USER_FIELDS);
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };

  const passengers = (ride.passengers || []).map((p) => sanitizeParticipant(p, viewerId));
  const all_deliveries = (ride.all_deliveries || []).map((c) => sanitizeParticipant(c, viewerId));

  const verificationParticipants = [
    ...passengers.map((p) => ({
      role: "passenger",
      name: p.userId?.name,
      userNo: p.userId?.userNo,
      isBoardingVerified: !!p.isBoardingVerified,
    })),
    ...all_deliveries.map((c) => ({
      role: "courier",
      name: c.userId?.name,
      userNo: c.userId?.userNo,
      isBoardingVerified: !!c.isBoardingVerified,
    })),
  ];
  const pendingVerification = verificationParticipants.filter((p) => !p.isBoardingVerified).length;

  let myBoarding = null;
  if (viewerId) {
    const vid = viewerId.toString();
    const asPassenger = passengers.find((p) => p.userId?._id?.toString() === vid);
    const asCourier = all_deliveries.find((c) => c.userId?._id?.toString() === vid);
    const self = asPassenger || asCourier;
    if (self) {
      myBoarding = {
        role: asPassenger ? "passenger" : "courier",
        userNo: self.userId?.userNo,
        boardingOtp: self.boardingOtp,
        boardingOtpExpires: self.boardingOtpExpires,
        isBoardingVerified: !!self.isBoardingVerified,
      };
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      data: {
        status: ride.status,
        vehicle: ride.vehicle,
        creator: ride.creator,
        from: ride.from,
        to: ride.to,
        date: ride.date,
        startTime: ride.startTime,
        ride_amount: ride.ride_amount,
        availableSeats: ride.availableSeats,
        CanCarryCourier: !!ride.CanCarryCourier,
        QuickReserve: !!ride.QuickReserve,
        passengers,
        all_deliveries,
        passenger_requested_ride: ride.passenger_requested_ride,
        users_request_Couriers: ride.users_request_Couriers,
        verification: {
          total: verificationParticipants.length,
          pending: pendingVerification,
          allVerified: verificationParticipants.length === 0 || pendingVerification === 0,
          participants: verificationParticipants,
        },
        myBoarding,
      },
    },
  };
};

const getMyRequests = async (user) => {
  const userId = new mongoose.Types.ObjectId(user._id);

  const passengerData = await PassengerRide.find({
    creator: userId,
    status: "pending",
    $or: [{ assigned_to: { $exists: false } }, { "assigned_to.rideId": null }],
  }).lean();
  const standalonePassengerRequests = passengerData.map((p) => ({
    requestId: p._id,
    passengerRideId: p._id,
    from: p.from,
    to: p.to,
    date: p.date,
    seats: p.seats_needed,
    amount: p.amount_will,
    luggage: p.luggage_included,
    requestedAt: p.createdAt,
    status: p.status,
    type: "passenger",
  }));

  const userRidesDoc = await UserRides.findOne({ creator: userId })
    .populate("my_pending_ride_requests.rideId", "from to date startTime")
    .populate("my_pending_ride_requests.driverId", "name mobile")
    .lean();

  const rideJoinRequests = (userRidesDoc?.my_pending_ride_requests || [])
    .filter((r) => (!r.status || r.status === "pending") && r.rideId)
    .map((r) => ({
      requestId: r.rideId?._id || r.rideId,
      rideId: r.rideId?._id || r.rideId,
      from: r.rideId?.from,
      to: r.rideId?.to,
      date: r.rideId?.date,
      startTime: r.rideId?.startTime,
      seats: r.seats_requested,
      amount: r.amount_requested,
      driver: r.driverId ? { name: r.driverId.name, mobile: r.driverId.mobile } : null,
      requestedAt: r.requestedAt,
      status: r.status || "pending",
      type: "passenger",
    }));

  const passengerRequests = [...standalonePassengerRequests, ...rideJoinRequests];

  const courierRequestsData = await Courier.find({
    creator: userId,
    courier_status: { $in: ["pending", "request_to_driver"] },
    "driver_assigned_courier.rideId": { $exists: false },
  }).lean();
  const courierRequests = courierRequestsData
    .filter((c) => !c.driver_assigned_courier?.rideId)
    .map((c) => ({
    requestId: c._id,
    courierNumber: c.courierNumber,
    from: c.from,
    to: c.to,
    parcel: c.what_to_deliver,
    amount: c.amount_will,
    date: c.date,
    timeSlot: c.timeSlot,
    receiver: c.courier_receiver_details,
    status: c.courier_status,
    assignedRide: c.driver_assigned_courier?.rideId || null,
    requestedAt: c.createdAt,
    type: "courier",
  }));
  return {
    status: 200,
    body: { success: true, passengerRequests, courierRequests, total: passengerRequests.length + courierRequests.length },
  };
};

module.exports = {
  getRidesData,
  createRide,
  getRides,
  cancelRide,
  sendPassengerRequest,
  listRidesByPhase,
  getRideDetails,
  getMyRequests,
};
