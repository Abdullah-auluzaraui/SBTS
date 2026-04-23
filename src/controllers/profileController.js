const bcrypt = require('bcryptjs');
const User = require('../models/User');
const OTP = require('../models/OTP');

// GET /api/profile/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone || null,
        isPhoneVerified: user.isPhoneVerified,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/profile/me
// Role-gated: driver name is read-only; username editable for parent and schooladmin only
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, username } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });

    if (name !== undefined) {
      if (user.role === 'driver') {
        return res.status(403).json({ success: false, message: 'لا يمكن للسائق تغيير اسمه. تواصل مع مدير المدرسة.' });
      }
      if (!name.trim()) {
        return res.status(400).json({ success: false, message: 'الاسم لا يمكن أن يكون فارغاً' });
      }
      user.name = name.trim();
    }

    if (email !== undefined) {
      if (user.role !== 'schooladmin') {
        return res.status(403).json({ success: false, message: 'تعديل البريد الإلكتروني متاح لمدير المدرسة فقط' });
      }
      const existing = await User.findOne({ email, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'البريد الإلكتروني مستخدم بالفعل' });
      }
      user.email = email.trim().toLowerCase();
    }

    if (username !== undefined) {
      if (!['parent', 'schooladmin'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'تعديل اسم المستخدم غير مسموح لهذا الدور' });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ success: false, message: 'اسم المستخدم يجب أن يحتوي على حروف إنجليزية وأرقام وشرطات سفلية فقط' });
      }
      const taken = await User.findOne({ username, _id: { $ne: user._id } });
      if (taken) {
        return res.status(400).json({ success: false, message: 'اسم المستخدم مستخدم بالفعل' });
      }
      user.username = username.trim();
    }

    await user.save();

    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      user: { name: user.name, email: user.email, username: user.username }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/profile/password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'كلمة المرور الحالية والجديدة مطلوبتان' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/profile/phone/request
// Initiates OTP flow to change phone number
exports.requestPhoneChange = async (req, res) => {
  try {
    const { newPhone } = req.body;

    if (!newPhone || !/^\d{10}$/.test(newPhone)) {
      return res.status(400).json({ success: false, message: 'رقم الجوال يجب أن يتكون من 10 أرقام' });
    }

    // Prevent using a phone already assigned to another account
    const taken = await User.findOne({ phone: newPhone, _id: { $ne: req.user._id } });
    if (taken) {
      return res.status(400).json({ success: false, message: 'هذا الرقم مرتبط بحساب آخر بالفعل' });
    }

    // Rate limit
    const recent = await OTP.countDocuments({
      phone: newPhone,
      purpose: 'change-phone',
      createdAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) }
    });
    if (recent >= 3) {
      return res.status(429).json({ success: false, message: 'لقد تجاوزت الحد المسموح من المحاولات. حاول بعد 15 دقيقة.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.create({ phone: newPhone, otp: otpCode, purpose: 'change-phone' });

    console.log(`\n========================================`);
    console.log(`📱 MOCK SMS [change-phone]: To ${newPhone}`);
    console.log(`🔑 OTP Code: ${otpCode}`);
    console.log(`⏳ Expires in 5 minutes.`);
    console.log(`========================================\n`);

    res.json({
      success: true,
      message: 'تم إرسال رمز التحقق إلى الرقم الجديد',
      mockOtp: otpCode // dev only
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/profile/phone/verify
// Verifies OTP and updates the phone number
exports.verifyPhoneChange = async (req, res) => {
  try {
    const { newPhone, otpCode } = req.body;

    if (!newPhone || !otpCode) {
      return res.status(400).json({ success: false, message: 'الرقم الجديد والرمز مطلوبان' });
    }

    const otps = await OTP.find({ phone: newPhone, purpose: 'change-phone' });
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

    const user = await User.findById(req.user._id);
    user.phone = newPhone;
    user.isPhoneVerified = true;
    await user.save();

    await OTP.deleteMany({ phone: newPhone, purpose: 'change-phone' });

    res.json({
      success: true,
      message: 'تم تحديث رقم الجوال بنجاح',
      phone: newPhone
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
