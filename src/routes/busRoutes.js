const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');
const { create, list, update, remove } = require('../controllers/busController');

const router = express.Router();

// All bus routes require auth + schooladmin + tenant scoping
router.use(authMiddleware, roleMiddleware(['schooladmin']), tenantMiddleware);

router.post('/', create);
router.get('/', list);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
