const mongoose = require("mongoose");

const rideMessageSchema = new mongoose.Schema(
  {
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: "Ride", required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderName: { type: String, default: "" },
    senderRole: { type: String, enum: ["driver", "passenger", "courier"], default: "passenger" },
    /** When set, message is 1:1 with this user on the ride. */
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    message: { type: String, required: true, maxlength: 2000 },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

rideMessageSchema.index({ rideId: 1, createdAt: 1 });
rideMessageSchema.index({ rideId: 1, recipientId: 1, createdAt: 1 });

module.exports = mongoose.model("RideMessage", rideMessageSchema);
