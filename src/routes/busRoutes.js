const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');
const { create, list, update, remove, toggleStatus, listDrivers, assignStudents, autoAssign } = require('../controllers/busController');

const router = express.Router();

// All bus routes require auth + schooladmin + tenant scoping
router.use(authMiddleware, roleMiddleware(['schooladmin']), tenantMiddleware);

router.post('/', create);
router.post('/auto-assign', autoAssign);
router.get('/', list);
router.get('/drivers', listDrivers);
router.put('/:id', update);
router.put('/:id/assign-students', assignStudents);
router.patch('/:id/status', toggleStatus);
router.delete('/:id', remove);

module.exports = router;
