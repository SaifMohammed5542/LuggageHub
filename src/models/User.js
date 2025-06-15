import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'partner'], default: 'user' },
  assignedStation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    default: null
  },
  accountDetails: {
  accountHolderName: { type: String },
  bankName: { type: String },
  bsb: { type: String },
  accountNumber: { type: String },
  accountType: { type: String },
}

});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    return next(error);
  }
});

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.models.User || mongoose.model('User', userSchema);
