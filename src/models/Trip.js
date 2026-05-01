const mongoose = require('mongoose');

// Trip Model — حفظ الرحلات النشطة والمكتملة لكل حافلة
const tripSchema = new mongoose.Schema({
  school:    { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  bus:       { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  driver:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Direction of the trip — used to prevent duplicate trips per day per direction
  tripType:  { type: String, enum: ['to_school', 'to_home'], default: null },
  status:    { type: String, enum: ['active', 'completed'], default: 'active' },

  // المسار المحسوب من OSRM: مصفوفة من { lat, lng }
  routePath: [{ lat: Number, lng: Number }],

  // آخر موقع معروف للحافلة — سيُحدَّث لاحقاً عبر Socket.io
  lastLocation: {
    lat:       { type: Number, default: null },
    lng:       { type: Number, default: null },
    updatedAt: { type: Date, default: null }
  },

  startedAt:   { type: Date, default: Date.now },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

// Index for fast daily-status queries per bus
tripSchema.index({ bus: 1, startedAt: -1 });

module.exports = mongoose.model('Trip', tripSchema);
