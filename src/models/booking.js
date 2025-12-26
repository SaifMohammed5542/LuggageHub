// models/booking.js
import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  dropOffDate: Date,
  pickUpDate: Date,
  smallBagCount: {
  type: Number,
  default: 0,
},
largeBagCount: {
  type: Number,
  default: 0,
},
luggageCount: {
  type: Number,
  default: 0, // derived (small + large)
},

  stationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  fullName: String,
  email: String,
  phone: String,
  specialInstructions: String,
  paymentId: String,
  status: {
    type: String,
    enum: ['pending', 'confirmed'],
    default: 'pending',
  },
}, { timestamps: true });

export default mongoose.models.Booking || mongoose.model('Booking', bookingSchema);