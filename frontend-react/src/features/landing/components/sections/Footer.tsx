import React from 'react';
import landingStyles from '@/features/landing/Landing.module.css';
import styles from './Footer.module.css';

const Footer: React.FC = () => (
  <footer className={styles.footer}>
    <div className={landingStyles.mcontainer}>
      <div className={styles.footerWrapper}>
        <div className={styles.footerContacts}>
          <a className={styles.footerContactsLink} href="mailto:support@okoznaniy.ru">
            <img className={styles.footerContactsLinkIcon} src="/assets/icons/email.svg" alt="email" />
            <span className={styles.footerContactsLinkText}>support@okoznaniy.ru</span>
          </a>
          <a className={styles.footerContactsLink} href="tel:88005007857">
            <img className={styles.footerContactsLinkIcon} src="/assets/icons/phone.svg" alt="phone" />
            <span className={styles.footerContactsLinkText}>8 800 500-78-57</span>
          </a>
        </div>

        <div className={styles.footerDocuments}>
          <a className={styles.footerDocumentsLink} href="/docs/privacy_policy.pdf" target="_blank" rel="noopener noreferrer">Политика конфиденциальности</a>
          <a className={styles.footerDocumentsLink} href="/docs/personal_data_processing.pdf" target="_blank" rel="noopener noreferrer">Согласие на обработку ПД</a>
          <a className={styles.footerDocumentsLink} href="/docs/user_agreement_client.pdf" target="_blank" rel="noopener noreferrer">Пользовательское соглашение (Клиент)</a>
          <a className={styles.footerDocumentsLink} href="/docs/user_agreement_expert.pdf" target="_blank" rel="noopener noreferrer">Пользовательское соглашение (Эксперт)</a>
          <a className={styles.footerDocumentsLink} href="/offer">Договор оферты</a>
          <a className={styles.footerDocumentsLink} href="/payment-and-refund">Оплата и возврат</a>
          <a className={styles.footerDocumentsLink} href="/contacts">Контакты и реквизиты</a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;



