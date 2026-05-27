import express from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/authMiddleware';
import roleMiddleware from '../middleware/roleMiddleware';
import tenantMiddleware from '../middleware/tenantMiddleware';
import {
  create,
  list,
  bulkUpload,
  getUnassigned,
  toggleStatus,
  update,
  unlinkParent,
  relinkParent
} from '../controllers/studentController';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// All student routes require auth + schooladmin + tenant scoping
router.use(authMiddleware, roleMiddleware(['schooladmin']), tenantMiddleware);

router.post('/', create);
router.get('/', list);
router.get('/unassigned', getUnassigned);
router.post('/bulk', upload.single('file'), bulkUpload);
router.patch('/:id', update);
router.patch('/:id/status', toggleStatus);
router.post('/:id/unlink-parent', unlinkParent);
router.post('/:id/relink-parent', relinkParent);

export default router;
