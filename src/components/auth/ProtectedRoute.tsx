import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Spin } from 'antd';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Array<'client' | 'expert'>;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  roles,
}: ProtectedRouteProps) => {
  const router = useRouter();
  const { user, loading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (roles && user && !roles.includes(user.role)) {
      router.push('/403');
    }
  }, [user, loading, roles, router]);

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <style jsx>{`
          .loading-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (roles && !roles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}; 