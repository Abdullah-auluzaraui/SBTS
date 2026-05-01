const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All notification routes are protected and restricted to parents
router.use(authMiddleware, roleMiddleware(['parent']));

router.get('/', notificationController.getNotifications);
// Note: /read-all must come before /:id/read to avoid route conflict
router.put('/read-all', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);

module.exports = router;
