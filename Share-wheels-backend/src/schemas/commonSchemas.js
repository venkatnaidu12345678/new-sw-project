const mongoose = require("mongoose");

/** Reusable amount field — passenger/courier offered price */
const amountWillField = {
  type: Number,
  min: 0,
  default: 0,
};

/** Driver per-seat or total fare on a ride */
const rideAmountField = {
  type: Number,
  min: 0,
  default: 0,
};

const routeFields = {
  from: { type: String, trim: true },
  to: { type: String, trim: true },
};

const assignmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: "Ride" },
  },
  { _id: false }
);

const receiverDetailsSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    alternate_mobile: { type: String, default: "" },
    Address: { type: String, required: true },
  },
  { _id: false }
);

const courierDateSchema = new mongoose.Schema(
  {
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
  },
  { _id: false }
);

/** Embedded passenger on a Ride */
const participantVerificationFields = {
  boardingOtp: { type: String },
  boardingOtpExpires: { type: Date },
  isBoardingVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
};

const passengerOnRideSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    requires_seats: { type: Number, min: 1, default: 1 },
    ride_amount: rideAmountField,
    status: {
      type: String,
      enum: ["accepted", "picked_up", "dropped"],
      default: "accepted",
    },
    joinedAt: { type: Date, default: Date.now },
    pickedUpAt: { type: Date },
    droppedAt: { type: Date },
    ...participantVerificationFields,
  },
  { _id: true }
);

/** Pending passenger seat request on a Ride */
const passengerRequestOnRideSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    requires_seats: { type: Number, min: 1, default: 1 },
    ride_amount: rideAmountField,
    requestedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

/** Courier snapshot embedded on a Ride */
const courierOnRideSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    courierId: { type: mongoose.Schema.Types.ObjectId, ref: "Courier" },
    courierNumber: String,
    from: String,
    to: String,
    courier_type: String,
    what_to_deliver: String,
    courier_img: String,
    amount_will: amountWillField,
    date: {
      startDate: { type: String },
      endDate: { type: String },
    },
    courier_receiver_details: {
      name: String,
      mobile: String,
      alternate_mobile: String,
      Address: String,
    },
    requestedAt: { type: Date, default: Date.now },
    assignedAt: { type: Date },
    status: {
      type: String,
      enum: ["accepted", "picked_up", "delivered"],
      default: "accepted",
    },
    pickedUpAt: { type: Date },
    deliveredAt: { type: Date },
    ...participantVerificationFields,
  },
  { _id: true }
);

const vehicleOnRideSchema = new mongoose.Schema(
  {
    type: { type: String, default: "car" },
    company: { type: String, default: "" },
    model: { type: String, default: "" },
    car_image: { type: String, default: "" },
    car_no: { type: String, default: "" },
  },
  { _id: false }
);

const parseAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const locationPointSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const participantLocationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["driver", "passenger", "courier"], required: true },
    name: { type: String, default: "" },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const liveTrackingSchema = new mongoose.Schema(
  {
    isActive: { type: Boolean, default: false },
    startedAt: { type: Date },
    endedAt: { type: Date },
    driverLocation: {
      lat: Number,
      lng: Number,
      updatedAt: Date,
    },
    participantLocations: {
      type: [participantLocationSchema],
      default: [],
    },
    locationHistory: {
      type: [locationPointSchema],
      default: [],
    },
  },
  { _id: false }
);

const coordsSchema = new mongoose.Schema(
  {
    lat: Number,
    lng: Number,
    label: String,
  },
  { _id: false }
);

module.exports = {
  amountWillField,
  rideAmountField,
  routeFields,
  assignmentSchema,
  receiverDetailsSchema,
  courierDateSchema,
  passengerOnRideSchema,
  passengerRequestOnRideSchema,
  courierOnRideSchema,
  vehicleOnRideSchema,
  parseAmount,
  locationPointSchema,
  liveTrackingSchema,
  coordsSchema,
};
