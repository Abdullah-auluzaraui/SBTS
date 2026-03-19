const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  createInvitation,
  resendInvitation,
  listSchools,
  toggleSchoolStatus
} = require('../controllers/superAdminController');

const router = express.Router();

// All super admin routes require auth + superadmin role
router.use(authMiddleware);
router.use(roleMiddleware(['superadmin']));

// GET  /api/super/schools                              → List all schools with stats + invitation status
router.get('/schools', listSchools);

// POST /api/super/invitations                          → Create school + send invitation
router.post('/invitations', createInvitation);

// POST /api/super/invitations/:schoolId/resend         → Resend invitation (new token)
router.post('/invitations/:schoolId/resend', resendInvitation);

// PATCH /api/super/schools/:id/status                  → Toggle active/inactive
router.patch('/schools/:id/status', toggleSchoolStatus);

module.exports = router;
