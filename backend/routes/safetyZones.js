const express = require('express');
const SafetyZone = require('../models/SafetyZone');

const router = express.Router();

// Get all active safety zones (public)
router.get('/', async (req, res) => {
  try {
    const zones = await SafetyZone.find({ isActive: true }).sort('name');
    res.json(zones);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get nearby safety zones (Aggregation to compute distance)
router.get('/nearby', async (req, res) => {
  try {
    const { lng, lat, maxDistance } = req.query;
    if (!lng || !lat) {
      return res.status(400).json({ message: 'Longitude and latitude are required' });
    }
    
    // Convert to numbers and validate
    const longitude = parseFloat(lng);
    const latitude = parseFloat(lat);
    if (isNaN(longitude) || isNaN(latitude)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    const radius = parseInt(maxDistance) || 50000; // default 50km

    const zones = await SafetyZone.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [longitude, latitude] },
          distanceField: 'distanceMeters',
          maxDistance: radius,
          query: { isActive: true },
          spherical: true
        }
      },
      { $limit: 100 }
    ]);
    
    res.json(zones);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
