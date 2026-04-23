// models/PartnerPayout.js
import mongoose from 'mongoose';

const partnerPayoutSchema = new mongoose.Schema({
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true, index: true },

  amount:      { type: Number, required: true }, // total A$ paid out
  periodLabel: { type: String, required: true }, // e.g. "April 2026"
  periodStart: { type: Date, required: true },
  periodEnd:   { type: Date, required: true },

  bookingEarnings: { type: Number, default: 0 }, // portion from booking flat rates
  bonusEarnings:   { type: Number, default: 0 }, // portion from bonuses

  // Bonus records settled in this payout
  bonusIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PartnerBonus' }],

  notes:  { type: String, default: '' },
  paidAt: { type: Date, default: Date.now },
  paidBy: { type: String, default: 'admin' },
}, { timestamps: true });

export default mongoose.models.PartnerPayout || mongoose.model('PartnerPayout', partnerPayoutSchema);
