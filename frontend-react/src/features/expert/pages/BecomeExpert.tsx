import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiseOutlined,
  DollarCircleOutlined,
  ClockCircleOutlined,
  DesktopOutlined,
  SafetyOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { SEO } from '@/features/common';
import { TopBar, StatsBand, BecomeLeadForm, FooterDark } from '@/features/landing-v2/components/LandingChrome';
import styles from '@/features/landing-v2/LandingV2.module.css';

const advantages = [
  { icon: <RiseOutlined />, title: 'Большой поток заказов', text: 'Тысячи студентов ежедневно размещают задания — выбирай подходящие.' },
  { icon: <DollarCircleOutlined />, title: 'Сам ставишь цену', text: 'Выбираешь задание и предлагаешь свою ставку — никаких фиксированных тарифов.' },
  { icon: <ClockCircleOutlined />, title: 'Гибкий график', text: 'Работай когда удобно — утром, вечером или в выходные.' },
  { icon: <DesktopOutlined />, title: 'Полностью удалённо', text: 'Работай из любой точки мира — нужен только компьютер и интернет.' },
  { icon: <SafetyOutlined />, title: '100% гарантия оплаты', text: 'Деньги хранятся на эскроу-счёте — получишь оплату после сдачи работы.' },
  { icon: <TeamOutlined />, title: 'Прямой контакт с заказчиком', text: 'Общайся напрямую, уточняй детали и получай обратную связь.' },
];

const BecomeExpert: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    document.title = 'Стать экспертом — Око Знаний | Зарабатывай от 100 000 ₽ в месяц';
  }, []);

  return (
    <div className={styles.page}>
      <SEO
        title="Стать экспертом - Око Знаний | Зарабатывай от 100 000 ₽ в месяц"
        description="Стань автором студенческих работ и зарабатывай от 100 000 ₽ в месяц. Большой поток заказов, гибкий график, удаленная работа. Начни работать прямо сейчас!"
        keywords="работа для студентов, удаленная работа, написание работ, заработок на знаниях, фриланс для студентов, работа экспертом"
        ogTitle="Стать экспертом - Зарабатывай на своих знаниях"
        ogDescription="Большой поток заказов, гибкий график работы, удаленная работа. Зарабатывай от 100 000 ₽ в месяц."
        ogUrl="https://okoznaniy.ru/become-expert"
        canonical="https://okoznaniy.ru/become-expert"
      />

      <TopBar links={[{ href: '#adv', label: 'Преимущества' }, { href: '#feedback', label: 'Начать' }]} />

      <section className={styles.becomeHero}>
        <div className={styles.heroBlobs}>
          <div className={`${styles.blob} ${styles.blob1}`} />
          <div className={`${styles.blob} ${styles.blob2}`} />
          <div className={`${styles.blob} ${styles.blob3}`} />
        </div>
        <div className={`${styles.container} ${styles.becomeHeroInner}`}>
          <div className={styles.heroBadge}>
            <span className={styles.dot} />
            Работа для экспертов
          </div>
          <h1 className={styles.heroTitle}>
            Стань <span className={styles.accent}>автором</span> студенческих работ<br />
            и зарабатывай <span className={styles.underline}>от 100 000 ₽</span> в месяц
          </h1>
          <p className={styles.heroSubtitle}>
            Большой поток заказов, гибкий график и удалённая работа. Сам выбираешь задания
            и ставишь цену. Начни зарабатывать на своих знаниях уже сегодня.
          </p>
          <button className={styles.btnPrimaryBig} onClick={() => navigate('/expert-application')}>
            Стать экспертом →
          </button>
          <div className={styles.becomeHeroStats}>
            <div className={styles.becomeHeroStat}>
              <span className={styles.becomeHeroStatVal}>5 000+</span>
              <span className={styles.becomeHeroStatLabel}>активных заказов</span>
            </div>
            <div className={styles.becomeHeroStat}>
              <span className={styles.becomeHeroStatVal}>от 500 ₽</span>
              <span className={styles.becomeHeroStatLabel}>за одну работу</span>
            </div>
            <div className={styles.becomeHeroStat}>
              <span className={styles.becomeHeroStatVal}>24/7</span>
              <span className={styles.becomeHeroStatLabel}>поддержка</span>
            </div>
          </div>
        </div>
      </section>

      <StatsBand
        tag="Око Знаний в цифрах"
        title={<>Тысячи заказов ждут <span className={styles.gradAccent}>своего автора</span></>}
        items={[
          { value: '5 000+', label: 'Активных заказов' },
          { value: 'от 500 ₽', label: 'За одну работу' },
          { value: '100 000 ₽', label: 'Средний доход в месяц' },
          { value: '24/7', label: 'Поддержка авторов' },
        ]}
      />

      <section className={styles.section} id="adv">
        <div className={styles.container}>
          <div className={styles.sectionTag}>Почему выбирают нас</div>
          <h2 className={styles.sectionTitle}>Всё для комфортной удалённой работы</h2>
          <p className={styles.sectionSubtitle}>
            Зарабатывай на своих знаниях без офиса, начальства и фиксированного графика.
          </p>
          <div className={styles.safetyGrid}>
            {advantages.map((a) => (
              <div className={styles.safetyCard} key={a.title}>
                <div className={styles.safetyIcon}>{a.icon}</div>
                <div className={styles.safetyTitle}>{a.title}</div>
                <div className={styles.safetyDesc}>{a.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BecomeLeadForm
        type="registration"
        buttonText="Стать экспертом"
        title={<>Готов начать <em>зарабатывать</em>?</>}
        subtitle="Оставь email — пришлём инструкцию по регистрации и первые доступные заказы."
      />

      <FooterDark />
    </div>
  );
};

export default BecomeExpert;