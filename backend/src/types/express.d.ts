import mongoose from 'mongoose';

export interface IUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  name: string;
  role: 'superadmin' | 'schooladmin' | 'driver' | 'parent';
  school?: mongoose.Types.ObjectId;
  phone?: string;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: IUser;        // Injected securely by Auth Middleware
      schoolId?: string;   // Injected securely by School Tenancy Middleware
    }
  }
}

declare module 'socket.io' {
  interface Socket {
    userId?: string;
    userRole?: string;
  }
}
