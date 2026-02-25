import React from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spin } from 'antd';
import { authApi } from '@/features/auth';
import { ROUTES } from '@/utils/constants';
import { QUERY_KEYS } from '@/config/queryKeys';

export const DashboardRedirect: React.FC = () => {
  const token = localStorage.getItem('access_token');

  const { data: userProfile, isLoading } = useQuery({
    queryKey: QUERY_KEYS.user.profile,
    queryFn: () => authApi.getCurrentUser(),
    enabled: !!token,
  });

  if (!token) return <Navigate to={ROUTES.login} replace />;

  if (isLoading) {
    return (
      <div className="fullScreenCenter">
        <Spin size="large" />
      </div>
    );
  }

  const role = userProfile?.role ?? '';

  if (role === 'partner') return <Navigate to={ROUTES.partner.root} replace />;
  if (role === 'admin') return <Navigate to={ROUTES.admin.dashboard} replace />;
  if (role === 'director') return <Navigate to={ROUTES.admin.directorDashboard} replace />;
  if (role === 'arbitrator') return <Navigate to={ROUTES.arbitrator.root} replace />;

  return <Navigate to={ROUTES.expert.root} replace />;
};
