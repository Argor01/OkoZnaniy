import React, { useEffect, useState } from 'react';
import styles from '@/features/auth/GoogleRedirect.module.css';

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
    <div className={styles.googleRedirectPage}>
      <div className={styles.googleRedirectCard}>
        <img src="/assets/google.png" alt="Google" width={48} height={48} className={styles.googleRedirectLogo} />
        <h2 className={styles.googleRedirectTitle}>Вход через Google</h2>
        <p className={styles.googleRedirectText}>
          {redirecting ? 'Перенаправляем на Google…' : 'Не удалось автоматически перенаправить. Нажмите кнопку ниже.'}
        </p>
        <div className={styles.googleRedirectAction}>
          <a href={googleUrl} className={styles.googleRedirectLink}>
            Продолжить с Google
          </a>
        </div>
      </div>
    </div>
  );
};

export default GoogleRedirect;
