const mongoose = require("mongoose");
const Ride = require("../models/rideModel");
const UserRides = require("../models/userRides");
const Courier = require("../models/courierModel");
const { parseAmount } = require("../schemas/commonSchemas");

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
  const rideDate = new Date(date);
  if (isNaN(rideDate)) return { status: 400, body: { error: "Invalid date format" } };

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
    vehicle,
    ride_amount: parsedAmount,
    CanCarryCourier,
    QuickReserve,
  });
  if (global.io) global.io.emit("newRide", ride);
  return { status: 200, body: { message: "Ride created successfully", ride } };
};

const getRides = async (query) => {
  let { from, to, date } = query;
  if (!from || !to || !date) return { status: 400, body: { message: "from, to and date are required" } };
  from = from.trim();
  to = to.trim();
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  const rides = await Ride.find({
    from: { $regex: from, $options: "i" },
    to: { $regex: to, $options: "i" },
    date: { $gte: startDate, $lte: endDate },
    status: "pending",
  })
    .populate("creator", "name email mobile profile_img")
    .sort({ createdAt: -1 });
  if (!rides.length) return { status: 404, body: { message: "No rides found" } };
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

const sendPassengerRequest = async (user, { rideId, requires_seats }) => {
  const userId = user._id;
  if (!rideId || !requires_seats) {
    return { status: 400, body: { message: "rideId & requires_seats are required" } };
  }
  const ride = await Ride.findById(rideId);
  if (!ride) return { status: 404, body: { message: "Ride not found" } };

  const alreadyRequested = ride.passenger_requested_ride.some((reqObj) => reqObj.userId.toString() === userId.toString());
  if (alreadyRequested) return { status: 400, body: { message: "Request already sent" } };
  const alreadyPassenger = ride.passengers.some((p) => p.userId.toString() === userId.toString());
  if (alreadyPassenger) return { status: 400, body: { message: "Already a passenger" } };
  if (requires_seats > ride.availableSeats) return { status: 400, body: { message: "Not enough seats available" } };

  const total_amount = ride.ride_amount * requires_seats;
  ride.passenger_requested_ride.push({ userId, requires_seats, ride_amount: total_amount, requestedAt: new Date() });
  await ride.save();

  await UserRides.findOneAndUpdate(
    { creator: userId },
    {
      $push: {
        my_pending_ride_requests: {
          rideId: ride._id,
          driverId: ride.creator,
          amount_requested: total_amount,
          seats_requested: requires_seats,
          status: "pending",
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return {
    status: 200,
    body: { message: "Passenger request sent successfully", calculated_amount: total_amount, ride },
  };
};

const upcomingDateFilter = () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const currentTime = new Date().toTimeString().slice(0, 5);
  return {
    $or: [
      { date: { $gt: todayStart } },
      { date: todayStart, startTime: { $gte: currentTime } },
    ],
  };
};

const listRidesByPhase = async (user, completed) => {
  const userId = new mongoose.Types.ObjectId(user._id);
  const userIdStr = userId.toString();
  const membership = {
    $or: [
      { creator: userId },
      { "passengers.userId": userId },
      { "all_deliveries.userId": userId },
    ],
  };

  const query = completed
    ? {
        status: { $in: ["completed", "cancelled", "started"] },
        ...membership,
      }
    : {
        status: "pending",
        $and: [upcomingDateFilter(), membership],
      };

  const rides = await Ride.find(query)
    .populate("creator", "-password -otp -otpExpires -__v")
    .populate("passengers.userId", "-password -otp -otpExpires -__v userNo")
    .populate("all_deliveries.userId", "-password -otp -otpExpires -__v userNo")
    .sort(completed ? { date: -1, startTime: -1 } : { date: 1, startTime: 1 })
    .lean();

  const updatedRides = rides
    .filter((ride) => (completed ? ride.status !== "pending" : ride.status === "pending"))
    .flatMap((ride) => {
    const results = [];
    const isDriver = ride.creator?._id.toString() === userIdStr;
    const passengerData = ride.passengers?.find((p) => p.userId?._id.toString() === userIdStr);
    const courierData = ride.all_deliveries?.find((d) => d.userId?._id.toString() === userIdStr);
    if (isDriver) results.push({ ...ride, myRole: "driver", roleContext: "creator", activeData: ride.creator });
    if (passengerData) {
      results.push({
        ...ride,
        myRole: "passenger",
        roleContext: "passengers",
        activeData: passengerData,
        ride_amount: passengerData.ride_amount ?? ride.ride_amount,
      });
    }
    if (courierData) {
      results.push({
        ...ride,
        myRole: "courier",
        roleContext: "all_deliveries",
        activeData: courierData,
        ride_amount: courierData.amount_will ?? ride.ride_amount,
      });
    }
    return results;
  });
  return { status: 200, body: { success: true, count: updatedRides.length, rides: updatedRides } };
};

const USER_FIELDS = "name email mobile profile_img gender userNo";

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
    .select("passengers all_deliveries passenger_requested_ride users_request_Couriers status creator")
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
  const passengerData = await PassengerRide.find({ creator: userId, status: "pending" }).lean();
  const passengerRequests = passengerData.map((p) => ({
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
  const courierRequestsData = await Courier.find({ creator: userId, courier_status: { $in: ["pending", "request_to_driver"] } }).lean();
  const courierRequests = courierRequestsData.map((c) => ({
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
