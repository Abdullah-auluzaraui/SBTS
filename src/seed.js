require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');

const seed = async () => {
  await connectDB();

  await User.deleteMany({});

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

  console.log('✅ Seed completed');
  mongoose.connection.close();
};

seed();