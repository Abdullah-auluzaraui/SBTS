const Student = require('../models/Student');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt, maskData } = require('../utils/crypto');
const { normalizeArabicName } = require('../utils/textUtils');

// Grace period (in days) applied to parent accounts that drop to zero
// active linked students. Centralized so changing the policy touches one spot.
const PARENT_DELETION_GRACE_DAYS = 30;

// Update a parent's deletion schedule based on how many active linked students
// they currently have. Idempotent — safe to call from multiple code paths.
const refreshParentDeletionSchedule = async (parentId) => {
  if (!parentId) return;
  const activeLinkedCount = await Student.countDocuments({
    parentId,
    isActive: { $ne: false }
  });

  const parent = await User.findById(parentId);
  if (!parent || parent.role !== 'parent') return;

  if (activeLinkedCount === 0) {
    // Only (re-)arm the timer if it isn't already armed — we don't want to push
    // the deletion date forward every time the count is re-checked at zero.
    if (!parent.accountDeletionScheduledAt) {
      const deletionDate = new Date(Date.now() + PARENT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
      parent.accountDeletionScheduledAt = deletionDate;
      await parent.save();
    }
  } else if (parent.accountDeletionScheduledAt) {
    // Any active linked student cancels a pending deletion.
    parent.accountDeletionScheduledAt = null;
    await parent.save();
  }
};

module.exports.PARENT_DELETION_GRACE_DAYS = PARENT_DELETION_GRACE_DAYS;
module.exports.refreshParentDeletionSchedule = refreshParentDeletionSchedule;

// ─── Helper: Generate Next Sequential Student ID (e.g. S260000001) ──
const generateNextStudentId = async (yearStr) => {
  const prefix = `S${yearStr}`;
  // Find the highest existing ID with this prefix
  const latestStudent = await Student.findOne({ studentId: { $regex: `^${prefix}` } })
    .sort({ studentId: -1 })
    .select('studentId');

  let counter = 1;
  if (latestStudent && latestStudent.studentId) {
    const numericPart = latestStudent.studentId.replace(prefix, '');
    counter = parseInt(numericPart, 10) + 1;
  }
  
  // Pad the counter to 7 digits (up to 10 million students per year)
  const paddedCounter = counter.toString().padStart(7, '0');
  return `${prefix}${paddedCounter}`;
};

// BE-S2-7: Create single student
// POST /api/students
exports.create = async (req, res) => {
  try {
    // Destructure only allowed fields — school/schoolId from body are intentionally excluded
    const { name, nationalId, dob, assignedBus, grade } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'اسم الطالب مطلوب' });
    }

    if (!nationalId || !dob) {
      return res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'الهوية الوطنية وتاريخ الميلاد مطلوبان' });
    }

    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length < 3) {
      return res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'يجب أن يكون الاسم ثلاثياً كحد أدنى (الاسم الأول واسم الأب واسم العائلة)' });
    }

    // Strip any school/schoolId injected from body — always use token-derived value
    const schoolIdToUse = req.schoolId;
    const existingName = await Student.findOne({ school: schoolIdToUse, name: name.trim() });
    if (existingName) {
      return res.status(400).json({ 
        success: false, 
        errorCode: 'DUPLICATE_NAME', 
        message: 'يوجد طالب مسجل مسبقاً بنفس الاسم تماماً في مدرستك. يرجى إضافة اسم الجد أو العائلة للتمييز بينهما.' 
      });
    }

    // Auto-generate the Student ID
    const yearStr = new Date().getFullYear().toString().slice(-2);
    const studentId = await generateNextStudentId(yearStr);

    const student = await Student.create({
      name: name.trim(),
      nationalId: encrypt(nationalId),
      dob: new Date(dob),
      normalizedName: normalizeArabicName(name),
      studentId,
      grade: grade || null,
      school: schoolIdToUse,
      assignedBus: assignedBus || null
    });

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      student: {
        id: student._id,
        name: student.name,
        studentId: student.studentId,
        nationalId: maskData(nationalId),
        grade: student.grade,
        parentLinked: !!student.parentId
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/students — List students (scoped, optional ?busId and ?all filters)
exports.list = async (req, res) => {
  try {
    const filter = { school: req.schoolId };
    if (req.query.busId) filter.assignedBus = req.query.busId;
    // Default: active only. ?all=true returns all including inactive
    if (req.query.all !== 'true') filter.isActive = { $ne: false };

    const students = await Student.find(filter)
      .populate('assignedBus', 'busId')
      .populate('parentId', 'name username')
      .sort({ createdAt: -1 });

    const result = students.map(s => ({
      _id: s._id,
      id: s._id,
      name: s.name,
      studentId: s.studentId,
      nationalId: s.nationalId ? maskData(decrypt(s.nationalId)) : null,
      parentLinked: !!s.parentId,
      parentName: s.parentId?.name || null,
      assignedBus: s.assignedBus?.busId || null,
      location: s.location || null,
      isActive: s.isActive !== false // treat undefined (old docs) as true
    }));

    res.json({ success: true, students: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/students/:id — Update student name and/or national ID
exports.update = async (req, res) => {
  try {
    const { name, nationalId } = req.body;
    const student = await Student.findOne({ _id: req.params.id, school: req.schoolId });
    if (!student) return res.status(404).json({ success: false, message: 'الطالب غير موجود' });

    if (name && name.trim() !== '') {
      const nameParts = name.trim().split(/\s+/);
      if (nameParts.length < 3) {
        return res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'يجب أن يكون الاسم ثلاثياً كحد أدنى (الاسم الأول واسم الأب واسم العائلة)' });
      }
      const duplicate = await Student.findOne({ school: req.schoolId, name: name.trim(), _id: { $ne: req.params.id } });
      if (duplicate) {
        return res.status(400).json({ success: false, errorCode: 'DUPLICATE_NAME', message: 'يوجد طالب مسجل مسبقاً بنفس الاسم. يرجى إضافة اسم الجد أو العائلة للتمييز.' });
      }
      student.name = name.trim();
      student.normalizedName = normalizeArabicName(name);
    }

    if (nationalId && nationalId.trim() !== '') {
      // Business rule: once a student is linked to a parent, the national ID
      // becomes immutable. The parent must be unlinked first before any
      // identity changes are allowed. This guard prevents bypassing the
      // disabled UI (e.g. via direct API calls or tampered requests).
      if (student.parentId) {
        return res.status(403).json({
          success: false,
          errorCode: 'NATIONAL_ID_LOCKED',
          message: 'لا يمكن تعديل الهوية الوطنية بعد ربط الطالب بولي الأمر. يُرجى فك الربط أولاً.'
        });
      }
      student.nationalId = encrypt(nationalId.trim());
    }

    await student.save();
    res.json({ success: true, message: `تم تحديث بيانات "${student.name}" بنجاح` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/students/:id/unlink-parent
// Admin-initiated soft unlink. Requires the admin's current password as an
// extra confirmation step. The student's parentId is cleared but the previous
// parent is remembered on `previousParentId` so the parent UI can keep showing
// a "Unlinked by Admin" ghost card. If the parent ends up with zero active
// linked students, a 30-day deletion grace period is scheduled.
exports.unlinkParent = async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        errorCode: 'PASSWORD_REQUIRED',
        message: 'كلمة المرور مطلوبة لتأكيد فك الربط'
      });
    }

    // 1. Verify admin password (fetch with +password since it's select:false)
    const admin = await User.findById(req.user._id).select('+password');
    if (!admin) {
      return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Unauthorized' });
    }
    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        errorCode: 'WRONG_PASSWORD',
        message: 'كلمة المرور غير صحيحة'
      });
    }

    // 2. Locate the student (scoped to this admin's school)
    const student = await Student.findOne({ _id: req.params.id, school: req.schoolId });
    if (!student) {
      return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'الطالب غير موجود' });
    }
    if (!student.parentId) {
      return res.status(400).json({
        success: false,
        errorCode: 'NOT_LINKED',
        message: 'هذا الطالب غير مرتبط بأي ولي أمر'
      });
    }

    // 3. Soft unlink
    const formerParentId = student.parentId;
    student.previousParentId = formerParentId;
    student.parentId = null;
    student.unlinkedAt = new Date();
    student.unlinkedBy = admin._id;
    await student.save();

    // 4. Re-evaluate the former parent's deletion schedule.
    await refreshParentDeletionSchedule(formerParentId);

    res.json({
      success: true,
      message: `تم فك الربط مع ولي الأمر بنجاح`,
      student: {
        id: student._id,
        name: student.name,
        unlinkedAt: student.unlinkedAt
      }
    });
  } catch (err) {
    console.error('Unlink Parent Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/students/:id/status — Toggle isActive (identical to driver/bus pattern)
exports.toggleStatus = async (req, res) => {
  try {
    const student = await Student.findOne({ _id: req.params.id, school: req.schoolId });
    if (!student) return res.status(404).json({ success: false, message: 'الطالب غير موجود' });

    student.isActive = !student.isActive;
    await student.save();

    res.json({
      success: true,
      message: student.isActive ? `تم تفعيل "${student.name}" بنجاح` : `تم تعطيل "${student.name}" بنجاح`,
      isActive: student.isActive
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/students/unassigned
// Fetch ACTIVE students who have no assigned bus AND have a valid location set
exports.getUnassigned = async (req, res) => {
  try {
    const students = await Student.find({
      school: req.schoolId,
      assignedBus: null,
      isActive: { $ne: false },
      'location.coordinates.0': { $ne: 0 } // Longitude is not 0
    }).select('name studentId location');

    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Export helper removed

// ─── BE-S2-2: CSV Bulk Upload ──────────────────────────────────────────
// POST /api/students/bulk
const csvParser = require('csv-parser');
const { Readable } = require('stream');

exports.bulkUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, errorCode: 'NO_FILE', message: 'CSV file is required' });
    }

    // Parse CSV from memory buffer
    const rows = [];
    const stream = Readable.from(req.file.buffer.toString());

    // Detect separator by checking the first line
    const firstLine = req.file.buffer.toString().split('\n')[0] || '';
    const separator = firstLine.includes(';') ? ';' : ',';

    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser({
          separator: separator,
          headers: ['name', 'nationalId', 'dob']
        }))
        .on('data', (row) => {
          const cleanRow = {};
          for (const key in row) {
            let val = row[key];
            if (typeof val === 'string') {
              val = val.replace(/^\uFEFF/, '').trim();
            }
            cleanRow[key] = val;
          }
          rows.push(cleanRow);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (rows.length === 0) {
      return res.status(400).json({ success: false, errorCode: 'EMPTY_FILE', message: 'ملف الـ CSV فارغ' });
    }

    let imported = 0;
    let skipped = 0;
    const errors = [];

    // Pre-fetch all existing names in this school to efficiently block duplicates
    // Strip any school/schoolId injected from body — always use token-derived value
    const schoolIdToUse = req.schoolId;
    const existingStudents = await Student.find({ school: schoolIdToUse }).select('name');
    const existingNameSet = new Set(existingStudents.map(s => s.name));

    const yearStr = new Date().getFullYear().toString().slice(-2);
    // Fetch the base ID for the sequence
    const nextStudentIdStr = await generateNextStudentId(yearStr);
    let nextCounter = parseInt(nextStudentIdStr.replace(`S${yearStr}`, ''), 10);

    for (const row of rows) {
      const rawName = row.name;
      const rawNationalId = row.nationalId;
      const rawDob = row.dob;
      
      if (!rawName || rawName.trim() === '') {
        skipped++;
        errors.push(`تم تخطي السطر: لم يتم العثور على اسم الطالب.`);
        continue;
      }
      
      if (!rawNationalId || !rawDob) {
        skipped++;
        errors.push(`تم تخطي "${rawName.trim()}": الهوية الوطنية وتاريخ الميلاد مطلوبان.`);
        continue;
      }

      const name = rawName.trim();
      const nameParts = name.split(/\s+/);
      if (nameParts.length < 3) {
        skipped++;
        errors.push(`تم تخطي "${name}": يجب أن يكون الاسم ثلاثياً كحد أدنى.`);
        continue;
      }

      // Skip duplicate names
      if (existingNameSet.has(name)) {
        skipped++;
        errors.push(`تم تخطي "${name}": يوجد طالب مسجل مسبقاً بنفس الاسم تماماً. أضف اسم العائلة للتمييز.`);
        continue;
      }

      // Generate ID
      const paddedCounter = nextCounter.toString().padStart(7, '0');
      const studentId = `S${yearStr}${paddedCounter}`;
      nextCounter++; // Increment for the next row

      // Parse the Date correctly (DD/MM/YYYY or DD-MM-YYYY etc)
      let parsedDate = null;
      const dateStr = rawDob.toString().trim();
      const match = dateStr.match(/^(\d{1,2})[\/\-\s]+(\d{1,2})[\/\-\s]+(\d{4})$/);
      if (match) {
          parsedDate = new Date(`${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`);
      } else {
          parsedDate = new Date(dateStr);
      }
      
      if (isNaN(parsedDate.getTime())) {
          skipped++;
          errors.push(`تم تخطي "${name}": صيغة التاريخ غير صحيحة.`);
          continue;
      }

      await Student.create({
        name,
        nationalId: encrypt(rawNationalId.toString().trim()),
        dob: parsedDate,
        normalizedName: normalizeArabicName(name),
        studentId,
        school: schoolIdToUse
      });
      
      existingNameSet.add(name); // Add to set to prevent duplicates within the same CSV payload
      imported++;
    }

    res.status(201).json({
      success: true,
      message: `تم رفع بيانات ${imported} طالب بنجاح`,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
