import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';

const ReferralRedirect: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      // Перенаправляем на страницу логина/регистрации с реферальным кодом
      navigate(`/login?ref=${code}`);
    } else {
      // Если кода нет, просто на логин
      navigate('/login');
    }
  }, [code, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <Spin size="large" />
    </div>
  );
};

export default ReferralRedirect;
