const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { getMe, updateProfile, changePassword, requestPhoneChange, verifyPhoneChange } = require('../controllers/profileController');

const router = express.Router();

// All profile routes require authentication — open to all roles
router.use(authMiddleware);

router.get('/me', getMe);
router.put('/me', updateProfile);
router.put('/password', changePassword);
router.post('/phone/request', requestPhoneChange);
router.put('/phone/verify', verifyPhoneChange);

module.exports = router;
