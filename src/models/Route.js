const mongoose = require('mongoose');

// BE-S2-4: Route Model — Section 7.4 of project-plan-EN.md
const routeSchema = new mongoose.Schema({
  school:            { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name:              { type: String, required: true },
  waypoints:         [{
    lat:   { type: Number, required: true },
    lng:   { type: Number, required: true },
    label: { type: String }
  }],
  driver:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  estimatedDuration: { type: Number }, // minutes
  isActive:          { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Route', routeSchema);
