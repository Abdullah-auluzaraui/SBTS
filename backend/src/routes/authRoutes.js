const express = require('express');
const {
  registerRequest,
  registerVerify,
  login,
  verifyInvitation,
  acceptInvitation,
  forgotPassword,
  verifyOtp,
  resetPassword
} = require('../controllers/authController');

const router = express.Router();

// OTP-based registration (parent)
router.post('/register-request', registerRequest);
router.post('/register-verify', registerVerify);
router.post('/login', login);

// Invitation onboarding (public — no auth required)
router.get('/verify-invitation', verifyInvitation);
router.post('/accept-invitation', acceptInvitation);

// Forgot password (3-step OTP flow)
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

module.exports = router;