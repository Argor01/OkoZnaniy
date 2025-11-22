import React, { useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';

interface SocialLoginButtonsProps {
  onTelegramAuth?: (user: any) => void;
  onTelegramError?: (error: string) => void;
}

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = () => {
  const googleHref = `${API_BASE_URL}/api/accounts/google/login/?process=login`;
  const vkHref = `${API_BASE_URL}/api/accounts/vk/login/`;
  
  // Очищаем старые данные авторизации при загрузке страницы
  useEffect(() => {
    // Очищаем localStorage от старых попыток авторизации
    localStorage.removeItem('telegram_auth_id');
  }, []);
  
  // Генерируем уникальный ID для сессии авторизации
  const generateAuthId = () => {
    return `auth_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  };

  const handleTelegramAuth = (e: React.MouseEvent) => {
    e.preventDefault();
    const authId = generateAuthId();
    
    // Открываем бота с параметром auth_id (authId уже содержит префикс auth_)
    window.open(`https://t.me/okoznaniybot?start=${authId}`, '_blank');
    
    // Начинаем проверять статус авторизации
    checkAuthStatus(authId);
  };

  const checkAuthStatus = (authId: string) => {
    let attempts = 0;
    const maxAttempts = 150; // 5 минут (150 * 2 секунды)
    
    console.log(`🔍 Начинаем проверку авторизации для ID: ${authId}`);
    
    const checkInterval = setInterval(async () => {
      attempts++;
      console.log(`🔄 Попытка ${attempts}/${maxAttempts}: Проверяем статус авторизации...`);
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/telegram_auth_status/${authId}/`);
        console.log(`📡 Ответ сервера:`, response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`📦 Данные:`, data);
          
          if (data.authenticated) {
            console.log(`✅ Авторизация подтверждена!`);
            clearInterval(checkInterval);
            
            // Сохраняем токены
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            localStorage.setItem('user', JSON.stringify(data.user));
            console.log(`💾 Токены сохранены`);
            
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
            
            console.log(`🚀 Перенаправляем на: ${redirectUrl}`);
            // Перенаправляем пользователя
            window.location.href = redirectUrl;
          } else {
            console.log(`⏳ Ожидаем подтверждения...`);
          }
        }
      } catch (error) {
        console.error('❌ Ошибка проверки статуса:', error);
      }
      
      // Останавливаем проверку после максимального количества попыток
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.log('⏱️ Время ожидания авторизации истекло');
      }
    }, 2000); // Проверяем каждые 2 секунды
  };
  
  return (
    <div className="panel-footer">
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>или войти через</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
        <a href="#" onClick={handleTelegramAuth} aria-label="Telegram">
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
