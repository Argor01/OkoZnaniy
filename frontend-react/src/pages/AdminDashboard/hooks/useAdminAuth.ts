import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { message, Modal } from 'antd';
import { authApi, type User } from '../../../api/auth';
import { ROUTES } from '../../../utils/constants';


export const useAdminAuth = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const hasToken = !!localStorage.getItem('access_token');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      setUser(null);
      return;
    }
    
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setLoading(false);
  };

  /**
   * Быстрый вход для тестирования
   */
  const handleQuickLogin = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await authApi.login({ username: email, password });
      
      // Сохраняем токены
      localStorage.setItem('access_token', response.access);
      localStorage.setItem('refresh_token', response.refresh);
      
      // Получаем данные пользователя
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      
      message.success(`Вход выполнен как ${currentUser.username}`);
      
      // Перенаправляем в зависимости от роли
      if (currentUser.role === 'partner') {
        navigate(ROUTES.partner.root);
      } else if (currentUser.role === 'arbitrator') {
        navigate(ROUTES.arbitrator.root);
      } else if (currentUser.role === 'director') {
        navigate(ROUTES.admin.directorDashboard);
      } else if (currentUser.role === 'admin') {
        queryClient.invalidateQueries();
      }
    } catch (error: any) {
      message.error('Ошибка входа: ' + (error?.response?.data?.detail || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };


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
        try {
          authApi.logout();
          queryClient.clear();
          setUser(null);
          setLoading(false);
          message.success('Вы вышли из системы');
        } catch (error) {
          authApi.logout();
          queryClient.clear();
          setUser(null);
          setLoading(false);
          message.success('Вы вышли из системы');
        }
      },
    });
  };

  // Вычисляемые значения
  const canLoadData = hasToken && !!user && user.role === 'admin';
  const isDirector = user?.role === 'director';
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';

  return {
    // Состояние
    user,
    loading,
    hasToken,
    isAuthenticated,
    isAdmin,
    canLoadData,
    isDirector,
    
    // Методы
    checkAuth,
    handleLoginSuccess,
    handleQuickLogin,
    handleLogout,
  };
};
