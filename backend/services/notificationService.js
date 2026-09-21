const Notification = require('../models/Notification');
const EmergencyContact = require('../models/EmergencyContact');

class NotificationService {
  /**
   * Sends an in-app notification by persisting it and emitting via Socket.IO
   */
  static async sendInApp(io, { recipientUserId, alertId, type, title, message, metadata = {} }) {
    try {
      // Prevent duplicates in short timeframes
      const recent = await Notification.findOne({
        recipientUserId,
        alertId,
        type,
        createdAt: { $gte: new Date(Date.now() - 5 * 60000) } // 5 minutes
      });
      if (recent) return recent;

      const notification = await Notification.create({
        recipientUserId,
        alertId,
        type,
        title,
        message,
        metadata
      });

      if (io) {
        io.to(`user:${recipientUserId.toString()}`).emit('notification:new', notification);
      }

      return notification;
    } catch (error) {
      console.error('Failed to send in-app notification:', error.message);
      return null;
    }
  }

  /**
   * Unified abstraction to notify trusted emergency contacts.
   * Handles SMS and Email channels via intent logging when providers are missing.
   * Includes duplication prevention within 15 minutes.
   */
  static async notifyEmergencyContacts(userId, alertId, userName, alertLocation) {
    try {
      const contacts = await EmergencyContact.find({ userId, isActive: true });
      if (contacts.length === 0) return { notified: 0, skipped: 0 };

      console.log(`[NotificationService] Found ${contacts.length} active emergency contacts for user ${userName} (Alert ID: ${alertId}).`);
      
      let notifiedCount = 0;
      let skippedCount = 0;

      for (const contact of contacts) {
        try {
          // Check for duplication in last 15 minutes
          const recentIntent = await Notification.findOne({
            alertId,
            type: 'EMERGENCY_CONTACT_ALERT',
            'metadata.contactId': contact._id,
            createdAt: { $gte: new Date(Date.now() - 15 * 60000) }
          });

          if (recentIntent) {
            console.log(`[NotificationService] Skipping duplicate notification for contact ${contact.name}`);
            skippedCount++;
            continue;
          }

          const messageContent = `🚨 EMERGENCY ALERT: Your trusted contact ${userName} needs immediate assistance. They have triggered an SOS.`;

          // Process SMS Channel
          if (['SMS', 'SMS_AND_EMAIL'].includes(contact.notificationPreference) && contact.phone) {
            let smsStatus = 'NOT_CONFIGURED';
            
            // If we had Twilio configured:
            // if (process.env.TWILIO_ACCOUNT_SID) {
            //   await twilioClient.messages.create({ ... });
            //   smsStatus = 'SENT';
            // } else {
            console.log(`[NotificationService] SMS Provider not configured. Logging intent for ${contact.phone}`);
            // }

            await Notification.create({
              recipientUserId: userId, // The SOS initiator is the owner of this log for simplicity, or keep it generic
              alertId,
              type: 'EMERGENCY_CONTACT_ALERT',
              channel: 'SMS',
              status: smsStatus,
              title: `SMS to ${contact.name}`,
              message: messageContent,
              metadata: { contactId: contact._id, targetPhone: contact.phone }
            });
            notifiedCount++;
          }

          // Process Email Channel
          if (['EMAIL', 'SMS_AND_EMAIL'].includes(contact.notificationPreference) && contact.email) {
            let emailStatus = 'NOT_CONFIGURED';
            
            console.log(`[NotificationService] Email Provider not configured. Logging intent for ${contact.email}`);

            await Notification.create({
              recipientUserId: userId,
              alertId,
              type: 'EMERGENCY_CONTACT_ALERT',
              channel: 'EMAIL',
              status: emailStatus,
              title: `Email to ${contact.name}`,
              message: messageContent,
              metadata: { contactId: contact._id, targetEmail: contact.email }
            });
            notifiedCount++;
          }
        } catch (innerError) {
          console.error(`[NotificationService] Failed to notify contact ${contact.name}:`, innerError.message);
          // Do not throw; continue loop to other contacts
        }
      }

      return { notified: notifiedCount, skipped: skippedCount };
    } catch (error) {
      console.error('Failed to process emergency contacts notification abstraction:', error.message);
      return { notified: 0, skipped: 0 };
    }
  }
}

module.exports = NotificationService;
