import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarCircleOutlined, ThunderboltOutlined, TeamOutlined, DesktopOutlined,
  CheckOutlined, CheckCircleOutlined, RiseOutlined, CrownFilled,
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

const benefits = [
  { value: '25%', icon: <DollarCircleOutlined />, title: 'Комиссия с каждого заказа', text: 'Получай 25% от суммы каждого заказа на протяжении полугода.' },
  { value: '7 дней', icon: <ThunderboltOutlined />, title: 'До первой прибыли', text: 'Начинай зарабатывать практически сразу после запуска.' },
  { value: '1 на 1', icon: <TeamOutlined />, title: 'Поддержка директора', text: 'Персональная поддержка от директора биржи в первый месяц.' },
  { value: '100%', icon: <DesktopOutlined />, title: 'Работа онлайн', text: 'Без офиса — работай из любой точки мира.' },
];

const steps = [
  { num: '01', title: 'Общение с менеджером', text: 'Связываемся с вами и обсуждаем все детали сотрудничества.' },
  { num: '02', title: 'Заполнение договора', text: 'Оформляем все необходимые документы для начала работы.' },
  { num: '03', title: 'План запуска', text: 'Разрабатываем индивидуальную стратегию развития вашего бизнеса.' },
  { num: '04', title: 'Открытие точки', text: 'Онлайн без офиса — работайте откуда удобно.' },
  { num: '05', title: 'Получай 25% от заказа', text: 'На протяжении полугода получайте стабильный доход от каждого заказа.' },
  { num: '06', title: 'Первая прибыль', text: 'Начинайте зарабатывать практически сразу после запуска.' },
];

const BecomePartner: React.FC = () => {
  const navigate = useNavigate();
  const ben = useReveal();
  const stp = useReveal();
  useEffect(() => { document.title = 'Стать партнёром — Око Знаний | Гарантируем 1 000 000 ₽ оборот'; }, []);

  return (
    <div className={styles.page}>
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

      <section className={styles.bpHero}>
        <div className={styles.heroBlobs}>
          <div className={`${styles.blob} ${styles.blob1}`} />
          <div className={`${styles.blob} ${styles.blob2}`} />
          <div className={`${styles.blob} ${styles.blob3}`} />
        </div>
        <div className={`${styles.container} ${styles.bpHeroGrid}`}>
          <div>
            <div className={styles.heroBadge}><span className={styles.dot} /> Партнёрская программа</div>
            <h1 className={styles.bpHeroTitle}>
              Бизнес с <span className={styles.accent}>Око Знаний</span> — это <span className={styles.underline}>просто</span>
            </h1>
            <p className={styles.bpHeroSub}>
              Запусти собственное агентство под нашим крылом. Получай 25% от каждого заказа,
              персональную поддержку директора и гарантию оборота уже через 2 месяца.
            </p>
            <div className={styles.bpHeroCtas}>
              <button className={styles.btnPrimaryBig} onClick={() => navigate('/become-partner#feedback')}>Стать партнёром →</button>
              <a href="#steps" className={styles.btnGhost}>Как это работает</a>
            </div>
            <div className={styles.bpHeroNote}><CheckCircleOutlined /> Гарантия 1 000 000 ₽ оборота через 2 месяца</div>
            <div className={styles.bpHeroStats}>
              <div className={styles.bpHeroStat}><span className={styles.bpHeroStatVal}>25%</span><span className={styles.bpHeroStatLabel}>от каждого заказа</span></div>
              <div className={styles.bpHeroStat}><span className={styles.bpHeroStatVal}>1 млн ₽</span><span className={styles.bpHeroStatLabel}>оборот за 2 месяца</span></div>
              <div className={styles.bpHeroStat}><span className={styles.bpHeroStatVal}>7 дней</span><span className={styles.bpHeroStatLabel}>до первой прибыли</span></div>
            </div>
          </div>

          <div className={styles.bpHeroArt}>
            <div className={styles.bpHeroArtGlow} />
            <div className={styles.bpHeroImgWrap}>
              <img src="/assets/become/partner-hero.png" alt="Партнёрство" className={styles.bpHeroImg} />
            </div>
            <div className={`${styles.bpChip} ${styles.bpChip1}`}>
              <div className={styles.bpChipIcon}><CrownFilled /></div>
              <div><div className={styles.bpChipTitle}>25% комиссия</div><div className={styles.bpChipSub}>с каждого заказа</div></div>
            </div>
            <div className={`${styles.bpChip} ${styles.bpChip2}`}>
              <div className={`${styles.bpChipIcon} ${styles.bpChipIconPink}`}><RiseOutlined /></div>
              <div><div className={styles.bpChipTitle}>1 000 000 ₽</div><div className={styles.bpChipSub}>оборот за 2 месяца</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.bpSection} ${styles.bpSectionAlt}`} id="benefits">
        <div className={styles.container}>
          <div className={styles.bpHead}>
            <span className={styles.bpTag}>Преимущества партнёрства</span>
            <h2 className={styles.bpTitle}>Стабильный доход и <span className={styles.g}>наша поддержка</span></h2>
            <p className={styles.bpSub}>Развивай свой бизнес с командой Око Знаний за спиной.</p>
          </div>
          <div ref={ben.ref} className={`${styles.bpBento} ${ben.cls}`}>
            <div className={styles.bpBentoFeatured}>
              <div>
                <div className={styles.bpBentoFeaturedTop}>
                  <div className={styles.bpBentoFeaturedIcon}>{benefits[0].icon}</div>
                  <span className={styles.bpBentoBadge}>Главное преимущество</span>
                </div>
                <div className={styles.bpBentoValue}>{benefits[0].value}</div>
              </div>
              <div>
                <div className={styles.bpBentoFeaturedTitle}>{benefits[0].title}</div>
                <div className={styles.bpBentoFeaturedText}>{benefits[0].text}</div>
              </div>
            </div>
            <div className={styles.bpBentoList}>
              {benefits.slice(1).map((b) => (
                <div className={styles.bpBentoItem} key={b.title}>
                  <div className={styles.bpBentoItemIcon}>{b.icon}</div>
                  <div>
                    <div className={styles.bpBentoItemVal}>{b.value}</div>
                    <div className={styles.bpBentoItemTitle}>{b.title}</div>
                    <div className={styles.bpBentoItemText}>{b.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.bpSection} id="steps">
        <div className={styles.container}>
          <div className={styles.bpGuarantee}>
            <div className={styles.bpGuaranteeOrb} />
            <span className={styles.bpGuaranteeBadge}>Гарантия</span>
            <h2 className={styles.bpGuaranteeTitle}>1 000 000 ₽ оборот вашего агентства через 2 месяца</h2>
            <div className={styles.bpGuaranteeItems}>
              <div className={styles.bpGuaranteeItem}><CheckOutlined /> Персональная поддержка от директора биржи на протяжении 1 месяца</div>
              <div className={styles.bpGuaranteeItem}><CheckOutlined /> Далее — персональный менеджер навсегда</div>
            </div>
          </div>

          <div className={styles.bpHead}>
            <span className={styles.bpTag}>Как проходит работа</span>
            <h2 className={styles.bpTitle}>Путь от заявки до <span className={styles.g}>прибыли</span></h2>
          </div>
          <div ref={stp.ref} className={`${styles.bpSteps} ${stp.cls}`}>
            {steps.map((s) => (
              <div className={styles.bpStep} key={s.num}>
                <div className={styles.bpStepNum}>{s.num}</div>
                <div className={styles.bpStepTitle}>{s.title}</div>
                <div className={styles.bpStepText}>{s.text}</div>
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