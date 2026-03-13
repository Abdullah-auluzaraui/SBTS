const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { createSchool } = require('../controllers/superAdminController');

const router = express.Router();

// All super admin routes require auth + superadmin role
router.use(authMiddleware);
router.use(roleMiddleware(['superadmin']));

// POST /api/super/schools — Stub for Sprint 2
router.post('/schools', createSchool);

module.exports = router;
