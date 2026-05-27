import express from 'express';
import authMiddleware from '../middleware/authMiddleware';
import roleMiddleware from '../middleware/roleMiddleware';
import tenantMiddleware from '../middleware/tenantMiddleware';
import { 
  getDashboard, 
  getSchool, 
  updateSchoolLocation, 
  updateSchoolEmergencyContacts 
} from '../controllers/adminController';

const router = express.Router();

// All school admin routes require auth + schooladmin role + tenant scoping
router.use(authMiddleware, roleMiddleware(['schooladmin']), tenantMiddleware);

// GET /api/admin/dashboard — Welcome message
router.get('/dashboard', getDashboard);

// GET /api/admin/school — Get current school info
router.get('/school', getSchool);

// PUT /api/admin/school/location — Set school location on map
router.put('/school/location', updateSchoolLocation);

// PUT /api/admin/school/emergency-contacts — Update emergency contacts
router.put('/school/emergency-contacts', updateSchoolEmergencyContacts);

export default router;
