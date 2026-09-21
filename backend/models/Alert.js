const mongoose = require('mongoose');

const ALERT_TYPES = ['sos', 'unsafe_area', 'harassment', 'medical', 'other'];

const STATUS_FLOW = [
  'active',
  'accepted',
  'en_route',
  'arrived',
  'assisting',
  'resolved',
  'cancelled',
];

const alertSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    alertType: { type: String, enum: ALERT_TYPES, default: 'sos' },
    description: { type: String, default: '' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] },
      address: { type: String, default: '' },
    },
    locationStatus: { type: String, enum: ['LIVE', 'LAST_KNOWN', 'UNAVAILABLE'], default: 'LIVE' },
    status: { type: String, enum: STATUS_FLOW, default: 'active' },
    responderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    responderLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] },
    },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
    declinedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    acceptedAt: { type: Date },
    enRouteAt: { type: Date },
    arrivedAt: { type: Date },
    assistingAt: { type: Date },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

alertSchema.index({ location: '2dsphere' });
alertSchema.index({ status: 1, createdAt: -1 });
alertSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
module.exports.ALERT_TYPES = ALERT_TYPES;
module.exports.STATUS_FLOW = STATUS_FLOW;
