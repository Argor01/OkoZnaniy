import React from 'react';
import type { AxiosError } from 'axios';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spin } from 'antd';
import { authApi } from '@/features/auth/api/auth';
import { ROUTES } from '@/utils/constants';
import { CURRENT_USER_KEY } from '@/hooks/queries';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem('access_token');
  const [shouldRedirect, setShouldRedirect] = React.useState(false);
  
  const { isLoading, isError, error } = useQuery({
    queryKey: [...CURRENT_USER_KEY],
    queryFn: () => authApi.getCurrentUser(),
    enabled: !!token && !shouldRedirect,
    retry: 2,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  React.useEffect(() => {
    if (!token) return;
    if (!isError) return;
    // Only force logout on a genuine auth failure (session expired/invalid).
    // Network errors or timeouts — e.g. right after the tab wakes from sleep —
    // must NOT kick the user out; the query will simply retry.
    const status = (error as AxiosError | undefined)?.response?.status;
    if (status !== 401 && status !== 403) return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setShouldRedirect(true);
  }, [isError, error, token]);

  if (!token) {
    return <Navigate to={ROUTES.login} replace />;
  }

  if (shouldRedirect) return <Navigate to={ROUTES.login} replace />;

  if (isLoading) {
    return (
      <div className="fullScreenCenter">
        <Spin size="large" />
      </div>
    );
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;
