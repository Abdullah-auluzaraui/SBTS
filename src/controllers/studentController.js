const Student = require('../models/Student');

// ─── Helper: Generate 6-char Access Code (e.g., 'A7X-92K') ────────────
const generateAccessCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part1}-${part2}`;
};

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
    const { name, assignedBus } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'اسم الطالب مطلوب' });
    }

    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length < 3) {
      return res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'يجب أن يكون الاسم ثلاثياً كحد أدنى (الاسم الأول واسم الأب واسم العائلة)' });
    }

    // Soft Warning: Duplicate name check scoped to this specific school
    const existingName = await Student.findOne({ school: req.user.schoolId, name: name.trim() });
    if (existingName) {
      return res.status(400).json({ 
        success: false, 
        errorCode: 'DUPLICATE_NAME', 
        message: 'يوجد طالب مسجل مسبقاً بنفس الاسم تماماً في مدرستك. يرجى إضافة اسم الجد أو العائلة للتمييز بينهما عند توزيع رموز الوصول.' 
      });
    }

    // Auto-generate the Student ID
    const yearStr = new Date().getFullYear().toString().slice(-2);
    const studentId = await generateNextStudentId(yearStr);

    const parentAccessCode = generateAccessCode();

    const student = await Student.create({
      name,
      studentId,
      grade: grade || null,
      school: req.schoolId,
      parentAccessCode,
      assignedBus: assignedBus || null
    });

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      student: {
        id: student._id,
        name: student.name,
        studentId: student.studentId,
        grade: student.grade,
        parentAccessCode: student.parentAccessCode,
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
      parentAccessCode: s.parentAccessCode,
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

// Export helper for Phase 4 (CSV bulk upload)
exports.generateAccessCode = generateAccessCode;

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
          mapHeaders: ({ header, index }) => {
            // Remove BOM characters and trim spaces
            return header ? header.replace(/^\uFEFF/, '').trim() : `col_${index}`;
          }
        }))
        .on('data', (row) => {
          const cleanRow = {};
          for (const key in row) {
            cleanRow[key] = typeof row[key] === 'string' ? row[key].trim() : row[key];
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
    const schoolIdToUse = req.schoolId || req.user.schoolId;
    const existingStudents = await Student.find({ school: schoolIdToUse }).select('name');
    const existingNameSet = new Set(existingStudents.map(s => s.name));

    const yearStr = new Date().getFullYear().toString().slice(-2);
    // Fetch the base ID for the sequence
    const nextStudentIdStr = await generateNextStudentId(yearStr);
    let nextCounter = parseInt(nextStudentIdStr.replace(`S${yearStr}`, ''), 10);

    for (const row of rows) {
      const rawName = row.name || row.Name || row['اسم الطالب'];
      
      if (!rawName || rawName.trim() === '') {
        skipped++;
        errors.push(`تم تخطي السطر: لم يتم العثور على اسم الطالب.`);
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

      await Student.create({
        name,
        studentId,
        school: schoolIdToUse,
        parentAccessCode: generateAccessCode()
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
