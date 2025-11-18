import React from 'react';

interface SocialLoginButtonsProps {
  onTelegramAuth?: (user: any) => void;
  onTelegramError?: (error: string) => void;
}

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = () => {
  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
  const googleHref = `/auth/google`;
  const vkHref = `${API_BASE_URL}/api/accounts/vk/login/`;
  
  // Генерируем уникальный ID для сессии авторизации
  const generateAuthId = () => {
    return `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleTelegramAuth = () => {
    const authId = generateAuthId();
    // Сохраняем ID в localStorage для проверки после авторизации
    localStorage.setItem('telegram_auth_id', authId);
    
    // Открываем бота с параметром auth_id
    window.open(`https://t.me/oko_expert_bot?start=auth_${authId}`, '_blank');
    
    // Начинаем проверять статус авторизации
    checkAuthStatus(authId);
  };

  const checkAuthStatus = (authId: string) => {
    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/telegram_auth_status/${authId}/`);
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            clearInterval(checkInterval);
            localStorage.removeItem('telegram_auth_id');
            
            // Сохраняем токены
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Перезагружаем страницу для применения авторизации
            window.location.href = '/dashboard';
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      }
    }, 2000); // Проверяем каждые 2 секунды

    // Останавливаем проверку через 5 минут
    setTimeout(() => {
      clearInterval(checkInterval);
      localStorage.removeItem('telegram_auth_id');
    }, 300000);
  };
  
  return (
    <div className="panel-footer">
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>или войти через</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
        {/* Telegram Auth Button */}
        <button
          onClick={handleTelegramAuth}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: '#0088cc',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#006ba3'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#0088cc'}
        >
          <img src="/assets/telegram.png" alt="telegram" style={{ width: '20px', height: '20px' }} />
          Войти через Telegram
        </button>
        
        {/* Другие способы входа */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '5px' }}>
          <a href={googleHref} aria-label="Google">
            <img src="/assets/google.png" alt="google-login" style={{ width: '32px', height: '32px' }} />
          </a>
          <a href={vkHref} aria-label="VK">
            <img src="/assets/vk.png" alt="vk-login" style={{ width: '32px', height: '32px' }} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default SocialLoginButtons;
