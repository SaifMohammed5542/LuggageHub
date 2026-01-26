// models/Station.js
import mongoose from 'mongoose';
import slugify from 'slugify';

const StationSchema = new mongoose.Schema({
  // Basic Info
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  slug: { 
    type: String,
    unique: true,
    lowercase: true,
    index: true
  },
  location: { 
    type: String, 
    required: true,
    trim: true 
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: { 
      type: [Number], // [longitude, latitude]
      required: true
    }
  },

  // 🏦 Bank Details (MOVED FROM USER MODEL)
  bankDetails: {
    accountHolderName: { type: String, default: '' },
    bankName: { type: String, default: '' },
    bsb: { type: String, default: '' },
    accountNumberEncrypted: { type: String, default: '' }, // Store encrypted
    accountType: { 
      type: String, 
      enum: ['savings', 'checking', 'business'],
      default: 'savings'
    },
    payoutEmail: { type: String, default: '' } // For PayPal/Wise
  },

  // ⏰ Operating Hours (MOVED FROM USER MODEL)
  timings: {
    is24Hours: { type: Boolean, default: false },
    monday: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '18:00' },
      closed: { type: Boolean, default: false }
    },
    tuesday: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '18:00' },
      closed: { type: Boolean, default: false }
    },
    wednesday: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '18:00' },
      closed: { type: Boolean, default: false }
    },
    thursday: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '18:00' },
      closed: { type: Boolean, default: false }
    },
    friday: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '18:00' },
      closed: { type: Boolean, default: false }
    },
    saturday: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '18:00' },
      closed: { type: Boolean, default: false }
    },
    sunday: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '18:00' },
      closed: { type: Boolean, default: false }
    }
  },

  // 📊 Operational Details
  capacity: { type: Number, default: 0 },
  description: { type: String, default: '' },
  photos: [{ type: String }],
  
  // 🔗 Partner References (Multiple partners can be assigned)
  partners: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],


 rating: { 
    type: Number, 
    default: 4.8,
    min: 0,
    max: 5 
  },
  
  reviewCount: { 
    type: Number, 
    default: 0 
  },
  
  features: [{ 
    type: String,
    enum: [
      '24/7 Security',
      'Insurance Included', 
      'Easy Access',
      'Instant Booking',
      'Climate Controlled',
      'CCTV Monitored'
    ]
  }],

  // 📍 Status
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'pending'], 
    default: 'active' 
  },

  timezone: { 
    type: String, 
    default: 'Australia/Melbourne' 
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
  
});

// Auto-generate slug from name
StationSchema.pre('save', async function(next) {
  if (this.isModified('name') && this.name) {
    let baseSlug = slugify(this.name, { lower: true, strict: true });
    let uniqueSlug = baseSlug;
    let counter = 1;

    if (!this.isNew && this.slug && this.slug === baseSlug) {
      return next();
    }
    
    while (true) {
      const existingStation = await mongoose.models.Station.findOne({ 
        slug: uniqueSlug, 
        _id: { $ne: this._id }
      });

      if (!existingStation) break;
      
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }
    this.slug = uniqueSlug;
  }

  this.updatedAt = Date.now();
  next();
});

// Geospatial index for nearby search
StationSchema.index({ coordinates: "2dsphere" });

const Station = mongoose.models.Station || mongoose.model('Station', StationSchema);

export default Station;