const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    alertId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alert', required: true },
    type: { 
      type: String, 
      enum: ['SOS_ALERT', 'RESPONSE_ACCEPTED', 'RESPONDER_EN_ROUTE', 'RESPONDER_ARRIVED', 'RESPONDER_ASSISTING', 'SOS_RESOLVED', 'SYSTEM', 'EMERGENCY_CONTACT_ALERT'], 
      required: true 
    },
    channel: {
      type: String,
      enum: ['IN_APP', 'SMS', 'EMAIL'],
      default: 'IN_APP'
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED', 'NOT_CONFIGURED', 'READ', 'UNREAD'],
      default: 'UNREAD'
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    readAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientUserId: 1, readAt: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
