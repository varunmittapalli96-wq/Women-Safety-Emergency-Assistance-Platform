const express = require('express');
const Alert = require('../models/Alert');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Create SOS alert
router.post('/', authorize('user'), async (req, res) => {
  try {
    const { alertType, description, location, locationStatus } = req.body;
    
    if (locationStatus !== 'UNAVAILABLE') {
      if (!location || !location.coordinates || location.coordinates.length !== 2) {
        return res.status(400).json({ message: 'Valid location coordinates [lng, lat] are required unless status is UNAVAILABLE' });
      }
      const [lng, lat] = location.coordinates;
      if (typeof lng !== 'number' || typeof lat !== 'number' || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        return res.status(400).json({ message: 'Invalid geographical coordinates' });
      }
    }

    const alertData = {
      userId: req.user._id,
      alertType: alertType || 'sos',
      description: description || '',
      locationStatus: locationStatus || 'LIVE',
      status: 'active',
      statusHistory: [{ status: 'active', note: 'Emergency alert triggered' }],
    };

    if (locationStatus !== 'UNAVAILABLE' && location && location.coordinates) {
      alertData.location = {
        type: 'Point',
        coordinates: location.coordinates,
        address: location.address || '',
      };
    }

    const alert = await Alert.create(alertData);

    // ==========================================
    // NOTIFICATION DISPATCH (Asynchronous)
    // ==========================================
    (async () => {
      try {
        const io = req.app.get('io');
        
        // 1. Notify emergency contacts via new abstraction
        const notifyResult = await NotificationService.notifyEmergencyContacts(req.user._id, alert._id, req.user.name, alert.location);
        console.log(`[Alerts] Emergency Contacts notified/logged: ${notifyResult.notified}`);

        // 2. Notify nearby verified volunteers
        let volunteerQuery = { role: 'volunteer', verificationStatus: 'VERIFIED' };
        
        // Apply geospatial filter if location is available
        if (locationStatus !== 'UNAVAILABLE' && location && location.coordinates && location.coordinates.length === 2) {
          volunteerQuery.location = {
            $near: {
              $geometry: { type: 'Point', coordinates: location.coordinates },
              $maxDistance: 10000 // 10km radius
            }
          };
        }

        const nearbyVolunteers = await User.find(volunteerQuery).limit(50);
        
        console.log(`[Alerts] Found ${nearbyVolunteers.length} eligible verified volunteers for Alert ${alert._id}`);
        
        for (const volunteer of nearbyVolunteers) {
          await NotificationService.sendInApp(io, {
            recipientUserId: volunteer._id,
            alertId: alert._id,
            type: 'SOS_ALERT',
            title: '🚨 EMERGENCY ALERT',
            message: `A nearby user needs assistance.`,
            metadata: {
              alertType: alert.alertType,
              createdAt: alert.createdAt
            }
          });
        }
      } catch (err) {
        console.error('[Notification Dispatch Error]', err);
      }
    })();

    res.status(201).json({ ...alert.toObject(), message: 'Nearby verified responders have been notified.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get alert types
router.get('/types', (_req, res) => {
  res.json(Alert.ALERT_TYPES);
});

// Get current user's alert history
router.get('/', authorize('user'), async (req, res) => {
  try {
    const alerts = await Alert.find({ userId: req.user._id })
      .populate('responderId', 'name phone profile')
      .sort('-createdAt');
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's alert history (Paginated, resolved/cancelled only)
router.get('/history', authorize('user'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {
      userId: req.user._id,
      status: { $in: ['resolved', 'cancelled', 'closed'] }
    };

    const alerts = await Alert.find(query)
      .populate('responderId', 'name phone profile')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const total = await Alert.countDocuments(query);

    res.json({
      alerts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalAlerts: total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single alert
router.get('/:id', async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('userId', 'name phone safetyProfile')
      .populate('responderId', 'name phone profile');
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    if (req.user.role === 'user' && alert.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Volunteers can only view if it's active or they are the responder
    if (req.user.role === 'volunteer') {
      const isResponder = alert.responderId && alert.responderId._id.toString() === req.user._id.toString();
      if (alert.status !== 'active' && !isResponder) {
        return res.status(403).json({ message: 'Access denied to this private emergency' });
      }
    }
    
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update alert status (For users cancelling/resolving their own alert)
router.put('/:id/status', authorize('user'), async (req, res) => {
  try {
    const { status, note } = req.body;
    
    if (!['resolved', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Users can only transition alerts to resolved or cancelled' });
    }

    const alert = await Alert.findOne({ _id: req.params.id, userId: req.user._id });
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found or access denied' });
    }
    alert.status = status;
    alert.statusHistory.push({ status, note: note || `Alert ${status} by user`, timestamp: new Date() });

    // If resolved, update volunteer stats
    if (status === 'resolved' && alert.responderId) {
      await User.findByIdAndUpdate(alert.responderId, {
        $inc: { 'profile.totalAssists': 1 },
      });
    }

    await alert.save();
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update live location during active alert
router.put('/:id/location', authorize('user'), async (req, res) => {
  try {
    const { coordinates } = req.body;
    const alert = await Alert.findOne({ _id: req.params.id, userId: req.user._id });
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    if (['resolved', 'cancelled'].includes(alert.status)) {
      return res.status(400).json({ message: 'Cannot update location for a closed alert' });
    }

    if (!coordinates || coordinates.length !== 2) {
      return res.status(400).json({ message: 'Valid coordinates array [lng, lat] required' });
    }
    const [lng, lat] = coordinates;
    if (typeof lng !== 'number' || typeof lat !== 'number' || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return res.status(400).json({ message: 'Invalid geographical coordinates' });
    }

    alert.location.coordinates = coordinates;
    await alert.save();
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
