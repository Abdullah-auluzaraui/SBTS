const Student = require('../models/Student');

// BE-S1-4b: Link additional student to logged-in parent (1-to-Many)
// POST /api/parents/students
exports.linkChild = async (req, res) => {
  try {
    const { studentId, parentAccessCode } = req.body;

    // 1. Validate required fields
    if (!studentId || !parentAccessCode) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Student ID and Access Code are both required'
      });
    }

    // 2. Find student and validate Access Code
    const student = await Student.findOne({ studentId });
    if (!student || student.parentAccessCode !== parentAccessCode) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Invalid Student ID or Access Code'
      });
    }

    // 3. Check if student is already linked
    if (student.parentId) {
      return res.status(400).json({
        success: false,
        errorCode: 'STUDENT_ALREADY_LINKED',
        message: 'This student is already linked to a parent account.'
      });
    }

    // 4. Ensure the student belongs to the same school as the parent
    if (String(student.school) !== String(req.user.school)) {
      return res.status(403).json({
        success: false,
        errorCode: 'SCHOOL_MISMATCH',
        message: 'This student does not belong to your school.'
      });
    }

    // 5. Link the student to this parent
    student.parentId = req.user._id;
    await student.save();

    res.json({
      success: true,
      message: 'Student linked successfully',
      student: { id: student._id, name: student.name, studentId: student.studentId, grade: student.grade }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
