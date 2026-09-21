const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { 
      type: String, 
      default: '', 
      required: function () { 
        return this.authProvider === 'LOCAL'; 
      } 
    },
    password: { 
      type: String, 
      minlength: 6, 
      required: function () { 
        return this.authProvider === 'LOCAL'; 
      } 
    },
    googleId: { type: String, sparse: true, unique: true },
    authProvider: {
      type: String,
      enum: ['LOCAL', 'GOOGLE', 'BOTH'],
      default: 'LOCAL',
    },
    avatar: String,
    role: {
      type: String,
      enum: ['user', 'volunteer', 'admin'],
      default: 'user',
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'],
      default: 'PENDING',
    },
    verificationReason: String,
    verificationReviewedAt: Date,
    profile: {
      organization: String,
      skills: [{ type: String }],
      experience: Number,
      bio: String,
      rating: { type: Number, default: 0 },
      totalRatings: { type: Number, default: 0 },
      totalAssists: { type: Number, default: 0 },
    },
    safetyProfile: {
      bloodGroup: String,
      medicalConditions: String,
      emergencyNote: String,
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [77.5946, 12.9716] },
      address: { type: String, default: '' },
    },
    isAvailable: { type: Boolean, default: true },
    lastActiveAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ location: '2dsphere' });
userSchema.index({ role: 1, verificationStatus: 1 });

userSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
