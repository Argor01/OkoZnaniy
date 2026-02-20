import React from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    return <Navigate to={ROUTES.login} replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;
