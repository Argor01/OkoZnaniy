import React from 'react';
import landingStyles from '@/features/landing/Landing.module.css';
import styles from './Footer.module.css';

const Footer: React.FC = () => (
  <footer className={styles.footer}>
    <div className={landingStyles.mcontainer}>
      <div className={styles.footerWrapper}>
        <div className={styles.footerContacts}>
          {/* Раньше контакты шли общим списком, и было неясно, куда писать
              по проблеме. Номер 8 800 500-78-57 убран: он не наш. */}
          <span className={styles.footerContactsTitle}>Напишите, поможем разместить задание</span>
          <a className={styles.footerContactsLink} href="tel:+79314674689">
            <img className={styles.footerContactsLinkIcon} src="/assets/icons/phone.svg" alt="phone" />
            <span className={styles.footerContactsLinkText}>+7 931 467-46-89</span>
          </a>
          <a className={styles.footerContactsLink} href="mailto:znaniy.oko@mail.ru">
            <img className={styles.footerContactsLinkIcon} src="/assets/icons/email.svg" alt="email" />
            <span className={styles.footerContactsLinkText}>znaniy.oko@mail.ru</span>
          </a>

          <a className={styles.footerContactsLink} href="https://vk.ru/oko.znania" target="_blank" rel="noopener noreferrer">ВКонтакте: Око Знаний</a>
          <a className={styles.footerContactsLink} href="https://t.me/okoznaNIY2018" target="_blank" rel="noopener noreferrer">Telegram: @okoznaNIY2018</a>
          <a className={styles.footerContactsLink} href="/vacancies">Вакансии для студентов</a>
          <a className={styles.footerContactsLink} href="/agencies">Агентствам</a>
          <span className={styles.footerContactsTitle}>Стать экспертом или партнёром</span>
          <a className={styles.footerContactsLink} href="tel:+79314674652">
            <img className={styles.footerContactsLinkIcon} src="/assets/icons/phone.svg" alt="phone" />
            <span className={styles.footerContactsLinkText}>+7 931 467-46-52</span>
          </a>
          <a className={styles.footerContactsLink} href="mailto:partners.okoznaniy@mail.ru">
            <img className={styles.footerContactsLinkIcon} src="/assets/icons/email.svg" alt="email" />
            <span className={styles.footerContactsLinkText}>partners.okoznaniy@mail.ru</span>
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



