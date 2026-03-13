const mongoose = require('mongoose');

// BE-S1-2: Student Model (Updated for v2.0) — Section 7.3 of project-plan-EN.md
const studentSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  studentId: { type: String, required: true, unique: true }, // e.g., "STU-2024-001"
  grade:    { type: String },
  // Multi-tenant: every student belongs to a specific school
  school:   { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  // Secure parent onboarding: auto-generated code (e.g., 'A7X-92K')
  parentAccessCode: { type: String, required: true },
  // 1-to-Many: parentId links to a single parent account (not unique — parent can have multiple children)
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, sparse: true, default: null },
  nfcTagId: { type: String, unique: true, sparse: true },
  assignedBus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);