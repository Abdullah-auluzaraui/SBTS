import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import DriverDashboard from './pages/DriverDashboard';
import ParentDashboard from './pages/ParentDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

function App() {
    useAuth(); // ensures AuthContext is initialized (interceptors registered in context)

    return (
        <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Task FE-S1-8: Role-based redirect routing structure (v2.0: 4 roles) */}

            {/* /super → requires role: 'superadmin' */}
            <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
                <Route path="/super" element={<SuperAdminDashboard />} />
            </Route>

            {/* /admin → requires role: 'schooladmin' */}
            <Route element={<ProtectedRoute allowedRoles={['schooladmin']} />}>
                <Route path="/admin" element={<AdminDashboard />} />
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
