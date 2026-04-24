import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useTranslation } from 'react-i18next';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import DriverDashboard from './pages/DriverDashboard';
import ParentDashboard from './pages/ParentDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

// Admin pages (Sprint 2)
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import BusManagement from './pages/admin/BusManagement';
import FleetMap from './pages/admin/FleetMap';
import StudentManagement from './pages/admin/StudentManagement';
import AttendanceRecords from './pages/admin/AttendanceRecords';
import DriverManagement from './pages/admin/DriverManagement';
import ProfilePage from './pages/ProfilePage';

function App() {
    useAuth(); // ensures AuthContext is initialized (interceptors registered in context)
    const { i18n } = useTranslation();

    useEffect(() => {
        const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = i18n.language;
        document.documentElement.dir = dir;
    }, [i18n.language]);

    return (
        <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding" element={<Onboarding />} />

            {/* /super → requires role: 'superadmin' */}
            <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
                <Route path="/super" element={<SuperAdminDashboard />} />
            </Route>

            {/* /admin → requires role: 'schooladmin' — nested sub-routes */}
            <Route element={<ProtectedRoute allowedRoles={['schooladmin']} />}>
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="buses" element={<BusManagement />} />
                    <Route path="routes" element={<FleetMap />} />
                    <Route path="students" element={<StudentManagement />} />
                    <Route path="attendance" element={<AttendanceRecords />} />
                    <Route path="drivers" element={<DriverManagement />} />
                </Route>
                {/* Profile is a standalone full-page route — NOT nested inside AdminLayout */}
                <Route path="/admin/profile" element={<ProfilePage />} />
            </Route>

            {/* /driver → requires role: 'driver' */}
            <Route element={<ProtectedRoute allowedRoles={['driver']} />}>
                <Route path="/driver" element={<DriverDashboard />} />
                <Route path="/driver/profile" element={<ProfilePage />} />
            </Route>

            {/* /parent → requires role: 'parent' */}
            <Route element={<ProtectedRoute allowedRoles={['parent']} />}>
                <Route path="/parent" element={<ParentDashboard />} />
                <Route path="/parent/profile" element={<ProfilePage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}

export default App;
