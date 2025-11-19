import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const GoogleCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Получаем токены из URL параметров
    const access = searchParams.get('access');
    const refresh = searchParams.get('refresh');
    const userId = searchParams.get('user_id');
    const username = searchParams.get('username');
    const role = searchParams.get('role');
    const error = searchParams.get('error');

    if (error) {
      console.error('Google auth error:', error);
      navigate('/login?error=google_auth_failed');
      return;
    }

    if (access && refresh && userId && username && role) {
      // Сохраняем токены в localStorage
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify({
        id: parseInt(userId),
        username,
        role
      }));

      console.log('✅ Google авторизация успешна');

      // Перенаправляем на соответствующую страницу в зависимости от роли
      let redirectUrl = '/dashboard';
      if (role === 'expert') {
        redirectUrl = '/expert';
      } else if (role === 'partner') {
        redirectUrl = '/partner';
      } else if (role === 'admin') {
        redirectUrl = '/admin';
      } else if (role === 'arbitrator') {
        redirectUrl = '/arbitrator';
      }

      navigate(redirectUrl);
    } else {
      console.error('Missing auth parameters');
      navigate('/login?error=missing_params');
    }
  }, [searchParams, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <p>Завершаем авторизацию через Google...</p>
    </div>
  );
};

export default GoogleCallback;
