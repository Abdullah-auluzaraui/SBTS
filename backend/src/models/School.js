const mongoose = require('mongoose');

// BE-S1-1: School Model (NEW) — Section 7.1 of project-plan-EN.md
const schoolSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  schoolId: { type: String, required: true, unique: true, uppercase: true }, // e.g., "SCH-0001"
  contact:  {
    phone: { type: String },
    email: { type: String, lowercase: true }
  },
  location: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
  },
  emergencyContacts: [{
    name: { type: String, required: true },
    phone: { type: String, required: true }
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

schoolSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('School', schoolSchema);
