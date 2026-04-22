const express = require('express');
const { registerRequest, registerVerify, login, verifyInvitation, acceptInvitation } = require('../controllers/authController');

const router = express.Router();

// New OTP-based Registration
router.post('/register-request', registerRequest);
router.post('/register-verify', registerVerify);
router.post('/login', login);

// Invitation onboarding (public — no auth required)
router.get('/verify-invitation', verifyInvitation);
router.post('/accept-invitation', acceptInvitation);

module.exports = router;