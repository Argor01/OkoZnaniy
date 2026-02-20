import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { message, Modal } from 'antd';
import { authApi, type User } from '../../../api/auth';

/**
 * Хук для управления аутентификацией в админской панели
 * Вынесен из монолитного AdminDashboard.tsx
 */
export const useAdminAuth = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const hasToken = !!localStorage.getItem('access_token');

  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * Проверка текущей аутентификации
   */
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
      // Токен невалиден
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Обработчик успешного входа
   */
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
        navigate('/partner');
      } else if (currentUser.role === 'arbitrator') {
        navigate('/arbitrator');
      } else if (currentUser.role === 'director') {
        navigate('/admin/directordashboard');
      } else if (currentUser.role === 'admin') {
        // Остаемся на админ-панели
        queryClient.invalidateQueries();
      }
    } catch (error: any) {
      message.error('Ошибка входа: ' + (error?.response?.data?.detail || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Выход из системы
   */
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
          // В случае ошибки все равно выходим
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
