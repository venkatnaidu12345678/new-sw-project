const mongoose = require("mongoose");

const userRidesSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  my_pending_ride_requests: [
    {
      rideId: { type: mongoose.Schema.Types.ObjectId, ref: "Ride" },
      driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      amount_requested: { type: Number },
      seats_requested: { type: Number },
      status: { type: String },
    },
  ],
  driver_accepted_ride_requests: [
    {
      rideId: { type: mongoose.Schema.Types.ObjectId, ref: "Ride" },
      driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      amount_requested: { type: Number },
      seats_requested: { type: Number },
      status: { type: String },
    },
  ],
});

module.exports = mongoose.model("userRides", userRidesSchema);
