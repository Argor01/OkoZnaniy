import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authApi } from '../api/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem('access_token');
  const [authorized, setAuthorized] = useState<boolean | null>(token ? true : null);

  useEffect(() => {
    let mounted = true;
    if (!token) {
      authApi
        .getCurrentUser()
        .then(() => {
          if (mounted) setAuthorized(true);
        })
        .catch(() => {
          if (mounted) setAuthorized(false);
        });
    }
    return () => {
      mounted = false;
    };
  }, [token]);

  if (authorized === false) {
    return <Navigate to="/login" replace />;
  }

  if (authorized === null) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
