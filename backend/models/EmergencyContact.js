const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true },
    relationship: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    notificationPreference: { type: String, enum: ['SMS', 'EMAIL', 'SMS_AND_EMAIL'], default: 'SMS_AND_EMAIL' },
  },
  { timestamps: true }
);

emergencyContactSchema.index({ userId: 1 });

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);
