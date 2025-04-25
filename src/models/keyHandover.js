import mongoose from 'mongoose';

const keyHandoverSchema = new mongoose.Schema({
  dropOffPerson: {
    name: String,
    email: String
  },
  pickUpPerson: {
    name: String,
    email: String
  },
  dropOffDate: Date,
  pickUpDate: Date,
  stationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station'
  },
  keyCode: String,  // Unique generated code for this handover
  status: {
    type: String,
    enum: ['pending', 'picked-up'],
    default: 'pending'
  }
}, { timestamps: true });

export default mongoose.models.KeyHandover || mongoose.model('KeyHandover', keyHandoverSchema);
