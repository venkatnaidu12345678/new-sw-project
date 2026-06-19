const mongoose = require("mongoose");
const Courier = require("../models/courierModel");
const Ride = require("../models/rideModel");
const User = require("../models/userModel");
const PassengerRide = require("../models/passengerRideModel");
const { parseAmount } = require("../schemas/commonSchemas");
const { ensureParticipantBoardingOtp } = require("./rideVerificationService");
const { notifyUser } = require("./notificationService");
const {
  emitRideParticipantsUpdated,
  emitRideRequestUpdated,
  emitMyRequestsUpdated,
  emitEnrouteRequestRemoved,
  emitEnrouteRequestAdded,
} = require("../utils/socketEmit");
const { escapeRegex, toEnrouteDateKey } = require("../utils/rideDateQueryUtils");
const {
  closeStandaloneRequestsAfterJoin,
  assertStandaloneCourierAvailableForRide,
} = require("../utils/participantRequestCleanup");
const { expirePendingRideIfStale } = require("./rideExpiryService");
const { syncLiveTrackingRoster } = require("./rideTrackingService");
const {
  rejectIfPassengerJoiningAsCourier,
  isUserCourierOnRide,
} = require("../utils/rideParticipantRules");

const parseCourierCalendarDate = (value) => {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const buildCreatorFilter = (value) => {
  const sid = value?.toString?.() || String(value || "");
  if (!sid) return { $in: [] };
  if (mongoose.Types.ObjectId.isValid(sid)) {
    return { $in: [sid, new mongoose.Types.ObjectId(sid)] };
  }
  return { $in: [sid] };
};

const normalizeCourierCreateBody = (body) => {
  const {
    from,
    to,
    courier_type,
    what_to_deliver,
    courier_img,
    amount_will,
    date,
    receiver_name,
    receiver_mobile,
    receiver_alternate_mobile,
    receiver_address,
  } = body || {};

  const mobile = String(receiver_mobile || "").trim();
  const alternate =
    String(receiver_alternate_mobile || "").trim() || mobile;
  const startDate = parseCourierCalendarDate(date?.startDate ?? date);
  const endDate = parseCourierCalendarDate(date?.endDate);

  return {
    from: String(from || "").trim(),
    to: String(to || "").trim(),
    courier_type: String(courier_type || "").trim(),
    what_to_deliver: String(what_to_deliver || "").trim(),
    courier_img: String(courier_img || "").trim(),
    amount_will,
    date: {
      startDate,
      endDate: endDate || startDate,
    },
    receiver_name: String(receiver_name || "").trim(),
    receiver_mobile: mobile,
    receiver_alternate_mobile: alternate,
    receiver_address: String(receiver_address || "").trim(),
  };
};

const createCourierRequest = async (user, body) => {
  const normalized = normalizeCourierCreateBody(body);
  const {
    from,
    to,
    courier_type,
    what_to_deliver,
    courier_img,
    amount_will,
    date,
    receiver_name,
    receiver_mobile,
    receiver_alternate_mobile,
    receiver_address,
  } = normalized;

  if (
    !from ||
    !to ||
    !courier_type ||
    !what_to_deliver ||
    !courier_img ||
    amount_will == null ||
    amount_will === "" ||
    !date.startDate ||
    !receiver_name ||
    !receiver_mobile ||
    !receiver_address
  ) {
    return {
      status: 400,
      body: {
        success: false,
        message:
          "Route, parcel details, photo, amount, delivery dates, and receiver info are required",
      },
    };
  }

  const parsedAmount = parseAmount(amount_will);
  if (parsedAmount === null || parsedAmount <= 0) {
    return { status: 400, body: { success: false, message: "Valid amount_will is required" } };
  }

  const courierNumber = `CR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newCourier = new Courier({
    creator: user._id,
    courierNumber,
    from,
    to,
    courier_type,
    what_to_deliver,
    courier_img,
    amount_will: parsedAmount,
    date: { startDate: date.startDate, endDate: date.endDate || date.startDate },
    courier_receiver_details: {
      name: receiver_name,
      mobile: receiver_mobile,
      alternate_mobile: receiver_alternate_mobile,
      Address: receiver_address,
    },
    courier_status: "pending",
  });
  await newCourier.save();
  emitMyRequestsUpdated(user._id);
  return { status: 201, body: { success: true, message: "Courier request created successfully", data: newCourier } };
};

const normalizeRouteLabel = (value) => String(value || "").trim();

const routesMatch = (fromA, toA, fromB, toB) =>
  normalizeRouteLabel(fromA).toLowerCase() === normalizeRouteLabel(fromB).toLowerCase() &&
  normalizeRouteLabel(toA).toLowerCase() === normalizeRouteLabel(toB).toLowerCase();

/** Corridor delivery segment (may differ from the driver's full ride). */
const resolveCourierBookingSegment = async (
  userId,
  ride,
  { standaloneCourierId, from: bodyFrom, to: bodyTo } = {}
) => {
  const rideFrom = ride.from;
  const rideTo = ride.to;

  if (standaloneCourierId && mongoose.Types.ObjectId.isValid(standaloneCourierId)) {
    const courier = await Courier.findById(standaloneCourierId)
      .select("from to creator")
      .lean();
    if (courier && String(courier.creator) === String(userId)) {
      const from = normalizeRouteLabel(courier.from);
      const to = normalizeRouteLabel(courier.to);
      if (from && to) return { from, to };
    }
  }

  const assigned = await Courier.findOne({
    creator: userId,
    "driver_assigned_courier.rideId": ride._id,
    courier_status: {
      $in: ["driver_assigned", "picked_up", "in_transit", "request_to_driver"],
    },
  })
    .select("from to")
    .lean();

  if (assigned) {
    const from = normalizeRouteLabel(assigned.from);
    const to = normalizeRouteLabel(assigned.to);
    if (from && to) return { from, to };
  }

  const from = normalizeRouteLabel(bodyFrom);
  const to = normalizeRouteLabel(bodyTo);
  if (from && to && !routesMatch(from, to, rideFrom, rideTo)) {
    return { from, to };
  }

  return { from: rideFrom, to: rideTo };
};

const requestCourier = async (user, body) => {
  const { rideId, standaloneCourierId } = body;
  if (!rideId || !mongoose.Types.ObjectId.isValid(rideId)) return { status: 400, body: { success: false, message: "Invalid rideId" } };
  const normalized = normalizeCourierCreateBody(body);
  const {
    from,
    to,
    courier_type,
    what_to_deliver,
    courier_img,
    amount_will,
    receiver_name,
    receiver_mobile,
    receiver_alternate_mobile,
    receiver_address,
    date: courierDate,
  } = normalized;

  if (
    !from ||
    !to ||
    !courier_type ||
    !what_to_deliver ||
    !courier_img ||
    amount_will == null ||
    amount_will === "" ||
    !courierDate?.startDate ||
    !receiver_name ||
    !receiver_mobile ||
    !receiver_address
  ) {
    return { status: 400, body: { success: false, message: "All courier fields are required" } };
  }
  let ride = await Ride.findById(rideId);
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };
  const stale = await expirePendingRideIfStale(ride);
  ride = stale.ride || ride;
  if (ride.status === "expired") {
    return {
      status: 400,
      body: { success: false, message: "This ride has expired and is no longer accepting courier requests" },
    };
  }
  if (ride.status !== "pending") {
    return { status: 400, body: { success: false, message: "Ride is not open for new courier requests" } };
  }
  if (ride.creator.toString() === user._id.toString()) {
    return { status: 400, body: { success: false, message: "Cannot request own ride" } };
  }
  if (!ride.CanCarryCourier) {
    return {
      status: 400,
      body: { success: false, message: "This ride does not accept courier deliveries" },
    };
  }

  const parsedAmount = parseAmount(amount_will);
  if (parsedAmount === null || parsedAmount <= 0) {
    return { status: 400, body: { success: false, message: "Valid amount_will is required" } };
  }

  if (isUserCourierOnRide(ride, user._id)) {
    return { status: 400, body: { success: false, message: "Already a courier on this ride" } };
  }

  const passengerConflict = rejectIfPassengerJoiningAsCourier(ride, user._id);
  if (passengerConflict.blocked) {
    return { status: 400, body: { success: false, message: passengerConflict.message } };
  }

  const standaloneLock = await assertStandaloneCourierAvailableForRide(
    user._id,
    standaloneCourierId,
    rideId
  );
  if (!standaloneLock.ok) {
    return {
      status: 400,
      body: { success: false, message: standaloneLock.message },
    };
  }

  const bookingSegment = await resolveCourierBookingSegment(user._id, ride, {
    standaloneCourierId,
    from,
    to,
  });

  const courierData = {
    userId: user._id,
    courierNumber: `CR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    from: bookingSegment.from,
    to: bookingSegment.to,
    ...(standaloneCourierId && mongoose.Types.ObjectId.isValid(standaloneCourierId)
      ? { courierId: standaloneCourierId }
      : {}),
    courier_type,
    what_to_deliver,
    courier_img,
    amount_will: parsedAmount,
    date: courierDate,
    courier_receiver_details: {
      name: receiver_name,
      mobile: receiver_mobile,
      alternate_mobile: receiver_alternate_mobile,
      Address: receiver_address,
    },
  };

  if (ride.QuickReserve) {
    await ensureParticipantBoardingOtp(courierData, user._id, {
      rideId: ride._id,
      from: bookingSegment.from,
      to: bookingSegment.to,
    });
    ride.all_deliveries.push(courierData);
    await ride.save();

    await closeStandaloneRequestsAfterJoin(user._id, ride, {
      explicitCourierId: standaloneCourierId,
      explicitPassengerRideId: body.standalonePassengerRideId,
    });
    emitMyRequestsUpdated(user._id, {
      action: "courier_joined",
      rideId: ride._id.toString(),
      from: ride.from,
      to: ride.to,
      ...(standaloneCourierId ? { courierId: String(standaloneCourierId) } : {}),
    });
    emitRideParticipantsUpdated(ride._id, {
      action: "courier_joined",
      userId: user._id.toString(),
    });

    await notifyUser(ride.creator, {
      title: "New courier (Quick Reserve)",
      body: `${user.name || "A courier"} booked delivery on your ride`,
      type: "courier_joined",
      data: { rideId: ride._id.toString() },
    });
    return {
      status: 200,
      body: {
        success: true,
        bookingStatus: "confirmed",
        message: "Courier booking confirmed on this ride.",
        data: ride.all_deliveries,
      },
    };
  }

  ride.users_request_Couriers.push(courierData);
  await ride.save();

  emitMyRequestsUpdated(user._id, {
    action: "courier_request_sent",
    rideId: ride._id.toString(),
    from: ride.from,
    to: ride.to,
  });
  emitRideRequestUpdated(ride._id, {
    action: "courier_request_sent",
    userId: user._id.toString(),
  });

  await notifyUser(ride.creator, {
    title: "New courier request",
    body: `${user.name || "Someone"} requested courier delivery on your ride`,
    type: "courier_request",
    data: { rideId: ride._id.toString() },
  });

  return {
    status: 200,
    body: {
      success: true,
      bookingStatus: "pending_approval",
      message: "Courier request sent. Waiting for driver approval.",
      data: ride.users_request_Couriers,
    },
  };
};

const acceptCourier = async (user, { rideId, courierId }) => {
  if (!mongoose.Types.ObjectId.isValid(rideId) || !mongoose.Types.ObjectId.isValid(courierId)) {
    return { status: 400, body: { success: false, message: "Invalid rideId or courierId" } };
  }
  const ride = await Ride.findById(rideId).select(
    "creator from to passengers passenger_requested_ride users_request_Couriers all_deliveries"
  );
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };
  const courierData = ride.users_request_Couriers?.find(
    (c) => c._id.toString() === courierId.toString()
  );
  if (!courierData) return { status: 404, body: { success: false, message: "Courier request not found" } };
  if (ride.creator.toString() !== user._id.toString()) return { status: 403, body: { success: false, message: "Only driver can accept" } };
  const passengerConflict = rejectIfPassengerJoiningAsCourier(ride, courierData.userId);
  if (passengerConflict.blocked) {
    return { status: 400, body: { success: false, message: passengerConflict.message } };
  }

  let segFrom = normalizeRouteLabel(courierData.from) || ride.from;
  let segTo = normalizeRouteLabel(courierData.to) || ride.to;
  if (routesMatch(segFrom, segTo, ride.from, ride.to)) {
    if (courierData.courierId && mongoose.Types.ObjectId.isValid(courierData.courierId)) {
      const linked = await Courier.findById(courierData.courierId).select("from to").lean();
      if (linked?.from && linked?.to) {
        segFrom = linked.from;
        segTo = linked.to;
      }
    } else {
      const linked = await Courier.findOne({
        creator: courierData.userId,
        "driver_assigned_courier.rideId": ride._id,
      })
        .sort({ updatedAt: -1 })
        .select("from to")
        .lean();
      if (linked?.from && linked?.to) {
        segFrom = linked.from;
        segTo = linked.to;
      }
    }
  }

  const deliveryEntry = {
    ...courierData.toObject(),
    from: segFrom,
    to: segTo,
    assignedAt: new Date(),
  };
  await ensureParticipantBoardingOtp(deliveryEntry, deliveryEntry.userId, {
    rideId: ride._id,
    from: segFrom,
    to: segTo,
  });
  const updateResult = await Ride.updateOne(
    { _id: rideId, "users_request_Couriers._id": new mongoose.Types.ObjectId(courierId) },
    {
      $pull: { users_request_Couriers: { _id: new mongoose.Types.ObjectId(courierId) } },
      $push: { all_deliveries: deliveryEntry },
    }
  );
  if (updateResult.modifiedCount === 0) return { status: 400, body: { success: false, message: "Failed to move courier" } };
  const courierUserId = courierData.userId?.toString?.() || courierData.userId;
  const rideForCleanup = await Ride.findById(rideId).select("creator from to date").lean();
  if (rideForCleanup && courierUserId) {
    const explicitCourierId =
      courierData.courierId?.toString?.() || courierData.courierId || null;
    await closeStandaloneRequestsAfterJoin(courierUserId, rideForCleanup, {
      explicitCourierId,
    });
  }
  emitEnrouteRequestRemoved(ride.from, ride.to, toEnrouteDateKey(ride.date), {
    type: "courier",
    userId: courierUserId,
    courierId: courierId.toString(),
  });
  emitRideParticipantsUpdated(rideId, {
    action: "courier_accepted",
    courierId: courierId.toString(),
    userId: courierUserId,
  });
  emitRideRequestUpdated(rideId, { action: "courier_accepted" });
  if (courierUserId) {
    emitMyRequestsUpdated(courierUserId, {
      action: "courier_accepted",
      rideId: rideId.toString(),
    });
  }
  const driver = await User.findById(user._id);
  await notifyUser(courierUserId, {
    title: "Courier delivery accepted",
    body: `${driver?.name || "Driver"} accepted your courier on their ride`,
    type: "courier_assigned",
    data: {
      rideId: rideId.toString(),
      courierId: courierId.toString(),
    },
  });
  return { status: 200, body: { success: true, message: "Courier accepted successfully" } };
};

const rejectCourier = async (user, { rideId, courierId }) => {
  if (!mongoose.Types.ObjectId.isValid(rideId) || !mongoose.Types.ObjectId.isValid(courierId)) {
    return { status: 400, body: { success: false, message: "Invalid IDs" } };
  }
  const ride = await Ride.findById(rideId);
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };
  if (ride.creator.toString() !== user._id.toString()) return { status: 403, body: { success: false, message: "Only driver allowed" } };
  const courierReq = ride.users_request_Couriers.find(
    (c) => c._id.toString() === courierId.toString()
  );
  if (!courierReq) return { status: 404, body: { success: false, message: "Courier not found in requests" } };
  const courierUserId = courierReq.userId?.toString?.() || courierReq.userId;
  await Ride.updateOne({ _id: rideId }, { $pull: { users_request_Couriers: { _id: new mongoose.Types.ObjectId(courierId) } } });
  const driver = await User.findById(user._id);
  if (courierUserId) {
    await notifyUser(courierUserId, {
      title: "Courier request declined",
      body: `${driver?.name || "Driver"} declined your courier request`,
      type: "courier_reject",
      data: { rideId: ride._id.toString(), courierId: courierId.toString() },
    });
    emitMyRequestsUpdated(courierUserId, {
      action: "courier_request_rejected",
      rideId: ride._id.toString(),
    });
  }
  emitRideRequestUpdated(rideId, { action: "courier_rejected", courierId: courierId.toString() });
  return { status: 200, body: { success: true, message: "Courier rejected and removed" } };
};

const removeDelivery = async (user, { rideId, courierId }) => {
  const ride = await Ride.findById(rideId).select("creator all_deliveries from to date");
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };
  if (ride.creator.toString() !== user._id.toString()) return { status: 403, body: { success: false, message: "Only driver allowed" } };
  const delivery = ride.all_deliveries?.find(
    (d) => d._id?.toString() === courierId?.toString()
  );
  if (!delivery) return { status: 404, body: { success: false, message: "Delivery not found" } };
  const courierUserId = delivery.userId?.toString?.() || String(delivery.userId);
  const creatorFilter = buildCreatorFilter(courierUserId);
  ride.all_deliveries = ride.all_deliveries.filter(
    (d) => d._id?.toString() !== courierId.toString()
  );
  await ride.save();
  const reopenedCouriers = await Courier.updateMany(
    {
      creator: creatorFilter,
      "driver_assigned_courier.rideId": ride._id,
      courier_status: {
        $in: ["driver_assigned", "request_to_driver", "picked_up", "in_transit", "cancelled"],
      },
    },
    {
      $set: {
        courier_status: "pending",
        driver_assigned_courier: { userId: null, rideId: null },
      },
    }
  );
  const reopenedPassengers = await PassengerRide.updateMany(
    {
      creator: creatorFilter,
      "assigned_to.rideId": ride._id,
      status: { $in: ["aisgned_passenger", "in_car", "ride_finished", "cancelled"] },
    },
    {
      $set: {
        status: "pending",
        assigned_to: { userId: null, rideId: null },
      },
    }
  );
  emitMyRequestsUpdated(courierUserId, {
    action: "participant_reopened",
    rideId: ride._id.toString(),
    reopenedPassengers: reopenedPassengers.modifiedCount || 0,
    reopenedCouriers: reopenedCouriers.modifiedCount || 0,
  });
  emitEnrouteRequestAdded(ride.from, ride.to, ride.date, {
    action: "participant_reopened",
    rideId: ride._id.toString(),
    userId: courierUserId.toString(),
    reopenedPassengers: reopenedPassengers.modifiedCount || 0,
    reopenedCouriers: reopenedCouriers.modifiedCount || 0,
  });
  await notifyUser(courierUserId, {
    title: "Removed from ride",
    body: "You have been removed from the courier delivery. Your open requests are visible again.",
    type: "courier_removed",
    data: { rideId: ride._id.toString(), courierId: courierId.toString() },
  });
  emitRideParticipantsUpdated(rideId, {
    action: "courier_removed",
    courierId: courierId.toString(),
    userId: courierUserId,
  });
  await syncLiveTrackingRoster(rideId);
  return { status: 200, body: { success: true, message: "Removed successfully" } };
};

module.exports = {
  createCourierRequest,
  requestCourier,
  acceptCourier,
  rejectCourier,
  removeDelivery,
  resolveCourierBookingSegment,
};
