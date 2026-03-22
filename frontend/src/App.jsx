import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
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
import RouteManagement from './pages/admin/RouteManagement';
import StudentManagement from './pages/admin/StudentManagement';
import AttendanceRecords from './pages/admin/AttendanceRecords';
import DriverManagement from './pages/admin/DriverManagement';

function App() {
    useAuth(); // ensures AuthContext is initialized (interceptors registered in context)

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
                    <Route path="routes" element={<RouteManagement />} />
                    <Route path="students" element={<StudentManagement />} />
                    <Route path="attendance" element={<AttendanceRecords />} />
                    <Route path="drivers" element={<DriverManagement />} />
                </Route>
            </Route>

            {/* /driver → requires role: 'driver' */}
            <Route element={<ProtectedRoute allowedRoles={['driver']} />}>
                <Route path="/driver" element={<DriverDashboard />} />
            </Route>

            {/* /parent → requires role: 'parent' */}
            <Route element={<ProtectedRoute allowedRoles={['parent']} />}>
                <Route path="/parent" element={<ParentDashboard />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}

export default App;
