import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';

const ReferralRedirect: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      // Сохраняем реферальный код в localStorage
      localStorage.setItem('referral_code', code);
      
      // Перенаправляем на страницу входа/регистрации с параметром ref
      // Это гарантирует, что код будет сохранен даже если localStorage не сработает
      navigate(`/login?ref=${code}`, { replace: true });
    } else {
      // Если кода нет, просто на страницу входа
      navigate('/login', { replace: true });
    }
  }, [code, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <Spin size="large" />
      <p style={{ color: '#666', fontSize: '16px' }}>
        Переход по реферальной ссылке...
      </p>
    </div>
  );
};

export default ReferralRedirect;
