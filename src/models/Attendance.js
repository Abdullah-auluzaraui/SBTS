const mongoose = require('mongoose');

// BE-S2-4: Attendance Model — Section 7.6 of project-plan-EN.md
const attendanceSchema = new mongoose.Schema({
  school:     { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  student:    { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  bus:        { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  driver:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  trip:       { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', default: null },
  event:      { type: String, enum: ['boarding', 'exit', 'absent', 'arrived_home', 'no_board', 'no_receiver'], required: true },
  // Direction of the trip this event belongs to. Optional so legacy rows
  // and any non-driver writers (e.g. future NFC ingestion) keep working;
  // the driver manual endpoint validates it at the controller level.
  tripType:   { type: String, enum: ['to_school', 'to_home'], default: null },
  timestamp:  { type: Date, default: Date.now },
  recordedBy: { type: String, enum: ['NFC', 'manual'], default: 'NFC' }
}, { timestamps: true });

// ─── Compound Index: school + timestamp ────────────────────────────────
// Critical for performance: attendance table will grow to thousands of records fast.
// Queries always filter by school (tenant isolation) + date range, so this compound
// index ensures those queries use an index scan instead of a full collection scan.
attendanceSchema.index({ school: 1, timestamp: -1 });

// Secondary compound index for the common "filter by bus within a school" query
attendanceSchema.index({ school: 1, bus: 1, timestamp: -1 });

// Compound index for "today's events for this bus + direction" hydration
// query used by the driver dashboard.
attendanceSchema.index({ school: 1, bus: 1, tripType: 1, timestamp: -1 });

// Secondary compound index for "filter by student within a school" query
attendanceSchema.index({ school: 1, student: 1, timestamp: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
