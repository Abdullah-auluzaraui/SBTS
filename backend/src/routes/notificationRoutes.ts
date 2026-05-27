import express from 'express';
import authMiddleware from '../middleware/authMiddleware';
import roleMiddleware from '../middleware/roleMiddleware';
import { getNotifications, markAllAsRead, markAsRead } from '../controllers/notificationController';

const router = express.Router();

// All notification routes are protected and restricted to parents
router.use(authMiddleware, roleMiddleware(['parent']));

router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

export default router;
