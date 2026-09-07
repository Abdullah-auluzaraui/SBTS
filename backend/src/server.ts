import dns from 'node:dns';
// Only override DNS when explicitly requested (in Docker, overriding DNS breaks internal container name resolution)
if (process.env.OVERRIDE_DNS === 'true') {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
}

import dotenv from 'dotenv';
dotenv.config(); // Reload env

import http from 'http';
import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { getNodeErrorMessage } from './utils/errorUtils';

// Types and Config
import connectDB from './config/db';
import * as socketUtil from './utils/socket';
import User from './models/User';
import bcrypt from 'bcryptjs';
import app from './app';

connectDB().then(async () => {
  try {
    if (process.env.DEMO_MODE === 'true') {
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log('🌱 Database is empty and DEMO_MODE=true. Automatically seeding demo data...');
        const { runSeed } = await import('./seed-demo');
        await runSeed();
        console.log('✅ Auto-seed completed successfully.');
      }
    } else {
      // Standard/Production Mode: Ensure at least one Super Admin exists to manage the platform
      const superAdminExists = await User.findOne({ role: 'superadmin' });
      if (!superAdminExists) {
        const username = process.env.SUPERADMIN_USERNAME || 'superadmin';
        const password = process.env.SUPERADMIN_PASSWORD || 'Aa1234';
        const email = process.env.SUPERADMIN_EMAIL || 'superadmin@sbts.com';
        const hash = await bcrypt.hash(password, 10);
        await User.create({
          username,
          email,
          password: hash,
          name: 'مدير النظام (Super Admin)',
          role: 'superadmin',
          school: null,
          isActive: true
        });
        console.log(`👑 [System Bootstrap] Created default Super Admin account: "${username}"`);
      }
    }
  } catch (err: any) {
    console.warn('⚠️ Bootstrap check warning:', err.message);
  }
});

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

const io = socketUtil.init(httpServer, {
  cors: {
    origin: '*',
  }
});

io.use((socket: Socket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Unauthorized'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string; role: string };
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', async (socket: Socket) => {
  console.log(`Socket connected: ${socket.id} (User: ${socket.userId}, Role: ${socket.userRole})`);

  if (socket.userRole === 'parent') {
    socket.join(`parent_${socket.userId}`);
  } else if (socket.userRole === 'schooladmin') {
    try {
      const user = await User.findById(socket.userId).select('school').lean();
      if (user?.school) {
        socket.join(`admin_${user.school}`);
      }
    } catch (e: unknown) {
      console.error('Socket admin room join error:', getNodeErrorMessage(e));
    }
  }

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Mode: ${process.env.DEMO_MODE === 'true' ? '🚀 DEMO MODE ACTIVE (Isolated Demo Environment)' : '🔒 STANDARD / PROD MODE'}`);
});
