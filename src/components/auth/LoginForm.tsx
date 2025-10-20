import React from 'react';
import { Form, Button, Typography } from 'antd';
import { useDispatch } from 'react-redux';
import { FormField } from '../shared/Form/FormField';
import { useApi } from '@/hooks/useApi';
import { setCredentials } from '@/store/slices/authSlice';
import { useRouter } from 'next/router';

const { Title } = Typography;

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginResponse {
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: 'client' | 'expert';
  };
  token: string;
}

export const LoginForm: React.FC = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const api = useApi();

  const handleSubmit = async (values: LoginFormData) => {
    try {
      const response = await api.post<LoginResponse>('/api/auth/login/', values);
      dispatch(setCredentials(response));
      router.push('/orders');
    } catch (error) {
      // Ошибка уже обработана в useApi
      console.error('Login error:', error);
    }
  };

  return (
    <div className="login-form">
      <Title level={2}>Вход в систему</Title>
      <Form
        name="login"
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <FormField
          name="email"
          label="Email"
          type="email"
          required
          rules={[
            {
              type: 'email',
              message: 'Пожалуйста, введите корректный email',
            },
          ]}
        />

        <FormField
          name="password"
          label="Пароль"
          type="password"
          required
        />

        <Form.Item>
          <Button type="primary" htmlType="submit" block>
            Войти
          </Button>
        </Form.Item>
      </Form>

      <style jsx>{`
        .login-form {
          max-width: 400px;
          margin: 40px auto;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          background: white;
        }
      `}</style>
    </div>
  );
}; 