const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');
const { getDriverDashboardData, markManualAttendance } = require('../controllers/driverController');

const router = express.Router();

// All driver routes require auth + driver role + tenant scoping
router.use(authMiddleware, roleMiddleware(['driver']), tenantMiddleware);

// GET /api/driver/me - Fetch dashboard data
router.get('/me', getDriverDashboardData);

// POST /api/driver/attendance/manual - Mark student attendance manually
router.post('/attendance/manual', markManualAttendance);

module.exports = router;
