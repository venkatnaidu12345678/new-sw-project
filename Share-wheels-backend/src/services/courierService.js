const mongoose = require("mongoose");
const Courier = require("../models/courierModel");
const Ride = require("../models/rideModel");
const { parseAmount } = require("../schemas/commonSchemas");
const { ensureParticipantBoardingOtp } = require("./rideVerificationService");

const createCourierRequest = async (user, body) => {
  const {
    from, to, courier_type, what_to_deliver, courier_img, amount_will, date,
    receiver_name, receiver_mobile, receiver_alternate_mobile, receiver_address,
  } = body;
  if (
    !from || !to || !courier_type || !what_to_deliver || !courier_img || !amount_will || !date?.startDate ||
    !receiver_name || !receiver_mobile || !receiver_alternate_mobile || !receiver_address
  ) return { status: 400, body: { success: false, message: "All fields are required" } };

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
    date: { startDate: date.startDate, endDate: date.endDate || null },
    courier_receiver_details: {
      name: receiver_name,
      mobile: receiver_mobile,
      alternate_mobile: receiver_alternate_mobile,
      Address: receiver_address,
    },
    courier_status: "pending",
  });
  await newCourier.save();
  return { status: 201, body: { success: true, message: "Courier request created successfully", data: newCourier } };
};

const requestCourier = async (user, body) => {
  const { rideId, from, to, courier_type, what_to_deliver, courier_img, amount_will, date, timeSlot, receiver_name, receiver_mobile, receiver_alternate_mobile, receiver_address } = body;
  if (!rideId || !mongoose.Types.ObjectId.isValid(rideId)) return { status: 400, body: { success: false, message: "Invalid rideId" } };
  if (!from || !to || !courier_type || !what_to_deliver || !courier_img || !amount_will || !date || !timeSlot || !receiver_name || !receiver_mobile || !receiver_alternate_mobile || !receiver_address) {
    return { status: 400, body: { success: false, message: "All courier fields are required" } };
  }
  const ride = await Ride.findById(rideId);
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };
  if (ride.creator.toString() === user._id.toString()) return { status: 400, body: { success: false, message: "Cannot request own ride" } };

  const parsedAmount = parseAmount(amount_will);
  if (parsedAmount === null || parsedAmount <= 0) {
    return { status: 400, body: { success: false, message: "Valid amount_will is required" } };
  }

  const courierData = {
    userId: user._id,
    courierNumber: `CR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    from, to, courier_type, what_to_deliver, courier_img, amount_will: parsedAmount, date, timeSlot,
    courier_receiver_details: { name: receiver_name, mobile: receiver_mobile, alternate_mobile: receiver_alternate_mobile, Address: receiver_address },
  };
  if (ride.CanCarryCourier) {
    await ensureParticipantBoardingOtp(courierData, user._id);
    ride.all_deliveries.push(courierData);
    await ride.save();
    return { status: 200, body: { success: true, message: "Courier directly assigned", data: ride.all_deliveries } };
  }
  ride.users_request_Couriers.push(courierData);
  await ride.save();
  return { status: 200, body: { success: true, message: "Courier request sent", data: ride.users_request_Couriers } };
};

const acceptCourier = async (user, { rideId, courierId }) => {
  if (!mongoose.Types.ObjectId.isValid(rideId) || !mongoose.Types.ObjectId.isValid(courierId)) {
    return { status: 400, body: { success: false, message: "Invalid rideId or courierId" } };
  }
  const ride = await Ride.findOne(
    { _id: rideId, "users_request_Couriers._id": new mongoose.Types.ObjectId(courierId) },
    { creator: 1, "users_request_Couriers.$": 1 }
  );
  if (!ride || ride.users_request_Couriers.length === 0) return { status: 404, body: { success: false, message: "Courier request not found" } };
  if (ride.creator.toString() !== user._id.toString()) return { status: 403, body: { success: false, message: "Only driver can accept" } };
  const courierData = ride.users_request_Couriers[0];
  const deliveryEntry = { ...courierData.toObject(), assignedAt: new Date() };
  await ensureParticipantBoardingOtp(deliveryEntry, deliveryEntry.userId);
  const updateResult = await Ride.updateOne(
    { _id: rideId, "users_request_Couriers._id": new mongoose.Types.ObjectId(courierId) },
    {
      $pull: { users_request_Couriers: { _id: new mongoose.Types.ObjectId(courierId) } },
      $push: { all_deliveries: deliveryEntry },
    }
  );
  if (updateResult.modifiedCount === 0) return { status: 400, body: { success: false, message: "Failed to move courier" } };
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
  return { status: 200, body: { success: true, message: "Courier rejected and removed" } };
};

const removeDelivery = async (user, { rideId, courierId }) => {
  const ride = await Ride.findById(rideId).select("creator");
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };
  if (ride.creator.toString() !== user._id.toString()) return { status: 403, body: { success: false, message: "Only driver allowed" } };
  const result = await Ride.updateOne({ _id: rideId }, { $pull: { all_deliveries: { _id: new mongoose.Types.ObjectId(courierId) } } });
  if (result.modifiedCount === 0) return { status: 404, body: { success: false, message: "Delivery not found" } };
  return { status: 200, body: { success: true, message: "Removed successfully" } };
};

module.exports = { createCourierRequest, requestCourier, acceptCourier, rejectCourier, removeDelivery };
