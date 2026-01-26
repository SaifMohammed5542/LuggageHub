// models/Payment.js
import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  // ✅ Your internal payment reference
  paymentReference: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  
  // ✅ PayPal identifiers
  paypalOrderId: {
    type: String,
    required: true,
    index: true,
  },
  
  paypalTransactionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  
  // ✅ Payment details
  amount: {
    type: Number,
    required: true,
  },
  
  currency: {
    type: String,
    default: 'AUD',
  },
  
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending',
    index: true,
  },
  
  // ✅ Payer information
  payerEmail: {
    type: String,
    required: true,
  },
  
  payerName: String,
  payerId: String,
  
  // ✅ Link to booking
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true,
  },
  
  // ✅ Payment method
  paymentMethod: {
    type: String,
    enum: ['paypal', 'card', 'other'],
    default: 'paypal',
  },
  
  // ✅ Raw PayPal response (for debugging/disputes)
  paypalResponse: {
    type: mongoose.Schema.Types.Mixed,
  },
  
  // ✅ Refund tracking
  refunds: [{
    refundId: String,
    amount: Number,
    reason: String,
    refundedAt: Date,
  }],
  
  // ✅ Error tracking
  errorDetails: {
    type: String,
  },
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ✅ Indexes for fast lookups
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ bookingId: 1, status: 1 });

// ✅ Virtual for booking details
paymentSchema.virtual('booking', {
  ref: 'Booking',
  localField: 'bookingId',
  foreignField: '_id',
  justOne: true,
});

// ✅ Methods
paymentSchema.methods.markAsCompleted = function() {
  this.status = 'completed';
  return this.save();
};

paymentSchema.methods.markAsFailed = function(errorMessage) {
  this.status = 'failed';
  this.errorDetails = errorMessage;
  return this.save();
};

paymentSchema.methods.addRefund = function(refundData) {
  this.refunds.push({
    ...refundData,
    refundedAt: new Date(),
  });
  
  // Calculate total refunded amount
  const totalRefunded = this.refunds.reduce((sum, r) => sum + r.amount, 0);
  
  if (totalRefunded >= this.amount) {
    this.status = 'refunded';
  } else {
    this.status = 'partially_refunded';
  }
  
  return this.save();
};

// ✅ Static methods for searching
paymentSchema.statics.findByBookingReference = async function(bookingReference) {
  const Booking = mongoose.model('Booking');
  const booking = await Booking.findOne({ bookingReference });
  if (!booking) return null;
  
  return this.find({ bookingId: booking._id });
};

paymentSchema.statics.findByPayPalOrderId = function(paypalOrderId) {
  return this.findOne({ paypalOrderId });
};

paymentSchema.statics.findByPayPalTransactionId = function(paypalTransactionId) {
  return this.findOne({ paypalTransactionId });
};

export default mongoose.models.Payment || mongoose.model('Payment', paymentSchema);