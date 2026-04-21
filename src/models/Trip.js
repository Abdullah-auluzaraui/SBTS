const mongoose = require('mongoose');

// Trip Model — حفظ الرحلة النشطة لكل حافلة
// unique: true على الـ bus يضمن رحلة واحدة نشطة لكل حافلة في أي وقت
const tripSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  bus:    { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true, unique: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },

  // المسار المحسوب من OSRM: مصفوفة من { lat, lng }
  routePath: [{ lat: Number, lng: Number }],

  // آخر موقع معروف للحافلة — سيُحدَّث لاحقاً عبر Socket.io
  lastLocation: {
    lat:       { type: Number, default: null },
    lng:       { type: Number, default: null },
    updatedAt: { type: Date, default: null }
  },

  startedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Trip', tripSchema);
