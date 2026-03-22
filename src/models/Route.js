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
  // Array of students picked up on this route (useful for joining data easily)
  students:          [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  // Encoded street path returned by OSRM API to draw the route perfectly on the map
  polyline:          { type: String, default: '' },
  driver:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  estimatedDuration: { type: Number }, // minutes
  isActive:          { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Route', routeSchema);
