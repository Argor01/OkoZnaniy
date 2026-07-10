import React, { useEffect } from 'react';
import { API_URL } from '@/config/api';
import { ROUTES } from '@/utils/constants';
import { API_ENDPOINTS } from '@/config/endpoints';
import { authApi } from '@/features/auth/api/auth';
import { logger } from '@/utils/logger';
import styles from '@/features/auth/Login.module.css';

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

  const handleMaxAuth = (e: React.MouseEvent) => {
    e.preventDefault();
    const authId = generateAuthId();
    window.open(`https://max.ru/id6623148052_bot?start=auth_${authId}`, '_blank', 'noopener,noreferrer');
    checkMaxAuthStatus(authId);
  };

  const checkMaxAuthStatus = (authId: string) => {
    let attempts = 0;
    const maxAttempts = 150;
    const checkInterval = setInterval(async () => {
      attempts++;
      try {
        const data = await authApi.checkMaxAuthStatus(authId);
        if (data.authenticated) {
          clearInterval(checkInterval);
          localStorage.setItem('access_token', 'cookie-session');
          localStorage.removeItem('refresh_token');
          localStorage.setItem('user', JSON.stringify(data.user));
          const user = data.user;
          let redirectUrl: string = ROUTES.dashboard;
          if (user.role === 'expert') redirectUrl = ROUTES.expert.root;
          else if (user.role === 'partner') redirectUrl = ROUTES.partner.root;
          else if (user.role === 'admin') redirectUrl = ROUTES.admin.dashboard;
          else if (user.role === 'director') redirectUrl = ROUTES.admin.directorDashboard;
          else if (user.role === 'arbitrator') redirectUrl = ROUTES.arbitrator.root;
          window.location.href = redirectUrl;
        }
      } catch (error) {
        if (debugEnabled) logger.error('MAX auth check error:', error);
      }
      if (attempts >= maxAttempts) clearInterval(checkInterval);
    }, 2000);
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
    
    if (debugEnabled) logger.log(`🔍 Начинаем проверку авторизации для ID: ${authId}`);
    
    const checkInterval = setInterval(async () => {
      attempts++;
      if (debugEnabled) logger.log(`🔄 Попытка ${attempts}/${maxAttempts}: Проверяем статус авторизации...`);
      
      try {
        const data = await authApi.checkTelegramAuthStatus(authId);
        if (debugEnabled) logger.log(`📦 Данные:`, data);
        
        if (data.authenticated) {
          if (debugEnabled) logger.log(`✅ Авторизация подтверждена!`);
          clearInterval(checkInterval);

          localStorage.setItem('access_token', 'cookie-session');
          localStorage.removeItem('refresh_token');
          localStorage.setItem('user', JSON.stringify(data.user));
          if (debugEnabled) logger.log(`💾 Токены сохранены`);

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
            
            if (debugEnabled) logger.log(`🚀 Перенаправляем на: ${redirectUrl}`);

            window.location.href = redirectUrl;
          } else {
            if (debugEnabled) logger.log(`⏳ Ожидаем подтверждения...`);
          }
      } catch (error) {
        if (debugEnabled) logger.error('❌ Ошибка проверки статуса:', error);
      }

      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        if (debugEnabled) logger.log('⏱️ Время ожидания авторизации истекло');
      }
    }, 2000);
  };
  
  return (
    <div className={styles.panelFooter}>
      <div className={styles.socialLoginTitle}>или войти через</div>
      <div className={styles.socialLoginRow}>
        <a href={vkHref} aria-label="VK">
          <img src="/assets/vk.svg" alt="vk-login" className={styles.socialLoginIcon} />
        </a>
        <a href="#" onClick={handleMaxAuth} aria-label="MAX">
          <img src="/assets/max.svg" alt="max-login" className={styles.socialLoginIcon} />
        </a>
      </div>
    </div>
  );
};

export default SocialLoginButtons;
