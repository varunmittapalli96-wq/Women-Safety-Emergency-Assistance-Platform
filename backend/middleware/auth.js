const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Update lastActiveAt if it's more than an hour old to prevent DB thrashing
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (!req.user.lastActiveAt || req.user.lastActiveAt < oneHourAgo) {
      await User.updateOne({ _id: req.user._id }, { $set: { lastActiveAt: new Date() } });
      req.user.lastActiveAt = new Date();
    }

    next();
  } catch {
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied for this role' });
  }
  next();
};

module.exports = { protect, authorize };
