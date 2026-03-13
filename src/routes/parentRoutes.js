const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { linkChild } = require('../controllers/parentController');

const router = express.Router();

// POST /api/parents/students — Link additional child (BE-S1-4b)
router.post('/students', authMiddleware, roleMiddleware(['parent']), linkChild);

module.exports = router;
