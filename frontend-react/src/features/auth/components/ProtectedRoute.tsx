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
  const [shouldRedirect, setShouldRedirect] = React.useState(false);

  // Единственный источник правды о сессии — сервер. Токен лежит в
  // HttpOnly-куке, скрипту её не видно, поэтому раньше вход определяли по
  // метке 'cookie-session' в localStorage. Метка и кука живут порознь и
  // расходятся: браузер вычищал метку — и человека выбрасывало на страницу
  // входа с полностью рабочей сессией.
  const { isLoading, isError, error } = useQuery({
    queryKey: [...CURRENT_USER_KEY],
    queryFn: () => authApi.getCurrentUser(),
    enabled: !shouldRedirect,
    retry: 2,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  React.useEffect(() => {
    if (!isError) return;
    // Уводим на вход только при настоящем отказе в доступе. Обрыв связи или
    // таймаут — например, когда вкладка просыпается — выкидывать не должны:
    // запрос просто повторится.
    const status = (error as AxiosError | undefined)?.response?.status;
    if (status !== 401 && status !== 403) return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setShouldRedirect(true);
  }, [isError, error]);

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
