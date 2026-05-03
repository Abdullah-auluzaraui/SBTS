const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');
const { getDriverDashboardData, markManualAttendance, undoManualAttendance, startTrip, endTrip, getTodayStatus, updateTripLocation } = require('../controllers/driverController');

const router = express.Router();

// All driver routes require auth + driver role + tenant scoping
router.use(authMiddleware, roleMiddleware(['driver']), tenantMiddleware);

// GET /api/driver/me - Fetch dashboard data
router.get('/me', getDriverDashboardData);

// POST /api/driver/attendance/manual - Mark student attendance manually
router.post('/attendance/manual', markManualAttendance);

// DELETE /api/driver/attendance/manual - Undo morning no_board status
router.delete('/attendance/manual', undoManualAttendance);

// GET /api/driver/trip/today-status - Returns today's trip states for lock/resume logic
router.get('/trip/today-status', getTodayStatus);

// POST /api/driver/trip/start - Save active trip route to DB
router.post('/trip/start', startTrip);

// POST /api/driver/trip/end - Mark active trip as completed
router.post('/trip/end', endTrip);

// PATCH /api/driver/trip/location - Update live bus position (called by TripSimulator)
router.patch('/trip/location', updateTripLocation);

module.exports = router;

