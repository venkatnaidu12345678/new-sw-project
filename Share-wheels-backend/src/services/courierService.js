const mongoose = require("mongoose");
const Courier = require("../models/courierModel");
const Ride = require("../models/rideModel");
const User = require("../models/userModel");
const { parseAmount } = require("../schemas/commonSchemas");
const { ensureParticipantBoardingOtp } = require("./rideVerificationService");
const { notifyUser } = require("./notificationService");
const {
  emitRideParticipantsUpdated,
  emitRideRequestUpdated,
  emitMyRequestsUpdated,
  emitEnrouteRequestRemoved,
} = require("../utils/socketEmit");
const { escapeRegex } = require("../utils/rideDateQueryUtils");
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

const requestCourier = async (user, body) => {
  const { rideId } = body;
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

  const courierData = {
    userId: user._id,
    courierNumber: `CR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    from,
    to,
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
      from: ride.from,
      to: ride.to,
    });
    ride.all_deliveries.push(courierData);
    await ride.save();

    const linkedQr = await Courier.find({
      creator: user._id,
      courier_status: "pending",
      from: { $regex: escapeRegex(from), $options: "i" },
      to: { $regex: escapeRegex(to), $options: "i" },
    }).select("_id");
    if (linkedQr.length) {
      await Courier.updateMany(
        { _id: { $in: linkedQr.map((c) => c._id) } },
        {
          $set: {
            courier_status: "driver_assigned",
            driver_assigned_courier: { userId: ride.creator, rideId: ride._id },
          },
        }
      );
      linkedQr.forEach((c) => {
        emitEnrouteRequestRemoved(ride.from, ride.to, ride.date, {
          courierId: c._id.toString(),
          type: "courier",
        });
      });
    }
    emitMyRequestsUpdated(user._id, {
      action: "courier_joined",
      rideId: ride._id.toString(),
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

  const linkedCouriers = await Courier.find({
    creator: user._id,
    courier_status: "pending",
    from: { $regex: escapeRegex(from), $options: "i" },
    to: { $regex: escapeRegex(to), $options: "i" },
  }).select("_id");

  if (linkedCouriers.length) {
    await Courier.updateMany(
      { _id: { $in: linkedCouriers.map((c) => c._id) } },
      {
        $set: {
          courier_status: "request_to_driver",
          driver_assigned_courier: { userId: ride.creator, rideId: ride._id },
        },
      }
    );
  }

  emitMyRequestsUpdated(user._id, {
    action: "courier_request_sent",
    rideId: ride._id.toString(),
  });
  emitRideRequestUpdated(ride._id, {
    action: "courier_request_sent",
    userId: user._id.toString(),
  });
  linkedCouriers.forEach((c) => {
    emitEnrouteRequestRemoved(ride.from, ride.to, ride.date, {
      courierId: c._id.toString(),
      type: "courier",
    });
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
  const deliveryEntry = { ...courierData.toObject(), assignedAt: new Date() };
  await ensureParticipantBoardingOtp(deliveryEntry, deliveryEntry.userId, {
    rideId: ride._id,
    from: ride.from,
    to: ride.to,
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
  return { status: 200, body: { success: true, message: "Courier accepted successfully" } };
};

const rejectCourier = async (user, { rideId, courierId }) => {
  if (!mongoose.Types.ObjectId.isValid(rideId) || !mongoose.Types.ObjectId.isValid(courierId)) {
    return { status: 400, body: { success: false, message: "Invalid IDs" } };
  }
  const ride = await Ride.findById(rideId);
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };
  if (ride.creator.toString() !== user._id.toString()) return { status: 403, body: { success: false, message: "Only driver allowed" } };
  const exists = ride.users_request_Couriers.some((c) => c._id.toString() === courierId);
  if (!exists) return { status: 404, body: { success: false, message: "Courier not found in requests" } };
  await Ride.updateOne({ _id: rideId }, { $pull: { users_request_Couriers: { _id: new mongoose.Types.ObjectId(courierId) } } });
  emitRideRequestUpdated(rideId, { action: "courier_rejected", courierId: courierId.toString() });
  return { status: 200, body: { success: true, message: "Courier rejected and removed" } };
};

const removeDelivery = async (user, { rideId, courierId }) => {
  const ride = await Ride.findById(rideId).select("creator all_deliveries");
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };
  if (ride.creator.toString() !== user._id.toString()) return { status: 403, body: { success: false, message: "Only driver allowed" } };
  const delivery = ride.all_deliveries?.find(
    (d) => d._id?.toString() === courierId?.toString()
  );
  if (!delivery) return { status: 404, body: { success: false, message: "Delivery not found" } };
  const courierUserId = delivery.userId?.toString?.() || String(delivery.userId);
  ride.all_deliveries = ride.all_deliveries.filter(
    (d) => d._id?.toString() !== courierId.toString()
  );
  await ride.save();
  emitRideParticipantsUpdated(rideId, {
    action: "courier_removed",
    courierId: courierId.toString(),
    userId: courierUserId,
  });
  await syncLiveTrackingRoster(rideId);
  return { status: 200, body: { success: true, message: "Removed successfully" } };
};

module.exports = { createCourierRequest, requestCourier, acceptCourier, rejectCourier, removeDelivery };
