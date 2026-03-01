require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');

const app = express();

connectDB();

const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

app.use(express.json());

app.use(cors());
app.use(helmet());

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send("🚀 SBTS Backend Running Successfully");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));