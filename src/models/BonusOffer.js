// models/BonusOffer.js
import mongoose from 'mongoose';

const bonusOfferSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },

  // rolling_window: X bookings in N days (window resets from last earned date)
  // calendar_month: X bookings in a calendar month (resets on 1st of each month)
  // all_time: X total bookings ever (one-time, never resets)
  type: {
    type: String,
    enum: ['rolling_window', 'calendar_month', 'all_time'],
    required: true,
  },

  threshold: { type: Number, required: true }, // e.g. 50 (bookings needed)
  windowDays: { type: Number, default: null }, // only used for rolling_window
  rewardAmount: { type: Number, required: true }, // A$ reward

  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.BonusOffer || mongoose.model('BonusOffer', bonusOfferSchema);
