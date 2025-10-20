import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const toggleMenu = useCallback(() => setIsMenuOpen((v) => !v), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeMenu]);

  const goToCabinet = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/');
    window.location.reload(); 
  }, [navigate]);

  const onMenuLinkClick = useCallback<React.MouseEventHandler<HTMLUListElement>>(
    (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'a') {
        closeMenu();
      }
    },
    [closeMenu]
  );

  return (
    <header className="header">
      <div className="mcontainer">
        <div className="header__wrapper">
          <div className="header__logo">
            <div className="header__logo-link">
              <img className="header__logo-link-image" src="/assets/logo.svg" alt="logo" width={120} height={36} />
            </div>
          </div>

          <nav className={`header__nav ${isMenuOpen ? 'active' : ''}`}>
            <div className="header__nav-wrapper">
              <div className="header__logo">
                <div className="header__logo-link">
                  <img className="header__logo-link-image" src="/assets/logo.svg" alt="logo" width={120} height={36} />
                </div>
              </div>

              <div className="header__close">
                <button className="header__close-button" onClick={closeMenu} aria-label="Закрыть меню"></button>
              </div>

              <ul className="header__nav-menu" onClick={onMenuLinkClick}>
                <li className="header__nav-menu-item">
                  <a className="header__nav-menu-item-link" href="#services">Услуги</a>
                </li>
                <li className="header__nav-menu-item">
                  <a className="header__nav-menu-item-link" href="#orders">Заказы</a>
                </li>
                <li className="header__nav-menu-item">
                  <a className="header__nav-menu-item-link" href="#experts">Эксперты</a>
                </li>
                <li className="header__nav-menu-item">
                  <a className="header__nav-menu-item-link" href="#shop">Магазин</a>
                </li>
                <li className="header__nav-menu-item">
                  <a className="header__nav-menu-item-link" href="#faq">FAQ</a>
                </li>
                <li className="header__nav-menu-item">
                  <a className="header__nav-menu-item-link" href="#support">Поддержка</a>
                </li>
                <li className="header__nav-menu-item">
                  <a className="header__nav-menu-item-link" href="#be-expert">Стать экспертом</a>
                </li>
                <li className="header__nav-menu-item">
                  <a className="header__nav-menu-item-link" href="#partners">Стать партнерам</a>
                </li>
              </ul>

              <div className="header__cabinet">
                {localStorage.getItem('access_token') ? (
                  <>
                    <button className="header__cabinet-button button" onClick={goToCabinet}>Личный кабинет</button>
                    <button className="header__cabinet-button button" onClick={handleLogout} style={{ marginLeft: '8px' }}>Выйти</button>
                  </>
                ) : (
                  <button className="header__cabinet-button button" onClick={goToCabinet}>Войти</button>
                )}
              </div>
            </div>
          </nav>

          <div className="header__cabinet">
            {localStorage.getItem('access_token') ? (
              <>
                <button className="header__cabinet-button button" onClick={goToCabinet}>Создать заказ</button>
                <button className="header__cabinet-button button" onClick={handleLogout} style={{ marginLeft: '8px' }}>Выйти</button>
              </>
            ) : (
              <button className="header__cabinet-button button" onClick={goToCabinet}>Войти</button>
            )}
          </div>

          <div className="header__burger">
            <button className="header__burger-button" onClick={toggleMenu} aria-label="Открыть меню"></button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;



