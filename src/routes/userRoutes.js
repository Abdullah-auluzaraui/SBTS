const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const router = express.Router();

// All user-management routes scoped to schoolAdmin
router.use(authMiddleware, roleMiddleware(['schooladmin']), tenantMiddleware);

// POST /api/users/driver — Create a driver account for this school
router.post('/driver', async (req, res) => {
  try {
    const { name, username, password, phone } = req.body;

    if (!name || !username || !password || !phone) {
      return res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'الاسم واسم المستخدم وكلمة المرور ورقم الجوال مطلوبة' });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'رقم الجوال يجب أن يتكون من 10 أرقام' });
    }

    // Enforce English-only username
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'اسم المستخدم يجب أن يحتوي على حروف إنجليزية وأرقام فقط' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }

    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, errorCode: 'DUPLICATE', message: `اسم المستخدم "${username}" مستخدم بالفعل` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const driver = await User.create({
      name,
      username: username.toLowerCase(),
      email: `${username.toLowerCase()}@driver.sbts`, // Placeholder email
      password: hashedPassword,
      role: 'driver',
      school: req.schoolId,
      phone: phone || null,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء حساب السائق بنجاح',
      driver: {
        id: driver._id,
        name: driver.name,
        username: driver.username,
        phone: driver.phone,
        isActive: driver.isActive
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users/drivers — List all drivers in this school
router.get('/drivers', async (req, res) => {
  try {
    const filter = { school: req.schoolId, role: 'driver' };
    if (req.query.all !== 'true') filter.isActive = true;

    const drivers = await User.find(filter)
      .select('_id name username phone isActive createdAt')
      .sort({ createdAt: -1 });

    res.json({ success: true, drivers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/users/drivers/:id — Update driver name
router.patch('/drivers/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'الاسم مطلوب' });
    }
    const driver = await User.findOne({ _id: req.params.id, school: req.schoolId, role: 'driver' });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'السائق غير موجود' });
    }
    driver.name = name.trim();
    await driver.save();
    res.json({ success: true, message: 'تم تحديث اسم السائق بنجاح', driver: { id: driver._id, name: driver.name } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/users/drivers/:id/status — Toggle driver active/suspended
router.patch('/drivers/:id/status', async (req, res) => {
  try {
    const driver = await User.findOne({ _id: req.params.id, school: req.schoolId, role: 'driver' });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'السائق غير موجود' });
    }

    driver.isActive = !driver.isActive;
    await driver.save();

    res.json({
      success: true,
      message: driver.isActive ? 'تم تفعيل حساب السائق' : 'تم تعليق حساب السائق',
      isActive: driver.isActive
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


module.exports = router;
