const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  // Purpose-based OTP: 'link-student' requires studentId; others do not
  purpose: {
    type: String,
    enum: ['link-student', 'forgot-password', 'change-phone'],
    default: 'link-student'
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: false,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // 5-minute TTL
  }
});

otpSchema.pre('save', async function (next) {
  if (!this.isModified('otp')) return next();
  const salt = await bcrypt.genSalt(10);
  this.otp = await bcrypt.hash(this.otp, salt);
});

otpSchema.methods.matchOTP = async function (enteredOTP) {
  return await bcrypt.compare(enteredOTP, this.otp);
};

module.exports = mongoose.model('OTP', otpSchema);
