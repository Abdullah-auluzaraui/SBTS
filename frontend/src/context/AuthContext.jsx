import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { setupAxiosInterceptors } from '../services/apiService';

// Task FE-S1-4: AuthContext — now backed by real API calls
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const navigate = useNavigate();

    // ─── Session restore on mount ────────────────────────────────────────────
    // Reads persisted token/user from localStorage.
    // A brief delay is kept to show the DashboardSkeleton on cold load.
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        // Short timeout so the skeleton has at least one render cycle
        const timer = setTimeout(() => setInitialLoading(false), 400);
        return () => clearTimeout(timer);
    }, []);

    // ─── Setup 401 interceptor once logout is available ─────────────────────
    // Task FE-S1-7: Any API response with 401 (expired/invalid JWT) triggers logout.
    useEffect(() => {
        setupAxiosInterceptors(logout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Helper: persist auth state ──────────────────────────────────────────
    const persistSession = (newToken, newUser) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    // ─── Task FE-S1-4: login() — POST /api/auth/login ───────────────────────
    // On success: persist token + user, redirect by role (FE-S1-8).
    // On failure: re-throw the backend errorCode so the form can display it.
    const login = async (username, password) => {
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', { username, password });

            persistSession(data.token, data.user);

            // Task FE-S1-8: Role-based redirect (v2.0: 4 roles)
            const roleRoutes = { superadmin: '/super', schooladmin: '/admin', driver: '/driver', parent: '/parent' };
            navigate(roleRoutes[data.user.role] || '/login');

            return data;
        } catch (err) {
            // Surface the backend errorCode + message to the calling component
            const payload = err.response?.data || {
                success: false,
                errorCode: 'NETWORK_ERROR',
                message: 'Cannot reach the server. Please check your connection.',
            };
            throw payload;
        } finally {
            setLoading(false);
        }
    };

    // ─── NEW: OTP-Based Registration ─────────────────────────────────────────
    
    // Step 1: Request OTP
    const registerRequest = async (name, username, email, phone, nationalId, dob) => {
        setLoading(true);
        try {
            const { data } = await api.post('/auth/register-request', { 
                name, username, email, phone, nationalId, dob 
            });
            return data;
        } catch (err) {
            const payload = err.response?.data || {
                success: false,
                errorCode: 'NETWORK_ERROR',
                message: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك.',
            };
            throw payload;
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP and Login
    const registerVerify = async (name, username, email, password, phone, otp, studentId) => {
        setLoading(true);
        try {
            const { data } = await api.post('/auth/register-verify', { 
                name, username, email, password, phone, otp, studentId 
            });

            persistSession(data.token, data.user);
            navigate('/parent');

            return data;
        } catch (err) {
            const payload = err.response?.data || {
                success: false,
                errorCode: 'NETWORK_ERROR',
                message: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك.',
            };
            throw payload;
        } finally {
            setLoading(false);
        }
    };

    // ─── Patch user fields without full re-login ─────────────────────────────
    const updateUser = (patch) => {
        setUser(prev => {
            const updated = { ...prev, ...patch };
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
        });
    };

    // ─── Task FE-S1-6: logout() ──────────────────────────────────────────────
    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const value = {
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
