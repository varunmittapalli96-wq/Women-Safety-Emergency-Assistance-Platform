const mongoose = require('mongoose');

const ZONE_TYPES = [
  'SAFE_ZONE',
  'POLICE_STATION',
  'HOSPITAL',
  'WOMEN_HELP_CENTER',
  'SHELTER',
  'CAMPUS_SECURITY',
  'SUPPORT_CENTER',
  'OTHER'
];

const safetyZoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ZONE_TYPES, required: true },
    description: { type: String, default: '' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
      address: { type: String, required: true },
    },
    phone: { type: String, default: '' },
    operatingHours: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

safetyZoneSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('SafetyZone', safetyZoneSchema);
module.exports.ZONE_TYPES = ZONE_TYPES;
