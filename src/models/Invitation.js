const mongoose = require('mongoose');

// Invitation Model — Token-based onboarding for School Admins
const invitationSchema = new mongoose.Schema({
  school:    { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  email:     { type: String, required: true, lowercase: true, trim: true },
  token:     { type: String, required: true, unique: true },     // crypto.randomBytes(32).toString('hex')
  expiresAt: { type: Date, required: true },                     // +24 hours
  isUsed:    { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Invitation', invitationSchema);
