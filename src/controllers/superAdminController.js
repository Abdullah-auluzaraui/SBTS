const crypto = require('crypto');
const School = require('../models/School');
const Invitation = require('../models/Invitation');
const User = require('../models/User');
const Student = require('../models/Student');
const Bus = require('../models/Bus');

// ─── Helper: Generate unique schoolId (SCH-XXXX) ──────────────────────
const generateSchoolId = async () => {
  let id;
  let exists = true;
  while (exists) {
    const num = Math.floor(1000 + Math.random() * 9000);
    id = `SCH-${num}`;
    exists = await School.findOne({ schoolId: id });
  }
  return id;
};

// ─── Helper: Generate secure invitation token ──────────────────────────
const generateToken = () => crypto.randomBytes(32).toString('hex'); // 64-char hex

// ─── Create Invitation (replaces createSchool) ─────────────────────────
// POST /api/super/invitations
exports.createInvitation = async (req, res) => {
  try {
    const { schoolName, contactEmail, contactPhone } = req.body;

    if (!schoolName || !contactEmail) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'schoolName and contactEmail are required'
      });
    }

    // Generate unique schoolId
    const schoolId = await generateSchoolId();

    // Create school (without admin user)
    const school = await School.create({
      name: schoolName,
      schoolId,
      contact: { email: contactEmail, phone: contactPhone || null },
      isActive: true
    });

    // Generate invitation token (valid for 24 hours)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await Invitation.create({
      school: school._id,
      email: contactEmail,
      token,
      expiresAt
    });

    // Build invitation link (frontend URL)
    const invitationLink = `/onboarding?token=${token}`;

    res.status(201).json({
      success: true,
      school: { id: school._id, schoolId: school.schoolId, name: school.name },
      invitation: { email: contactEmail, link: invitationLink, expiresAt }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Resend Invitation (invalidates old token, creates new one) ────────
// POST /api/super/invitations/:schoolId/resend
exports.resendInvitation = async (req, res) => {
  try {
    const school = await School.findById(req.params.schoolId);
    if (!school) {
      return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'School not found' });
    }

    // Invalidate all previous invitations for this school
    await Invitation.updateMany(
      { school: school._id, isUsed: false },
      { isUsed: true }
    );

    // Get the last invitation email, or use school contact email
    const lastInvitation = await Invitation.findOne({ school: school._id }).sort({ createdAt: -1 });
    const email = req.body.email || lastInvitation?.email || school.contact?.email;

    if (!email) {
      return res.status(400).json({ success: false, errorCode: 'NO_EMAIL', message: 'No email found for this school' });
    }

    // Generate new token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await Invitation.create({
      school: school._id,
      email,
      token,
      expiresAt
    });

    const invitationLink = `/onboarding?token=${token}`;

    res.json({
      success: true,
      message: 'Invitation resent successfully',
      invitation: { email, link: invitationLink, expiresAt }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── List All Schools (with invitation status + stats) ─────────────────
// GET /api/super/schools
exports.listSchools = async (req, res) => {
  try {
    const schools = await School.find().sort({ createdAt: -1 }).lean();

    const enriched = await Promise.all(
      schools.map(async (school) => {
        const [studentCount, busCount, adminUser, latestInvitation] = await Promise.all([
          Student.countDocuments({ school: school._id }),
          Bus.countDocuments({ school: school._id }),
          User.findOne({ school: school._id, role: 'schooladmin' }).select('username name').lean(),
          Invitation.findOne({ school: school._id }).sort({ createdAt: -1 }).lean()
        ]);

        // Determine invitation status
        let invitationStatus = 'none';
        if (adminUser) {
          invitationStatus = 'accepted'; // Admin already registered
        } else if (latestInvitation && !latestInvitation.isUsed && latestInvitation.expiresAt > new Date()) {
          invitationStatus = 'pending';
        } else if (latestInvitation) {
          invitationStatus = 'expired';
        }

        return {
          ...school,
          studentCount,
          busCount,
          admin: adminUser || null,
          invitationStatus,
          invitationEmail: latestInvitation?.email || null
        };
      })
    );

    res.json({ success: true, schools: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Toggle School Status (kept from previous version) ─────────────────
// PATCH /api/super/schools/:id/status
exports.toggleSchoolStatus = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) {
      return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'School not found' });
    }

    school.isActive = !school.isActive;
    await school.save();

    await User.updateMany(
      { school: school._id, role: 'schooladmin' },
      { isActive: school.isActive }
    );

    res.json({
      success: true,
      message: `School "${school.name}" is now ${school.isActive ? 'active' : 'inactive'}`,
      isActive: school.isActive
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
