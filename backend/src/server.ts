import dns from 'node:dns';
dns.setServers(['1.1.1.1', '8.8.8.8']);

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { getNodeErrorMessage } from './utils/errorUtils';

// Types and Config
import connectDB from './config/db';
import * as socketUtil from './utils/socket';
import User from './models/User';

// TS Routers (Phase 2.1 & Phase 2.2)
import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import superAdminRoutes from './routes/superAdminRoutes';
import busRoutes from './routes/busRoutes';
import routeRoutes from './routes/routeRoutes';
import studentRoutes from './routes/studentRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import notificationRoutes from './routes/notificationRoutes';
import driverRoutes from './routes/driverRoutes';
import parentRoutes from './routes/parentRoutes';
import adminRoutes from './routes/adminRoutes';
import userRoutes from './routes/userRoutes';

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
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationRoutes);

import { errorHandler } from './middleware/errorHandler';
app.use(errorHandler);

app.get('/', (_req, res) => {
  res.send(' SBTS Backend Running Successfully');
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

httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
