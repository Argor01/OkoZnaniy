import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { message, Modal } from 'antd';
import { authApi, type User } from '@/features/auth/api/auth';
import { ROUTES } from '@/utils/constants';

export const useAdminAuth = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const token = localStorage.getItem('access_token');
  const hasToken = !!token;

  const { data: user = null, isLoading: userLoading, isError } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => authApi.getCurrentUser(),
    enabled: hasToken,
    retry: false,
    staleTime: Infinity, // User data rarely changes automatically
  });

  // Effect to handle 401/error state
  useEffect(() => {
    if (isError && hasToken) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      queryClient.setQueryData(['current-user'], null);
    }
  }, [isError, hasToken, queryClient]);

  const loading = hasToken && userLoading;

  const handleLoginSuccess = (loggedInUser: User) => {
    queryClient.setQueryData(['current-user'], loggedInUser);
  };

  const handleQuickLogin = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ username: email, password });
      
      localStorage.setItem('access_token', response.access);
      localStorage.setItem('refresh_token', response.refresh);
      
      const currentUser = await authApi.getCurrentUser();
      queryClient.setQueryData(['current-user'], currentUser);
      
      message.success(`Вход выполнен как ${currentUser.username}`);
      
      if (currentUser.role === 'partner') {
        navigate(ROUTES.partner.root);
      } else if (currentUser.role === 'arbitrator') {
        navigate(ROUTES.arbitrator.root);
      } else if (currentUser.role === 'director') {
        navigate(ROUTES.admin.directorDashboard);
      } else if (currentUser.role === 'admin') {
        // Just invalidate queries to refresh admin data
        queryClient.invalidateQueries();
      }
    } catch (error: any) {
      message.error('Ошибка входа: ' + (error?.response?.data?.detail || 'Неизвестная ошибка'));
    }
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout();
      } catch (error) {
        // Ignore logout errors, just clear local state
        console.error('Logout error', error);
      }
    },
    onSettled: () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      queryClient.clear();
      queryClient.setQueryData(['current-user'], null);
      message.success('Вы вышли из системы');
    }
  });

  const handleLogout = () => {
    Modal.confirm({
      title: 'Выход из системы',
      content: 'Вы уверены, что хотите выйти?',
      okText: 'Выйти',
      cancelText: 'Отмена',
      maskStyle: {
        backdropFilter: 'blur(4px)',
      },
      onOk: async () => {
        await logoutMutation.mutateAsync();
        navigate('/');
      },
    });
  };

  const canLoadData = hasToken && !!user && user.role === 'admin';
  const isDirector = user?.role === 'director';
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';

  return {
    user,
    loading,
    hasToken,
    isAuthenticated,
    isAdmin,
    canLoadData,
    isDirector,
    checkAuth: () => queryClient.invalidateQueries({ queryKey: ['current-user'] }),
    handleLoginSuccess,
    handleQuickLogin,
    handleLogout,
  };
};
