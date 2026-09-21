const express = require('express');
const User = require('../models/User');
const Alert = require('../models/Alert');
const SafetyZone = require('../models/SafetyZone');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

// Analytics Overview
router.get('/analytics/overview', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Date Filtering
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      // Default to current month
      const now = new Date();
      dateFilter = {
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1),
          $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        }
      };
    }

    // 1. User Statistics
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalVolunteers = await User.countDocuments({ role: 'volunteer', verificationStatus: 'VERIFIED' });
    
    // MAU: Active within the date filter (falling back to current month if no filter)
    const activeStart = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const activeEnd = endDate ? new Date(endDate) : new Date();
    const monthlyActiveUsers = await User.countDocuments({
      role: 'user',
      lastActiveAt: { $gte: activeStart, $lte: activeEnd }
    });

    // 2. Incident Statistics
    const alertsInPeriod = await Alert.countDocuments(dateFilter);
    const activeAlerts = await Alert.countDocuments({ status: 'active' }); // Current active irrespective of period
    
    // 3. Response Performance Statistics (using Aggregation)
    const performanceStats = await Alert.aggregate([
      { $match: dateFilter },
      { 
        $group: {
          _id: null,
          totalResolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          totalCancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
          totalAccepted: { $sum: { $cond: [{ $ifNull: ["$acceptedAt", false] }, 1, 0] } },
          // Response time = acceptedAt - createdAt
          avgResponseTimeMs: { 
            $avg: { 
              $cond: [
                { $and: [{ $ifNull: ["$acceptedAt", false] }, { $ifNull: ["$createdAt", false] }] },
                { $subtract: ["$acceptedAt", "$createdAt"] },
                null
              ]
            }
          }
        }
      }
    ]);

    const stats = performanceStats[0] || { totalResolved: 0, totalCancelled: 0, totalAccepted: 0, avgResponseTimeMs: null };
    
    // Successful Assistance Rate: Resolved / (Resolved + other finished states where a responder was involved? Or just Total Accepted)
    // The requirement suggests: resolved alerts / alerts that received a response
    const successfulAssistanceRate = stats.totalAccepted > 0 
      ? (stats.totalResolved / stats.totalAccepted) * 100 
      : null;

    // Volunteer Response Rate: Alerts with an accepted response / Total eligible alerts
    const volunteerResponseRate = alertsInPeriod > 0 
      ? (stats.totalAccepted / alertsInPeriod) * 100 
      : null;

    res.json({
      totalUsers,
      totalVolunteers,
      monthlyActiveUsers,
      alertsInPeriod,
      activeAlerts,
      totalResolved: stats.totalResolved,
      totalCancelled: stats.totalCancelled,
      avgResponseTimeMs: stats.avgResponseTimeMs,
      successfulAssistanceRate,
      volunteerResponseRate
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Analytics Trends (Time Series)
router.get('/analytics/trends', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      const now = new Date();
      dateFilter = {
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1),
          $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        }
      };
    }

    const trends = await Alert.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(trends);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Incident Reports (Paginated)
router.get('/reports/incidents', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const { startDate, endDate, status } = req.query;
    let query = {};
    
    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (status && status !== 'all') {
      query.status = status;
    }

    const alerts = await Alert.find(query)
      .populate('userId', 'name email phone')
      .populate('responderId', 'name email phone')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const total = await Alert.countDocuments(query);

    res.json({
      alerts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalRecords: total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Incident Reports (CSV Export)
router.get('/reports/incidents/export', async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    let query = {};
    
    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (status && status !== 'all') {
      query.status = status;
    }

    const alerts = await Alert.find(query)
      .populate('userId', 'name')
      .populate('responderId', 'name')
      .sort('-createdAt');

    // Generate CSV string
    const headers = ['Alert ID', 'Date', 'Emergency Type', 'Status', 'User Name', 'Responder Name', 'Accepted At', 'Resolved At', 'Response Duration (ms)'];
    
    const rows = alerts.map(a => {
      const durationMs = a.acceptedAt && a.createdAt ? new Date(a.acceptedAt).getTime() - new Date(a.createdAt).getTime() : '';
      return [
        a._id.toString(),
        a.createdAt ? new Date(a.createdAt).toISOString() : '',
        a.alertType || '',
        a.status || '',
        a.userId ? (a.userId.name || '') : 'Unknown',
        a.responderId ? (a.responderId.name || '') : 'None',
        a.acceptedAt ? new Date(a.acceptedAt).toISOString() : '',
        a.resolvedAt ? new Date(a.resolvedAt).toISOString() : '',
        durationMs
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','); // Escape quotes
    });

    const csvString = [headers.join(','), ...rows].join('\n');

    res.header('Content-Type', 'text/csv');
    res.attachment(`incident_report_${new Date().getTime()}.csv`);
    res.send(csvString);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort('-createdAt');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get pending volunteers
router.get('/volunteers/pending', async (req, res) => {
  try {
    const volunteers = await User.find({ role: 'volunteer', verificationStatus: 'PENDING' }).sort('-createdAt');
    res.json(volunteers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify volunteer
router.put('/volunteers/:id/verify', async (req, res) => {
  try {
    const volunteer = await User.findById(req.params.id);
    if (!volunteer || volunteer.role !== 'volunteer') {
      return res.status(404).json({ message: 'Volunteer not found' });
    }
    volunteer.verificationStatus = 'VERIFIED';
    volunteer.verificationReviewedAt = new Date();
    await volunteer.save();
    res.json(volunteer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reject volunteer
router.put('/volunteers/:id/reject', async (req, res) => {
  try {
    const volunteer = await User.findById(req.params.id);
    if (!volunteer || volunteer.role !== 'volunteer') {
      return res.status(404).json({ message: 'Volunteer not found' });
    }
    volunteer.verificationStatus = 'REJECTED';
    volunteer.verificationReviewedAt = new Date();
    await volunteer.save();
    res.json(volunteer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Suspend volunteer
router.put('/volunteers/:id/suspend', async (req, res) => {
  try {
    const volunteer = await User.findById(req.params.id);
    if (!volunteer || volunteer.role !== 'volunteer') {
      return res.status(404).json({ message: 'Volunteer not found' });
    }
    volunteer.verificationStatus = 'SUSPENDED';
    volunteer.verificationReviewedAt = new Date();
    await volunteer.save();
    res.json(volunteer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all alerts
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await Alert.find()
      .populate('userId', 'name phone email')
      .populate('responderId', 'name phone')
      .sort('-createdAt');
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Resolve alert
router.put('/alerts/:id/resolve', async (req, res) => {
  try {
    const { status, note } = req.body;
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    alert.status = status || 'resolved';
    alert.statusHistory.push({
      status: alert.status,
      note: note || 'Resolved by admin',
      timestamp: new Date(),
    });
    await alert.save();
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Safety zone CRUD
router.get('/safety-zones', async (req, res) => {
  try {
    const zones = await SafetyZone.find().sort('-createdAt');
    res.json(zones);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/safety-zones', async (req, res) => {
  try {
    const { name, type, location, phone } = req.body;
    if (!name || !type || !location) {
      return res.status(400).json({ message: 'Name, type, and location are required' });
    }
    const zone = await SafetyZone.create({
      name,
      type,
      location: {
        type: 'Point',
        coordinates: location.coordinates,
        address: location.address || '',
      },
      phone: phone || '',
    });
    res.status(201).json(zone);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/safety-zones/:id', async (req, res) => {
  try {
    const zone = await SafetyZone.findById(req.params.id);
    if (!zone) {
      return res.status(404).json({ message: 'Safety zone not found' });
    }
    const { name, type, location, phone, isActive } = req.body;
    if (name) zone.name = name;
    if (type) zone.type = type;
    if (location) {
      zone.location = {
        type: 'Point',
        coordinates: location.coordinates || zone.location.coordinates,
        address: location.address || zone.location.address,
      };
    }
    if (phone !== undefined) zone.phone = phone;
    if (typeof isActive === 'boolean') zone.isActive = isActive;
    await zone.save();
    res.json(zone);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/safety-zones/:id', async (req, res) => {
  try {
    const zone = await SafetyZone.findByIdAndDelete(req.params.id);
    if (!zone) {
      return res.status(404).json({ message: 'Safety zone not found' });
    }
    res.json({ message: 'Safety zone deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
