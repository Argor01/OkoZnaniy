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
      <div className="adminLoginSession">
        <Card className="adminLoginLoadingCard" loading />
      </div>
    );
  }

  return (
    <div className="adminLoginPage">
      <div className="adminLoginDecorBubble" />
      <div className="adminLoginDecorBubbleAlt" />
      
      <Card className="adminLoginCard">
        <div className="adminLoginHeader">
          <div className="adminLoginIconWrapper">
            <CrownOutlined className="adminLoginIcon" />
          </div>
          <Title level={2} className="adminLoginTitle">
            Вход в админ-панель
          </Title>
          <Paragraph className="adminLoginSubtitle">
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
            label={<span className="adminLoginLabel">Email</span>}
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
              prefix={<MailOutlined className="adminLoginInputIcon" />}
              placeholder="Введите ваш email"
              size="large"
              disabled={loading}
              autoComplete="email"
              className="adminLoginInput"
              onPressEnter={() => {
                form.submit();
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span className="adminLoginLabel">Пароль</span>}
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
              prefix={<LockOutlined className="adminLoginInputIcon" />}
              placeholder="Введите ваш пароль"
              size="large"
              disabled={loading}
              autoComplete="current-password"
              className="adminLoginInput"
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
              className="adminLoginSubmit"
            >
              Войти
            </Button>
          </Form.Item>
        </Form>

        <>
          <Divider className="adminLoginDivider">
            Быстрый вход
          </Divider>
          <div className="adminLoginQuickList">
            
            <div className="adminLoginQuickGrid">
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
                    className="adminLoginQuickButton"
                  >
                    {account.label}
                  </Button>
                </Tooltip>
              ))}
            </div>
            
            <div className="adminLoginQuickSingle">
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
                    className="adminLoginQuickButton adminLoginQuickButtonWide"
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

