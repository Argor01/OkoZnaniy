import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClockCircleOutlined } from '@ant-design/icons';
import apiClient from '@/api/client';
import { API_ENDPOINTS } from '@/config/endpoints';
import styles from '../LandingV2.module.css';

interface NavLink { href: string; label: string; }

export const TopBar: React.FC<{ links?: NavLink[] }> = ({ links }) => {
  const nav = links ?? [
    { href: '/#how', label: 'Как это работает' },
    { href: '/#experts', label: 'Эксперты' },
    { href: '/#reviews', label: 'Отзывы' },
    { href: '/#cta', label: 'Заказать' },
  ];
  return (
    <header className={styles.topbar}>
      <div className={`${styles.container} ${styles.topbarInner}`}>
        <Link to="/" className={styles.logo} aria-label="Око Знаний">
          <img src="/assets/logo.png" alt="Око Знаний" className={styles.logoImg} />
          <div>
            <div className={styles.logoText}>Око Знаний</div>
            <div className={styles.logoSub}>Помощь студентам</div>
          </div>
        </Link>
        <nav className={styles.topnav}>
          {nav.map((n) => (
            <a key={n.href} href={n.href}>{n.label}</a>
          ))}
        </nav>
        <div className={styles.topActions}>
          <Link to="/login" className={styles.btnGhost}>Войти</Link>
          <Link to="/register" className={styles.btnPrimary}>Регистрация</Link>
        </div>
      </div>
    </header>
  );
};

export const StatsBand: React.FC<{
  tag?: string;
  title?: React.ReactNode;
  items: { value: string; label: string }[];
}> = ({ tag, title, items }) => (
  <section className={styles.statsDark}>
    <div className={styles.statsDarkOrb1} />
    <div className={styles.statsDarkOrb2} />
    <div className={styles.container}>
      {(tag || title) && (
        <div className={styles.statsDarkHeader}>
          {tag && <span className={styles.smallTag}>{tag}</span>}
          {title && <h2 className={styles.statsDarkTitle}>{title}</h2>}
        </div>
      )}
      <div className={styles.statsDarkGrid}>
        {items.map((it) => (
          <div className={styles.statBoxDark} key={it.label}>
            <div className={styles.statValueDark}>{it.value}</div>
            <div className={styles.statLabelDark}>{it.label}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export const BecomeLeadForm: React.FC<{
  type: 'registration' | 'partner';
  buttonText: string;
  title: React.ReactNode;
  subtitle: string;
}> = ({ type, buttonText, title, subtitle }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Введите email'); return; }
    setLoading(true); setError(''); setMessage('');
    try {
      const endpoint = type === 'partner'
        ? API_ENDPOINTS.notifications.sendPartnerEmail
        : API_ENDPOINTS.notifications.sendRegistrationEmail;
      const res = await apiClient.post(endpoint, { email });
      if (res.status === 200) {
        setMessage('Инструкция отправлена! Проверьте ваш email');
        setEmail('');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Ошибка соединения. Попробуйте позже');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.finalCta} id="feedback">
      <div className={styles.finalCtaBg1} />
      <div className={styles.finalCtaBg2} />
      <div className={styles.finalCtaBg3} />
      <div className={styles.container}>
        <div className={styles.becomeFormCard}>
          <span className={styles.finalCtaTag}><ClockCircleOutlined /> Начни сегодня</span>
          <h2 className={styles.finalCtaTitle}>{title}</h2>
          <p className={styles.finalCtaSub}>{subtitle}</p>
          <form className={styles.becomeForm} onSubmit={submit}>
            <input
              type="email"
              className={styles.becomeFormInput}
              placeholder="Ваш E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className={styles.becomeFormBtn} disabled={loading}>
              {loading ? 'Отправка...' : buttonText}
            </button>
          </form>
          {message && <p className={styles.becomeFormMsg}>{message}</p>}
          {error && <p className={styles.becomeFormError}>{error}</p>}
          <p className={styles.becomeFormLegal}>
            Нажимая «{buttonText}», вы принимаете условия{' '}
            <a href="/docs/user_agreement_client.pdf" target="_blank" rel="noopener noreferrer">Пользовательского соглашения</a>{' '}и{' '}
            <a href="/docs/privacy_policy.pdf" target="_blank" rel="noopener noreferrer">Политики конфиденциальности</a>
          </p>
        </div>
      </div>
    </section>
  );
};

export const FooterDark: React.FC = () => (
  <footer className={styles.footerDark}>
    <div className={styles.footerDarkOrb} />
    <div className={styles.container}>
      <div className={styles.footerDarkGrid}>
        <div className={styles.footerBrand}>
          <Link to="/" className={styles.footerLogo}>
            <img src="/assets/logo.png" alt="Око Знаний" />
            <span>Око Знаний</span>
          </Link>
          <p className={styles.footerAbout}>
            Платформа подбора экспертов для студентов. Курсовые, дипломы,
            рефераты — с гарантией, эскроу и поддержкой 24/7.
          </p>
        </div>
        <div className={styles.footerCol}>
          <div className={styles.footerColTitle}>Контакты</div>
          <a href="mailto:b-oko.znaniy@mail.ru">b-oko.znaniy@mail.ru</a>
          <a href="tel:88005007857">8 800 500-78-57</a>
        </div>
        <div className={styles.footerCol}>
          <div className={styles.footerColTitle}>Документы</div>
          <a href="/docs/privacy_policy.pdf" target="_blank" rel="noopener noreferrer">Политика конфиденциальности</a>
          <a href="/docs/personal_data_processing.pdf" target="_blank" rel="noopener noreferrer">Согласие на обработку ПД</a>
          <a href="/docs/user_agreement_client.pdf" target="_blank" rel="noopener noreferrer">Пользовательское соглашение (Клиент)</a>
          <a href="/docs/user_agreement_expert.pdf" target="_blank" rel="noopener noreferrer">Пользовательское соглашение (Эксперт)</a>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <span>© {new Date().getFullYear()} Око Знаний. Все права защищены.</span>
      </div>
    </div>
  </footer>
);