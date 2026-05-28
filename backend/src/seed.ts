import dns from 'node:dns';
dns.setServers(['1.1.1.1', '8.8.8.8']);

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from './config/db';

// استدعاء جميع الموديلات لضمان التنظيف الشامل
import School from './models/School';
import User from './models/User';
import Student from './models/Student';
import Bus from './models/Bus';

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
  } catch (err: unknown) {
    console.error('❌ حدث خطأ أثناء تصفية القاعدة:', err instanceof Error ? err.message : String(err));
    mongoose.connection.close();
    process.exit(1);
  }
};

seed();
