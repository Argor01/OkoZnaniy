import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Tabs, Select } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi, type LoginRequest, type RegisterRequest } from '../api/auth';
import { ordersApi } from '../api/orders';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [registerForm] = Form.useForm();
  const navigate = useNavigate();
  
  // Автоматически подставляем реферальный код при загрузке
  React.useEffect(() => {
    const savedReferralCode = localStorage.getItem('referral_code');
    if (savedReferralCode) {
      registerForm.setFieldsValue({ referral_code: savedReferralCode });
    }
  }, [registerForm]);

  // Функция для проверки наличия заказов у клиента
  const checkClientOrders = async (): Promise<boolean> => {
    try {
      const ordersData = await ordersApi.getClientOrders();
      const orders = ordersData?.results || ordersData || [];
      return orders.length > 0;
    } catch (error) {
      console.error('Ошибка при проверке заказов:', error);
      return false;
    }
  };

  // Функция для определения куда перенаправить клиента
  const redirectClient = async () => {
    const hasOrders = await checkClientOrders();
    if (hasOrders) {
      navigate('/dashboard');
    } else {
      navigate('/create-order');
    }
  };

  const onLogin = async (values: LoginRequest) => {
    setLoading(true);
    try {
      const auth = await authApi.login(values);
      message.success('Успешный вход!');
      const role = auth?.user?.role;
      if (role === 'client') {
        await redirectClient();
      } else if (role === 'expert') {
        navigate('/expert');
      } else if (role === 'partner') {
        navigate('/partner');
      } else if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'arbitrator') {
        navigate('/arbitrator');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (values: RegisterRequest) => {
    setLoading(true);
    try {
      // Очищаем пустые поля перед отправкой
      const cleanValues = {
        email: values.email || undefined,
        phone: values.phone || undefined,
        password: values.password,
        password2: values.password2,
        role: values.role || 'client',
      } as RegisterRequest;
      
      console.log('Sending registration data:', cleanValues);
      
      await authApi.register(cleanValues);
      message.success('Регистрация успешна! Выполняется вход...');
      
      // Автологин после регистрации
      const loginData = {
        username: values.email || values.phone || '',
        password: values.password
      };
      
      try {
        const auth = await authApi.login(loginData);
        message.success('Добро пожаловать!');
        const role = auth?.user?.role;
        if (role === 'client') {
          await redirectClient();
        } else if (role === 'expert') {
          navigate('/expert');
        } else if (role === 'partner') {
          navigate('/partner');
        } else {
          navigate('/dashboard');
        }
      } catch (loginError) {
        message.warning('Регистрация успешна, но не удалось войти автоматически. Войдите вручную.');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorData = error?.response?.data;
      if (errorData && typeof errorData === 'object') {
        const entries = Object.entries(errorData as Record<string, any>);
        if (entries.length === 0) {
          message.error('Ошибка регистрации');
        } else {
          entries.forEach(([_, v]) => {
            if (Array.isArray(v)) {
              v.forEach((msg) => message.error(String(msg)));
            } else if (typeof v === 'string') {
              message.error(v);
            } else if (v && typeof v === 'object' && 'detail' in v) {
              message.error(String(v.detail));
            }
          });
        }
      } else {
        message.error(error?.message || 'Ошибка регистрации');
      }
    } finally {
      setLoading(false);
    }
  };

  const loginForm = (
    <Form onFinish={onLogin} layout="vertical">
      <Form.Item
        name="username"
        rules={[{ required: true, message: 'Введите email или телефон ' }]}
      >
        <Input prefix={<UserOutlined />} placeholder="Email или телефон" />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[{ required: true, message: 'Введите пароль' }]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Пароль" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          Войти
        </Button>
      </Form.Item>
    </Form>
  );

  const registerFormComponent = (
    <Form form={registerForm} onFinish={onRegister} layout="vertical">
      <Form.Item 
        name="email" 
        rules={[
          { type: 'email', message: 'Некорректный email' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              const phone = getFieldValue('phone');
              if (!value && !phone) {
                return Promise.reject(new Error('Укажите email или телефон'));
              }
              return Promise.resolve();
            },
          }),
        ]}
      > 
        <Input prefix={<MailOutlined />} placeholder="Email (или оставьте пустым)" />
      </Form.Item>
      <Form.Item 
        name="phone"
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value) {
              const email = getFieldValue('email');
              if (!value && !email) {
                return Promise.reject(new Error('Укажите email или телефон'));
              }
              return Promise.resolve();
            },
          }),
        ]}
      >
        <Input prefix={<PhoneOutlined />} placeholder="Телефон (или оставьте пустым)" />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[{ required: true, message: 'Введите пароль' }]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Пароль" />
      </Form.Item>
      <Form.Item
        name="password2"
        rules={[
          { required: true, message: 'Подтвердите пароль' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('Пароли не совпадают'));
            },
          }),
        ]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Подтвердите пароль" />
      </Form.Item>
      <Form.Item
        name="role"
        rules={[{ required: true, message: 'Выберите роль' }]}
        initialValue="client"
      >
        <Select placeholder="Выберите роль">
          <Select.Option value="client">Клиент</Select.Option>
          <Select.Option value="expert">Эксперт</Select.Option>
          <Select.Option value="partner">Партнер</Select.Option>
          <Select.Option value="arbitrator">Арбитр</Select.Option>
          <Select.Option value="admin">Администратор</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item
        name="referral_code"
        label="Реферальный код (необязательно)"
      >
        <Input placeholder="Введите реферальный код, если есть" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          Зарегистрироваться
        </Button>
      </Form.Item>
    </Form>
  );

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={2}>Око Знаний</Title>
          <Text type="secondary">Войдите в систему или зарегистрируйтесь</Text>
        </div>
        
        <Tabs
          defaultActiveKey="login"
          items={[
            {
              key: 'login',
              label: 'Вход',
              children: loginForm,
            },
            {
              key: 'register',
              label: 'Регистрация',
              children: registerFormComponent,
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default Login;
