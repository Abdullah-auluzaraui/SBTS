const dns = require('node:dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const School = require('./models/School');
const User = require('./models/User');
const Student = require('./models/Student');

const seed = async () => {
  await connectDB();

  // Clear all existing data
  await School.deleteMany({});
  await User.deleteMany({});
  await Student.deleteMany({});

  // ─── 1. Create a demo School ─────────────────────────────────────────
  const school = await School.create({
    name: 'Al-Nour High School',
    schoolId: 'SCH-0001',
    contact: { phone: '+966500000000', email: 'info@alnour.edu.sa' },
    isActive: true
  });

  // ─── 2. Hash passwords ───────────────────────────────────────────────
  const hashSuper   = await bcrypt.hash('Super@123', 10);
  const hashAdmin   = await bcrypt.hash('Admin@123', 10);
  const hashDriver  = await bcrypt.hash('Driver@123', 10);

  // ─── 3. Create users ─────────────────────────────────────────────────
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
    },
    // School Admin — linked to Al-Nour
    {
      username: 'admin01',
      email: 'admin@sbts.com',
      password: hashAdmin,
      name: 'Main Admin',
      role: 'schooladmin',
      school: school._id,
      isActive: true
    },
    // Active Driver — linked to Al-Nour
    {
      username: 'driver01',
      email: 'driver@sbts.com',
      password: hashDriver,
      name: 'Active Driver',
      role: 'driver',
      school: school._id,
      isActive: true
    },
    // Suspended Driver — linked to Al-Nour
    {
      username: 'driver02',
      email: 'driver2@sbts.com',
      password: hashDriver,
      name: 'Suspended Driver',
      role: 'driver',
      school: school._id,
      isActive: false
    }
  ]);

  // ─── 4. Demo students with parentAccessCode ──────────────────────────
  await Student.create([
    {
      name: 'Khalid Al-Otaibi',
      studentId: 'STU-2024-001',
      grade: '5A',
      school: school._id,
      parentAccessCode: 'A7X-92K',
      parentId: null
    },
    {
      name: 'Sara Al-Mutairi',
      studentId: 'STU-2024-002',
      grade: '3B',
      school: school._id,
      parentAccessCode: 'B3Y-41M',
      parentId: null
    },
    {
      name: 'Omar Al-Zahrani',
      studentId: 'STU-2024-003',
      grade: '6C',
      school: school._id,
      parentAccessCode: 'C5Z-78N',
      parentId: null
    },
  ]);

  console.log('✅ Seed completed — School + Users + Students created');
  console.log('   📋 Demo Accounts:');
  console.log('   Super Admin : superadmin01 / Super@123');
  console.log('   School Admin: admin01      / Admin@123');
  console.log('   Driver      : driver01     / Driver@123');
  console.log('   Students    : STU-2024-001 (Code: A7X-92K)');
  console.log('                 STU-2024-002 (Code: B3Y-41M)');
  console.log('                 STU-2024-003 (Code: C5Z-78N)');
  mongoose.connection.close();
};

seed();