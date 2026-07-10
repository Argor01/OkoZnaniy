import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { UserOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useTheme } from '@/contexts/ThemeContext';
import landingStyles from '@/features/landing/Landing.module.css';
import styles from './Header.module.css';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

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
      navigate('/expert');
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

  const isHomePage = location.pathname === '/';

  return (
    <header className={styles.header}>
      <div className={landingStyles.mcontainer}>
        <div className={styles.headerWrapper}>
          <div className={styles.headerLogo}>
            <div className={styles.headerLogoLink}>
              <div className={styles.headerLogoCircle}>
                <img className={styles.headerLogoLinkImage} src="/assets/logo.png" alt="logo" width={120} height={36} />
              </div>
              <div className={styles.headerLogoLinkText}>Око Знаний</div>
            </div>
          </div>

          <nav className={`${styles.headerNav} ${isMenuOpen ? styles.active : ''}`}>
            <div className={styles.headerNavWrapper}>
              <div className={styles.headerLogo}>
                <div className={styles.headerLogoLink}>
                  <div className={styles.headerLogoCircle}>
                    <img className={styles.headerLogoLinkImage} src="/assets/logo.png" alt="logo" width={120} height={36} />
                  </div>
                  <div className={styles.headerLogoLinkText}>Око Знаний</div>
                </div>
              </div>

              <div className={styles.headerClose}>
                <button className={styles.headerCloseButton} onClick={closeMenu} aria-label="Закрыть меню"></button>
              </div>

              <ul className={styles.headerNavMenu} onClick={onMenuLinkClick}>
                <li className={styles.headerNavMenuItem}>
                  <a className={styles.headerNavMenuItemLink} href={isHomePage ? "#services" : "/#services"}>Услуги</a>
                </li>
                <li className={styles.headerNavMenuItem}>
                  <a className={styles.headerNavMenuItemLink} href={isHomePage ? "#orders" : "/#orders"}>Заказы</a>
                </li>
                <li className={styles.headerNavMenuItem}>
                  <a className={styles.headerNavMenuItemLink} href={isHomePage ? "#experts" : "/#experts"}>Эксперты</a>
                </li>
                <li className={styles.headerNavMenuItem}>
                  <a className={styles.headerNavMenuItemLink} href={isHomePage ? "#faq" : "/#faq"}>FAQ</a>
                </li>
                <li className={styles.headerNavMenuItem}>
                  <Link className={styles.headerNavMenuItemLink} to="/become-expert">Стать экспертом</Link>
                </li>
                <li className={styles.headerNavMenuItem}>
                  <Link className={styles.headerNavMenuItemLink} to="/become-partner">Стать партнером</Link>
                </li>
              </ul>

              <div className={styles.headerCabinet}>
                {localStorage.getItem('access_token') ? (
                  <>
                    <button className={`${styles.headerCabinetButton} ${landingStyles.button}`} onClick={goToCabinet}>Личный кабинет</button>
                    <button className={`${styles.headerCabinetButton} ${styles.headerCabinetButtonSpaced} ${landingStyles.button}`} onClick={handleLogout}>Выйти</button>
                  </>
                ) : (
                  <button className={`${styles.headerCabinetButton} ${landingStyles.button}`} onClick={goToCabinet}>Войти</button>
                )}
                <button
                  className={styles.headerThemeToggle}
                  onClick={toggleTheme}
                  aria-label={isDark ? 'Светлая тема' : 'Тёмная тема'}
                  title={isDark ? 'Светлая тема' : 'Тёмная тема'}
                >
                  {isDark ? <SunOutlined /> : <MoonOutlined />}
                </button>
              </div>
            </div>
          </nav>

          <div className={styles.headerCabinet}>
            <button className={`${styles.headerCabinetButton} ${styles.headerBecomeCta} ${landingStyles.button}`} onClick={() => navigate('/become-expert')}>Стать экспертом</button>
            <button className={`${styles.headerCabinetButton} ${styles.headerBecomeCta} ${styles.headerCabinetButtonSpaced} ${landingStyles.button}`} onClick={() => navigate('/become-partner')}>Стать партнёром</button>
            {localStorage.getItem('access_token') ? (
              <>
                <button 
                  className={styles.headerCabinetIconButton} 
                  onClick={goToCabinet}
                  aria-label="Личный кабинет"
                  title="Личный кабинет"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    marginRight: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    transition: 'background-color 0.3s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <UserOutlined style={{ fontSize: '24px', color: '#333' }} />
                </button>
                <button className={`${styles.headerCabinetButton} ${landingStyles.button}`} onClick={goToCabinet}>Создать заказ</button>
                <button className={`${styles.headerCabinetButton} ${styles.headerCabinetButtonSpaced} ${landingStyles.button}`} onClick={handleLogout}>Выйти</button>
              </>
            ) : (
              <button className={`${styles.headerCabinetButton} ${landingStyles.button}`} onClick={goToCabinet}>Войти</button>
            )}
            <button
              className={styles.headerThemeToggle}
              onClick={toggleTheme}
              aria-label={isDark ? 'Светлая тема' : 'Тёмная тема'}
              title={isDark ? 'Светлая тема' : 'Тёмная тема'}
            >
              {isDark ? <SunOutlined /> : <MoonOutlined />}
            </button>
          </div>

          <div className={styles.headerBurger}>
            <button className={styles.headerBurgerButton} onClick={toggleMenu} aria-label="Открыть меню"></button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;




