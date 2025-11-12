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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f9fc' }}>
      <div style={{ maxWidth: 520, width: '100%', background: '#fff', borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,0.08)', padding: 24, textAlign: 'center' }}>
        <img src="/assets/google.png" alt="Google" width={48} height={48} style={{ marginBottom: 12 }} />
        <h2 style={{ margin: 0, fontSize: 22 }}>Вход через Google</h2>
        <p style={{ marginTop: 8, color: '#667085' }}>
          {redirecting ? 'Перенаправляем на Google…' : 'Не удалось автоматически перенаправить. Нажмите кнопку ниже.'}
        </p>
        <div style={{ marginTop: 16 }}>
          <a href={googleUrl} style={{ display: 'inline-block', background: '#1a73e8', color: '#fff', padding: '10px 16px', borderRadius: 8, textDecoration: 'none' }}>
            Продолжить с Google
          </a>
        </div>
      </div>
    </div>
  );
};

export default GoogleRedirect;