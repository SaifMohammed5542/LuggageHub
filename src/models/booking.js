// models/booking.js - UPDATED VERSION
import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  
  // ✅ NEW: Your internal booking reference
  bookingReference: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  
  // ✅ Dates
  dropOffDate: {
    type: Date,
    required: true,
  },
  
  pickUpDate: {
    type: Date,
    required: true,
  },
  
  // ✅ Luggage details
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
    default: 0,
  },
  
  // ✅ Location and user info
  stationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    required: true,
    index: true,
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // ✅ Customer details
  fullName: {
    type: String,
    required: true,
  },
  
  email: {
    type: String,
    required: true,
    index: true,
  },
  
  phone: {
    type: String,
    required: true,
  },
  
  specialInstructions: String,
  
  // ✅ NEW: Total amount paid
  totalAmount: {
    type: Number,
    required: true,
  },
  
  // ✅ DEPRECATED: Keep for backward compatibility but use Payment model instead
  paymentId: {
    type: String,
    index: true,
  },
  
  // ✅ Status tracking
  status: {
  type: String,
  enum: ['pending', 'confirmed', 'stored', 'completed', 'cancelled', 'no_show'],
  default: 'pending',
  index: true,
},
  
  // ✅ Additional tracking
  checkInTime: Date,
  checkOutTime: Date,
  
  cancellationReason: String,
  cancelledAt: Date,
  
  notes: String,
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ✅ Indexes for performance
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ stationId: 1, dropOffDate: 1, pickUpDate: 1 });
bookingSchema.index({ email: 1, status: 1 });

// ✅ Virtual for station details
bookingSchema.virtual('station', {
  ref: 'Station',
  localField: 'stationId',
  foreignField: '_id',
  justOne: true,
});

// ✅ Virtual for payments
bookingSchema.virtual('payments', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'bookingId',
});

// ✅ Methods
bookingSchema.methods.markAsCompleted = function() {
  this.status = 'completed';
  this.checkOutTime = new Date();
  return this.save();
};

bookingSchema.methods.cancel = function(reason) {
  this.status = 'cancelled';
  this.cancellationReason = reason;
  this.cancelledAt = new Date();
  return this.save();
};

bookingSchema.methods.checkIn = function() {
  this.checkInTime = new Date();
  return this.save();
};

// ✅ Static method for finding by reference
bookingSchema.statics.findByReference = function(bookingReference) {
  return this.findOne({ bookingReference });
};

// ✅ Pre-save hook to calculate total bags
bookingSchema.pre('save', function(next) {
  this.luggageCount = (this.smallBagCount || 0) + (this.largeBagCount || 0);
  next();
});

export default mongoose.models.Booking || mongoose.model('Booking', bookingSchema);