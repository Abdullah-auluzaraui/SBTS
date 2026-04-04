const dns = require('node:dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const parentRoutes = require('./routes/parentRoutes');
const busRoutes = require('./routes/busRoutes');
const routeRoutes = require('./routes/routeRoutes');
const studentRoutes = require('./routes/studentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const userRoutes = require('./routes/userRoutes');
const driverRoutes = require('./routes/driverRoutes');

const app = express();

connectDB();


app.use(express.json());
app.use(cors());
app.use(helmet());


app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/super', superAdminRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/driver', driverRoutes);

app.get('/', (req, res) => {
  res.send('🚀 SBTS Backend Running Successfully');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));