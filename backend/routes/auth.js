const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const getFrontendUrl = () => {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
};

const getOAuth2Client = () => {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'
  );
};

// Generates a cryptographically signed CSRF state token
const generateStateToken = () => {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const data = `${nonce}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'bsafe_secret')
    .update(data)
    .digest('hex');
  return `${data}:${signature}`;
};

// Verifies the CSRF state token and ensures it hasn't expired (10 min TTL)
const verifyStateToken = (stateToken) => {
  if (!stateToken || typeof stateToken !== 'string') return false;
  const parts = stateToken.split(':');
  if (parts.length !== 3) return false;
  const [nonce, timestampStr, signature] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  // Max 10 minutes expiry window
  if (Date.now() - timestamp > 10 * 60 * 1000 || Date.now() < timestamp - 60 * 1000) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'bsafe_secret')
    .update(`${nonce}:${timestamp}`)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
};

// Safe helper for Google account creation and account linking
async function findOrCreateGoogleUser(payload) {
  const { sub, email, email_verified, name, picture } = payload;

  if (!email_verified) {
    throw new Error('Google email is not verified. Please verify your email with Google.');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check if user already exists by googleId
  let user = await User.findOne({ googleId: sub });
  if (user) {
    if (picture && !user.avatar) {
      user.avatar = picture;
      await user.save();
    }
    return user;
  }

  // 2. Check if user already exists with matching verified email (Account Linking)
  user = await User.findOne({ email: normalizedEmail });
  if (user) {
    user.googleId = sub;
    if (user.authProvider === 'LOCAL') {
      user.authProvider = 'BOTH';
    }
    if (picture && !user.avatar) {
      user.avatar = picture;
    }
    await user.save();
    return user;
  }

  // 3. Create new user with verified Google identity
  // STRICT RULE: New Google users MUST ALWAYS have role: 'user'.
  // Google login MUST NEVER create ADMIN or VERIFIED VOLUNTEER accounts.
  user = await User.create({
    name: (name || normalizedEmail.split('@')[0]).trim(),
    email: normalizedEmail,
    googleId: sub,
    authProvider: 'GOOGLE',
    avatar: picture || '',
    phone: '',
    role: 'user', // Default to normal user, never privileged
    verificationStatus: 'VERIFIED',
  });

  return user;
}

// Initiate Google OAuth redirect
router.get('/google', (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({
        message: 'Google OAuth is not configured on the server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      });
    }

    const state = generateStateToken();
    const oauth2Client = getOAuth2Client();

    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'select_account',
    });

    res.redirect(authorizeUrl);
  } catch (error) {
    console.error('Google auth init error:', error);
    res.status(500).json({ message: 'Failed to initialize Google authentication.' });
  }
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  const frontendUrl = getFrontendUrl();
  const { code, state, error } = req.query;

  // Handle user cancellation or denial
  if (error) {
    console.warn('Google sign-in cancelled or failed by user:', error);
    return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Google sign-in was cancelled.')}`);
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Authorization code missing from Google.')}`);
  }

  // Validate state token for CSRF protection
  if (!verifyStateToken(state)) {
    console.warn('Invalid or expired OAuth state parameter received');
    return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Invalid or expired authentication session. Please try again.')}`);
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.id_token) {
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Google did not provide an ID token.')}`);
    }

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Your Google account could not be verified.')}`);
    }

    const user = await findOrCreateGoogleUser(payload);
    const token = signToken(user._id);

    // Redirect to frontend callback handler
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (err) {
    console.error('Google OAuth callback error:', err.message);
    const userMsg = err.message.includes('verified')
      ? err.message
      : 'Unable to sign in with Google. Please try again.';
    res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(userMsg)}`);
  }
});

// Firebase Public Certificates Cache for verifying Firebase ID tokens
let firebaseCertsCache = null;
let firebaseCertsExpiresAt = 0;

async function getFirebasePublicCerts() {
  const now = Date.now();
  if (firebaseCertsCache && now < firebaseCertsExpiresAt) {
    return firebaseCertsCache;
  }

  const res = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
  if (!res.ok) {
    throw new Error('Failed to retrieve Firebase public signing certificates.');
  }

  const certs = await res.json();
  firebaseCertsCache = certs;

  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const ttlSeconds = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 6 * 3600;
  firebaseCertsExpiresAt = now + ttlSeconds * 1000;

  return certs;
}

// Direct ID Token verification endpoint (supports both Firebase Auth ID Tokens and Google OAuth ID Tokens)
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Google/Firebase ID token credential is required.' });
    }

    const decoded = jwt.decode(credential, { complete: true });
    if (!decoded || !decoded.payload) {
      return res.status(400).json({ message: 'Invalid token format.' });
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || 'bsafe-f874c';
    const isFirebaseToken =
      decoded.payload.iss === `https://securetoken.google.com/${projectId}` ||
      decoded.payload.aud === projectId;

    let payload;

    if (isFirebaseToken) {
      const kid = decoded.header?.kid;
      if (!kid) {
        return res.status(401).json({ message: 'Missing key ID in Firebase token header.' });
      }

      const certs = await getFirebasePublicCerts();
      const cert = certs[kid];
      if (!cert) {
        return res.status(401).json({ message: 'Invalid or unknown signing key for Firebase token.' });
      }

      payload = jwt.verify(credential, cert, {
        algorithms: ['RS256'],
        audience: projectId,
        issuer: `https://securetoken.google.com/${projectId}`,
      });
    } else {
      // Standard Google OAuth ID Token
      if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(500).json({ message: 'Google OAuth client ID is not configured on the server.' });
      }

      const oauth2Client = getOAuth2Client();
      const ticket = await oauth2Client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    }

    if (!payload) {
      return res.status(401).json({ message: 'Your Google account could not be verified.' });
    }

    const user = await findOrCreateGoogleUser(payload);
    const token = signToken(user._id);

    res.json({ user, token });
  } catch (error) {
    console.error('Google token verify error:', error);
    res.status(401).json({ message: error.message || 'Google authentication failed.' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role, organization, skills } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    const userRole = ['user', 'volunteer'].includes(role) ? role : 'user';
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: userRole,
      verificationStatus: userRole === 'user' ? 'VERIFIED' : 'PENDING',
      profile: userRole === 'volunteer' ? { organization, skills: skills || [] } : undefined,
    });
    const token = signToken(user._id);
    res.status(201).json({ user, token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = signToken(user._id);
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/me', require('../middleware/auth').protect, (req, res) => {
  res.json(req.user);
});

router.put('/me', require('../middleware/auth').protect, async (req, res) => {
  try {
    const { name, phone, location, safetyProfile } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (location) {
      user.location = {
        type: 'Point',
        coordinates: location.coordinates || [77.5946, 12.9716],
        address: location.address || '',
      };
    }
    if (safetyProfile) {
      user.safetyProfile = { ...user.safetyProfile?.toObject?.() || {}, ...safetyProfile };
    }
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
