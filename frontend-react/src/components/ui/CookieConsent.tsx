import React, { useState, useEffect } from 'react';
import { AppButton } from './AppButton';
import styles from './CookieConsent.module.css';

const COOKIE_CONSENT_KEY = 'cookie_consent_accepted';

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Show with a small delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className={styles.cookieConsent}>
      <div className={styles.content}>
        <div className={styles.textContainer}>
          <p className={styles.text}>
            На сайте используются метрические программы. Продолжая использование я соглашаюсь на обработку моих метрических данных
            <a 
              href="/docs/metric_agreement.pdf" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.link}
            >
              Согласие метрика
            </a>
          </p>
        </div>
        <div className={styles.actions}>
          <AppButton 
            variant="primary" 
            onClick={handleAccept}
            size="middle"
          >
            Хорошо
          </AppButton>
        </div>
      </div>
    </div>
  );
};
