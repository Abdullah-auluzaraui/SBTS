import express from 'express';
import authMiddleware from '../middleware/authMiddleware';
import roleMiddleware from '../middleware/roleMiddleware';
import tenantMiddleware from '../middleware/tenantMiddleware';
import { list, generateReport } from '../controllers/attendanceController';

const router = express.Router();

// Attendance routes: schooladmin can view, scoped by tenant
router.use(authMiddleware, roleMiddleware(['schooladmin']), tenantMiddleware);

router.get('/report', generateReport);
router.get('/', list);

export default router;
