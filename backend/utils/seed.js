require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const EmergencyContact = require('../models/EmergencyContact');
const Alert = require('../models/Alert');
const SafetyZone = require('../models/SafetyZone');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await EmergencyContact.deleteMany({});
    await Alert.deleteMany({});
    await SafetyZone.deleteMany({});
    console.log('Cleared existing data');

    // Create admin
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@bsafe.com',
      phone: '9999999999',
      password: 'admin123',
      role: 'admin',
      isVerified: true,
      location: { type: 'Point', coordinates: [77.5946, 12.9716], address: 'Bengaluru, Karnataka' },
    });
    console.log('Admin created:', admin.email);

    // Create sample users
    const user1 = await User.create({
      name: 'Priya Sharma',
      email: 'priya@example.com',
      phone: '9876543210',
      password: 'user123',
      role: 'user',
      isVerified: true,
      safetyProfile: { bloodGroup: 'O+', medicalConditions: 'None', emergencyNote: 'Please contact my mother first' },
      location: { type: 'Point', coordinates: [77.5946, 12.9716], address: 'MG Road, Bengaluru' },
    });

    const user2 = await User.create({
      name: 'Ananya Patel',
      email: 'ananya@example.com',
      phone: '9876543211',
      password: 'user123',
      role: 'user',
      isVerified: true,
      safetyProfile: { bloodGroup: 'A+', medicalConditions: 'Asthma', emergencyNote: 'Carries inhaler' },
      location: { type: 'Point', coordinates: [77.6101, 12.9352], address: 'Koramangala, Bengaluru' },
    });
    console.log('Users created');

    // Create emergency contacts
    await EmergencyContact.create([
      { userId: user1._id, name: 'Meera Sharma', phone: '9876000001', relationship: 'Mother', isPrimary: true },
      { userId: user1._id, name: 'Rahul Sharma', phone: '9876000002', relationship: 'Brother', isPrimary: false },
      { userId: user2._id, name: 'Sunita Patel', phone: '9876000003', relationship: 'Mother', isPrimary: true },
    ]);
    console.log('Emergency contacts created');

    // Create verified volunteers
    const vol1 = await User.create({
      name: 'Rajesh Kumar',
      email: 'rajesh@example.com',
      phone: '9876543300',
      password: 'volunteer123',
      role: 'volunteer',
      isVerified: true,
      profile: { organization: 'SafeCity NGO', skills: ['first_aid', 'self_defense'], experience: 5, bio: 'Experienced community volunteer', rating: 4.8, totalRatings: 25, totalAssists: 30 },
      location: { type: 'Point', coordinates: [77.5800, 12.9600], address: 'Jayanagar, Bengaluru' },
      isAvailable: true,
    });

    const vol2 = await User.create({
      name: 'Sneha Reddy',
      email: 'sneha@example.com',
      phone: '9876543301',
      password: 'volunteer123',
      role: 'volunteer',
      isVerified: true,
      profile: { organization: 'Women Helpline Foundation', skills: ['counseling', 'first_aid'], experience: 3, bio: 'Trained counselor and first responder', rating: 4.6, totalRatings: 18, totalAssists: 22 },
      location: { type: 'Point', coordinates: [77.6200, 12.9350], address: 'HSR Layout, Bengaluru' },
      isAvailable: true,
    });

    // Create unverified volunteer
    await User.create({
      name: 'Amit Singh',
      email: 'amit@example.com',
      phone: '9876543302',
      password: 'volunteer123',
      role: 'volunteer',
      isVerified: false,
      profile: { organization: 'Neighbourhood Watch', skills: ['patrol'], experience: 1, bio: 'New volunteer' },
      location: { type: 'Point', coordinates: [77.6100, 12.9500], address: 'Indiranagar, Bengaluru' },
      isAvailable: true,
    });
    console.log('Volunteers created');

    // Create safety zones
    await SafetyZone.create([
      { name: 'Cubbon Park Police Station', type: 'police_station', location: { type: 'Point', coordinates: [77.5929, 12.9763], address: 'Cubbon Park, Bengaluru' }, phone: '080-22942222', isActive: true },
      { name: 'Victoria Hospital', type: 'hospital', location: { type: 'Point', coordinates: [77.5731, 12.9567], address: 'Fort, Bengaluru' }, phone: '080-26701150', isActive: true },
      { name: 'Women Safety Hub', type: 'safe_house', location: { type: 'Point', coordinates: [77.6050, 12.9350], address: 'Koramangala, Bengaluru' }, phone: '080-41234567', isActive: true },
      { name: 'Brigade Road Metro Station', type: 'public_place', location: { type: 'Point', coordinates: [77.6070, 12.9716], address: 'Brigade Road, Bengaluru' }, phone: '', isActive: true },
      { name: 'Jayanagar Police Station', type: 'police_station', location: { type: 'Point', coordinates: [77.5820, 12.9300], address: 'Jayanagar, Bengaluru' }, phone: '080-26633500', isActive: true },
      { name: 'St. Johns Hospital', type: 'hospital', location: { type: 'Point', coordinates: [77.6000, 12.9285], address: 'Koramangala, Bengaluru' }, phone: '080-22065000', isActive: true },
    ]);
    console.log('Safety zones created');

    // Create sample alerts (history)
    await Alert.create([
      {
        userId: user1._id,
        alertType: 'sos',
        description: 'Being followed on MG Road',
        location: { type: 'Point', coordinates: [77.5946, 12.9716], address: 'MG Road, Bengaluru' },
        status: 'resolved',
        responderId: vol1._id,
        statusHistory: [
          { status: 'active', note: 'Emergency alert triggered', timestamp: new Date(Date.now() - 3600000) },
          { status: 'responding', note: 'Volunteer Rajesh Kumar is responding', timestamp: new Date(Date.now() - 3500000) },
          { status: 'resolved', note: 'User is safe. Volunteer escorted to safe zone.', timestamp: new Date(Date.now() - 3000000) },
        ],
      },
      {
        userId: user2._id,
        alertType: 'harassment',
        description: 'Verbal harassment near bus stop',
        location: { type: 'Point', coordinates: [77.6101, 12.9352], address: 'Koramangala Bus Stop, Bengaluru' },
        status: 'resolved',
        responderId: vol2._id,
        statusHistory: [
          { status: 'active', note: 'Emergency alert triggered', timestamp: new Date(Date.now() - 7200000) },
          { status: 'responding', note: 'Volunteer Sneha Reddy is responding', timestamp: new Date(Date.now() - 7100000) },
          { status: 'resolved', note: 'Situation handled', timestamp: new Date(Date.now() - 6600000) },
        ],
      },
    ]);
    console.log('Sample alerts created');

    console.log('\n--- Seed Complete ---');
    console.log('Admin: admin@bsafe.com / admin123');
    console.log('User: priya@example.com / user123');
    console.log('User: ananya@example.com / user123');
    console.log('Volunteer: rajesh@example.com / volunteer123');
    console.log('Volunteer: sneha@example.com / volunteer123');
    console.log('Unverified Volunteer: amit@example.com / volunteer123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
