const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { linkChild, updateLocation, getStudents } = require('../controllers/parentController');

const router = express.Router();

// GET /api/parents/students — Get all linked children
router.get('/students', authMiddleware, roleMiddleware(['parent']), getStudents);

// POST /api/parents/students — Link additional child (BE-S1-4b)
router.post('/students', authMiddleware, roleMiddleware(['parent']), linkChild);

// PUT /api/parents/students/:id/location — Update student home location (Maps Feature)
router.put('/students/:id/location', authMiddleware, roleMiddleware(['parent']), updateLocation);

module.exports = router;
