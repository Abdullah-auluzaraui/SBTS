import express from 'express';
import authMiddleware from '../middleware/authMiddleware';
import roleMiddleware from '../middleware/roleMiddleware';
import tenantMiddleware from '../middleware/tenantMiddleware';
import {
  create,
  list,
  update,
  remove
} from '../controllers/routeController';

const router = express.Router();

// All route routes require auth + schooladmin + tenant scoping
router.use(authMiddleware, roleMiddleware(['schooladmin']), tenantMiddleware);

router.post('/', create);
router.get('/', list);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
