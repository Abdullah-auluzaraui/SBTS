const mongoose = require('mongoose');

// BE-S1-2: User Model (Updated for v2.0) — Section 7.2 of project-plan-EN.md
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  name:     { type: String, required: true },
  // Updated enum: added 'superadmin' and renamed 'admin' → 'schooladmin'
  role:     { type: String, enum: ['superadmin', 'schooladmin', 'driver', 'parent'], required: true },
  // school ref: required for all roles except superadmin
  school:   {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: function () { return this.role !== 'superadmin'; },
    default: null
  },
  phone:            { type: String },
  isPhoneVerified:  { type: Boolean, default: false },
  isActive:         { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);