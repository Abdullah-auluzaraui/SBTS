const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Student = require('../models/Student');
const generateToken = require('../utils/generateToken');

// REGISTER (Parent only) — BE-S1-5
exports.register = async (req, res) => {
  try {
    const { username, email, password, name, phone, studentId } = req.body;

    // 1. Validate studentId exists in the Student collection
    if (!studentId) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_STUDENT_ID',
        message: 'studentId is required'
      });
    }

    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_STUDENT_ID',
        message: `No student found with ID '${studentId}'`
      });
    }

    // 2. Check for duplicate email or username
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res.status(400).json({
        success: false,
        errorCode: 'USER_EXISTS',
        message: 'User already exists'
      });
    }

    // 3. Create the parent account
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hash,
      name,
      phone,
      role: 'parent'
    });

    // 4. Link parent to the student's parents[] array
    await Student.findByIdAndUpdate(student._id, {
      $addToSet: { parents: user._id }
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// LOGIN (All roles)
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
      user: { id: user._id, name: user.name, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};