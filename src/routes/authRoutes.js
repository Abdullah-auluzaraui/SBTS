const express = require('express');
const { register, login, verifyInvitation, acceptInvitation } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

// Invitation onboarding (public — no auth required)
router.get('/verify-invitation', verifyInvitation);
router.post('/accept-invitation', acceptInvitation);

module.exports = router;