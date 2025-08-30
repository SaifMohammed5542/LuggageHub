// models/Station.js
import mongoose from 'mongoose';
import slugify from 'slugify'; // <--- ADD THIS LINE

const StationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // Keeping name unique as it helps with slug generation
  slug: { // <--- ADD THIS SLUG FIELD BACK
    type: String,
    unique: true, // <--- We want it unique!
    lowercase: true,
    index: true, // <--- Add index for faster queries
  },
  location: { type: String, required: true },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: { // [longitude, latitude]
      type: [Number],
      required: true
    }
  },
  partners: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
}],

  createdAt: { type: Date, default: Date.now }
});

// <--- ADD THIS PRE-SAVE HOOK
StationSchema.pre('save', async function(next) {
  if (this.isModified('name') && this.name) {
    let baseSlug = slugify(this.name, { lower: true, strict: true });
    let uniqueSlug = baseSlug;
    let counter = 1;

    // Check for existing slug if not a new document
    if (!this.isNew && this.slug && this.slug === baseSlug) {
      return next(); // Slug hasn't changed or is already the same as base, no need to re-generate uniqueness
    }
    
    // Loop to ensure uniqueness
    while (true) {
      // Find a station with the generated slug, but not the current station itself (if updating)
      const existingStation = await mongoose.models.Station.findOne({ 
        slug: uniqueSlug, 
        _id: { $ne: this._id } // Exclude current document if it's an update
      });

      if (!existingStation) {
        break; // Slug is unique
      }

      // If not unique, append a counter
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }
    this.slug = uniqueSlug;
  }
  next();
});

StationSchema.index({ coordinates: "2dsphere" }); // Enable geospatial queries

const Station = mongoose.models.Station || mongoose.model('Station', StationSchema);

export default Station;