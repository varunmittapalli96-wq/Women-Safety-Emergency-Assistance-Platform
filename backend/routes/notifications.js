const express = require('express');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Get user's unread notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipientUserId: req.user._id,
      readAt: null
    }).sort('-createdAt').limit(20);
    
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark a single notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientUserId: req.user._id },
      { $set: { readAt: new Date() } },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark all as read
router.put('/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientUserId: req.user._id, readAt: null },
      { $set: { readAt: new Date() } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
