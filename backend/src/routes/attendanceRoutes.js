const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');
const { list, generateReport } = require('../controllers/attendanceController');

const router = express.Router();

// Attendance routes: schooladmin can view, scoped by tenant
router.use(authMiddleware, roleMiddleware(['schooladmin']), tenantMiddleware);

router.get('/report', generateReport); // ⚠️ must be before GET /
router.get('/', list);

module.exports = router;
