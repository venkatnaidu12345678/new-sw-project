const mongoose = require("mongoose");
const {
  amountWillField,
  routeFields,
  assignmentSchema,
} = require("../schemas/commonSchemas");

const passengerRideSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    passenger_rideId: { type: String, required: true, unique: true },
    ...routeFields,
    ride_need_date: { type: String },
    vehicle_type: { type: String, default: "" },
    seats_needed: { type: Number, required: true, min: 1 },
    amount_will: amountWillField,
    luggage_included: { type: Boolean, default: false },
    join_requested_By: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rideId: { type: mongoose.Schema.Types.ObjectId, ref: "Ride" },
      },
    ],
    assigned_to: assignmentSchema,
    status: {
      type: String,
      enum: [
        "pending",
        "aisgned_passenger",
        "in_car",
        "ride_finished",
        "cancelled",
        "expired",
      ],
      default: "pending",
    },
    date: { type: Date, required: true },
    date_end: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PassengerRide", passengerRideSchema);
