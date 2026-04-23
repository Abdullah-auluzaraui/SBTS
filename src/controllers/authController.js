const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const Invitation = require('../models/Invitation');
const OTP = require('../models/OTP');
const { encrypt, decrypt } = require('../utils/crypto');
const { normalizeArabicName } = require('../utils/textUtils');
const generateToken = require('../utils/generateToken');

// REGISTER REQUEST (Step 1: Validate Parent, Find Student, Send OTP)
exports.registerRequest = async (req, res) => {
  try {
    const { username, email, name, phone, studentName, nationalId, dob } = req.body;

    // 1. Basic validation
    if (!username || !email || !name || !phone || !studentName || !nationalId || !dob) {
      return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
    }

    // 2. Check for duplicate parent email or username
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res.status(400).json({ success: false, errorCode: 'USER_EXISTS', message: 'اسم المستخدم أو البريد الإلكتروني مسجل مسبقاً' });
    }

    // 3. Find the student
    const normalized = normalizeArabicName(studentName);
    const students = await Student.find({ normalizedName: normalized });

    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على طالب بهذه البيانات' });
    }

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
      return res.status(400).json({ success: false, errorCode: 'STUDENT_ALREADY_LINKED', message: 'هذا الطالب مرتبط بحساب ولي أمر بالفعل' });
    }

    // 4. Rate Limiting Check (max 3 unverified OTPs for this phone in last 15 mins)
    const recentOtps = await OTP.countDocuments({ phone, createdAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) } });
    if (recentOtps >= 3) {
      return res.status(429).json({ success: false, message: 'لقد تجاوزت الحد المسموح من المحاولات. يرجى المحاولة لاحقاً.' });
    }

    // 5. Generate and save OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.create({ phone, otp: otpCode, studentId: student._id });

    // 6. Mock SMS
    console.log(`\n========================================`);
    console.log(`📱 MOCK SMS: To ${phone}`);
    console.log(`🔑 OTP Code for linking ${student.name}: ${otpCode}`);
    console.log(`⏳ Expires in 5 minutes.`);
    console.log(`========================================\n`);

    res.json({ 
      success: true, 
      message: 'تم إرسال رمز التحقق إلى جوالك', 
      studentId: student._id,
      mockOtp: otpCode // للإختبار في بيئة التطوير
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// REGISTER VERIFY (Step 2: Verify OTP, Create Parent, Link Student)
exports.registerVerify = async (req, res) => {
  try {
    const { username, email, password, name, phone, otp, studentId } = req.body;

    if (!phone || !otp || !studentId || !password) {
      return res.status(400).json({ success: false, message: 'البيانات غير مكتملة' });
    }

    // 1. Verify OTP
    const otps = await OTP.find({ phone, studentId });
    if (otps.length === 0) {
      return res.status(400).json({ success: false, message: 'رمز التحقق غير صالح أو منتهي الصلاحية' });
    }

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

    // 2. Fetch Student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'الطالب غير موجود' });
    }

    if (student.parentId) {
      return res.status(400).json({ success: false, message: 'الطالب مرتبط بالفعل' });
    }

    // 3. Create User Account
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res.status(400).json({ success: false, errorCode: 'USER_EXISTS', message: 'المستخدم موجود بالفعل' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hash,
      name,
      phone,
      role: 'parent',
      school: student.school
    });

    // 4. Link Student
    student.parentId = user._id;
    await student.save();

    // 5. Clean up OTP
    await OTP.deleteMany({ phone });

    // 6. Generate Token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, role: user.role, schoolId: user.school, phone: user.phone || null }
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
      user: { id: user._id, name: user.name, role: user.role, schoolId: user.school || null, phone: user.phone || null }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── VERIFY INVITATION (Public) ────────────────────────────────────────
// GET /api/auth/verify-invitation?token=xxx
exports.verifyInvitation = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, errorCode: 'NO_TOKEN', message: 'Token is required' });
    }

    const invitation = await Invitation.findOne({ token }).populate('school', 'name schoolId');
    if (!invitation) {
      return res.status(404).json({ success: false, errorCode: 'INVALID_TOKEN', message: 'رابط الدعوة غير صالح' });
    }

    if (invitation.isUsed) {
      return res.status(400).json({ success: false, errorCode: 'TOKEN_USED', message: 'هذه الدعوة مستخدمة بالفعل' });
    }

    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({ success: false, errorCode: 'TOKEN_EXPIRED', message: 'انتهت صلاحية هذه الدعوة' });
    }

    res.json({
      success: true,
      invitation: {
        schoolName: invitation.school.name,
        schoolId: invitation.school.schoolId,
        email: invitation.email
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── ACCEPT INVITATION (Public) ────────────────────────────────────────
// POST /api/auth/accept-invitation
exports.acceptInvitation = async (req, res) => {
  try {
    const { token, username, password, phone } = req.body;

    if (!token || !username || !password || !phone) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'token, username, password, and phone are all required'
      });
    }

    // 1. Find and validate invitation
    const invitation = await Invitation.findOne({ token }).populate('school');
    if (!invitation) {
      return res.status(404).json({ success: false, errorCode: 'INVALID_TOKEN', message: 'رابط الدعوة غير صالح' });
    }
    if (invitation.isUsed) {
      return res.status(400).json({ success: false, errorCode: 'TOKEN_USED', message: 'هذه الدعوة مستخدمة بالفعل' });
    }
    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({ success: false, errorCode: 'TOKEN_EXPIRED', message: 'انتهت صلاحية هذه الدعوة' });
    }

    // 2. Check duplicate username
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, errorCode: 'USER_EXISTS', message: 'اسم المستخدم مأخوذ بالفعل' });
    }

    // 3. Create schooladmin account — name is taken from the school name automatically
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email: invitation.email,
      password: hash,
      name: invitation.school.name,
      role: 'schooladmin',
      school: invitation.school._id,
      phone,
      isPhoneVerified: true, // phone entered during invited setup is trusted
      isActive: true
    });

    // 4. Mark invitation as used
    invitation.isUsed = true;
    await invitation.save();

    // 5. Issue JWT
    const jwtToken = generateToken(user);

    res.status(201).json({
      success: true,
      token: jwtToken,
      user: { id: user._id, name: user.name, role: user.role, schoolId: user.school, phone: user.phone || null }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── FORGOT PASSWORD — Step 1 ────────────────────────────────────────────────
// POST /api/auth/forgot-password
// Accepts phone, generates an OTP, returns mockOtp in dev mode
exports.forgotPassword = async (req, res) => {
  try {
    const { username, phone } = req.body;
    if (!username || !phone) {
      return res.status(400).json({ success: false, message: 'اسم المستخدم ورقم الجوال مطلوبان' });
    }

    // Both username and phone must match the same account
    const user = await User.findOne({ username, phone });
    if (!user) {
      // Generic response prevents account enumeration via username or phone alone
      return res.json({ success: true, message: 'إذا كانت البيانات صحيحة، سيصلك رمز التحقق' });
    }

    // Rate limit: max 3 OTPs per phone in 15 minutes
    const recent = await OTP.countDocuments({
      phone,
      purpose: 'forgot-password',
      createdAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) }
    });
    if (recent >= 3) {
      return res.status(429).json({ success: false, message: 'لقد تجاوزت الحد المسموح من المحاولات. حاول بعد 15 دقيقة.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.create({ phone, otp: otpCode, purpose: 'forgot-password' });

    console.log(`\n========================================`);
    console.log(`📱 MOCK SMS [forgot-password]: To ${phone}`);
    console.log(`🔑 OTP Code: ${otpCode}`);
    console.log(`⏳ Expires in 5 minutes.`);
    console.log(`========================================\n`);

    res.json({
      success: true,
      message: 'تم إرسال رمز التحقق إلى جوالك',
      mockOtp: otpCode // dev only
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── FORGOT PASSWORD — Step 2 ────────────────────────────────────────────────
// POST /api/auth/verify-otp
// Verifies OTP and returns a short-lived reset token (10 min)
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otpCode } = req.body;
    if (!phone || !otpCode) {
      return res.status(400).json({ success: false, message: 'الرقم والرمز مطلوبان' });
    }

    const otps = await OTP.find({ phone, purpose: 'forgot-password' });
    if (otps.length === 0) {
      return res.status(400).json({ success: false, message: 'رمز التحقق غير صالح أو منتهي الصلاحية' });
    }

    let validDoc = null;
    for (const doc of otps) {
      if (await doc.matchOTP(otpCode)) { validDoc = doc; break; }
    }
    if (!validDoc) {
      return res.status(400).json({ success: false, message: 'رمز التحقق غير صحيح' });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    // Issue short-lived reset token (purpose-scoped to prevent reuse)
    const resetToken = jwt.sign(
      { id: user._id, purpose: 'reset-password' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    await OTP.deleteMany({ phone, purpose: 'forgot-password' });

    res.json({ success: true, message: 'تم التحقق بنجاح', resetToken });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── FORGOT PASSWORD — Step 3 ────────────────────────────────────────────────
// POST /api/auth/reset-password
// Verifies the reset token and saves the new password
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'التوكن وكلمة المرور مطلوبان' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }

    let payload;
    try {
      payload = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'رمز إعادة التعيين غير صالح أو منتهي الصلاحية' });
    }

    if (payload.purpose !== 'reset-password') {
      return res.status(401).json({ success: false, message: 'رمز غير صالح' });
    }

    const updated = await User.findByIdAndUpdate(
      payload.id,
      { password: await bcrypt.hash(newPassword, 10) },
      { new: true, runValidators: false }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};