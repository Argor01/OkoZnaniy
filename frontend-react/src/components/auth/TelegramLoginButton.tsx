import React, { useEffect, useRef } from 'react';
import axios from 'axios';

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
    // Создаем глобальную функцию для callback
    (window as any).onTelegramAuth = async (user: TelegramUser) => {
      try {
        // Отправляем данные на бэкенд для проверки
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/users/telegram_auth/`,
          user
        );

        // Сохраняем токены
        const { access, refresh, user: userData } = response.data;
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('user', JSON.stringify(userData));

        // Вызываем callback
        onAuth(userData);
      } catch (error: any) {
        console.error('Telegram auth error:', error);
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

    // Добавляем скрипт в контейнер
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(script);
    }

    // Cleanup
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      delete (window as any).onTelegramAuth;
    };
  }, [botName, buttonSize, cornerRadius, requestAccess, usePic, lang, onAuth, onError]);

  return <div ref={containerRef} />;
};

export default TelegramLoginButton;
