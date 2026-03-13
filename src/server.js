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

const app = express();

connectDB();


app.use(express.json());
app.use(cors());
app.use(helmet());


app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/super', superAdminRoutes);
app.use('/api/parents', parentRoutes);

app.get('/', (req, res) => {
  res.send('🚀 SBTS Backend Running Successfully');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));