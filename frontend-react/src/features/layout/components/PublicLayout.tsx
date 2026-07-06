import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout, Button } from 'antd';
import { AppFooter } from '@/components/layout/AppFooter';
import styles from './PublicLayout.module.css';

const { Content } = Layout;

interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * Лёгкий публичный layout для страниц, доступных без авторизации
 * (База знаний, Око ответы). Если пользователь залогинен — показываем
 * кнопку перехода в кабинет, иначе — Войти/Регистрация.
 */
export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const isAuthed = typeof window !== 'undefined' && !!localStorage.getItem('access_token');

  return (
    <Layout className={styles.publicLayout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logo} aria-label="Око Знаний">
            <img src="/assets/logo.png" alt="Око Знаний" className={styles.logoImg} />
            <span className={styles.logoText}>Око Знаний</span>
          </Link>
          <nav className={styles.nav}>
            <Link to="/knowledge">Око ответы</Link>
            <Link to="/knowledge-base">База знаний</Link>
          </nav>
          <div className={styles.actions}>
            {isAuthed ? (
              <Button type="primary" onClick={() => navigate('/dashboard')}>
                Личный кабинет
              </Button>
            ) : (
              <>
                <Button type="text" onClick={() => navigate('/login')}>
                  Войти
                </Button>
                <Button type="primary" onClick={() => navigate('/register')}>
                  Регистрация
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <Content className={styles.content}>{children}</Content>

      <AppFooter userRole={isAuthed ? undefined : 'guest'} />
    </Layout>
  );
};

export default PublicLayout;
