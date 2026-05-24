const mongoose = require("mongoose");
const {
  routeFields,
  rideAmountField,
  vehicleOnRideSchema,
  passengerOnRideSchema,
  passengerRequestOnRideSchema,
  courierOnRideSchema,
  liveTrackingSchema,
  coordsSchema,
} = require("../schemas/commonSchemas");

const rideSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ...routeFields,
    rideType: { type: String, enum: ["local", "long"] },
    availableSeats: { type: Number, default: 1, min: 0 },
    ride_amount: { ...rideAmountField, required: true },
    date: { type: Date, required: true },
    AlternatePhoneNumber: { type: String },
    startTime: { type: String, required: true },
    CanCarryCourier: { type: Boolean, default: false },
    QuickReserve: { type: Boolean, default: false },
    vehicle: vehicleOnRideSchema,
    driver_requested_passengers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        passenger_rideId: { type: String },
        status: { type: String },
        requestedAt: { type: Date, default: Date.now },
      },
    ],
    users_request_Couriers: [courierOnRideSchema],
    all_deliveries: [courierOnRideSchema],
    passenger_requested_ride: [passengerRequestOnRideSchema],
    passengers: [passengerOnRideSchema],
    droput_Passengers: [passengerOnRideSchema],
    status: {
      type: String,
      enum: ["pending", "started", "completed", "cancelled"],
      default: "pending",
    },
    cancel_reason: { type: String, default: null },
    fromCoords: coordsSchema,
    toCoords: coordsSchema,
    liveTracking: { type: liveTrackingSchema, default: () => ({}) },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ride", rideSchema);
