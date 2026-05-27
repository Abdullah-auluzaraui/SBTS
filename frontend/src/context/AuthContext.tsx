import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import api, { setupAxiosInterceptors } from '../services/apiService';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'superadmin' | 'schooladmin' | 'driver' | 'parent';

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  schoolId?: string | null;
  phone?: string | null;
}

interface ApiErrorPayload {
  success: false;
  errorCode: string;
  message: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  initialLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<unknown>;
  registerRequest: (
    name: string,
    username: string,
    email: string,
    phone: string,
    nationalId: string,
    dob: string
  ) => Promise<unknown>;
  registerVerify: (
    name: string,
    username: string,
    email: string,
    password: string,
    phone: string,
    otp: string,
    studentId: string
  ) => Promise<unknown>;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// ─── Provider ────────────────────────────────────────────────────────────────

const ROLE_ROUTES: Record<UserRole, string> = {
  superadmin: '/super',
  schooladmin: '/admin',
  driver: '/driver',
  parent: '/parent',
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const navigate = useNavigate();

  // ─── Session restore on mount ─────────────────────────────────────────────
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser  = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser) as AuthUser);
    }
    // Short timeout so the skeleton has at least one render cycle
    const timer = setTimeout(() => setInitialLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  // ─── Setup 401 interceptor once logout is available ──────────────────────
  useEffect(() => {
    setupAxiosInterceptors(logout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Helper: persist auth state ───────────────────────────────────────────
  const persistSession = (newToken: string, newUser: AuthUser): void => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  // ─── login() ─────────────────────────────────────────────────────────────
  const login = async (username: string, password: string): Promise<unknown> => {
    setLoading(true);
    try {
      const { data } = await api.post<{ token: string; user: AuthUser }>(
        '/auth/login',
        { username, password }
      );

      persistSession(data.token, data.user);
      navigate(ROLE_ROUTES[data.user.role] ?? '/login');
      return data;
    } catch (err: any) {
      const payload: ApiErrorPayload = err.response?.data ?? {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: 'Cannot reach the server. Please check your connection.',
      };
      throw payload;
    } finally {
      setLoading(false);
    }
  };

  // ─── registerRequest() ───────────────────────────────────────────────────
  const registerRequest = async (
    name: string,
    username: string,
    email: string,
    phone: string,
    nationalId: string,
    dob: string
  ): Promise<unknown> => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register-request', {
        name, username, email, phone, nationalId, dob,
      });
      return data;
    } catch (err: any) {
      const payload: ApiErrorPayload = err.response?.data ?? {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: 'Could not connect to server. Please check your connection.',
      };
      throw payload;
    } finally {
      setLoading(false);
    }
  };

  // ─── registerVerify() ────────────────────────────────────────────────────
  const registerVerify = async (
    name: string,
    username: string,
    email: string,
    password: string,
    phone: string,
    otp: string,
    studentId: string
  ): Promise<unknown> => {
    setLoading(true);
    try {
      const { data } = await api.post<{ token: string; user: AuthUser }>(
        '/auth/register-verify',
        { name, username, email, password, phone, otp, studentId }
      );

      persistSession(data.token, data.user);
      navigate('/parent');
      return data;
    } catch (err: any) {
      const payload: ApiErrorPayload = err.response?.data ?? {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: 'Could not connect to server. Please check your connection.',
      };
      throw payload;
    } finally {
      setLoading(false);
    }
  };

  // ─── updateUser() ────────────────────────────────────────────────────────
  const updateUser = (patch: Partial<AuthUser>): void => {
    setUser(prev => {
      const updated = { ...prev, ...patch } as AuthUser;
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  // ─── logout() ────────────────────────────────────────────────────────────
  const logout = (): void => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const value: AuthContextValue = {
    user,
    token,
    loading,
    initialLoading,
    login,
    registerRequest,
    registerVerify,
    logout,
    updateUser,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
