// src/components/ProtectedRoute.js
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    // User not authenticated, redirect to login
    return <Navigate to="/admin/login" replace />;
  }
  
  // If children exist, render them, otherwise render Outlet for nested routes
  return children ? children : <Outlet />;
};

export default ProtectedRoute;