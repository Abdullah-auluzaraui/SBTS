import express from 'express';
import authMiddleware from '../middleware/authMiddleware';
import roleMiddleware from '../middleware/roleMiddleware';
import tenantMiddleware from '../middleware/tenantMiddleware';
import {
  create,
  list,
  update,
  remove,
  toggleStatus,
  listDrivers,
  assignStudents,
  autoAssign,
  getActiveLocation
} from '../controllers/busController';

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
router.get('/:id/active-location', getActiveLocation);

export default router;
