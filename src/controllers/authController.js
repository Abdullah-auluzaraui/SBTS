const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Student = require('../models/Student');
const generateToken = require('../utils/generateToken');

// REGISTER (Parent only) — BE-S1-4 (v2.0: parentAccessCode required)
exports.register = async (req, res) => {
  try {
    const { username, email, password, name, phone, studentId, parentAccessCode } = req.body;

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

    // 3. Check if this student is already linked to a parent
    if (student.parentId) {
      return res.status(400).json({
        success: false,
        errorCode: 'STUDENT_ALREADY_LINKED',
        message: 'This student is already linked to a parent account. Contact school administration.'
      });
    }

    // 4. Check for duplicate email or username
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res.status(400).json({
        success: false,
        errorCode: 'USER_EXISTS',
        message: 'User already exists'
      });
    }

    // 5. Create the parent account (linked to the student's school)
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hash,
      name,
      phone,
      role: 'parent',
      school: student.school  // inherit school from the student
    });

    // 6. Link parent to the student (1-to-many: parentId, not parents[])
    student.parentId = user._id;
    await student.save();

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, role: user.role, schoolId: user.school }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// LOGIN (All roles) — BE-S1-3
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username }).select('+password');
    if (!user) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Username or password is incorrect'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        errorCode: 'ACCOUNT_INACTIVE',
        message: 'Your account has been suspended'
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Username or password is incorrect'
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, role: user.role, schoolId: user.school || null }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};