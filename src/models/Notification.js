const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  type: { 
    type: String, 
    enum: ['status_update', 'urgent_alert', 'admin_notice'], 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false, index: true },
  payload: {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', default: null },
    attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance', default: null },
    event: { type: String, default: null },
    tripType: { type: String, default: null },
  }
}, { timestamps: true });

// Fast queries: all unread for a parent, newest first
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// TTL Index: Auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('Notification', notificationSchema);
