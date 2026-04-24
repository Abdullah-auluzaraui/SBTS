const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');
const { create, list, bulkUpload, getUnassigned, toggleStatus, update } = require('../controllers/studentController');

const router = express.Router();

// Multer memory storage — no disk writes (avoids ephemeral storage issues)
const upload = multer({ storage: multer.memoryStorage() });

// All student routes require auth + schooladmin + tenant scoping
router.use(authMiddleware, roleMiddleware(['schooladmin']), tenantMiddleware);

router.post('/', create);
router.get('/', list);
router.get('/unassigned', getUnassigned);
router.post('/bulk', upload.single('file'), bulkUpload);
router.patch('/:id', update);
router.patch('/:id/status', toggleStatus);

module.exports = router;
