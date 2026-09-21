const express = require('express');
const User = require('../models/User');
const Alert = require('../models/Alert');
const Testimonial = require('../models/Testimonial');
const EmergencyContact = require('../models/EmergencyContact');

const router = express.Router();

// Get dynamic stats for the landing page
router.get('/stats', async (req, res) => {
  try {
    const womenProtected = await User.countDocuments({ role: 'user' });
    const allUsersCount = await User.countDocuments();
    const alertsResolved = await Alert.countDocuments({ status: 'resolved' });
    const verifiedVolunteers = await User.countDocuments({ 
      role: 'volunteer', 
      verificationStatus: 'VERIFIED' 
    });
    const emergencyContactsCount = await EmergencyContact.countDocuments();
    const totalAlerts = await Alert.countDocuments();
    
    const performanceStats = await Alert.aggregate([
      { 
        $match: { 
          status: 'resolved',
          acceptedAt: { $exists: true },
          createdAt: { $exists: true }
        } 
      },
      { 
        $group: {
          _id: null,
          avgResponseTimeMs: { 
            $avg: { $subtract: ["$acceptedAt", "$createdAt"] }
          }
        }
      }
    ]);

    const avgResponseTimeMs = performanceStats[0]?.avgResponseTimeMs || (2 * 60 * 1000); // 2 mins fallback
    const avgResponseTimeMins = Math.max(1, Math.round(avgResponseTimeMs / (1000 * 60)));

    // Fetch recent users to display live avatar initials on the hero section
    const recentUsersDocs = await User.find({ role: { $in: ['user', 'volunteer'] } })
      .select('name role')
      .sort({ createdAt: -1 })
      .limit(6);

    const recentUsers = recentUsersDocs.map(u => {
      const parts = (u.name || '').trim().split(/\s+/).filter(Boolean);
      let initials = 'U';
      if (parts.length >= 2) {
        initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      } else if (parts.length === 1 && parts[0].length > 0) {
        initials = parts[0].slice(0, 2).toUpperCase();
      }
      return {
        name: u.name,
        initials,
        role: u.role
      };
    });

    res.json({
      totalUsers: womenProtected > 0 ? womenProtected : allUsersCount,
      womenProtected,
      allUsersCount,
      alertsResolved,
      verifiedVolunteers,
      emergencyContactsCount,
      totalAlerts,
      avgResponseTimeMins,
      recentUsers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get active testimonials
router.get('/testimonials', async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ isActive: true }).sort('-createdAt').limit(10);
    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit a new testimonial
router.post('/testimonials', async (req, res) => {
  try {
    const { name, role, city, text, rating } = req.body;
    if (!name || !role || !city || !text || !rating) {
      return res.status(400).json({ message: 'All fields (name, role, city, text, rating) are required.' });
    }

    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    let initials = 'U';
    if (parts.length >= 2) {
      initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length > 0) {
      initials = parts[0].slice(0, 2).toUpperCase();
    }

    const testimonial = new Testimonial({
      name: name.trim(),
      role: role.trim(),
      city: city.trim(),
      text: text.trim(),
      rating: Math.min(5, Math.max(1, Number(rating))),
      initials,
      isActive: true
    });

    await testimonial.save();
    res.status(201).json(testimonial);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
