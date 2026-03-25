import React, { useEffect } from 'react';
import { API_URL } from '@/config/api';
import { ROUTES } from '@/utils/constants';
import { API_ENDPOINTS } from '@/config/endpoints';
import { authApi } from '@/features/auth/api/auth';

interface SocialLoginButtonsProps {
  onTelegramAuth?: (user: any) => void;
  onTelegramError?: (error: string) => void;
}

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = () => {
  const vkHref = `${API_URL}${API_ENDPOINTS.auth.vkLogin}`;
  const debugEnabled =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.localStorage?.getItem('debug_auth') === '1';
  
  
  useEffect(() => {
    
    localStorage.removeItem('telegram_auth_id');
  }, []);
  
  
  const generateAuthId = () => {
    return `auth_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  };

  const handleTelegramAuth = (e: React.MouseEvent) => {
    e.preventDefault();
    const authId = generateAuthId();

    window.open(`https://t.me/okoznaniybot?start=${authId}`, '_blank', 'noopener,noreferrer');
    checkAuthStatus(authId);
  };

  const checkAuthStatus = (authId: string) => {
    let attempts = 0;
    const maxAttempts = 150; 
    
    if (debugEnabled) console.log(`🔍 Начинаем проверку авторизации для ID: ${authId}`);
    
    const checkInterval = setInterval(async () => {
      attempts++;
      if (debugEnabled) console.log(`🔄 Попытка ${attempts}/${maxAttempts}: Проверяем статус авторизации...`);
      
      try {
        const data = await authApi.checkTelegramAuthStatus(authId);
        if (debugEnabled) console.log(`📦 Данные:`, data);
        
        if (data.authenticated) {
          if (debugEnabled) console.log(`✅ Авторизация подтверждена!`);
          clearInterval(checkInterval);

          localStorage.setItem('access_token', data.access);
          localStorage.setItem('refresh_token', data.refresh);
          localStorage.setItem('user', JSON.stringify(data.user));
          if (debugEnabled) console.log(`💾 Токены сохранены`);

          const user = data.user;
            let redirectUrl: string = ROUTES.dashboard;
            
            if (user.role === 'expert') {
              redirectUrl = ROUTES.expert.root;
            } else if (user.role === 'partner') {
              redirectUrl = ROUTES.partner.root;
            } else if (user.role === 'admin') {
              redirectUrl = ROUTES.admin.dashboard;
            } else if (user.role === 'director') {
              redirectUrl = ROUTES.admin.directorDashboard;
            } else if (user.role === 'arbitrator') {
              redirectUrl = ROUTES.arbitrator.root;
            }
            
            if (debugEnabled) console.log(`🚀 Перенаправляем на: ${redirectUrl}`);

            window.location.href = redirectUrl;
          } else {
            if (debugEnabled) console.log(`⏳ Ожидаем подтверждения...`);
          }
      } catch (error) {
        if (debugEnabled) console.error('❌ Ошибка проверки статуса:', error);
      }

      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        if (debugEnabled) console.log('⏱️ Время ожидания авторизации истекло');
      }
    }, 2000);
  };
  
  return (
    <div className="panel-footer">
      <div className="socialLoginTitle">или войти через</div>
      <div className="socialLoginRow">
        <a href="#" onClick={handleTelegramAuth} aria-label="Telegram">
          <img src="/assets/telegram.png" alt="telegram-login" className="socialLoginIcon" />
        </a>
        <a href={vkHref} aria-label="VK">
          <img src="/assets/vk.svg" alt="vk-login" className="socialLoginIcon" />
        </a>
        <a href={vkHref} aria-label="MAX">
          <img src="/assets/max.svg" alt="max-login" className="socialLoginIcon" />
        </a>
      </div>
    </div>
  );
};

export default SocialLoginButtons;
