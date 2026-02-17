// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // 🔐 Login Credentials
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    lowercase: true 
  },
  password: { 
    type: String, 
    required: true 
  },

  // 👤 Basic Info
  phone: { 
    type: String, 
    default: '' 
  },

  // 🎭 Role
  role: { 
    type: String, 
    enum: ['user', 'admin', 'partner'], 
    default: 'user' 
  },

  // 📍 Station Assignment (for partners)
  assignedStation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    default: null
  },

  // ✅ Email Verification Fields
  isEmailVerified: { 
    type: Boolean, 
    default: false 
  },
  emailVerificationToken: { 
    type: String,
    default: null
  },
  emailVerificationExpires: { 
    type: Date,
    default: null
  },

  // ✅ NEW: Auto-delete unverified accounts after 30 days
  // MongoDB TTL index - automatically deletes document when this date passes
  // Set to null when user verifies (so verified accounts are NEVER deleted)
  unverifiedExpiresAt: {
    type: Date,
    default: null,
    index: { expireAfterSeconds: 0 }
  },

  // 📅 Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.updatedAt = Date.now();
    next();
  } catch (error) {
    return next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// Force delete old model to use updated schema
if (mongoose.models.User) {
  delete mongoose.models.User;
}

export default mongoose.model('User', userSchema);