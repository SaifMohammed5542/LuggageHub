import mongoose from "mongoose";

const keyHandoverSchema = new mongoose.Schema({
  dropOffPerson: {
    name: { type: String, required: true },
    email: { type: String, default: null }
  },
  pickUpPerson: {
    name: { type: String, required: true },
    email: { type: String, default: null }
  },
  dropOffDate: { type: Date, required: true },
  pickUpDate: { type: Date, required: true },

  stationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Station",
    required: true,
  },

  keyCode: { type: String, required: true }, // 6-digit pickup code

  // Payment info
  paymentId: { type: String, required: true },
  price: { type: Number, required: true },
  paymentStatus: {
    type: String,
    enum: ["pending", "confirmed", "failed"],
    default: "confirmed",
  },

  status: {
    type: String,
    enum: ["pending", "picked-up"],
    default: "pending",
  },
}, { timestamps: true });

export default mongoose.models.KeyHandover || mongoose.model("KeyHandover", keyHandoverSchema);
