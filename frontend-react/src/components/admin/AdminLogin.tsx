import React, { useEffect, useState } from 'react';
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
  const [sessionLoading, setSessionLoading] = useState(true);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const token = localStorage.getItem('access_token');
    if (!token) {
      setSessionLoading(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const user = await authApi.getCurrentUser();
        if (cancelled) return;
        await redirectByRole(user?.role ?? '', navigate);
      } catch (_error) {
        authApi.logout();
      } finally {
        if (!cancelled) {
          setSessionLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  
  const handleError = (error: any): string => {
    
    if (!error.response) {
      return 'Ошибка соединения с сервером. Проверьте подключение к интернету.';
    }

    const status = error.response?.status;
    const data = error.response?.data;

    
    switch (status) {
      case 400:
        
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
        
        return 'Неверный email или пароль. Проверьте правильность данных.';
      
      case 403:
        
        return 'Доступ запрещен. У вас нет прав для входа.';
      
      case 404:
        
        return 'Пользователь с указанным email не найден.';
      
      case 500:
        
        return 'Ошибка на сервере. Попробуйте позже.';
      
      default:
        
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
      
      
      if (onSuccess && auth?.user) {
        
        if (role === 'admin') {
          onSuccess(auth.user);
          
          return;
        }
      }
      
      
      await redirectByRole(role, navigate);
    } catch (error: any) {
      const errorMessage = handleError(error);
      message.error(errorMessage);
      if (import.meta.env.DEV && localStorage.getItem('debug_api') === '1') {
        console.error('Login error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  
  const handleQuickLogin = async (account: DevAccount) => {
    setLoading(true);
    try {
      
      form.setFieldsValue({
        username: account.email,
        password: account.password
      });
      
      
      const auth = await authApi.login({
        username: account.email,
        password: account.password
      });
      
      message.success(`Успешный вход как ${account.label}!`);
      
      
      if (onSuccess && auth?.user) {
        
        if (account.role === 'admin') {
          onSuccess(auth.user);
          
          return;
        }
      }
      
      
      await redirectByRole(account.role, navigate);
    } catch (error: any) {
      const errorMessage = handleError(error);
      message.error(`Ошибка входа как ${account.label}: ${errorMessage}`);
      if (import.meta.env.DEV && localStorage.getItem('debug_api') === '1') {
        console.error(`Quick login error for ${account.label}:`, error);
      }
    } finally {
      setLoading(false);
    }
  };

  
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

  if (sessionLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}
      >
        <Card style={{ width: '100%', maxWidth: '480px', borderRadius: '20px' }} loading />
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--color-brand-blue-600) 0%, #b9e0ff 100%)',
        padding: '40px 20px',
        overflow: 'hidden',
      }}
    >
      
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: '15%',
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 150,
          right: '20%',
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'rgba(155, 74, 255, 0.15)',
          zIndex: 0,
        }}
      />
      
      <Card
        style={{
          width: '100%',
          maxWidth: '480px',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-card)',
          border: 'none',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '16px',
              background: 'var(--color-brand-blue-600)',
              borderRadius: '12px',
              marginBottom: '16px',
            }}
          >
            <CrownOutlined style={{ fontSize: '32px', color: '#fff' }} />
          </div>
          <Title level={2} style={{ marginBottom: '8px', color: '#1a1a1a', fontFamily: 'var(--font-family-display)' }}>
            Вход в админ-панель
          </Title>
          <Paragraph style={{ color: '#666', marginBottom: 0, fontSize: '16px' }}>
            Введите email и пароль для доступа к админ-панели
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
                borderRadius: '8px',
              }}
            >
              Войти
            </Button>
          </Form.Item>
        </Form>

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            
            <div 
              style={{ 
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}
            >
              {DEV_ACCOUNTS.filter(acc => acc.role !== 'director').map((account) => (
                <Tooltip
                  key={account.email}
                  title={`${account.email}`}
                  placement="top"
                >
                  <Button
                    icon={getRoleIcon(account.role)}
                    onClick={() => handleQuickLogin(account)}
                    loading={loading}
                    disabled={loading}
                    size="large"
                    style={{
                      height: '56px',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      border: '1px solid #e0e0e0',
                      background: '#fff',
                      color: '#333',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-brand-blue-600)';
                      e.currentTarget.style.color = 'var(--color-brand-blue-600)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e0e0e0';
                      e.currentTarget.style.color = '#333';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {account.label}
                  </Button>
                </Tooltip>
              ))}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {DEV_ACCOUNTS.filter(acc => acc.role === 'director').map((account) => (
                <Tooltip
                  key={account.email}
                  title={`${account.email}`}
                  placement="top"
                >
                  <Button
                    icon={getRoleIcon(account.role)}
                    onClick={() => handleQuickLogin(account)}
                    loading={loading}
                    disabled={loading}
                    size="large"
                    style={{
                      height: '56px',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      border: '1px solid #e0e0e0',
                      background: '#fff',
                      color: '#333',
                      transition: 'all 0.3s ease',
                      minWidth: '200px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-brand-blue-600)';
                      e.currentTarget.style.color = 'var(--color-brand-blue-600)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e0e0e0';
                      e.currentTarget.style.color = '#333';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {account.label}
                  </Button>
                </Tooltip>
              ))}
            </div>
          </div>
        </>
      </Card>
    </div>
  );
};

export default AdminLogin;

