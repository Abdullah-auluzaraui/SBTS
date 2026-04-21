const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');
const { getDriverDashboardData, markManualAttendance, startTrip, endTrip } = require('../controllers/driverController');

const router = express.Router();

// All driver routes require auth + driver role + tenant scoping
router.use(authMiddleware, roleMiddleware(['driver']), tenantMiddleware);

// GET /api/driver/me - Fetch dashboard data
router.get('/me', getDriverDashboardData);

// POST /api/driver/attendance/manual - Mark student attendance manually
router.post('/attendance/manual', markManualAttendance);

// POST /api/driver/trip/start - Save active trip route to DB
router.post('/trip/start', startTrip);

// POST /api/driver/trip/end - Mark active trip as completed
router.post('/trip/end', endTrip);

module.exports = router;

