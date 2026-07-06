import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarCircleOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  DesktopOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { SEO } from '@/features/common';
import { TopBar, StatsBand, BecomeLeadForm, FooterDark } from '@/features/landing-v2/components/LandingChrome';
import styles from '@/features/landing-v2/LandingV2.module.css';

const benefits = [
  { value: '25%', icon: <DollarCircleOutlined />, title: 'Комиссия с каждого заказа', text: 'Получай 25% от суммы каждого заказа на протяжении полугода.' },
  { value: '7 дней', icon: <ThunderboltOutlined />, title: 'До первой прибыли', text: 'Начинай зарабатывать практически сразу после запуска.' },
  { value: '1 на 1', icon: <TeamOutlined />, title: 'Поддержка директора', text: 'Персональная поддержка от директора биржи в первый месяц.' },
  { value: '100%', icon: <DesktopOutlined />, title: 'Работа онлайн', text: 'Без офиса — работай из любой точки мира.' },
];

const steps = [
  { num: '01', title: 'Общение с менеджером', text: 'Связываемся с вами и обсуждаем все детали сотрудничества.' },
  { num: '02', title: 'Заполнение договора', text: 'Оформляем все необходимые документы для начала работы.' },
  { num: '03', title: 'Составление плана запуска', text: 'Разрабатываем индивидуальную стратегию развития вашего бизнеса.' },
  { num: '04', title: 'Открытие точки', text: 'Онлайн без офиса — работайте откуда удобно.' },
  { num: '05', title: 'Получай 25% от заказа', text: 'На протяжении полугода получайте стабильный доход от каждого заказа.' },
  { num: '06', title: 'Первая прибыль через неделю', text: 'Начинайте зарабатывать практически сразу после запуска.' },
];

const BecomePartner: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    document.title = 'Стать партнёром — Око Знаний | Гарантируем 1 000 000 ₽ оборот';
  }, []);

  return (
    <div className={`${styles.page} ${styles.becomePage}`}>
      <SEO
        title="Стать партнером - Око Знаний | Гарантируем 1 000 000 ₽ оборот"
        description="Бизнес с Око Знаний - это просто! Гарантируем 1 000 000 ₽ оборот вашего агентства через 2 месяца. Персональная поддержка от директора биржи. Получай 25% от заказа."
        keywords="франшиза, бизнес партнерство, заработок онлайн, образовательный бизнес, партнерская программа, франчайзинг"
        ogTitle="Стать партнером - Развивай бизнес с Око Знаний"
        ogDescription="Гарантируем 1 000 000 ₽ оборот через 2 месяца. Получай 25% от каждого заказа. Персональная поддержка."
        ogUrl="https://okoznaniy.ru/become-partner"
        canonical="https://okoznaniy.ru/become-partner"
      />

      <TopBar links={[{ href: '#benefits', label: 'Преимущества' }, { href: '#steps', label: 'Как это работает' }, { href: '#feedback', label: 'Стать партнёром' }]} />

      <section className={styles.becomeHero}>
        <div className={styles.heroBlobs}>
          <div className={`${styles.blob} ${styles.blob1}`} />
          <div className={`${styles.blob} ${styles.blob2}`} />
          <div className={`${styles.blob} ${styles.blob3}`} />
        </div>
        <div className={`${styles.container} ${styles.becomeHeroInner}`}>
          <div className={styles.heroBadge}>
            <span className={styles.dot} />
            Партнёрская программа
          </div>
          <h1 className={styles.heroTitle}>
            Бизнес с <span className={styles.accent}>Око Знаний</span><br />
            — это <span className={styles.underline}>просто</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Запусти собственное агентство под нашим крылом. Получай 25% от каждого заказа,
            персональную поддержку директора и гарантию оборота уже через 2 месяца.
          </p>
          <button className={styles.btnPrimaryBig} onClick={() => navigate('/become-partner#feedback')}>
            Стать партнёром →
          </button>
          <img src="/assets/become/partner-hero.png" alt="" className={styles.becomeHeroImg} /><div className={styles.becomeHeroStats}>
            <div className={styles.becomeHeroStat}>
              <span className={styles.becomeHeroStatVal}>25%</span>
              <span className={styles.becomeHeroStatLabel}>от каждого заказа</span>
            </div>
            <div className={styles.becomeHeroStat}>
              <span className={styles.becomeHeroStatVal}>1 млн ₽</span>
              <span className={styles.becomeHeroStatLabel}>оборот за 2 месяца</span>
            </div>
            <div className={styles.becomeHeroStat}>
              <span className={styles.becomeHeroStatVal}>7 дней</span>
              <span className={styles.becomeHeroStatLabel}>до первой прибыли</span>
            </div>
          </div>
        </div>
      </section>

      <StatsBand
        tag="Партнёрство в цифрах"
        title={<>Развивай бизнес <span className={styles.gradAccent}>вместе с нами</span></>}
        items={[
          { value: '25%', label: 'С каждого заказа' },
          { value: '1 млн ₽', label: 'Оборот за 2 месяца' },
          { value: '7 дней', label: 'До первой прибыли' },
          { value: '100%', label: 'Работа онлайн' },
        ]}
      />

      <section className={styles.section} id="benefits">
        <div className={styles.container}>
          <div className={styles.sectionTag}>Преимущества партнёрства</div>
          <h2 className={styles.sectionTitle}>Стабильный доход и наша поддержка</h2>
          <p className={styles.sectionSubtitle}>
            Получайте стабильный доход и развивайте свой бизнес с поддержкой команды Око Знаний.
          </p>
          <div className={styles.safetyGrid}>
            {benefits.map((b) => (
              <div className={styles.safetyCard} key={b.title}>
                <div className={styles.safetyIcon}>{b.icon}</div>
                <div className={styles.becomeStepNum}>{b.value}</div>
                <div className={styles.safetyTitle}>{b.title}</div>
                <div className={styles.safetyDesc}>{b.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section} id="steps">
        <div className={styles.container}>
          <div className={styles.becomeGuarantee}>
            <span className={styles.becomeGuaranteeBadge}>Гарантия</span>
            <h2 className={styles.becomeGuaranteeTitle}>
              1 000 000 ₽ оборот вашего агентства через 2 месяца
            </h2>
            <div className={styles.becomeGuaranteeItems}>
              <div className={styles.becomeGuaranteeItem}>
                <CheckOutlined /> Персональная поддержка от директора биржи на протяжении 1 месяца
              </div>
              <div className={styles.becomeGuaranteeItem}>
                <CheckOutlined /> Далее — персональный менеджер навсегда
              </div>
            </div>
          </div>

          <div className={styles.sectionTag}>Как проходит работа</div>
          <h2 className={styles.sectionTitle}>Путь от заявки до прибыли</h2>
          <div className={styles.safetyGrid}>
            {steps.map((s) => (
              <div className={styles.safetyCard} key={s.num}>
                <div className={styles.becomeStepNum}>{s.num}</div>
                <div className={styles.safetyTitle}>{s.title}</div>
                <div className={styles.safetyDesc}>{s.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BecomeLeadForm
        type="partner"
        buttonText="Стать партнёром"
        title={<>Готов запустить <em>своё агентство</em>?</>}
        subtitle="Оставь email — свяжемся, обсудим детали и составим план запуска твоего бизнеса."
      />

      <FooterDark />
    </div>
  );
};

export default BecomePartner;