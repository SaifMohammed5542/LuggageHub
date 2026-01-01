// models/keyHandover.js - UPDATED MODEL
import mongoose from "mongoose";

const KeyHandoverSchema = new mongoose.Schema(
  {
    // People Details
    dropOffPerson: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
    },
    pickUpPerson: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        default: null, // Optional
      },
    },

    // NEW: Key Details
    keyDetails: {
      numberOfKeys: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
      },
      keyTypes: {
        type: [String], // Array of key types: ["house", "car", "office", etc.]
        required: true,
        validate: {
          validator: function(v) {
            return v && v.length > 0;
          },
          message: "At least one key type must be selected"
        }
      },
      otherKeyType: {
        type: String,
        default: null, // Only if "other" is selected
      },
      description: {
        type: String,
        default: null, // Optional key description
      },
      specialInstructions: {
        type: String,
        default: null, // Optional special instructions
      },
    },

    // Dates & Location
    dropOffDate: {
      type: Date,
      required: true,
    },
    pickUpDate: {
      type: Date,
      required: true,
    },
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      required: true,
    },

    // Security & Payment
    keyCode: {
      type: String,
      required: true,
      length: 6, // 6-digit PIN
      // TODO: In production, this should be hashed!
    },
    paymentId: {
      type: String,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "confirmed", "refunded"],
      default: "pending",
    },

    // Pricing
    price: {
      type: Number,
      required: true,
    },
    numberOfDays: {
      type: Number,
      required: true,
      min: 1,
    },

    // Status Tracking
    status: {
      type: String,
      enum: ["pending", "dropped-off", "ready-for-pickup", "collected", "cancelled"],
      default: "pending",
    },

    // Drop-off Status
    dropoffStatus: {
      completed: {
        type: Boolean,
        default: false,
      },
      completedAt: {
        type: Date,
        default: null,
      },
      completedBy: {
        type: String,
        default: null,
      },
    },

    // Pickup Status
    pickupStatus: {
      completed: {
        type: Boolean,
        default: false,
      },
      completedAt: {
        type: Date,
        default: null,
      },
      collectedBy: {
        type: String,
        default: null,
      },
      pinVerified: {
        type: Boolean,
        default: false, // Must be true to release keys
      },
      pinAttempts: {
        type: Number,
        default: 0, // Track failed PIN attempts
      },
      maxPinAttempts: {
        type: Number,
        default: 5, // Lock after 5 failed attempts
      },
      locked: {
        type: Boolean,
        default: false, // Lock booking after too many failed attempts
      },
    },

    // Notifications (Email Only)
    notifications: {
      dropperConfirmationSent: {
        type: Boolean,
        default: false,
      },
      pickerNotificationSent: {
        type: Boolean,
        default: false,
      },
      dropoffReminderSent: {
        type: Boolean,
        default: false,
      },
      pickupReminderSent: {
        type: Boolean,
        default: false,
      },
      pickupConfirmationSent: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Indexes for better query performance
KeyHandoverSchema.index({ stationId: 1, dropOffDate: 1 });
KeyHandoverSchema.index({ keyCode: 1 });
KeyHandoverSchema.index({ "dropOffPerson.email": 1 });
KeyHandoverSchema.index({ "pickUpPerson.email": 1 });
KeyHandoverSchema.index({ status: 1 });
KeyHandoverSchema.index({ createdAt: -1 });

// Virtual for booking reference
KeyHandoverSchema.virtual('bookingReference').get(function() {
  return `KEY-${this._id.toString().slice(-8).toUpperCase()}`;
});

// Method to verify PIN
KeyHandoverSchema.methods.verifyPIN = function(inputPIN) {
  if (this.pickupStatus.locked) {
    return { success: false, message: "Booking is locked due to too many failed attempts" };
  }

  if (this.keyCode === inputPIN) {
    this.pickupStatus.pinVerified = true;
    return { success: true, message: "PIN verified successfully" };
  } else {
    this.pickupStatus.pinAttempts += 1;
    if (this.pickupStatus.pinAttempts >= this.pickupStatus.maxPinAttempts) {
      this.pickupStatus.locked = true;
      return { success: false, message: "Too many failed attempts. Booking is now locked." };
    }
    return { 
      success: false, 
      message: `Incorrect PIN. ${this.pickupStatus.maxPinAttempts - this.pickupStatus.pinAttempts} attempts remaining.` 
    };
  }
};

// Method to mark as collected
KeyHandoverSchema.methods.markAsCollected = function(collectorName) {
  if (!this.pickupStatus.pinVerified) {
    throw new Error("PIN must be verified before collection");
  }
  
  this.pickupStatus.completed = true;
  this.pickupStatus.completedAt = new Date();
  this.pickupStatus.collectedBy = collectorName;
  this.status = "collected";
};

export default mongoose.models.KeyHandover || mongoose.model("KeyHandover", KeyHandoverSchema);