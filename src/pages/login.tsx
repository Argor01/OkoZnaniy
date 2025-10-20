import React from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { Typography } from 'antd';

const { Title } = Typography;

const LoginPage: React.FC = () => {
  return (
    <div className="login-page">
      <Title level={1} style={{ textAlign: 'center', marginBottom: 48 }}>
        Биржа студенческих работ
      </Title>
      <LoginForm />

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 24px;
          background: #f0f2f5;
        }
      `}</style>
    </div>
  );
};

export default LoginPage; 