const express = require('express');
const EmergencyContact = require('../models/EmergencyContact');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('user', 'admin'));

// Get all contacts for current user
router.get('/', async (req, res) => {
  try {
    const contacts = await EmergencyContact.find({ userId: req.user._id }).sort('-isPrimary createdAt');
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a new emergency contact
router.post('/', async (req, res) => {
  try {
    const { name, phone, relationship, isPrimary, email, isActive, notificationPreference } = req.body;
    if (!name || !phone || !relationship) {
      return res.status(400).json({ message: 'Please provide name, phone and relationship' });
    }
    // If setting as primary, unset other primaries
    if (isPrimary) {
      await EmergencyContact.updateMany({ userId: req.user._id }, { isPrimary: false });
    }
    const contact = await EmergencyContact.create({
      userId: req.user._id,
      name,
      phone,
      relationship,
      isPrimary: isPrimary || false,
      email: email || undefined,
      isActive: typeof isActive === 'boolean' ? isActive : true,
      notificationPreference: notificationPreference || 'SMS_AND_EMAIL'
    });
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update an emergency contact
router.put('/:id', async (req, res) => {
  try {
    const contact = await EmergencyContact.findOne({ _id: req.params.id, userId: req.user._id });
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    const { name, phone, relationship, isPrimary, email, isActive, notificationPreference } = req.body;
    if (isPrimary) {
      await EmergencyContact.updateMany({ userId: req.user._id }, { isPrimary: false });
    }
    if (name !== undefined) contact.name = name;
    if (phone !== undefined) contact.phone = phone;
    if (relationship !== undefined) contact.relationship = relationship;
    if (email !== undefined) contact.email = email;
    if (typeof isPrimary === 'boolean') contact.isPrimary = isPrimary;
    if (typeof isActive === 'boolean') contact.isActive = isActive;
    if (notificationPreference) contact.notificationPreference = notificationPreference;
    await contact.save();
    res.json(contact);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete an emergency contact
router.delete('/:id', async (req, res) => {
  try {
    const contact = await EmergencyContact.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    res.json({ message: 'Contact deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
