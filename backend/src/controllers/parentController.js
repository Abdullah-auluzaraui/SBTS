const Student = require('../models/Student');

// POST /api/parents/link-request
exports.requestLinking = async (req, res) => {
  try {
    const { nationalId, dob } = req.body;

    // Use the phone already on the parent's account; only require it from the body if not set yet
    const phone = req.user.phone || req.body.phone;

    const missingPhone = !phone;
    if (!nationalId || !dob || missingPhone) {
      return res.status(400).json({
        success: false,
        message: missingPhone
          ? 'جميع الحقول مطلوبة (الهوية، تاريخ الميلاد، رقم الجوال)'
          : 'جميع الحقول مطلوبة (الهوية، تاريخ الميلاد)'
      });
    }

    const { decrypt } = require('../utils/crypto');
    
    // Scope search to the parent's own school to prevent cross-tenant student discovery.
    // If the parent has no school linked yet, the empty result is a safe fallback.
    const schoolFilter = req.user.school ? { school: req.user.school } : {};
    const students = await Student.find(schoolFilter);

    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على طالب بهذه البيانات' });
    }

    // 2. Filter by exact DOB (ignoring time) and decrypted National ID
    const inputDate = new Date(dob).toISOString().split('T')[0];
    const student = students.find(s => {
      const dbDate = new Date(s.dob).toISOString().split('T')[0];
      const dbNationalId = decrypt(s.nationalId);
      return dbDate === inputDate && dbNationalId === nationalId.trim();
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'بيانات الهوية أو تاريخ الميلاد غير متطابقة' });
    }

    if (student.parentId) {
      return res.status(400).json({ success: false, message: 'هذا الطالب مرتبط بحساب ولي أمر بالفعل' });
    }

    // 3. Rate Limiting Check (max 3 unverified OTPs for this phone in last 15 mins)
    const OTP = require('../models/OTP');
    const recentOtps = await OTP.countDocuments({ phone, createdAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) } });
    if (recentOtps >= 3) {
      return res.status(429).json({ success: false, message: 'لقد تجاوزت الحد المسموح من المحاولات. يرجى المحاولة لاحقاً.' });
    }

    // 4. Generate OTP (6 digits)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 5. Save OTP
    await OTP.create({
      phone,
      otp: otpCode,
      studentId: student._id
    });

    // 6. Mock SMS (Console Log)
    console.log(`\n========================================`);
    console.log(`📱 MOCK SMS: To ${phone}`);
    console.log(`🔑 OTP Code for linking ${student.name}: ${otpCode}`);
    console.log(`⏳ Expires in 5 minutes.`);
    console.log(`========================================\n`);

    res.json({ success: true, message: 'تم إرسال رمز التحقق إلى جوالك', studentId: student._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/parents/link-verify
exports.verifyLinking = async (req, res) => {
  try {
    const { otp, studentId } = req.body;

    // Use the phone already on the parent's account; only require it from the body if not set yet
    const phone = req.user.phone || req.body.phone;

    if (!phone || !otp || !studentId) {
      return res.status(400).json({ success: false, message: 'البيانات غير مكتملة' });
    }

    const OTP = require('../models/OTP');
    
    // Find all OTPs for this phone and student
    const otps = await OTP.find({ phone, studentId });
    if (otps.length === 0) {
      return res.status(400).json({ success: false, message: 'رمز التحقق غير صالح أو منتهي الصلاحية' });
    }

    // Check which one matches
    let validOtpDoc = null;
    for (const doc of otps) {
      const isMatch = await doc.matchOTP(otp);
      if (isMatch) {
        validOtpDoc = doc;
        break;
      }
    }

    if (!validOtpDoc) {
      return res.status(400).json({ success: false, message: 'رمز التحقق غير صحيح' });
    }

    // Link the student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'الطالب غير موجود' });
    }

    if (student.parentId) {
      return res.status(400).json({ success: false, message: 'الطالب مرتبط بالفعل' });
    }

    // Ensure the student belongs to the same school as the parent (if parent has school assigned)
    if (req.user.school && String(student.school) !== String(req.user.school)) {
      return res.status(403).json({ success: false, message: 'هذا الطالب ينتمي لمدرسة أخرى.' });
    }

    // Capture the previous ghost owner (if any) so we can refresh their
    // deletion schedule after the link — a transfer should not accidentally
    // keep the former parent marked as "0 active students" if this was their
    // last ghost being cleared.
    const priorGhostOwner = student.previousParentId;

    student.parentId = req.user._id;
    // Any existing ghost is cleared whether we're re-linking the same parent
    // or transferring to a different one. Re-link case: the ghost restores
    // into a live link. Transfer case: the old parent hard-loses the ghost.
    student.previousParentId = null;
    student.unlinkedAt = null;
    student.unlinkedBy = null;
    await student.save();

    // Update parent's phone if missing
    const User = require('../models/User');
    const parent = await User.findById(req.user._id);
    if (!parent.phone) {
      parent.phone = phone;
      await parent.save();
    }

    // Cancel any pending deletion for the newly-linking parent — they now
    // have at least one active linked student again.
    const { refreshParentDeletionSchedule } = require('./studentController');
    await refreshParentDeletionSchedule(req.user._id);
    // If this was a transfer from a different ghost owner, re-evaluate their
    // state too (e.g. they might still have other ghosts/active students).
    if (priorGhostOwner && String(priorGhostOwner) !== String(req.user._id)) {
      await refreshParentDeletionSchedule(priorGhostOwner);
    }

    // Delete all OTPs for this phone to prevent reuse
    await OTP.deleteMany({ phone });

    res.json({
      success: true,
      message: 'تم ربط الطالب بنجاح',
      phone,
      student: { id: student._id, name: student.name, studentId: student.studentId }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/parents/students/:id/location
// Update student location (Interactive Map feature)
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const studentId = req.params.id;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
    }

    const student = await Student.findOne({ _id: studentId, parentId: req.user._id });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found or not linked to your account' });
    }

    student.location = {
      type: 'Point',
      coordinates: [lng, lat]
    };
    
    await student.save();

    res.json({ success: true, message: 'Location updated successfully', location: student.location });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/parents/relink
// Restore a previously-linked (now "ghost") student by re-verifying the
// National ID. This is the "standard verification" path the product requires
// for ghost restoration — single-tap re-link is explicitly disallowed, but a
// parent that still knows the child's ID can restore the link without going
// through another OTP cycle (they were already OTP-verified originally).
exports.relink = async (req, res) => {
  try {
    const { studentId, nationalId } = req.body || {};
    if (!studentId || !nationalId || !String(nationalId).trim()) {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_FIELDS',
        message: 'بيانات غير مكتملة'
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'الطالب غير موجود' });
    }

    // Must be this parent's ghost specifically — we never expose other parents'
    // unlinked records, and we refuse to operate on a student that is already
    // actively linked (to any parent, including this one).
    const isMyGhost =
      student.previousParentId &&
      String(student.previousParentId) === String(req.user._id) &&
      student.unlinkedAt &&
      !student.parentId;
    if (!isMyGhost) {
      return res.status(403).json({
        success: false,
        errorCode: 'NOT_A_GHOST',
        message: 'هذا الطالب غير متاح لإعادة الربط'
      });
    }

    // Verify the decrypted National ID matches.
    const { decrypt } = require('../utils/crypto');
    const storedId = decrypt(student.nationalId);
    if (storedId !== String(nationalId).trim()) {
      return res.status(400).json({
        success: false,
        errorCode: 'WRONG_NATIONAL_ID',
        message: 'الهوية الوطنية غير مطابقة'
      });
    }

    // Restore the link + clear ghost metadata.
    student.parentId = req.user._id;
    student.previousParentId = null;
    student.unlinkedAt = null;
    student.unlinkedBy = null;
    await student.save();

    // Cancel any pending deletion now that the parent has an active link again.
    const { refreshParentDeletionSchedule } = require('./studentController');
    await refreshParentDeletionSchedule(req.user._id);

    res.json({
      success: true,
      message: 'تم إعادة الربط بنجاح',
      student: { id: student._id, name: student.name, studentId: student.studentId }
    });
  } catch (err) {
    console.error('Relink Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/parents/students
// Returns live-linked students AND soft-unlinked "ghost" students that used
// to belong to this parent, each tagged with a `linkStatus`. Also returns the
// parent's pending deletion schedule (if any) so the UI can render a
// countdown banner when no active links remain.
exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find({
      $or: [
        { parentId: req.user._id },
        { previousParentId: req.user._id, unlinkedAt: { $ne: null } }
      ]
    })
      .populate('school', 'name contact.phone emergencyContacts')
      .populate({
        path: 'assignedBus',
        select: 'busId capacity',
        populate: {
          path: 'driver',
          select: 'name phone'
        }
      })
      .sort({ createdAt: -1 });

    const Attendance = require('../models/Attendance');
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const studentIds = students.map(s => s._id);
    const todayEvents = await Attendance.find({
      student: { $in: studentIds },
      timestamp: { $gte: startOfDay }
    }).sort({ timestamp: -1 }).lean();

    const latestEventByStudent = {};
    for (const e of todayEvents) {
      if (!latestEventByStudent[e.student]) {
        latestEventByStudent[e.student] = e.event;
      }
    }

    // Tag each record so the frontend can visually separate live vs ghost.
    const tagged = students.map(s => {
      const isLinked = String(s.parentId || '') === String(req.user._id);
      const obj = s.toObject();
      obj.linkStatus = isLinked ? 'LINKED' : 'UNLINKED';
      obj.latestEvent = latestEventByStudent[s._id] || null;
      
      if (!isLinked) {
        // Hide driver/bus details from ghosts — the parent should not retain
        // operational access once unlinked.
        obj.assignedBus = null;
      }
      return obj;
    });

    // Pull the parent's deletion schedule.
    const User = require('../models/User');
    const parent = await User.findById(req.user._id).select('accountDeletionScheduledAt');

    res.json({
      success: true,
      students: tagged,
      account: {
        deletionScheduledAt: parent?.accountDeletionScheduledAt || null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/parents/bus/:busId/live
// جلب بيانات الرحلة النشطة لولي الأمر — مع تصفية الخصوصية (أبناؤه فقط)
exports.getBusLive = async (req, res) => {
  try {
    const { busId } = req.params;
    const parentId = req.user._id;

    const Bus = require('../models/Bus');
    const Trip = require('../models/Trip');

    // 1. تحقق أن ولي الأمر لديه طالب واحد على الأقل في هذه الحافلة (تأمين)
    const myStudentInBus = await Student.findOne({ assignedBus: busId, parentId });
    if (!myStudentInBus) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك إذن لتتبع هذه الحافلة'
      });
    }

    // 2. جلب بيانات الحافلة مع المدرسة — scoped to parent's school
    const bus = await Bus.findOne({ _id: busId, school: req.user.school }).populate('school', 'name location');
    if (!bus) {
      return res.status(404).json({ success: false, message: 'الحافلة غير موجودة' });
    }

    // 3. جلب الرحلة النشطة — scoped to same school
    const trip = await Trip.findOne({ bus: busId, status: 'active', school: req.user.school });

    // 4. جلب أبناء ولي الأمر في هذه الحافلة فقط (الخصوصية: نستبعد باقي الطلاب)
    const myStudents = await Student.find({ assignedBus: busId, parentId })
      .select('name location');

    res.json({
      success: true,
      tripActive:   !!trip,
      routePath:    trip ? trip.routePath : [],
      lastLocation: trip ? trip.lastLocation : null,
      school: bus.school ? {
        name:     bus.school.name,
        location: bus.school.location
      } : null,
      myStudents
    });
  } catch (err) {
    console.error('Get Bus Live Error:', err);
    res.status(500).json({ success: false, message: 'فشل جلب بيانات التتبع' });
  }
};

