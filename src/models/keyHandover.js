// models/keyHandover.js
import mongoose from 'mongoose';

const keyHandoverSchema = new mongoose.Schema({
  dropOffPerson: {
    name: String,
    email: String,
  },
  pickUpPerson: {
    name: String,
    email: String,
  },
  dropOffDate: Date,
  pickUpDate: Date,
  station: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    required: true,
  },
  keyCode: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'picked-up'],
    default: 'pending',
  },
}, { timestamps: true });

export default mongoose.models.KeyHandover || mongoose.model('KeyHandover', keyHandoverSchema);
