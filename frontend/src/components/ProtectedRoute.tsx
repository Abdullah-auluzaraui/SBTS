import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';
import DashboardSkeleton from './DashboardSkeleton';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

const ROLE_HOME: Record<UserRole, string> = {
  superadmin: '/super',
  schooladmin: '/admin',
  driver: '/driver',
  parent: '/parent',
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated, initialLoading } = useAuth();
  const location = useLocation();

  if (initialLoading) {
    return <DashboardSkeleton />;
  }

  // If the user is not logged in, redirect to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If logged in but role not authorized, redirect to their home dashboard
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const home = ROLE_HOME[user.role] ?? '/login';
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
