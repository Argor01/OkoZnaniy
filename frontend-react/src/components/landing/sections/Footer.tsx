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

        <div className="footer__social">
          <a className="footer__social-link" href="#">
            <img className="footer__social-link-icon" src="/assets/icons/whatsapp.svg" alt="whatsapp" />
          </a>
          <a className="footer__social-link" href="#">
            <img className="footer__social-link-icon" src="/assets/icons/telegram.svg" alt="telegram" />
          </a>
        </div>

        <div className="footer__documents">
          <a className="footer__documents-link" href="#">Политика конфиденциальности</a>
          <a className="footer__documents-link" href="#">Пользовательское соглашение</a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;



