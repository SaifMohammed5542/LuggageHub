// models/PartnerBonus.js
import mongoose from 'mongoose';

const partnerBonusSchema = new mongoose.Schema({
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
  offerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'BonusOffer', required: true, index: true },

  // Window tracking
  windowStart: { type: Date, required: true }, // when this earning window started
  windowEnd:   { type: Date, default: null },   // null for all_time / calendar_month handled via windowStart month

  bookingsInWindow: { type: Number, required: true }, // count at time of earning

  // Reward
  amount: { type: Number, required: true }, // A$ reward (snapshot at earn time)
  earnedAt: { type: Date, default: Date.now },

  // Payout
  status: { type: String, enum: ['pending', 'paid'], default: 'pending', index: true },
  paidAt: { type: Date, default: null },
  paidBy: { type: String, default: null }, // 'admin'
}, { timestamps: true });

// Prevent duplicate bonuses for the same partner+offer+window
partnerBonusSchema.index({ partnerId: 1, offerId: 1, windowStart: 1 }, { unique: true });

export default mongoose.models.PartnerBonus || mongoose.model('PartnerBonus', partnerBonusSchema);
