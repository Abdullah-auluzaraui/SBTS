const Student = require('../models/Student');

// POST /api/parents/link-request
exports.requestLinking = async (req, res) => {
  try {
    const { studentName, nationalId, dob } = req.body;

    // Use the phone already on the parent's account; only require it from the body if not set yet
    const phone = req.user.phone || req.body.phone;

    const missingPhone = !phone;
    if (!studentName || !nationalId || !dob || missingPhone) {
      return res.status(400).json({
        success: false,
        message: missingPhone
          ? 'جميع الحقول مطلوبة (الاسم، الهوية، تاريخ الميلاد، رقم الجوال)'
          : 'جميع الحقول مطلوبة (الاسم، الهوية، تاريخ الميلاد)'
      });
    }

    // 1. Search by dob and normalized name
    const { normalizeArabicName } = require('../utils/textUtils');
    const { decrypt } = require('../utils/crypto');
    const normalized = normalizeArabicName(studentName);
    
    // Scope search to the parent's own school to prevent cross-tenant student discovery.
    // If the parent has no school linked yet, the empty result is a safe fallback.
    const schoolFilter = req.user.school ? { school: req.user.school } : {};
    const students = await Student.find({ normalizedName: normalized, ...schoolFilter });

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

    student.parentId = req.user._id;
    await student.save();

    // Update parent's phone if missing
    const User = require('../models/User');
    const parent = await User.findById(req.user._id);
    if (!parent.phone) {
      parent.phone = phone;
      await parent.save();
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

// GET /api/parents/students
// Get all students linked to the logged-in parent
exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find({ parentId: req.user._id })
      .populate('school', 'name contact.phone')
      .populate({
        path: 'assignedBus',
        select: 'busId capacity',
        populate: {
          path: 'driver',
          select: 'name phone'
        }
      });
    res.json({ success: true, students });
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

