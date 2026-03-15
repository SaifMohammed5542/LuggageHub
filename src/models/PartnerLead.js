// models/PartnerLead.js
import mongoose from 'mongoose';

const partnerLeadSchema = new mongoose.Schema({

  // ── Business details ──────────────────────────────────────
  businessName: {
    type: String,
    required: true,
  },

  address: {
    type: String,
    default: '',
  },

  suburb: {
    type: String,
    required: true,
    index: true,
  },

  businessType: {
    type: String,
    default: '',
  },

  // ── Owner / manager details ───────────────────────────────
  ownerName: {
    type: String,
    required: true,
  },

  phone: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    index: true,
  },

  // ── Lead status ───────────────────────────────────────────
  status: {
    type: String,
    enum: ['new', 'contacted', 'onboarded', 'rejected'],
    default: 'new',
    index: true,
  },

  // ── Internal notes ────────────────────────────────────────
  notes: {
    type: String,
    default: '',
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ── Indexes ───────────────────────────────────────────────
partnerLeadSchema.index({ createdAt: -1 });
partnerLeadSchema.index({ status: 1, createdAt: -1 });

// ── Statics ───────────────────────────────────────────────
partnerLeadSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

partnerLeadSchema.statics.findNew = function() {
  return this.find({ status: 'new' }).sort({ createdAt: -1 });
};

// ── Methods ───────────────────────────────────────────────
partnerLeadSchema.methods.markContacted = function() {
  this.status = 'contacted';
  return this.save();
};

partnerLeadSchema.methods.markOnboarded = function() {
  this.status = 'onboarded';
  return this.save();
};

partnerLeadSchema.methods.markRejected = function(reason) {
  this.status = 'rejected';
  if (reason) this.notes = reason;
  return this.save();
};

export default mongoose.models.PartnerLead || mongoose.model('PartnerLead', partnerLeadSchema);