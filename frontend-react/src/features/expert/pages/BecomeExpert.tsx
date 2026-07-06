import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiseOutlined, DollarCircleOutlined, ClockCircleOutlined, DesktopOutlined,
  SafetyOutlined, TeamOutlined, CheckCircleOutlined, StarFilled, ThunderboltOutlined,
} from '@ant-design/icons';
import { SEO } from '@/features/common';
import { TopBar, BecomeLeadForm, FooterDark } from '@/features/landing-v2/components/LandingChrome';
import styles from '@/features/landing-v2/LandingV2.module.css';

const useReveal = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return { ref, cls: `${styles.bpReveal} ${v ? styles.bpVisible : ''}` };
};

const advantages = [
  { icon: <RiseOutlined />, title: 'Большой поток заказов', text: 'Тысячи студентов ежедневно размещают задания — выбирай подходящие.' },
  { icon: <DollarCircleOutlined />, title: 'Сам ставишь цену', text: 'Выбираешь задание и предлагаешь свою ставку. Никаких фиксированных тарифов.' },
  { icon: <ClockCircleOutlined />, title: 'Гибкий график', text: 'Работай когда удобно: утром, вечером или в выходные.' },
  { icon: <DesktopOutlined />, title: 'Полностью удалённо', text: 'Работай из любой точки мира. Нужен только компьютер и интернет.' },
  { icon: <SafetyOutlined />, title: '100% гарантия оплаты', text: 'Деньги на эскроу-счёте: получишь оплату сразу после сдачи работы.' },
  { icon: <TeamOutlined />, title: 'Прямой контакт с заказчиком', text: 'Общайся напрямую, уточняй детали и получай обратную связь.' },
];

const BecomeExpert: React.FC = () => {
  const navigate = useNavigate();
  const adv = useReveal();
  useEffect(() => { document.title = 'Стать экспертом — Око Знаний | Зарабатывай от 100 000 ₽ в месяц'; }, []);

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

      <section className={styles.bpHero}>
        <div className={styles.heroBlobs}>
          <div className={`${styles.blob} ${styles.blob1}`} />
          <div className={`${styles.blob} ${styles.blob2}`} />
          <div className={`${styles.blob} ${styles.blob3}`} />
        </div>
        <div className={`${styles.container} ${styles.bpHeroGrid}`}>
          <div>
            <div className={styles.heroBadge}><span className={styles.dot} /> Работа для экспертов</div>
            <h1 className={styles.bpHeroTitle}>
              Стань <span className={styles.accent}>автором</span> студенческих работ и зарабатывай <span className={styles.underline}>от 100 000 ₽</span>
            </h1>
            <p className={styles.bpHeroSub}>
              Большой поток заказов, гибкий график и удалённая работа. Сам выбираешь задания
              и ставишь цену. Начни зарабатывать на своих знаниях уже сегодня.
            </p>
            <div className={styles.bpHeroCtas}>
              <button className={styles.btnPrimaryBig} onClick={() => navigate('/expert-application')}>Стать экспертом →</button>
              <a href="#adv" className={styles.btnGhost}>Узнать подробнее</a>
            </div>
            <div className={styles.bpHeroNote}><CheckCircleOutlined /> Регистрация бесплатна, первые заказы уже сегодня</div>
            <div className={styles.bpHeroStats}>
              <div className={styles.bpHeroStat}><span className={styles.bpHeroStatVal}>5 000+</span><span className={styles.bpHeroStatLabel}>активных заказов</span></div>
              <div className={styles.bpHeroStat}><span className={styles.bpHeroStatVal}>от 500 ₽</span><span className={styles.bpHeroStatLabel}>за одну работу</span></div>
              <div className={styles.bpHeroStat}><span className={styles.bpHeroStatVal}>24/7</span><span className={styles.bpHeroStatLabel}>поддержка авторов</span></div>
            </div>
          </div>

          <div className={styles.bpHeroArt}>
            <div className={styles.bpHeroArtGlow} />
            <div className={styles.bpHeroImgWrap}>
              <img src="/assets/become/expert-hero.png" alt="Эксперт за работой" className={styles.bpHeroImg} />
            </div>
            <div className={`${styles.bpChip} ${styles.bpChip1}`}>
              <div className={styles.bpChipIcon}><DollarCircleOutlined /></div>
              <div><div className={styles.bpChipTitle}>100 000 ₽+</div><div className={styles.bpChipSub}>средний доход в месяц</div></div>
            </div>
            <div className={`${styles.bpChip} ${styles.bpChip2}`}>
              <div className={`${styles.bpChipIcon} ${styles.bpChipIconPink}`}><StarFilled /></div>
              <div><div className={styles.bpChipTitle}>4.9 / 5</div><div className={styles.bpChipSub}>рейтинг авторов</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.bpSection} ${styles.bpSectionAlt}`} id="adv">
        <div className={styles.container}>
          <div className={styles.bpHead}>
            <span className={styles.bpTag}>Почему выбирают нас</span>
            <h2 className={styles.bpTitle}>Всё для комфортной <span className={styles.g}>удалённой работы</span></h2>
            <p className={styles.bpSub}>Зарабатывай на своих знаниях без офиса, начальства и фиксированного графика.</p>
          </div>
          <div ref={adv.ref} className={`${styles.bpGrid} ${adv.cls}`}>
            {advantages.map((a) => (
              <div className={styles.bpCard} key={a.title}>
                <div className={styles.bpCardIcon}>{a.icon}</div>
                <div className={styles.bpCardTitle}>{a.title}</div>
                <div className={styles.bpCardText}>{a.text}</div>
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