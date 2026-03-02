import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardSkeleton from './DashboardSkeleton';

// Task FE-S1-5: ProtectedRoute
const ProtectedRoute = ({ allowedRoles }) => {
    const { user, isAuthenticated, initialLoading } = useAuth();
    const location = useLocation();

    if (initialLoading) {
        return <DashboardSkeleton />;
    }

    // If the user is not logged in, redirect them to /login
    if (!isAuthenticated) {
        // We can also pass the location they tried to access using state
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If the user is logged in but their role does not match the required role for the route
    if (allowedRoles && !allowedRoles.includes(user?.role)) {
        // Redirect them to their specific dashboard based on their role
        switch (user?.role) {
            case 'admin':
                return <Navigate to="/admin" replace />;
            case 'driver':
                return <Navigate to="/driver" replace />;
            case 'parent':
                return <Navigate to="/parent" replace />;
            default:
                // Fallback for unknown role
                return <Navigate to="/login" replace />;
        }
    }

    // If authenticated and authorized, render the child routes
    return <Outlet />;
};

export default ProtectedRoute;
