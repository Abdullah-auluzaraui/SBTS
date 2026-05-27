import express from 'express';
import authMiddleware from '../middleware/authMiddleware';
import roleMiddleware from '../middleware/roleMiddleware';
import { 
  requestLinking, 
  verifyLinking, 
  updateLocation, 
  getStudents, 
  getBusLive, 
  relink 
} from '../controllers/parentController';

const router = express.Router();

// GET /api/parents/students — Get all linked children
router.get('/students', authMiddleware, roleMiddleware(['parent']), getStudents);

// POST /api/parents/link-request — Request to link a child (OTP sent)
router.post('/link-request', authMiddleware, roleMiddleware(['parent']), requestLinking);

// POST /api/parents/link-verify — Verify OTP and link the child
router.post('/link-verify', authMiddleware, roleMiddleware(['parent']), verifyLinking);

// POST /api/parents/relink — Restore a previously-linked (ghost) student
router.post('/relink', authMiddleware, roleMiddleware(['parent']), relink);

// PUT /api/parents/students/:id/location — Update student home location (Maps Feature)
router.put('/students/:id/location', authMiddleware, roleMiddleware(['parent']), updateLocation);

// GET /api/parents/bus/:busId/live — Get live trip data (filtered for this parent's children only)
router.get('/bus/:busId/live', authMiddleware, roleMiddleware(['parent']), getBusLive);

export default router;
