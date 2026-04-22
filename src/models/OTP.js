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
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student', 
    required: true 
  },
  // Automatically delete document after 5 minutes (300 seconds)
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: 300 
  }
});

// Hash the OTP before saving it to the database for security
otpSchema.pre('save', async function(next) {
  if (!this.isModified('otp')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.otp = await bcrypt.hash(this.otp, salt);
});

// Method to verify OTP
otpSchema.methods.matchOTP = async function(enteredOTP) {
  return await bcrypt.compare(enteredOTP, this.otp);
};

module.exports = mongoose.model('OTP', otpSchema);
