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

  // Automated Parent Linking
  nationalId: { type: String, required: true }, // Stored encrypted
  dob: { type: Date, required: true },
  normalizedName: { type: String, required: true }, // For fuzzy matching
  // 1-to-Many: parentId links to a single parent account (not unique — parent can have multiple children)
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, sparse: true, default: null },
  // Soft-unlink tracking: when an admin unlinks a parent, the previous parent
  // keeps a "ghost" reference so they still see the student grayed-out until
  // the student is either re-linked (to them or a different parent) or until
  // the parent account expires. If a different parent later claims the student
  // we hard-remove these fields to drop the ghost from the old parent's view.
  previousParentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  unlinkedAt:       { type: Date, default: null },
  unlinkedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  nfcTagId: { type: String, unique: true, sparse: true },
  assignedBus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', default: null },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Create a 2dsphere index to support fast geographic queries (like auto-routing nearest neighbors)
studentSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Student', studentSchema);