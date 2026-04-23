const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');
const School = require('../models/School');

const router = express.Router();

router.use(authMiddleware, roleMiddleware(['schooladmin']), tenantMiddleware);

router.get('/dashboard', (req, res) => {
  res.json({ success: true, message: `Welcome Admin ${req.user.name}` });
});

// GET /api/admin/school — Get current school info (including location)
router.get('/school', async (req, res) => {
  try {
    const school = await School.findById(req.schoolId).select('name schoolId contact location emergencyContacts');
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });
    res.json({ success: true, school });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/school/location — Set school location on the map
router.put('/school/location', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }
    const school = await School.findByIdAndUpdate(
      req.schoolId,
      { location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] } },
      { new: true }
    );
    res.json({ success: true, message: 'School location updated', location: school.location });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/school/emergency-contacts — Update emergency contacts
router.put('/school/emergency-contacts', async (req, res) => {
  try {
    const { contacts } = req.body;
    if (!Array.isArray(contacts)) {
      return res.status(400).json({ success: false, message: 'contacts must be an array' });
    }
    const school = await School.findByIdAndUpdate(
      req.schoolId,
      { emergencyContacts: contacts },
      { new: true }
    );
    res.json({ success: true, message: 'Emergency contacts updated', emergencyContacts: school.emergencyContacts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;