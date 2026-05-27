import express from 'express';
import authMiddleware from '../middleware/authMiddleware';
import roleMiddleware from '../middleware/roleMiddleware';
import tenantMiddleware from '../middleware/tenantMiddleware';
import { 
  createDriver, 
  listDrivers, 
  updateDriverName, 
  toggleDriverStatus 
} from '../controllers/userController';

const router = express.Router();

// All user-management routes require auth + schooladmin role + tenant scoping
router.use(authMiddleware, roleMiddleware(['schooladmin']), tenantMiddleware);

// POST /api/users/driver — Create a driver account for this school
router.post('/driver', createDriver);

// GET /api/users/drivers — List all drivers in this school
router.get('/drivers', listDrivers);

// PATCH /api/users/drivers/:id — Update driver name
router.patch('/drivers/:id', updateDriverName);

// PATCH /api/users/drivers/:id/status — Toggle driver active/suspended
router.patch('/drivers/:id/status', toggleDriverStatus);

export default router;
