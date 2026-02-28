import React from 'react';
import { Layout } from 'antd';
import styles from './AppFooter.module.css';

const { Footer } = Layout;

interface AppFooterProps {
  userRole?: 'client' | 'expert' | 'partner' | 'admin' | string;
}

export const AppFooter: React.FC<AppFooterProps> = ({ userRole }) => {
  const currentYear = new Date().getFullYear();
  
  const agreementLink = userRole === 'expert' || userRole === 'partner'
    ? '/docs/user_agreement_expert.pdf'
    : '/docs/user_agreement_client.pdf';

  return (
    <Footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.copyright}>
          © {currentYear} Око Знаний. Все права защищены.
        </div>
        <div className={styles.links}>
          <a href="/docs/privacy_policy.pdf" target="_blank" rel="noopener noreferrer" className={styles.link}>
            Политика конфиденциальности
          </a>
          <span className={styles.divider}>|</span>
          <a href="/docs/personal_data_processing.pdf" target="_blank" rel="noopener noreferrer" className={styles.link}>
            Обработка ПД
          </a>
          <span className={styles.divider}>|</span>
          <a href={agreementLink} target="_blank" rel="noopener noreferrer" className={styles.link}>
            Пользовательское соглашение
          </a>
        </div>
      </div>
    </Footer>
  );
};
