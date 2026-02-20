import React from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spin } from 'antd';
import { authApi } from '../api/auth';
import { ROUTES } from '../utils/constants';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem('access_token');
  const [shouldRedirect, setShouldRedirect] = React.useState(false);
  
  const { isLoading, isError } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
    enabled: !!token && !shouldRedirect,
    retry: false,
  });

  React.useEffect(() => {
    if (!token) return;
    if (!isError) return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setShouldRedirect(true);
  }, [isError, token]);

  if (!token) {
    return <Navigate to={ROUTES.login} replace />;
  }

  if (shouldRedirect) return <Navigate to={ROUTES.login} replace />;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;
