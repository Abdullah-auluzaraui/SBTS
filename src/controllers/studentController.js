const Student = require('../models/Student');

// ─── Helper: Generate 6-char Access Code (e.g., 'A7X-92K') ────────────
const generateAccessCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part1}-${part2}`;
};

// BE-S2-7: Create single student
// POST /api/students
exports.create = async (req, res) => {
  try {
    const { name, studentId, grade, assignedBus } = req.body;

    if (!name || !studentId) {
      return res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'name and studentId are required' });
    }

    const existing = await Student.findOne({ studentId });
    if (existing) {
      return res.status(400).json({ success: false, errorCode: 'DUPLICATE', message: `Student ID "${studentId}" already exists` });
    }

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

// GET /api/students — List students (scoped, optional ?busId filter)
exports.list = async (req, res) => {
  try {
    const filter = { school: req.schoolId };
    if (req.query.busId) filter.assignedBus = req.query.busId;

    const students = await Student.find(filter)
      .populate('assignedBus', 'busId')
      .populate('parentId', 'name username')
      .sort({ createdAt: -1 });

    const result = students.map(s => ({
      _id: s._id,
      id: s._id,
      name: s.name,
      studentId: s.studentId,
      grade: s.grade,
      parentAccessCode: s.parentAccessCode,
      parentLinked: !!s.parentId,
      parentName: s.parentId?.name || null,
      assignedBus: s.assignedBus?.busId || null,
      location: s.location || null
    }));

    res.json({ success: true, students: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/students/unassigned
// Fetch students who have no assigned bus AND have a valid location set
exports.getUnassigned = async (req, res) => {
  try {
    const students = await Student.find({
      school: req.schoolId,
      assignedBus: null,
      'location.coordinates.0': { $ne: 0 } // Longitude is not 0
    }).select('name studentId grade location');

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

    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    if (rows.length === 0) {
      return res.status(400).json({ success: false, errorCode: 'EMPTY_FILE', message: 'CSV file is empty' });
    }

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const row of rows) {
      const name = row.name || row.Name || row['اسم الطالب'];
      const studentId = row.studentId || row.StudentId || row['رقم الطالب'];
      const grade = row.grade || row.Grade || row['الصف'] || null;

      if (!name || !studentId) {
        skipped++;
        errors.push(`Row skipped: missing name or studentId`);
        continue;
      }

      // Skip duplicate studentId
      const existing = await Student.findOne({ studentId });
      if (existing) {
        skipped++;
        errors.push(`"${studentId}" already exists — skipped`);
        continue;
      }

      await Student.create({
        name,
        studentId,
        grade,
        school: req.schoolId,
        parentAccessCode: generateAccessCode()
      });
      imported++;
    }

    res.status(201).json({
      success: true,
      message: `Successfully imported ${imported} students`,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
