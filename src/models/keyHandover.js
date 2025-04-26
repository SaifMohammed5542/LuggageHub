import mongoose from 'mongoose';

const keyHandoverSchema = new mongoose.Schema({
  dropOffPerson: { name: String, email: String },
  pickUpPerson: { name: String, email: String },
  dropOffDate: Date,
  pickUpDate: Date,
  station: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  keyCode: { type: String, required: true },
  // ← new fields for payment
  paymentId: { type: String, default: null },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  status: { type: String, enum: ['pending','picked-up'], default: 'pending' }
}, { timestamps: true });

export default mongoose.models.KeyHandover
  || mongoose.model('KeyHandover', keyHandoverSchema);
