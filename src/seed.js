const dns = require('node:dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');

// استدعاء جميع الموديلات لضمان التنظيف الشامل
const School = require('./models/School');
const User = require('./models/User');
const Student = require('./models/Student');
const Bus = require('./models/Bus'); // تمت إضافة الباصات

const seed = async () => {
  try {
    await connectDB();
    console.log('🧹 جاري تصفية قاعدة البيانات بالكامل...');

    // مسح جميع البيانات بشكل متوازٍ لتسريع العملية
    const [delSchools, delUsers, delStudents, delBuses] = await Promise.all([
      School.deleteMany({}),
      User.deleteMany({}),
      Student.deleteMany({}),
      Bus.deleteMany({}) // مسح الباصات
    ]);

    console.log('🗑️ تفاصيل الحذف:');
    console.log(`   - المدارس: ${delSchools.deletedCount}`);
    console.log(`   - المستخدمين: ${delUsers.deletedCount}`);
    console.log(`   - الطلاب: ${delStudents.deletedCount}`);
    console.log(`   - الباصات: ${delBuses.deletedCount}`);

    // ─── 1. Hash passwords ───────────────────────────────────────────────
    const hashSuper = await bcrypt.hash('Super@123', 10);

    // ─── 2. Create users ─────────────────────────────────────────────────
    await User.create([
      // Super Admin — no school association
      {
        username: 'superadmin01',
        email: 'super@sbts.com',
        password: hashSuper,
        name: 'System Super Admin',
        role: 'superadmin',
        school: null,
        isActive: true
      }
    ]);

    console.log('\n✅ Seed completed — Super Admin created successfully!');
    console.log('──────────────────────────────────────────────────');
    console.log('   📋 Demo Account:');
    console.log('   🧑‍💻 Super Admin : superadmin01');
    console.log('   🔑 Password    : Super@123');
    console.log('──────────────────────────────────────────────────\n');

    mongoose.connection.close();
  } catch (err) {
    console.error('❌ حدث خطأ أثناء تصفية القاعدة:', err.message);
    mongoose.connection.close();
    process.exit(1);
  }
};

seed();