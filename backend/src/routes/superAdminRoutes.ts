import express from 'express';
import authMiddleware from '../middleware/authMiddleware';
import roleMiddleware from '../middleware/roleMiddleware';
import {
  createInvitation,
  resendInvitation,
  listSchools,
  toggleSchoolStatus
} from '../controllers/superAdminController';

const router = express.Router();

// All super admin routes require auth + superadmin role
router.use(authMiddleware);
router.use(roleMiddleware(['superadmin']));

router.get('/schools', listSchools);
router.post('/invitations', createInvitation);
router.post('/invitations/:schoolId/resend', resendInvitation);
router.patch('/schools/:id/status', toggleSchoolStatus);

export default router;
