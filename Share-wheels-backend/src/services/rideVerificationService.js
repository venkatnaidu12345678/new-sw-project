const mongoose = require("mongoose");
const Ride = require("../models/rideModel");
const User = require("../models/userModel");
const { assignUserNoIfMissing } = require("../utils/userNoHelper");
const { generateBoardingOtp, boardingOtpExpiry } = require("../utils/boardingOtpHelper");
const { notifyUser } = require("./notificationService");
const {
  TRIP_STATUS,
  tripStatusLabel,
  countsTowardDriverEarnings,
  canMarkDropped,
  canMarkDelivered,
} = require("../utils/participantTripStatus");
const { getActiveBookedSeats } = require("../utils/rideSeatUtils");

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
    participantId: entry._id,
    name: entry.userId?.name,
    userNo: entry.userId?.userNo,
    isBoardingVerified: !!entry.isBoardingVerified,
    verifiedAt: entry.verifiedAt,
    status: entry.status || TRIP_STATUS.ACCEPTED,
    statusLabel: tripStatusLabel(entry.status),
    countsTowardEarnings: countsTowardDriverEarnings(entry, role),
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
  entry.status = TRIP_STATUS.PICKED_UP;
  entry.pickedUpAt = new Date();
  ride.markModified("passengers");
  ride.markModified("all_deliveries");
  await ride.save();

  const participantUserId = entry.userId?._id || entry.userId;
  if (participantUserId) {
    const route = `${ride.from} → ${ride.to}`;
    await notifyUser(participantUserId, {
      title: "Picked up",
      body: `You are marked Picked Up on the ride (${route}).`,
      type: "participant_picked_up",
      data: { rideId: ride._id.toString(), role: type },
    });
    await notifyUser(ride.creator, {
      title: type === "courier" ? "Courier picked up" : "Passenger picked up",
      body: `${entry.userId?.name || "Participant"} verified and picked up (${route}).`,
      type: "participant_picked_up",
      data: {
        rideId: ride._id.toString(),
        role: type,
        participantId: entry._id?.toString?.(),
      },
    });
  }

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
const ensureParticipantBoardingOtp = async (entry, userId, rideContext = null) => {
  const user = await User.findById(userId);
  if (user) await assignUserNoIfMissing(user);
  const hadOtp = !!entry.boardingOtp;
  attachBoardingOtp(entry);

  if (rideContext?.rideId && userId) {
    const route =
      rideContext.from && rideContext.to
        ? `${rideContext.from} → ${rideContext.to}`
        : "your ride";
    await notifyUser(userId, {
      title: hadOtp ? "Boarding OTP updated" : "Boarding OTP ready",
      body: hadOtp
        ? `Your boarding OTP for (${route}) was refreshed. Open ride details to view it.`
        : `Your boarding OTP for (${route}) is ready. Open ride details to view your User ID and OTP.`,
      type: hadOtp ? "boarding_otp_updated" : "boarding_otp_issued",
      data: { rideId: String(rideContext.rideId) },
    });
  }
};

const findPassengerEntry = (ride, participantId) =>
  ride.passengers?.find((p) => p._id?.toString() === participantId?.toString());

const findCourierEntry = (ride, participantId) =>
  ride.all_deliveries?.find((c) => c._id?.toString() === participantId?.toString());

const markPassengerDropped = async (user, { rideId, participantId }) => {
  if (!mongoose.Types.ObjectId.isValid(rideId) || !mongoose.Types.ObjectId.isValid(participantId)) {
    return { status: 400, body: { success: false, message: "Invalid ride or participant ID" } };
  }

  const ride = await Ride.findById(rideId).populate("passengers.userId", USER_POPULATE);
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };
  if (ride.creator.toString() !== user._id.toString()) {
    return { status: 403, body: { success: false, message: "Only driver can update passenger status" } };
  }
  if (ride.status !== "started") {
    return { status: 400, body: { success: false, message: "Ride must be started" } };
  }

  const entry = findPassengerEntry(ride, participantId);
  if (!entry) {
    return { status: 404, body: { success: false, message: "Passenger not found on this ride" } };
  }
  if (!canMarkDropped(entry)) {
    return {
      status: 400,
      body: {
        success: false,
        message: entry.isBoardingVerified
          ? "Passenger must be Picked Up before Drop"
          : "Verify passenger OTP before Drop",
      },
    };
  }

  const seatsFreed = Number(entry.requires_seats) || 1;
  const alreadyDropped =
    String(entry.status || "").toLowerCase() === TRIP_STATUS.DROPPED;

  entry.status = TRIP_STATUS.DROPPED;
  entry.droppedAt = new Date();

  if (!alreadyDropped) {
    ride.availableSeats = (Number(ride.availableSeats) || 0) + seatsFreed;
  }

  ride.markModified("passengers");
  await ride.save();

  const uid = entry.userId?._id || entry.userId;
  const route = `${ride.from} → ${ride.to}`;
  if (uid) {
    await notifyUser(uid, {
      title: "Dropped off",
      body: `You were dropped off for the ride (${route}).`,
      type: "passenger_dropped",
      data: { rideId: ride._id.toString(), participantId: entry._id.toString() },
    });
  }
  await notifyUser(ride.creator, {
    title: "Passenger dropped",
    body: `${entry.userId?.name || "Passenger"} marked Dropped — earnings updated (${route}).`,
    type: "passenger_dropped",
    data: { rideId: ride._id.toString(), participantId: entry._id.toString() },
  });

  return {
    status: 200,
    body: {
      success: true,
      message: "Passenger marked as Dropped",
      availableSeats: ride.availableSeats,
      bookedSeats: getActiveBookedSeats(ride),
      participant: {
        role: "passenger",
        participantId: entry._id,
        status: entry.status,
        statusLabel: tripStatusLabel(entry.status),
        countsTowardEarnings: true,
      },
    },
  };
};

const markCourierDelivered = async (user, { rideId, participantId }) => {
  if (!mongoose.Types.ObjectId.isValid(rideId) || !mongoose.Types.ObjectId.isValid(participantId)) {
    return { status: 400, body: { success: false, message: "Invalid ride or participant ID" } };
  }

  const ride = await Ride.findById(rideId).populate("all_deliveries.userId", USER_POPULATE);
  if (!ride) return { status: 404, body: { success: false, message: "Ride not found" } };
  if (ride.creator.toString() !== user._id.toString()) {
    return { status: 403, body: { success: false, message: "Only driver can update courier status" } };
  }
  if (ride.status !== "started") {
    return { status: 400, body: { success: false, message: "Ride must be started" } };
  }

  const entry = findCourierEntry(ride, participantId);
  if (!entry) {
    return { status: 404, body: { success: false, message: "Courier not found on this ride" } };
  }
  if (!canMarkDelivered(entry)) {
    return {
      status: 400,
      body: {
        success: false,
        message: entry.isBoardingVerified
          ? "Courier must be Picked Up before Delivered"
          : "Verify courier OTP before Delivered",
      },
    };
  }

  entry.status = TRIP_STATUS.DELIVERED;
  entry.deliveredAt = new Date();
  ride.markModified("all_deliveries");
  await ride.save();

  const uid = entry.userId?._id || entry.userId;
  const route = `${ride.from} → ${ride.to}`;
  if (uid) {
    await notifyUser(uid, {
      title: "Parcel delivered",
      body: `Your delivery was marked Delivered (${route}).`,
      type: "courier_delivered",
      data: { rideId: ride._id.toString(), participantId: entry._id.toString() },
    });
  }
  await notifyUser(ride.creator, {
    title: "Courier delivered",
    body: `${entry.userId?.name || "Courier"} marked Delivered — earnings updated (${route}).`,
    type: "courier_delivered",
    data: { rideId: ride._id.toString(), participantId: entry._id.toString() },
  });

  return {
    status: 200,
    body: {
      success: true,
      message: "Courier marked as Delivered",
      participant: {
        role: "courier",
        participantId: entry._id,
        status: entry.status,
        statusLabel: tripStatusLabel(entry.status),
        countsTowardEarnings: true,
      },
    },
  };
};

module.exports = {
  listVerificationParticipants,
  verifyParticipant,
  markPassengerDropped,
  markCourierDelivered,
  assertAllParticipantsVerified,
  ensureParticipantBoardingOtp,
  attachBoardingOtp,
};
