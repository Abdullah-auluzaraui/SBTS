const mongoose = require('mongoose');

// BE-S2-4: Bus Model — Section 7.5 of project-plan-EN.md
const busSchema = new mongoose.Schema({
  school:   { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  busId:    { type: String, required: true, unique: true, uppercase: true }, // e.g., "BUS-001"
  capacity: { type: Number, required: true, min: 1, max: 100 },
  route:    { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
  driver:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Bus', busSchema);
