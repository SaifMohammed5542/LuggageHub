import mongoose from 'mongoose';

const StationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  coordinates: {  // NEW FIELD
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {  // [longitude, latitude]
      type: [Number],
      required: true
    }
  },
  partner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: { type: Date, default: Date.now }
});

StationSchema.index({ coordinates: "2dsphere" });  // Enable geospatial queries

const Station = mongoose.models.Station || mongoose.model('Station', StationSchema);

export default Station;
