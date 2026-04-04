const mongoose = require('mongoose');

// BE-S1-2: Student Model (Updated for v2.0) — Section 7.3 of project-plan-EN.md
const studentSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  studentId: { type: String, required: true, unique: true }, // e.g., "S260000001"
  // Multi-tenant: every student belongs to a specific school
  school:   { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  
  // Interactive Maps: geographic location of the student's home set by parents
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },

  // Secure parent onboarding: auto-generated code (e.g., 'A7X-92K')
  parentAccessCode: { type: String, required: true },
  // 1-to-Many: parentId links to a single parent account (not unique — parent can have multiple children)
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, sparse: true, default: null },
  nfcTagId: { type: String, unique: true, sparse: true },
  assignedBus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', default: null },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Create a 2dsphere index to support fast geographic queries (like auto-routing nearest neighbors)
studentSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Student', studentSchema);