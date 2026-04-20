// models/RefundRequest.js
import mongoose from 'mongoose';

const refundRequestSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true, index: true },

  type: { type: String, enum: ['cancel', 'reduce'], required: true },

  // Snapshot at request time
  originalDropOff:  { type: Date, required: true },
  originalPickUp:   { type: Date, required: true },
  originalAmount:   { type: Number, required: true },

  // For 'reduce' requests — the new dates the customer wants
  requestedDropOff: { type: Date },
  requestedPickUp:  { type: Date },

  // Calculated refund amount
  refundAmount: { type: Number, required: true },

  customerNote: { type: String, default: '' },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },

  rejectionReason: { type: String },
  resolvedAt:      { type: Date },
  paypalRefundId:  { type: String },
}, { timestamps: true });

refundRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.RefundRequest || mongoose.model('RefundRequest', refundRequestSchema);
