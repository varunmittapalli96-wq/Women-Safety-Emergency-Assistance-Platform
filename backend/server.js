require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Alert = require('./models/Alert');

const app = express();
const server = http.createServer(app);

connectDB();

app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  message: 'Too many requests from this IP, please try again later.'
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Expose io to routes
app.set('io', io);

// Socket.IO Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.IO Events
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id} (User: ${socket.user.role})`);

  // Automatically join a private room for targeted notifications
  socket.join(`user:${socket.user._id.toString()}`);

  socket.on('join:alert', async (alertId) => {
    try {
      const alert = await Alert.findById(alertId);
      if (!alert) return;

      const isOwner = alert.userId.toString() === socket.user._id.toString();
      const isResponder = alert.responderId && alert.responderId.toString() === socket.user._id.toString();
      const isEligibleVolunteer = socket.user.role === 'volunteer' && socket.user.verificationStatus === 'VERIFIED' && alert.status === 'active';
      const isAdmin = socket.user.role === 'admin';

      if (isOwner || isResponder || isEligibleVolunteer || isAdmin) {
        socket.join(`alert:${alertId}`);
        console.log(`Socket ${socket.id} joined alert:${alertId}`);
      } else {
        console.warn(`Unauthorized room join attempt by user ${socket.user._id} for alert ${alertId}`);
      }
    } catch (err) {
      console.error('Socket join alert error:', err.message);
    }
  });

  socket.on('sos:location:update', async (data) => {
    const { alertId, latitude, longitude } = data;
    try {
      // Verify alert belongs to the authenticated user and is active
      const alert = await Alert.findOne({ _id: alertId, userId: socket.user._id });
      if (alert && ['active', 'accepted', 'en_route', 'arrived', 'assisting'].includes(alert.status)) {
        // Update database
        alert.location = {
          type: 'Point',
          coordinates: [longitude, latitude],
          address: alert.location?.address || 'Live location'
        };
        alert.locationStatus = 'LIVE';
        await alert.save();
        
        // Broadcast to responders
        io.to(`alert:${alertId}`).emit('sos:location:update', {
          alertId,
          latitude,
          longitude,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Location update error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/volunteers', require('./routes/volunteers'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/safety-zones', require('./routes/safetyZones'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/public', require('./routes/public'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'bSafe - Women Safety API' });
});

app.get('/', (_req, res) => {
  res.send('<h1>bSafe - Women Safety & Emergency Assistance API is running!</h1>');
});

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
