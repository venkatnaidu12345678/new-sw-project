const mongoose = require("mongoose");
const Ride = require("../models/rideModel");
const User = require("../models/userModel");
const { assignUserNoIfMissing } = require("../utils/userNoHelper");
const { generateBoardingOtp, boardingOtpExpiry } = require("../utils/boardingOtpHelper");

const USER_POPULATE = "name email mobile profile_img userNo";

const attachBoardingOtp = (entry) => {
  entry.boardingOtp = generateBoardingOtp();
  entry.boardingOtpExpires = boardingOtpExpiry();
  entry.isBoardingVerified = false;
  entry.verifiedAt = null;
  return entry;
};

const findParticipantByUserNo = (ride, userNo) => {
  const normalized = String(userNo || "").trim();
  const passenger = ride.passengers?.find(
    (p) => p.userId?.userNo === normalized || p.userId?.toString?.() === normalized
  );
  if (passenger) return { type: "passenger", entry: passenger };

  const courier = ride.all_deliveries?.find(
    (c) => c.userId?.userNo === normalized || c.userId?.toString?.() === normalized
  );
  if (courier) return { type: "courier", entry: courier };

  return null;
};

const listVerificationParticipants = async (user, rideId) => {
  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    return { status: 400, body: { success: false, message: "Invalid ride ID" } };
  }
  const ride = await Ride.findById(rideId)
    .populate("passengers.userId", USER_POPULATE)
    .populate("all_deliveries.userId", USER_POPULATE);

  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };
  if (ride.creator.toString() !== user._id.toString()) {
    return { status: 403, body: { success: false, message: "Only driver can verify participants" } };
  }
  if (!["pending", "started"].includes(ride.status)) {
    return {
      status: 400,
      body: { success: false, message: "Verification is not available for this ride" },
    };
  }

  let dirty = false;
  for (const p of ride.passengers || []) {
    if (p.userId && !p.boardingOtp) {
      await ensureParticipantBoardingOtp(p, p.userId._id || p.userId);
      dirty = true;
    }
  }
  for (const c of ride.all_deliveries || []) {
    if (c.userId && !c.boardingOtp) {
      await ensureParticipantBoardingOtp(c, c.userId._id || c.userId);
      dirty = true;
    }
  }
  if (dirty) {
    ride.markModified("passengers");
    ride.markModified("all_deliveries");
    await ride.save();
  }

  const mapEntry = (entry, role) => ({
    role,
    userId: entry.userId?._id,
    name: entry.userId?.name,
    userNo: entry.userId?.userNo,
    isBoardingVerified: !!entry.isBoardingVerified,
    verifiedAt: entry.verifiedAt,
  });

  const participants = [
    ...(ride.passengers || []).map((p) => mapEntry(p, "passenger")),
    ...(ride.all_deliveries || []).map((c) => mapEntry(c, "courier")),
  ];

  const pending = participants.filter((p) => !p.isBoardingVerified).length;

  return {
    status: 200,
    body: {
      success: true,
      rideId: ride._id,
      participants,
      total: participants.length,
      pending,
      allVerified: participants.length === 0 || pending === 0,
    },
  };
};

const verifyParticipant = async (user, { rideId, userNo, otp }) => {
  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    return { status: 400, body: { success: false, message: "Invalid ride ID" } };
  }
  const normalizedUserNo = String(userNo || "").trim();
  const normalizedOtp = String(otp || "").trim();

  if (!/^\d{6}$/.test(normalizedUserNo)) {
    return { status: 400, body: { success: false, message: "User number must be 6 digits" } };
  }
  if (!/^\d{4}$/.test(normalizedOtp)) {
    return { status: 400, body: { success: false, message: "OTP must be 4 digits" } };
  }

  const ride = await Ride.findById(rideId)
    .populate("passengers.userId", USER_POPULATE)
    .populate("all_deliveries.userId", USER_POPULATE);

  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };
  if (ride.creator.toString() !== user._id.toString()) {
    return { status: 403, body: { success: false, message: "Only driver can verify participants" } };
  }
  if (!["pending", "started"].includes(ride.status)) {
    return {
      status: 400,
      body: { success: false, message: "Cannot verify on a completed or cancelled ride" },
    };
  }

  const match = findParticipantByUserNo(ride, normalizedUserNo);
  if (!match) {
    return {
      status: 404,
      body: { success: false, message: "No passenger or courier with this user number on this ride" },
    };
  }

  const { entry, type } = match;

  if (entry.isBoardingVerified) {
    return {
      status: 200,
      body: {
        success: true,
        message: "Already verified",
        participant: { role: type, userNo: normalizedUserNo, name: entry.userId?.name },
      },
    };
  }

  if (!entry.boardingOtp) {
    return { status: 400, body: { success: false, message: "Boarding OTP not issued for this participant" } };
  }
  if (entry.boardingOtpExpires && entry.boardingOtpExpires < new Date()) {
    return { status: 400, body: { success: false, message: "Boarding OTP expired. Re-accept participant to refresh." } };
  }
  if (entry.boardingOtp !== normalizedOtp) {
    return { status: 400, body: { success: false, message: "Invalid OTP" } };
  }

  entry.isBoardingVerified = true;
  entry.verifiedAt = new Date();
  ride.markModified("passengers");
  ride.markModified("all_deliveries");
  await ride.save();

  const refreshed = await listVerificationParticipants(user, rideId);

  return {
    status: 200,
    body: {
      success: true,
      message: `${type === "courier" ? "Courier" : "Passenger"} verified successfully`,
      participant: {
        role: type,
        userNo: normalizedUserNo,
        name: entry.userId?.name,
      },
      verification: refreshed.body,
    },
  };
};

const assertAllParticipantsVerified = (ride) => {
  const passengers = ride.passengers || [];
  const couriers = ride.all_deliveries || [];
  const total = passengers.length + couriers.length;
  if (total === 0) return null;

  const unverifiedPassengers = passengers.filter((p) => !p.isBoardingVerified);
  const unverifiedCouriers = couriers.filter((c) => !c.isBoardingVerified);

  if (unverifiedPassengers.length === 0 && unverifiedCouriers.length === 0) return null;

  return {
    status: 400,
    body: {
      success: false,
      message: "Verify all passengers and couriers before starting the ride",
      pendingPassengers: unverifiedPassengers.length,
      pendingCouriers: unverifiedCouriers.length,
    },
  };
};

/** Issue boarding OTP when participant joins ride */
const ensureParticipantBoardingOtp = async (entry, userId) => {
  const user = await User.findById(userId);
  if (user) await assignUserNoIfMissing(user);
  attachBoardingOtp(entry);
};

module.exports = {
  listVerificationParticipants,
  verifyParticipant,
  assertAllParticipantsVerified,
  ensureParticipantBoardingOtp,
  attachBoardingOtp,
};
