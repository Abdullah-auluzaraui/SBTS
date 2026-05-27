export interface IUser {
  _id: any;
  username: string;
  email: string;
  name: string;
  role: 'superadmin' | 'schooladmin' | 'driver' | 'parent';
  school?: any;
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
