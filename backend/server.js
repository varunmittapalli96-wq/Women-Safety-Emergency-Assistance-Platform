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

// --------------------------------------------------
// Environment validation
// --------------------------------------------------

const isProduction = process.env.NODE_ENV === 'production';

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET'
];

if (isProduction) {
  requiredEnvVars.push('FRONTEND_URL');
}

const missingEnvVars = requiredEnvVars.filter(
  (key) => !process.env[key]
);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
}

if (
  process.env.JWT_SECRET &&
  process.env.JWT_SECRET.length < 32
) {
  throw new Error(
    'JWT_SECRET must be at least 32 characters long.'
  );
}

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

const allowedOrigins = [
  FRONTEND_URL,
  'https://women-safety-frontend-g4ym.onrender.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/+$/, '');

    if (
      allowedOrigins.includes(normalizedOrigin) ||
      normalizedOrigin.endsWith('.onrender.com') ||
      normalizedOrigin.endsWith('.vercel.app') ||
      normalizedOrigin.includes('localhost') ||
      normalizedOrigin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }

    // Default permit with reflected origin to avoid breaking legitimate clients
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  optionsSuccessStatus: 204
};

// --------------------------------------------------
// Database
// --------------------------------------------------

connectDB();

// --------------------------------------------------
// Express configuration
// --------------------------------------------------

// Render runs the application behind a reverse proxy.
// This also allows express-rate-limit to identify client IPs correctly.
if (isProduction) {
  app.set('trust proxy', 1);
}

// Security headers
app.use(
  helmet({
    crossOriginOpenerPolicy: {
      policy: 'same-origin-allow-popups'
    }
  })
);

// CORS middleware & Preflight handler
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// JSON request parser
app.use(express.json());

// --------------------------------------------------
// Rate Limiting
// --------------------------------------------------

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    message: 'Too many requests from this IP, please try again later.'
  }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    message: 'Too many API requests from this IP, please try again later.'
  }
});

// Authentication endpoints
app.use('/api/auth', authLimiter);
app.use('/auth', authLimiter);

// All API endpoints
app.use('/api', apiLimiter);

// --------------------------------------------------
// Socket.IO
// --------------------------------------------------

const io = new Server(server, {
  cors: corsOptions
});

// Expose Socket.IO instance to routes
app.set('io', io);

// --------------------------------------------------
// Socket.IO Authentication
// --------------------------------------------------

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(
        new Error('Authentication error: No token')
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.id);

    if (!user) {
      return next(
        new Error('Authentication error: User not found')
      );
    }

    socket.user = user;

    next();
  } catch (error) {
    console.error(
      'Socket authentication error:',
      error.message
    );

    next(
      new Error('Authentication error: Invalid token')
    );
  }
});

// --------------------------------------------------
// Socket.IO Events
// --------------------------------------------------

io.on('connection', (socket) => {
  console.log(
    `Socket connected: ${socket.id} (User: ${socket.user.role})`
  );

  // Automatically join a private room
  // for targeted notifications
  socket.join(
    `user:${socket.user._id.toString()}`
  );

  // ------------------------------------------------
  // Join an alert room
  // ------------------------------------------------

  socket.on('join:alert', async (alertId) => {
    try {
      if (!alertId) {
        return;
      }

      const alert = await Alert.findById(alertId);

      if (!alert) {
        return;
      }

      const currentUserId =
        socket.user._id.toString();

      const isOwner =
        alert.userId?.toString() === currentUserId;

      const isResponder =
        alert.responderId &&
        alert.responderId.toString() === currentUserId;

      const isEligibleVolunteer =
        socket.user.role === 'volunteer' &&
        socket.user.verificationStatus === 'VERIFIED' &&
        alert.status === 'active';

      const isAdmin =
        socket.user.role === 'admin';

      if (
        isOwner ||
        isResponder ||
        isEligibleVolunteer ||
        isAdmin
      ) {
        socket.join(`alert:${alertId}`);

        console.log(
          `Socket ${socket.id} joined alert:${alertId}`
        );
      } else {
        console.warn(
          `Unauthorized room join attempt by user ${currentUserId} for alert ${alertId}`
        );
      }
    } catch (err) {
      console.error(
        'Socket join alert error:',
        err.message
      );
    }
  });

  // ------------------------------------------------
  // Live SOS location updates
  // ------------------------------------------------

  socket.on(
    'sos:location:update',
    async (data) => {
      const {
        alertId,
        latitude,
        longitude
      } = data || {};

      try {
        // Validate required values
        if (
          !alertId ||
          !Number.isFinite(Number(latitude)) ||
          !Number.isFinite(Number(longitude))
        ) {
          return;
        }

        const lat = Number(latitude);
        const lng = Number(longitude);

        // Validate geographic coordinate ranges
        if (
          lat < -90 ||
          lat > 90 ||
          lng < -180 ||
          lng > 180
        ) {
          console.warn(
            `Invalid location received from user ${socket.user._id}`
          );

          return;
        }

        // Verify alert belongs to authenticated user
        const alert = await Alert.findOne({
          _id: alertId,
          userId: socket.user._id
        });

        if (
          alert &&
          [
            'active',
            'accepted',
            'en_route',
            'arrived',
            'assisting'
          ].includes(alert.status)
        ) {
          // Update database with REAL coordinates
          alert.location = {
            type: 'Point',
            coordinates: [lng, lat],
            address:
              alert.location?.address ||
              'Live location'
          };

          alert.locationStatus = 'LIVE';

          await alert.save();

          // Broadcast live location to authorized
          // members of the alert room
          io.to(`alert:${alertId}`).emit(
            'sos:location:update',
            {
              alertId,
              latitude: lat,
              longitude: lng,
              timestamp:
                new Date().toISOString()
            }
          );
        }
      } catch (err) {
        console.error(
          'Location update error:',
          err.message
        );
      }
    }
  );

  // ------------------------------------------------
  // Socket disconnect
  // ------------------------------------------------

  socket.on('disconnect', () => {
    console.log(
      `Socket disconnected: ${socket.id}`
    );
  });
});

// --------------------------------------------------
// API Routes (Mounted at both /api and root for compatibility)
// --------------------------------------------------

const authRoutes = require('./routes/auth');
const contactsRoutes = require('./routes/contacts');
const alertsRoutes = require('./routes/alerts');
const volunteersRoutes = require('./routes/volunteers');
const adminRoutes = require('./routes/admin');
const safetyZonesRoutes = require('./routes/safetyZones');
const notificationsRoutes = require('./routes/notifications');
const publicRoutes = require('./routes/public');

// Routes with /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/volunteers', volunteersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/safety-zones', safetyZonesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/public', publicRoutes);

// Compatibility aliases without /api prefix
app.use('/auth', authRoutes);
app.use('/contacts', contactsRoutes);
app.use('/alerts', alertsRoutes);
app.use('/volunteers', volunteersRoutes);
app.use('/admin', adminRoutes);
app.use('/safety-zones', safetyZonesRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/public', publicRoutes);

// --------------------------------------------------
// Health Check
// --------------------------------------------------

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'bSafe - Women Safety API'
  });
});

// --------------------------------------------------
// Root Route
// --------------------------------------------------

app.get('/', (_req, res) => {
  res.send(
    '<h1>bSafe - Women Safety & Emergency Assistance API is running!</h1>'
  );
});

// --------------------------------------------------
// Global Error Handler
// --------------------------------------------------

app.use(
  (err, _req, res, _next) => {
    console.error(err.stack);

    res.status(500).json({
      message: 'Internal server error'
    });
  }
);

// --------------------------------------------------
// Start Server
// --------------------------------------------------

const PORT = process.env.PORT || 5000;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use by another running server instance.`);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      `Server running on port ${PORT}`
    );
  }
);