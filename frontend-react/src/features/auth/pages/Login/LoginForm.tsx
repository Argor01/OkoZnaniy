import React from 'react';
import { Form, Input, Button } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import type { LoginRequest } from '@/features/auth/api/auth';
import SocialLoginButtons from '../../components/SocialLoginButtons';

interface LoginFormProps {
  loading: boolean;
  onLogin: (values: LoginRequest) => void;
  onForgotPassword: () => void;
  onTelegramAuth: (user: any) => void;
  onTelegramError: (error: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  loading,
  onLogin,
  onForgotPassword,
  onTelegramAuth,
  onTelegramError,
}) => {
  const [form] = Form.useForm();

  return (
    <Form form={form} onFinish={onLogin} layout="vertical">
      <Form.Item
        label="Email"
        name="username"
        rules={[{ required: true, message: 'Введите email' }]}
      >
        <Input prefix={<UserOutlined />} placeholder="Email" />
      </Form.Item>
      <Form.Item
        label="Пароль"
        name="password"
        rules={[{ required: true, message: 'Введите пароль' }]}
        extra={
          <Button
            type="link"
            htmlType="button"
            className="forgot-password-link"
            onClick={onForgotPassword}
          >
            Забыли пароль?
          </Button>
        }
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Пароль" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          Войти
        </Button>
      </Form.Item>
      <Form.Item>
        <SocialLoginButtons
          onTelegramAuth={onTelegramAuth}
          onTelegramError={onTelegramError}
        />
      </Form.Item>
    </Form>
  );
};

export default LoginForm;
