import React, { useState, useEffect } from 'react';
import { Typography, Button, Modal, message, Spin, Result } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { authApi, type User } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import AdminLogin from '../components/admin/AdminLogin';

const { Title, Paragraph } = Typography;

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Проверка аутентификации
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
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

  // Обработчик успешного входа
  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setLoading(false);
  };

  const handleLogout = async () => {
    Modal.confirm({
      title: 'Выход из системы',
      content: 'Вы уверены, что хотите выйти?',
      okText: 'Выйти',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          const currentUser = user || await authApi.getCurrentUser();
          authApi.logout();
          message.success('Вы вышли из системы');
          
          if (currentUser && ['arbitrator', 'partner', 'admin', 'director'].includes(currentUser.role)) {
            navigate('/admin');
          } else {
            navigate('/admin');
          }
        } catch (error) {
          authApi.logout();
          message.success('Вы вышли из системы');
          navigate('/admin');
        }
      },
    });
  };

  // Если загрузка - показываем спиннер
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  // Если пользователь не авторизован - показываем форму входа
  if (!user) {
    return <AdminLogin onSuccess={handleLoginSuccess} />;
  }

  // Если пользователь - директор (проверяем по email, так как в БД у него роль admin)
  if (user.role === 'admin' && user.email === 'director@test.com') {
    navigate('/director');
    return null;
  }

  // Если пользователь авторизован, но не имеет роли admin - показываем ошибку доступа
  if (user.role !== 'admin') {
    return (
      <Result
        status="403"
        title="Доступ запрещен"
        subTitle="У вас нет прав для доступа к админ-панели."
        extra={
          <Button type="primary" onClick={() => navigate('/dashboard')}>
            Вернуться на главную
          </Button>
        }
      />
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: '24px auto', padding: '0 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2}>Административная панель</Title>
            <Paragraph>
              Панель управления системой
            </Paragraph>
          </div>
          <Button 
            type="primary" 
            danger 
            onClick={handleLogout}
            icon={<UserOutlined />}
          >
            Выйти
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
