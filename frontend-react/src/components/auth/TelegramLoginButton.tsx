import React, { useEffect, useRef } from 'react';
import { apiClient } from '../../api/client';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginButtonProps {
  botName: string;
  buttonSize?: 'large' | 'medium' | 'small';
  cornerRadius?: number;
  requestAccess?: boolean;
  usePic?: boolean;
  lang?: string;
  onAuth: (user: any) => void;
  onError?: (error: string) => void;
}

const TelegramLoginButton: React.FC<TelegramLoginButtonProps> = ({
  botName,
  buttonSize = 'large',
  cornerRadius,
  requestAccess = true,
  usePic = true,
  lang = 'ru',
  onAuth,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const debugEnabled =
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      window.localStorage?.getItem('debug_auth') === '1';

    if (debugEnabled) console.log('[TelegramLoginButton] Initializing with botName:', botName);
    
    // Создаем глобальную функцию для callback
    (window as any).onTelegramAuth = async (user: TelegramUser) => {
      if (debugEnabled) console.log('[TelegramLoginButton] Telegram auth callback received:', user);
      
      try {
        // Отправляем данные на бэкенд для проверки
        const response = await apiClient.post('/users/telegram_auth/', user);
        
        if (debugEnabled) console.log('[TelegramLoginButton] Backend response:', response.data);

        // Сохраняем токены
        const { access, refresh, user: userData } = response.data;
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('user', JSON.stringify(userData));
        
        if (debugEnabled) console.log('[TelegramLoginButton] Tokens saved, calling onAuth callback');

        // Вызываем callback
        onAuth(userData);
      } catch (error: any) {
        if (debugEnabled) {
          console.error('[TelegramLoginButton] Telegram auth error:', error);
          console.error('[TelegramLoginButton] Error response:', error.response?.data);
        }
        const errorMessage = error.response?.data?.error || 'Ошибка авторизации через Telegram';
        if (onError) {
          onError(errorMessage);
        }
      }
    };

    // Создаем скрипт для Telegram Widget
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', buttonSize);
    if (cornerRadius !== undefined) {
      script.setAttribute('data-radius', cornerRadius.toString());
    }
    script.setAttribute('data-request-access', requestAccess ? 'write' : '');
    script.setAttribute('data-userpic', usePic.toString());
    script.setAttribute('data-lang', lang);
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.async = true;
    
    script.onload = () => {
      if (debugEnabled) console.log('[TelegramLoginButton] Telegram widget script loaded successfully');
    };
    
    script.onerror = (error) => {
      if (debugEnabled) console.error('[TelegramLoginButton] Failed to load Telegram widget script:', error);
    };

    const container = containerRef.current;
    if (container) {
      container.innerHTML = '';
      container.appendChild(script);
      if (debugEnabled) console.log('[TelegramLoginButton] Widget script added to DOM');
    }

    // Cleanup
    return () => {
      if (container) {
        container.innerHTML = '';
      }
      delete (window as any).onTelegramAuth;
    };
  }, [botName, buttonSize, cornerRadius, requestAccess, usePic, lang, onAuth, onError]);

  return <div ref={containerRef} />;
};

export default TelegramLoginButton;
