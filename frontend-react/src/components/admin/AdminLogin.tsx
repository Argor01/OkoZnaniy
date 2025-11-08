import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Space, Divider, Tooltip } from 'antd';
import { 
  MailOutlined, 
  LockOutlined, 
  TeamOutlined, 
  CrownOutlined, 
  SafetyOutlined, 
  BankOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi, type LoginRequest, type User } from '../../api/auth';
import { DEV_ACCOUNTS, type DevAccount } from '../../config/devAccounts';
import { redirectByRole } from '../../utils/roleRedirect';

const { Title, Paragraph } = Typography;

interface AdminLoginProps {
  onSuccess?: (user: User) => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // Функция для обработки ошибок
  const handleError = (error: any): string => {
    // Ошибка сети
    if (!error.response) {
      return 'Ошибка соединения с сервером. Проверьте подключение к интернету.';
    }

    const status = error.response?.status;
    const data = error.response?.data;

    // Разные типы ошибок
    switch (status) {
      case 400:
        // Неверные данные
        if (data?.detail) {
          return data.detail;
        }
        if (data?.non_field_errors) {
          return Array.isArray(data.non_field_errors) 
            ? data.non_field_errors.join(', ') 
            : data.non_field_errors;
        }
        return 'Неверные данные. Проверьте введенные email и пароль.';
      
      case 401:
        // Неавторизован
        return 'Неверный email или пароль. Проверьте правильность данных.';
      
      case 403:
        // Доступ запрещен
        return 'Доступ запрещен. У вас нет прав для входа.';
      
      case 404:
        // Пользователь не найден
        return 'Пользователь с указанным email не найден.';
      
      case 500:
        // Ошибка сервера
        return 'Ошибка на сервере. Попробуйте позже.';
      
      default:
        // Общая ошибка
        if (data?.detail) {
          return data.detail;
        }
        if (data?.message) {
          return data.message;
        }
        return 'Произошла ошибка при входе. Попробуйте еще раз.';
    }
  };

  const handleLogin = async (values: LoginRequest) => {
    setLoading(true);
    try {
      const auth = await authApi.login(values);
      message.success('Успешный вход!');
      
      const role = auth?.user?.role || '';
      
      // Если есть callback (значит мы на странице админ-панели)
      if (onSuccess && auth?.user) {
        // Только для admin показываем панель, директор должен редиректиться
        if (role === 'admin') {
          onSuccess(auth.user);
          // Остаемся на странице, AdminDashboard покажет панель
          return;
        }
        // Для директора делаем редирект на его страницу (проверяем по email)
        if (role === 'admin' && auth?.user?.email === 'director@test.com') {
          await redirectByRole(role, navigate, auth.user.email);
          return;
        }
      }
      
      // Редирект в зависимости от роли пользователя (передаем email для определения директора)
      await redirectByRole(role, navigate, auth?.user?.email);
    } catch (error: any) {
      const errorMessage = handleError(error);
      message.error(errorMessage);
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Функция быстрого входа
  const handleQuickLogin = async (account: DevAccount) => {
    setLoading(true);
    try {
      // Автозаполнение формы
      form.setFieldsValue({
        username: account.email,
        password: account.password
      });
      
      // Выполнение входа
      const auth = await authApi.login({
        username: account.email,
        password: account.password
      });
      
      message.success(`Успешный вход как ${account.label}!`);
      
      // Если есть callback (значит мы на странице админ-панели)
      if (onSuccess && auth?.user) {
        // Проверяем, не директор ли это (по email)
        const isDirector = auth.user.email === 'director@test.com';
        
        // Если это директор, редиректим на его страницу
        if (isDirector || account.role === 'director') {
          await redirectByRole(account.role, navigate, auth.user.email);
          return;
        }
        
        // Только для admin (не директор) показываем панель
        if (account.role === 'admin') {
          onSuccess(auth.user);
          // Остаемся на странице, AdminDashboard покажет панель
          return;
        }
      }
      
      // Редирект в зависимости от роли (передаем email для определения директора)
      await redirectByRole(account.role, navigate, auth?.user?.email || account.email);
    } catch (error: any) {
      const errorMessage = handleError(error);
      message.error(`Ошибка входа как ${account.label}: ${errorMessage}`);
      console.error(`Quick login error for ${account.label}:`, error);
    } finally {
      setLoading(false);
    }
  };

  // Получить иконку для роли
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'partner':
        return <TeamOutlined />;
      case 'admin':
        return <CrownOutlined />;
      case 'arbitrator':
        return <SafetyOutlined />;
      case 'director':
        return <BankOutlined />;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        overflow: 'hidden',
      }}
    >
      {/* Декоративные элементы */}
      <div
        style={{
          position: 'absolute',
          top: '-50px',
          left: '-50px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-100px',
          right: '-100px',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.08)',
          zIndex: 0,
        }}
      />
      
      <Card
        style={{
          width: '100%',
          maxWidth: '500px',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          border: 'none',
          position: 'relative',
          zIndex: 1,
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              marginBottom: '16px',
            }}
          >
            <CrownOutlined style={{ fontSize: '32px', color: '#fff' }} />
          </div>
          <Title level={2} style={{ marginBottom: '8px', color: '#1a1a1a' }}>
            Вход в админ-панель
          </Title>
          <Paragraph style={{ color: '#666', marginBottom: 0, fontSize: '14px' }}>
            Введите email и пароль для доступа к административной панели
          </Paragraph>
        </div>

        <Form
          form={form}
          onFinish={handleLogin}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            name="username"
            label={<span style={{ fontWeight: 500, fontSize: '14px' }}>Email</span>}
            rules={[
              { 
                required: true, 
                message: 'Пожалуйста, введите email' 
              },
              { 
                type: 'email', 
                message: 'Введите корректный email адрес' 
              },
              {
                whitespace: true,
                message: 'Email не может быть пустым'
              },
              {
                max: 254,
                message: 'Email слишком длинный (максимум 254 символа)'
              }
            ]}
            validateTrigger="onBlur"
          >
            <Input
              prefix={<MailOutlined style={{ color: '#999' }} />}
              placeholder="Введите ваш email"
              size="large"
              disabled={loading}
              autoComplete="email"
              style={{
                borderRadius: '8px',
                fontSize: '15px',
                padding: '8px 12px',
              }}
              onPressEnter={() => {
                form.submit();
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span style={{ fontWeight: 500, fontSize: '14px' }}>Пароль</span>}
            rules={[
              { 
                required: true, 
                message: 'Пожалуйста, введите пароль' 
              },
              { 
                min: 6, 
                message: 'Пароль должен содержать минимум 6 символов' 
              },
              {
                max: 128,
                message: 'Пароль слишком длинный (максимум 128 символов)'
              },
              {
                whitespace: false,
                message: 'Пароль не может содержать только пробелы'
              }
            ]}
            validateTrigger="onBlur"
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#999' }} />}
              placeholder="Введите ваш пароль"
              size="large"
              disabled={loading}
              autoComplete="current-password"
              style={{
                borderRadius: '8px',
                fontSize: '15px',
                padding: '8px 12px',
              }}
              onPressEnter={() => {
                form.submit();
              }}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{
                marginTop: '8px',
                height: '48px',
                fontSize: '16px',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
            >
              Войти
            </Button>
          </Form.Item>
        </Form>

        {/* Кнопки быстрого входа (только в режиме разработки) */}
        {import.meta.env.DEV && (
          <>
            <Divider 
              style={{ 
                margin: '32px 0 20px 0',
                borderColor: '#e8e8e8',
                fontSize: '13px',
                color: '#999',
                fontWeight: 500,
              }}
            >
              Быстрый вход
            </Divider>
            <Space 
              direction="vertical" 
              size="middle" 
              style={{ width: '100%' }}
            >
              <Space 
                wrap 
                style={{ 
                  width: '100%', 
                  justifyContent: 'center',
                  gap: '12px',
                }}
              >
                {DEV_ACCOUNTS.map((account) => (
                  <Tooltip
                    key={account.role}
                    title={`Войти как ${account.label} (${account.email})`}
                    placement="top"
                  >
                    <Button
                      icon={getRoleIcon(account.role)}
                      onClick={() => handleQuickLogin(account)}
                      loading={loading}
                      disabled={loading}
                      size="large"
                      style={{
                        minWidth: '140px',
                        height: '44px',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease',
                        border: '1px solid #d9d9d9',
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                          e.currentTarget.style.borderColor = '#667eea';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.borderColor = '#d9d9d9';
                        }
                      }}
                    >
                      {account.label}
                    </Button>
                  </Tooltip>
                ))}
              </Space>
            </Space>
          </>
        )}
      </Card>
    </div>
  );
};

export default AdminLogin;

