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

  console.log('✅ Seed completed — Super Admin created');
  console.log('   📋 Demo Accounts:');
  console.log('   Super Admin : superadmin01 / Super@123');
  mongoose.connection.close();
};

seed();