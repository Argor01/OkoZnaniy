import React, { useEffect, useState } from 'react';

const GoogleRedirect: React.FC = () => {
  const [redirecting, setRedirecting] = useState(true);
  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
  const googleUrl = `${API_BASE_URL}/api/accounts/google/login/?process=login`;

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.location.href = googleUrl;
      } catch (e) {
        setRedirecting(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [googleUrl]);

  return (
    <div className="googleRedirectPage">
      <div className="googleRedirectCard">
        <img src="/assets/google.png" alt="Google" width={48} height={48} className="googleRedirectLogo" />
        <h2 className="googleRedirectTitle">Вход через Google</h2>
        <p className="googleRedirectText">
          {redirecting ? 'Перенаправляем на Google…' : 'Не удалось автоматически перенаправить. Нажмите кнопку ниже.'}
        </p>
        <div className="googleRedirectAction">
          <a href={googleUrl} className="googleRedirectLink">
            Продолжить с Google
          </a>
        </div>
      </div>
    </div>
  );
};

export default GoogleRedirect;
