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

  return (
    <div className="panel-footer">
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>или войти через</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
        {/* Telegram Login Button */}
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
