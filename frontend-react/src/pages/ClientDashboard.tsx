import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin } from 'antd';

/**
 * ClientDashboard больше не используется.
 * Все пользователи (клиенты и эксперты) перенаправляются на ExpertDashboard.
 */
const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Автоматически перенаправляем на ExpertDashboard
    navigate('/expert', { replace: true });
  }, [navigate]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <Spin size="large" />
      <p>Перенаправление на главный дашборд...</p>
    </div>
  );
};

export default ClientDashboard;
