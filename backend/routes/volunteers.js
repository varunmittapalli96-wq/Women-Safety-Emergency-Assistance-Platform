const express = require('express');
const User = require('../models/User');
const Alert = require('../models/Alert');
const NotificationService = require('../services/notificationService');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('volunteer'));

const requireVerifiedVolunteer = (req, res, next) => {
  if (req.user.verificationStatus !== 'VERIFIED') {
    return res.status(403).json({ message: 'Volunteer account is not verified. Access denied.' });
  }
  next();
};

// Get nearby active alerts
router.get('/alerts', requireVerifiedVolunteer, async (req, res) => {
  try {
    const volunteer = await User.findById(req.user._id);
    
    let alerts = [];
    if (volunteer.location && volunteer.location.coordinates && volunteer.location.coordinates.length === 2) {
      alerts = await Alert.find({
        status: 'active',
        locationStatus: { $ne: 'UNAVAILABLE' },
        declinedBy: { $ne: req.user._id },
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: volunteer.location.coordinates,
            },
            $maxDistance: 10000, // 10km radius
          },
        },
      })
        .populate('userId', 'name phone safetyProfile')
        .sort('-createdAt')
        .limit(20);
    }

    const unavailableAlerts = await Alert.find({
      status: 'active',
      locationStatus: 'UNAVAILABLE',
      declinedBy: { $ne: req.user._id },
    })
      .populate('userId', 'name phone safetyProfile')
      .sort('-createdAt')
      .limit(10);

    // Combine them
    const combined = [...alerts, ...unavailableAlerts];
    
    // Sort combined by createdAt descending
    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(combined);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Accept / respond to an alert
router.put('/respond/:alertId', requireVerifiedVolunteer, async (req, res) => {
  try {
    const { action } = req.body; // 'accept' or 'decline'
    const alert = await Alert.findById(req.params.alertId);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    if (action === 'accept') {
      if (alert.status !== 'active') {
        return res.status(400).json({ message: 'Alert is no longer active' });
      }
      if (alert.responderId) {
        return res.status(400).json({ message: 'Alert already accepted by another volunteer' });
      }
      
      // Atomic update to prevent race conditions
      const updated = await Alert.findOneAndUpdate(
        { _id: alert._id, responderId: { $exists: false }, status: 'active' },
        {
          $set: {
            responderId: req.user._id,
            status: 'accepted',
            acceptedAt: new Date(),
            responderLocation: {
              type: 'Point',
              coordinates: req.user.location.coordinates,
            }
          },
          $push: {
            statusHistory: {
              status: 'accepted',
              note: `Volunteer ${req.user.name} accepted the alert`,
              timestamp: new Date(),
            }
          }
        },
        { new: true }
      );
      
      if (!updated) {
        return res.status(400).json({ message: 'Alert was just accepted by someone else or is no longer active' });
      }
      
      // Populate and return
      const populated = await Alert.findById(updated._id)
        .populate('userId', 'name phone safetyProfile')
        .populate('responderId', 'name phone profile');
        
      // Emit to the user and any other admins/responders watching this alert
      const io = req.app.get('io');
      if (io) {
        io.to(`alert:${alert._id}`).emit('response:status:update', {
          alertId: alert._id,
          status: 'accepted',
          responder: populated.responderId,
          timestamp: new Date().toISOString()
        });

        // Send a targeted in-app notification to the victim
        NotificationService.sendInApp(io, {
          recipientUserId: populated.userId._id,
          alertId: alert._id,
          type: 'RESPONSE_ACCEPTED',
          title: 'Responder Assigned',
          message: `A responder has accepted your emergency.`,
          metadata: { status: 'accepted' }
        });
      }
      
      return res.json(populated);
      
    } else if (action === 'decline') {
      if (!alert.declinedBy.includes(req.user._id)) {
        alert.declinedBy.push(req.user._id);
        await alert.save();
      }
      return res.json({ message: 'Alert declined' });
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update response status (State Machine)
router.put('/status/:alertId', requireVerifiedVolunteer, async (req, res) => {
  try {
    const { status } = req.body;
    const alert = await Alert.findById(req.params.alertId);
    
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    if (!alert.responderId || alert.responderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not the assigned responder for this alert' });
    }
    
    const validTransitions = {
      'accepted': ['en_route', 'cancelled'],
      'en_route': ['arrived', 'cancelled'],
      'arrived': ['assisting', 'cancelled'],
      'assisting': ['resolved', 'cancelled']
    };
    
    if (!validTransitions[alert.status] || !validTransitions[alert.status].includes(status)) {
      return res.status(400).json({ message: `Invalid status transition from ${alert.status} to ${status}` });
    }
    
    alert.status = status;
    
    // Set timestamp
    if (status === 'en_route') alert.enRouteAt = new Date();
    if (status === 'arrived') alert.arrivedAt = new Date();
    if (status === 'assisting') alert.assistingAt = new Date();
    if (status === 'resolved') {
      alert.resolvedAt = new Date();
      // Update volunteer stats
      await User.findByIdAndUpdate(req.user._id, { $inc: { 'profile.totalAssists': 1 } });
    }
    
    alert.statusHistory.push({
      status,
      note: `Responder updated status to ${status}`,
      timestamp: new Date(),
    });
    
    await alert.save();
    
    const populated = await Alert.findById(alert._id)
      .populate('userId', 'name phone safetyProfile')
      .populate('responderId', 'name phone profile');
      
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`alert:${alert._id}`).emit('response:status:update', {
        alertId: alert._id,
        status,
        responder: populated.responderId,
        timestamp: new Date().toISOString()
      });

      // Map status to notification content
      const statusMessages = {
        'en_route': { type: 'RESPONDER_EN_ROUTE', title: 'Responder En Route', message: 'Your responder is on the way.' },
        'arrived': { type: 'RESPONDER_ARRIVED', title: 'Responder Arrived', message: 'Your responder has arrived.' },
        'assisting': { type: 'RESPONDER_ASSISTING', title: 'Responder Assisting', message: 'Your responder is assisting you.' },
        'resolved': { type: 'SOS_RESOLVED', title: 'Emergency Resolved', message: 'Your emergency has been marked resolved.' }
      };

      if (statusMessages[status]) {
        NotificationService.sendInApp(io, {
          recipientUserId: populated.userId._id,
          alertId: alert._id,
          type: statusMessages[status].type,
          title: statusMessages[status].title,
          message: statusMessages[status].message,
          metadata: { status }
        });
      }
    }
      
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update volunteer profile
router.put('/profile', async (req, res) => {
  try {
    const { organization, skills, experience, bio } = req.body;
    const user = await User.findById(req.user._id);
    if (organization !== undefined) user.profile.organization = organization;
    if (skills !== undefined) user.profile.skills = skills;
    if (experience !== undefined) user.profile.experience = experience;
    if (bio !== undefined) user.profile.bio = bio;
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update volunteer location
router.put('/location', async (req, res) => {
  try {
    const { coordinates, address } = req.body;
    const user = await User.findById(req.user._id);
    if (coordinates) {
      if (coordinates.length !== 2) {
        return res.status(400).json({ message: 'Valid coordinates array [lng, lat] required' });
      }
      const [lng, lat] = coordinates;
      if (typeof lng !== 'number' || typeof lat !== 'number' || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        return res.status(400).json({ message: 'Invalid geographical coordinates' });
      }
    }

    user.location = {
      type: 'Point',
      coordinates: coordinates || user.location.coordinates,
      address: address || user.location.address,
    };
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle availability
router.put('/availability', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.isAvailable = !user.isAvailable;
    await user.save();
    res.json({ isAvailable: user.isAvailable });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get volunteer's response history
router.get('/history', async (req, res) => {
  try {
    const alerts = await Alert.find({ responderId: req.user._id })
      .populate('userId', 'name phone')
      .sort('-createdAt');
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get volunteer stats
router.get('/stats', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const totalResponses = await Alert.countDocuments({ responderId: req.user._id });
    const resolved = await Alert.countDocuments({ responderId: req.user._id, status: 'resolved' });
    res.json({
      totalAssists: user.profile.totalAssists || 0,
      rating: user.profile.rating || 0,
      totalRatings: user.profile.totalRatings || 0,
      totalResponses,
      resolvedCount: resolved,
      isAvailable: user.isAvailable,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
