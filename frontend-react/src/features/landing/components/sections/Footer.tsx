import React from 'react';

const Footer: React.FC = () => (
  <footer className="footer">
    <div className="mcontainer">
      <div className="footer__wrapper">
        <div className="footer__contacts">
          <a className="footer__contacts-link" href="mailto:support@site.ru">
            <img className="footer__contacts-link-icon" src="/assets/icons/email.svg" alt="email" />
            <span className="footer__contacts-link-text">support@site.ru</span>
          </a>
          <a className="footer__contacts-link" href="tel:88003243423">
            <img className="footer__contacts-link-icon" src="/assets/icons/phone.svg" alt="phone" />
            <span className="footer__contacts-link-text">8 800 ( 324 ) - 34 -23</span>
          </a>
        </div>

        <div className="footer__documents">
          <a className="footer__documents-link" href="/docs/privacy_policy.pdf" target="_blank" rel="noopener noreferrer">Политика конфиденциальности</a>
          <a className="footer__documents-link" href="/docs/personal_data_processing.pdf" target="_blank" rel="noopener noreferrer">Согласие на обработку ПД</a>
          <a className="footer__documents-link" href="/docs/user_agreement_client.pdf" target="_blank" rel="noopener noreferrer">Пользовательское соглашение (Клиент)</a>
          <a className="footer__documents-link" href="/docs/user_agreement_expert.pdf" target="_blank" rel="noopener noreferrer">Пользовательское соглашение (Эксперт)</a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;



