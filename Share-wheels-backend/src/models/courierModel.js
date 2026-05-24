const mongoose = require("mongoose");
const {
  amountWillField,
  routeFields,
  assignmentSchema,
  receiverDetailsSchema,
  courierDateSchema,
} = require("../schemas/commonSchemas");

const courierRequestSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    from: { ...routeFields.from, required: true },
    to: { ...routeFields.to, required: true },
    courierNumber: { type: String, required: true, unique: true },
    courier_type: { type: String, required: true },
    what_to_deliver: { type: String, required: true },
    courier_img: { type: String, required: true },
    amount_will: { ...amountWillField, required: true },
    timeSlot: { type: String, default: "" },
    date: { type: courierDateSchema, required: true },
    courier_receiver_details: { type: receiverDetailsSchema, required: true },
    driver_assigned_courier: assignmentSchema,
    courier_status: {
      type: String,
      enum: [
        "pending",
        "request_to_driver",
        "driver_assigned",
        "picked_up",
        "in_transit",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Courier", courierRequestSchema);
