const Student = require('../models/Student');
const { encrypt, decrypt, maskData } = require('../utils/crypto');
const { normalizeArabicName } = require('../utils/textUtils');

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
      student.nationalId = encrypt(nationalId.trim());
    }

    await student.save();
    res.json({ success: true, message: `تم تحديث بيانات "${student.name}" بنجاح` });
  } catch (err) {
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
