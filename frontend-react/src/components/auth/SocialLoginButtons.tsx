import React, { useState, useEffect } from 'react';

interface SocialLoginButtonsProps {
  onTelegramAuth?: (user: any) => void;
  onTelegramError?: (error: string) => void;
}

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = () => {
  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
  const googleHref = `/auth/google`;
  const vkHref = `${API_BASE_URL}/api/accounts/vk/login/`;
  
  const [isWaitingAuth, setIsWaitingAuth] = useState(false);
  
  // Проверяем при загрузке, не ожидаем ли мы авторизацию
  useEffect(() => {
    const savedAuthId = localStorage.getItem('telegram_auth_id');
    if (savedAuthId) {
      setIsWaitingAuth(true);
      checkAuthStatus(savedAuthId);
    }
  }, []);
  
  // Генерируем уникальный ID для сессии авторизации
  const generateAuthId = () => {
    return `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleTelegramAuth = (e: React.MouseEvent) => {
    e.preventDefault();
    const authId = generateAuthId();
    // Сохраняем ID в localStorage для проверки после авторизации
    localStorage.setItem('telegram_auth_id', authId);
    setIsWaitingAuth(true);
    
    // Открываем бота с параметром auth_id
    window.open(`https://t.me/okoznaniybot?start=auth_${authId}`, '_blank');
    
    // Начинаем проверять статус авторизации
    checkAuthStatus(authId);
  };

  const checkAuthStatus = (authId: string) => {
    let attempts = 0;
    const maxAttempts = 150; // 5 минут (150 * 2 секунды)
    
    const checkInterval = setInterval(async () => {
      attempts++;
      
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
            
            // Показываем уведомление об успехе
            console.log('✅ Авторизация через Telegram успешна!');
            
            // Определяем куда перенаправить пользователя
            const user = data.user;
            let redirectUrl = '/dashboard';
            
            if (user.role === 'expert') {
              redirectUrl = '/expert';
            } else if (user.role === 'partner') {
              redirectUrl = '/partner';
            } else if (user.role === 'admin') {
              redirectUrl = '/admin';
            } else if (user.role === 'arbitrator') {
              redirectUrl = '/arbitrator';
            }
            
            // Перенаправляем пользователя
            window.location.href = redirectUrl;
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      }
      
      // Останавливаем проверку после максимального количества попыток
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        localStorage.removeItem('telegram_auth_id');
        console.log('⏱️ Время ожидания авторизации истекло');
      }
    }, 2000); // Проверяем каждые 2 секунды
  };
  
  return (
    <div className="panel-footer">
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>или войти через</div>
      
      {isWaitingAuth && (
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '15px', 
          padding: '10px', 
          background: '#e6f7ff', 
          borderRadius: '8px',
          border: '1px solid #91d5ff'
        }}>
          <div style={{ fontSize: '14px', color: '#0050b3', marginBottom: '5px' }}>
            ⏳ Ожидание авторизации через Telegram...
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Подтвердите вход в боте
          </div>
        </div>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
        <a 
          href="#" 
          onClick={handleTelegramAuth} 
          aria-label="Telegram"
          style={{ 
            opacity: isWaitingAuth ? 0.5 : 1,
            cursor: isWaitingAuth ? 'not-allowed' : 'pointer',
            pointerEvents: isWaitingAuth ? 'none' : 'auto'
          }}
        >
          <img src="/assets/telegram.png" alt="telegram-login" style={{ width: '32px', height: '32px' }} />
        </a>
        <a href={googleHref} aria-label="Google">
          <img src="/assets/google.png" alt="google-login" style={{ width: '32px', height: '32px' }} />
        </a>
        <a href={vkHref} aria-label="VK">
          <img src="/assets/vk.png" alt="vk-login" style={{ width: '32px', height: '32px' }} />
        </a>
      </div>
    </div>
  );
};

export default SocialLoginButtons;
