import React from 'react';
import TelegramLoginButton from './TelegramLoginButton';

interface SocialLoginButtonsProps {
  onTelegramAuth: (user: any) => void;
  onTelegramError: (error: string) => void;
}

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  onTelegramAuth,
  onTelegramError,
}) => {
  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
  const googleHref = `/auth/google`;
  const vkHref = `${API_BASE_URL}/api/accounts/vk/login/`;

  // Проверяем, работаем ли мы на localhost
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  return (
    <div className="panel-footer">
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>или войти через</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
        {/* Telegram Login Button */}
        {!isLocalhost ? (
          <div style={{ transform: 'scale(1.1)' }}>
            <TelegramLoginButton
              botName="oko_expert_bot"
              buttonSize="medium"
              cornerRadius={8}
              requestAccess={true}
              usePic={true}
              lang="ru"
              onAuth={onTelegramAuth}
              onError={onTelegramError}
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px', background: '#f0f0f0', borderRadius: '8px', maxWidth: '300px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#666' }}>
              Telegram Login Widget не работает на localhost
            </p>
            <a 
              href="https://t.me/oko_expert_bot?start=auth"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: '#0088cc',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <img src="/assets/telegram.png" alt="telegram" style={{ width: '20px', height: '20px' }} />
              Открыть бота в Telegram
            </a>
            <p style={{ margin: '10px 0 0 0', fontSize: '11px', color: '#999' }}>
              Для тестирования используйте ngrok или публичный домен
            </p>
          </div>
        )}
        
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
