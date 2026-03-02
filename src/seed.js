const dns = require('node:dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');
const Student = require('./models/Student');

const seed = async () => {
  await connectDB();

  await User.deleteMany({});
  await Student.deleteMany({});

  const hash = await bcrypt.hash('Admin@123', 10);
  const hashDriver = await bcrypt.hash('Driver@123', 10);

  await User.create([
    {
      username: 'admin01',
      email: 'admin@sbts.com',
      password: hash,
      name: 'Main Admin',
      role: 'admin',
      isActive: true
    },
    {
      username: 'driver01',
      email: 'driver@sbts.com',
      password: hashDriver,
      name: 'Active Driver',
      role: 'driver',
      isActive: true
    },
    {
      username: 'driver02',
      email: 'driver2@sbts.com',
      password: hashDriver,
      name: 'Suspended Driver',
      role: 'driver',
      isActive: false
    }
  ]);

  // Demo students for Sprint 1 register testing (BE-S1-9)
  await Student.create([
    { name: 'Khalid Al-Otaibi', studentId: 'STU-2024-001', grade: '5A', parents: [] },
    { name: 'Sara Al-Mutairi', studentId: 'STU-2024-002', grade: '3B', parents: [] },
    { name: 'Omar Al-Zahrani', studentId: 'STU-2024-003', grade: '6C', parents: [] },
  ]);

  console.log('✅ Seed completed — Users + Students created');
  mongoose.connection.close();
};

seed();