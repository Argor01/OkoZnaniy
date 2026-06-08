import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LockOutlined,
  SafetyOutlined,
  SafetyCertificateOutlined,
  FileProtectOutlined,
  DollarCircleOutlined,
  CustomerServiceOutlined,
  RobotOutlined,
  AppstoreOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { SEO } from '@/features/common';
import styles from '../LandingV2.module.css';

/* ---------- Reveal-on-scroll hook ---------- */
const useReveal = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return { ref, className: `${styles.reveal} ${visible ? styles.visible : ''}` };
};

/* ---------- Animated counter ---------- */
const useCounter = (target: number, duration = 1600) => {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (t: number) => {
            const p = Math.min((t - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(Math.round(target * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [target, duration]);
  return { ref, val };
};

/* ---------- Top bar ---------- */
const TopBar: React.FC = () => (
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
        <a href="#how">Как это работает</a>
        <a href="#experts">Эксперты</a>
        <a href="#reviews">Отзывы</a>
        <a href="#cta">Заказать</a>
      </nav>
      <div className={styles.topActions}>
        <Link to="/login" className={styles.btnGhost}>Войти</Link>
        <Link to="/register" className={styles.btnPrimary}>Регистрация</Link>
      </div>
    </div>
  </header>
);

/* ---------- Hero ---------- */
const Hero: React.FC = () => {
  const navigate = useNavigate();
  const [taskType, setTaskType] = useState('Курсовая работа');
  const [deadline, setDeadline] = useState('Через неделю');
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/register?type=${encodeURIComponent(taskType)}&deadline=${encodeURIComponent(deadline)}`);
  };
  return (
    <section className={styles.hero}>
      <div className={styles.heroBlobs}>
        <div className={`${styles.blob} ${styles.blob1}`} />
        <div className={`${styles.blob} ${styles.blob2}`} />
        <div className={`${styles.blob} ${styles.blob3}`} />
      </div>
      <div className={`${styles.container} ${styles.heroGrid}`}>
        <div>
          <div className={styles.heroBadge}>
            <span className={styles.dot} />
            №1 платформа помощи студентам в 2026
          </div>
          <h1 className={styles.heroTitle}>
            Найди <span className={styles.accent}>эксперта</span>,<br />
            который <span className={styles.underline}>сделает работу</span><br />
            за тебя
          </h1>
          <p className={styles.heroSubtitle}>
            Более 8 000 проверенных авторов: курсовые, дипломы, рефераты, контрольные.
            Авторский подход, бессрочная гарантия, рассрочка 0%.
          </p>

          <form className={styles.heroForm} onSubmit={onSubmit}>
            <div className={styles.heroFormGroup}>
              <label className={styles.heroFormLabel}>Тип работы</label>
              <select
                className={styles.heroFormSelect}
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
              >
                <option>Курсовая работа</option>
                <option>Дипломная работа</option>
                <option>Реферат</option>
                <option>Контрольная работа</option>
                <option>Эссе</option>
                <option>Решение задач</option>
                <option>Презентация</option>
              </select>
            </div>
            <div className={styles.heroFormGroup}>
              <label className={styles.heroFormLabel}>Срок</label>
              <select
                className={styles.heroFormSelect}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              >
                <option>Сегодня</option>
                <option>Завтра</option>
                <option>Через 3 дня</option>
                <option>Через неделю</option>
                <option>Через 2 недели</option>
                <option>Через месяц</option>
              </select>
            </div>
            <button type="submit" className={styles.heroFormBtn}>
              Найти эксперта →
            </button>
          </form>

          <div className={styles.heroTrust}>
            <div className={styles.heroTrustGroup}>
              <div className={styles.heroAvatars}>
                <img src="/assets/landing-v2/expert1.jpg" alt="" />
                <img src="/assets/landing-v2/expert2.jpg" alt="" />
                <img src="/assets/landing-v2/expert3.jpg" alt="" />
                <img src="/assets/landing-v2/expert4.jpg" alt="" />
              </div>
              <div className={styles.heroTrustText}>
                <strong>+ 8 000 экспертов</strong>
                готовы помочь прямо сейчас
              </div>
            </div>
            <div className={styles.heroTrustGroup}>
              <div className={styles.heroStars}>★★★★★</div>
              <div className={styles.heroTrustText}>
                <strong>4.9 из 5</strong>
                по 12 400 отзывам
              </div>
            </div>
          </div>
        </div>

        <div className={styles.heroExperts} aria-hidden="false">
          <div className={`${styles.expertCard} ${styles.expertCard1}`}>
            <div className={styles.expertCardPhoto}>
              <img src="/assets/landing-v2/expert1.jpg" alt="Анна К." />
              <span className={styles.expertOnline}>онлайн</span>
              <span className={styles.expertRatingTag}>★ 4.9</span>
            </div>
            <div className={styles.expertCardName}>Анна К.</div>
            <div className={styles.expertCardRole}>Филология • Литература</div>
            <div className={styles.expertCardStats}>
              <span><strong>312</strong> работ</span>
              <span><strong>7 лет</strong> опыт</span>
            </div>
          </div>

          <div className={`${styles.expertCard} ${styles.expertCard2}`}>
            <div className={styles.expertCardPhoto}>
              <img src="/assets/landing-v2/expert2.jpg" alt="Дмитрий В." />
              <span className={styles.expertOnline}>онлайн</span>
              <span className={styles.expertRatingTag}>★ 5.0</span>
            </div>
            <div className={styles.expertCardName}>Дмитрий В.</div>
            <div className={styles.expertCardRole}>Экономика • Право</div>
            <div className={styles.expertCardStats}>
              <span><strong>489</strong> работ</span>
              <span><strong>12 лет</strong> опыт</span>
            </div>
          </div>

          <div className={`${styles.expertCard} ${styles.expertCard3}`}>
            <div className={styles.expertCardPhoto}>
              <img src="/assets/landing-v2/expert3.jpg" alt="Мария Л." />
              <span className={styles.expertOnline}>онлайн</span>
              <span className={styles.expertRatingTag}>★ 4.8</span>
            </div>
            <div className={styles.expertCardName}>Мария Л.</div>
            <div className={styles.expertCardRole}>Программирование</div>
            <div className={styles.expertCardStats}>
              <span><strong>208</strong> работ</span>
              <span><strong>5 лет</strong> опыт</span>
            </div>
          </div>

          <div className={styles.heroFloatBadge}>
            <div className={styles.icon}>✓</div>
            <div>
              <strong>973 студента</strong>
              <span>получили работу сегодня</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------- Stats Dark Band ---------- */
const useCount = (target: number) => {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const done = useRef(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true;
        const start = performance.now();
        const dur = 1600;
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / dur);
          setV(Math.floor(target * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [target]);
  return { ref, val: v };
};

const StatsDark: React.FC = () => {
  const a = useCount(8420);
  const b = useCount(127500);
  const c = useCount(4.9 as any);
  const d = useCount(97);
  return (
    <section className={styles.statsDark}>
      <div className={styles.statsDarkOrb1} />
      <div className={styles.statsDarkOrb2} />
      <div className={styles.container}>
        <div className={styles.statsDarkHeader}>
          <span className={styles.smallTag}>Платформа в цифрах</span>
          <h2 className={styles.statsDarkTitle}>
            Каждый день студенты сдают <span className={styles.gradAccent}>на отлично</span>
          </h2>
        </div>
        <div className={styles.statsDarkGrid}>
          <div className={styles.statBoxDark} ref={a.ref}>
            <div className={styles.statValueDark}>{a.val.toLocaleString('ru-RU')}+</div>
            <div className={styles.statLabelDark}>Проверенных экспертов</div>
            <svg className={styles.statSpark} viewBox="0 0 100 30" preserveAspectRatio="none">
              <path d="M0 22 L15 18 L30 20 L45 12 L60 14 L75 6 L100 2" fill="none" stroke="#f6c14a" strokeWidth="2" />
              <path d="M0 22 L15 18 L30 20 L45 12 L60 14 L75 6 L100 2 L100 30 L0 30 Z" fill="url(#sparkA)" opacity="0.35" />
              <defs><linearGradient id="sparkA" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#f6c14a" /><stop offset="1" stopColor="#f6c14a" stopOpacity="0" /></linearGradient></defs>
            </svg>
          </div>
          <div className={styles.statBoxDark} ref={b.ref}>
            <div className={styles.statValueDark}>{b.val.toLocaleString('ru-RU')}</div>
            <div className={styles.statLabelDark}>Выполненных работ</div>
            <svg className={styles.statSpark} viewBox="0 0 100 30" preserveAspectRatio="none">
              <path d="M0 26 L20 22 L40 18 L60 14 L80 8 L100 4" fill="none" stroke="#ec4899" strokeWidth="2" />
            </svg>
          </div>
          <div className={styles.statBoxDark} ref={c.ref}>
            <div className={styles.statValueDark}>4.9<span className={styles.smallOf}> / 5</span></div>
            <div className={styles.statLabelDark}>Средний рейтинг авторов</div>
            <div className={styles.statStarsRow}>★★★★★</div>
          </div>
          <div className={styles.statBoxDark} ref={d.ref}>
            <div className={styles.statValueDark}>{d.val}%</div>
            <div className={styles.statLabelDark}>Сдают с первого раза</div>
            <div className={styles.statBar}><div className={styles.statBarFill} style={{ width: `${d.val}%` }} /></div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------- How it works ---------- */
const HowItWorks: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(2);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s % 4) + 1), 2200);
    return () => clearInterval(t);
  }, []);
  const steps = [
    { n: 1, t: 'Опиши задание', d: 'Тип работы, тема, срок, методичка — за 30 секунд.' },
    { n: 2, t: 'Получи отклики', d: 'Эксперты по твоему предмету откликаются за 3–7 минут.' },
    { n: 3, t: 'Выбери своего', d: 'Сравни рейтинги, отзывы, цены. Общайся в чате.' },
    { n: 4, t: 'Прими работу', d: 'Деньги переводим автору только после твоего «ОК».' },
  ];
  return (
    <section className={styles.how} id="how">
      <div className={`${styles.container} ${styles.howInner}`}>
        <div className={styles.howLeft}>
          <span className={styles.smallTag}>Как это работает</span>
          <h2 className={styles.bigTitle}>
            От заявки до сдачи — <span className={styles.gradAccent}>4 минуты</span> твоего времени
          </h2>
          <p className={styles.bigSub}>
            Платформа сама находит эксперта по предмету, согласует цену и сроки.
            Ты только утверждаешь работу — остальное на нас.
          </p>
          <div className={styles.howSteps}>
            {steps.map((s) => (
              <div key={s.n} className={`${styles.howStep} ${step === s.n ? styles.howStepActive : ''}`}>
                <div className={styles.howStepNum}>{s.n}</div>
                <div>
                  <div className={styles.howStepTitle}>{s.t}</div>
                  <div className={styles.howStepDesc}>{s.d}</div>
                </div>
                <div className={styles.howStepCheck}>✓</div>
              </div>
            ))}
          </div>
          <button className={styles.btnPrimaryBig} onClick={() => navigate('/login')}>
            Оформить заявку бесплатно →
          </button>
          <div className={styles.howNote}>
            <span><LockOutlined /></span> Деньги под защитой эскроу. Возврат 100% за 24 часа.
          </div>
        </div>

        <div className={styles.howRight}>
          <div className={styles.chatMock}>
            <div className={styles.chatHeader}>
              <div className={styles.chatAvatar}>
                <img src="/assets/landing-v2/expert6.jpg" alt="Елена" />
                <span className={styles.chatOnlineDot} />
              </div>
              <div className={styles.chatHeaderInfo}>
                <div className={styles.chatHeaderName}>Елена Викторовна</div>
                <div className={styles.chatHeaderRole}>Доктор фил. наук · печатает...</div>
              </div>
              <div className={styles.chatStars}>★ 4.96</div>
            </div>
            <div className={styles.chatBody}>
              <div className={`${styles.chatMsg} ${styles.chatMsgIn}`}>
                Здравствуйте! Курсовая по социолингвистике — мой профиль. Возьму на себя.
                <span className={styles.chatMsgTime}>14:02</span>
              </div>
              <div className={`${styles.chatMsg} ${styles.chatMsgIn}`}>
                Готова сдать за 3 дня с антиплагиатом 92%.
                <span className={styles.chatMsgTime}>14:02</span>
              </div>
              <div className={`${styles.chatMsg} ${styles.chatMsgOut}`}>
                Супер! Беру.
                <span className={styles.chatMsgTime}>14:03</span>
              </div>
              <div className={styles.chatTypingRow}>
                <div className={styles.chatTyping}>
                  <span /><span /><span />
                </div>
                <span className={styles.chatTypingLabel}>Елена печатает...</span>
              </div>
            </div>
            <div className={styles.chatInput}>
              <input placeholder="Сообщение" readOnly />
              <button>↑</button>
            </div>
          </div>
          <div className={styles.chatBadgeFloat}>
            <strong>3 мин</strong>
            <span>средняя скорость отклика</span>
          </div>
          <div className={styles.chatBadgeFloat2}>
            <span className={styles.chatBadgeDot} />
            <span><strong>16 экспертов</strong> онлайн прямо сейчас</span>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------- VS ChatGPT comparison ---------- */
const VsChatGPT: React.FC = () => {
  const rows = [
    { l: 'Текст пишет человек с дипломом по теме', a: 'yes', b: 'no', c: 'part' },
    { l: 'Авторский подход, не шаблон', a: 'yes', b: 'no', c: 'part' },
    { l: 'Антиплагиат 80–95% (отчёт прикладываем)', a: 'yes', b: 'no', c: 'no' },
    { l: '0% «искусственный текст» по детекторам', a: 'yes', b: 'no', c: 'no' },
    { l: 'Деньги под защитой эскроу', a: 'yes', b: 'no', c: 'part' },
    { l: 'Бесплатные доработки до сдачи', a: 'yes', b: 'no', c: 'no' },
    { l: 'Юридический договор и гарантии', a: 'yes', b: 'no', c: 'no' },
    { l: 'Поддержка 24/7 на русском', a: 'yes', b: 'no', c: 'no' },
  ];
  const mark = (m: string) => {
    if (m === 'yes') return <span className={`${styles.vsCell} ${styles.vsYes}`}>✓</span>;
    if (m === 'no') return <span className={`${styles.vsCell} ${styles.vsNo}`}>✕</span>;
    return <span className={`${styles.vsCell} ${styles.vsPart}`}>~</span>;
  };
  return (
    <section className={styles.vs}>
      <div className={styles.container}>
        <div className={styles.vsHeader}>
          <span className={styles.smallTag}>Почему мы, а не нейросеть</span>
          <h2 className={styles.bigTitle}>
            ChatGPT <span className={styles.gradAccent}>не сдаст</span> за тебя курсовую.<br />А мы сдадим.
          </h2>
          <p className={styles.bigSub}>
            Сравни честно. Готовое сравнение по 8 критериям, которые реально решают —
            от антиплагиата до возврата денег.
          </p>
        </div>

        <div className={styles.vsTableWrap}>
          <div className={styles.vsTable}>
            <div className={styles.vsTableHead}>
              <div className={styles.vsHeadLabel} />
              <div className={`${styles.vsHeadCol} ${styles.vsHeadColUs}`}>
                <img src="/assets/logo.png" alt="" className={styles.vsHeadLogo} />
                <div className={styles.vsHeadName}>Око Знаний</div>
                <div className={styles.vsHeadHint}>живые эксперты</div>
              </div>
              <div className={styles.vsHeadCol}>
                <div className={styles.vsHeadIcon}><RobotOutlined /></div>
                <div className={styles.vsHeadName}>ChatGPT</div>
                <div className={styles.vsHeadHint}>нейросеть</div>
              </div>
              <div className={styles.vsHeadCol}>
                <div className={styles.vsHeadIcon}><AppstoreOutlined /></div>
                <div className={styles.vsHeadName}>Биржи фриланса</div>
              </div>
            </div>
            {rows.map((r, i) => (
              <div className={styles.vsRow} key={i}>
                <div className={styles.vsRowLabel}>{r.l}</div>
                <div className={styles.vsRowCellUs}>{mark(r.a)}</div>
                <div className={styles.vsRowCell}>{mark(r.b)}</div>
                <div className={styles.vsRowCell}>{mark(r.c)}</div>
              </div>
            ))}
            <div className={styles.vsFooter}>
              <div />
              <div className={styles.vsFooterUs}>
                <strong>от 800 ₽</strong>
                <span>с гарантией</span>
              </div>
              <div className={styles.vsFooterCell}>
                <strong>бесплатно</strong>
                <span>но не сдашь</span>
              </div>
              <div className={styles.vsFooterCell}>
                <strong>лотерея</strong>
                <span>как повезёт</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------- Experts grid (unchanged structure, more faces) ---------- */
const ExpertsGrid: React.FC = () => {
  const r = useReveal();
  const cats = ['Все направления', 'Гуманитарные', 'Экономика', 'IT', 'Инженерные', 'Естественные'];
  const [active, setActive] = useState(0);
  const items = [
    { src: '/assets/landing-v2/expert1.jpg', name: 'Анна К.', role: 'Филология • Литература', rating: '4.9', works: 312, years: 7 },
    { src: '/assets/landing-v2/expert2.jpg', name: 'Дмитрий В.', role: 'Экономика • Финансы', rating: '5.0', works: 489, years: 12 },
    { src: '/assets/landing-v2/expert3.jpg', name: 'Мария Л.', role: 'IT • Программирование', rating: '4.8', works: 208, years: 5 },
    { src: '/assets/landing-v2/expert4.jpg', name: 'Алексей П.', role: 'Право • Менеджмент', rating: '4.9', works: 356, years: 9 },
    { src: '/assets/landing-v2/expert5.jpg', name: 'Сергей И.', role: 'История • Политология', rating: '5.0', works: 612, years: 18 },
    { src: '/assets/landing-v2/expert6.jpg', name: 'Елена В.', role: 'Социология • Психология', rating: '4.96', works: 428, years: 14 },
    { src: '/assets/landing-v2/expert7.jpg', name: 'Никита С.', role: 'Машинное обучение • Data', rating: '4.9', works: 174, years: 6 },
    { src: '/assets/landing-v2/expert8.jpg', name: 'Линь Т.', role: 'Лингвистика • Английский', rating: '4.9', works: 267, years: 8 },
  ];
  return (
    <section className={styles.section} id="experts">
      <div ref={r.ref} className={`${styles.container} ${r.className}`}>
        <div className={styles.sectionTag}>Эксперты</div>
        <h2 className={styles.sectionTitle}>Более 8 000 проверенных авторов</h2>
        <p className={styles.sectionSubtitle}>
          Только 2% кандидатов проходят отбор. Преподаватели вузов, кандидаты и доктора наук,
          практикующие специалисты.
        </p>
        <div className={styles.expertsFilter}>
          {cats.map((c, i) => (
            <button
              key={c}
              className={i === active ? styles.active : ''}
              onClick={() => setActive(i)}
              type="button"
            >
              {c}
            </button>
          ))}
        </div>
        <div className={styles.expertsGrid}>
          {items.map((e) => (
            <div className={styles.expertGridCard} key={e.name}>
              <div className={styles.expertGridPhoto}>
                <img src={e.src} alt={e.name} />
                <span className={styles.expertOnline}>онлайн</span>
                <span className={styles.expertRatingTag}>★ {e.rating}</span>
              </div>
              <div className={styles.expertGridBody}>
                <div className={styles.expertGridName}>{e.name}</div>
                <div className={styles.expertGridRole}>{e.role}</div>
                <div className={styles.expertGridStats}>
                  <span><strong>{e.works}</strong> работ</span>
                  <span><strong>{e.years} лет</strong> опыт</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ---------- Reviews marquee ---------- */
const ReviewsBlock: React.FC = () => {
  const row1 = [
    { ph: '/assets/landing-v2/student2.jpg', n: 'Анна К.', u: 'МГУ, 3 курс', t: 'Курсовая по соц. психологии за 4 дня. Антиплагиат 91%, защитила на 5. Авторский подход реально чувствуется — никакого ChatGPT-привкуса.' },
    { ph: '/assets/landing-v2/student1.jpg', n: 'Кирилл В.', u: 'ВШЭ, 4 курс', t: 'Диплом по экономике. Эксперт писал по моей структуре, не лил воду. Доработки бесплатно — переписал главу за вечер.' },
    { ph: '/assets/landing-v2/student4.jpg', n: 'София Р.', u: 'СПбГУ, 2 курс', t: 'Реферат за ночь. Серьёзно, оформила заказ в 22:00, в 7 утра уже всё было. Спасли мне сессию.' },
    { ph: '/assets/landing-v2/student3.jpg', n: 'Дмитрий М.', u: 'МФТИ, 5 курс', t: 'Самое адекватное соотношение цена-качество среди всего, что пробовал. Решение задач по физике — без шаблонов, понятным языком.' },
  ];
  const row2 = [
    { ph: '/assets/landing-v2/student5.jpg', n: 'Артём З.', u: 'СПбПУ, 4 курс', t: 'Контрольная по матану. Прислали через 6 часов после оплаты. Все шаги расписаны — теперь сам понимаю, как решать.' },
    { ph: '/assets/landing-v2/student6.jpg', n: 'Полина Д.', u: 'РАНХиГС, 3 курс', t: 'Эссе по политологии. Автор написала так, как пишу я. Преподаватель ни о чём не догадался. Это и есть авторский подход.' },
    { ph: '/assets/landing-v2/student7.jpg', n: 'Камилла А.', u: 'КФУ, 1 курс', t: 'Деньги вернули мгновенно, когда первый автор не уложился по срокам. Перенаправили на другого — успели в дедлайн.' },
    { ph: '/assets/landing-v2/student8.jpg', n: 'Илья П.', u: 'НГУ, 4 курс', t: 'Магистерская в работе с ноября. Куратор как родной — каждую неделю созвон. Закрою с красным дипломом.' },
  ];
  const Card: React.FC<{ r: typeof row1[number] }> = ({ r }) => (
    <div className={styles.reviewCardNew}>
      <div className={styles.reviewQuoteMark}>"</div>
      <div className={styles.reviewStars}>★★★★★</div>
      <div className={styles.reviewText}>{r.t}</div>
      <div className={styles.reviewAuthor}>
        <img src={r.ph} alt={r.n} />
        <div>
          <div className={styles.reviewName}>{r.n}</div>
          <div className={styles.reviewMeta}>{r.u}</div>
        </div>
      </div>
    </div>
  );
  return (
    <section className={styles.reviewsNew}>
      <div className={styles.container}>
        <div className={styles.reviewsHeader}>
          <span className={styles.smallTag}>Отзывы</span>
          <h2 className={styles.bigTitle}>
            12 400 студентов <span className={styles.gradAccent}>спят спокойно</span>
          </h2>
          <div className={styles.reviewsRatingRow}>
            <div className={styles.reviewsBigStars}>★★★★★</div>
            <div className={styles.reviewsRatingMeta}>
              <strong>4.96 из 5</strong>
              <span>на основе 12 437 отзывов</span>
            </div>
            <div className={styles.reviewsTrustLogos}>
              <span>Яндекс</span><span>Google</span><span>VK</span>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.marqueeRow}>
        <div className={`${styles.marqueeTrack} ${styles.marqueeLeft}`}>
          {[...row1, ...row1].map((r, i) => <Card key={i} r={r} />)}
        </div>
      </div>
      <div className={styles.marqueeRow}>
        <div className={`${styles.marqueeTrack} ${styles.marqueeRight}`}>
          {[...row2, ...row2].map((r, i) => <Card key={i} r={r} />)}
        </div>
      </div>
    </section>
  );
};

/* ---------- Safety band ---------- */
const SafetyBand: React.FC = () => {
  const items: { i: React.ReactNode; t: string; d: string }[] = [
    { i: <SafetyOutlined />, t: 'Эскроу-сделка', d: 'Деньги у нас, пока ты не примешь работу' },
    { i: <DollarCircleOutlined />, t: 'Возврат 100%', d: 'Не понравилось? Вернём за 24 часа' },
    { i: <FileProtectOutlined />, t: 'Юр. договор', d: 'Все условия зафиксированы письменно' },
    { i: <SafetyCertificateOutlined />, t: 'NDA по запросу', d: 'Тема работы не покинет платформу' },
    { i: <CustomerServiceOutlined />, t: 'Поддержка 24/7', d: 'Менеджер в чате за 30 секунд' },
  ];
  return (
    <section className={styles.safety}>
      <div className={styles.container}>
        <div className={styles.safetyHeader}>
          <span className={styles.smallTag}>Безопасность</span>
          <h2 className={styles.bigTitle}>Защита, как в <span className={styles.gradAccent}>банке</span></h2>
        </div>
        <div className={styles.safetyGrid}>
          {items.map((it) => (
            <div className={styles.safetyCard} key={it.t}>
              <div className={styles.safetyIcon}>{it.i}</div>
              <div className={styles.safetyTitle}>{it.t}</div>
              <div className={styles.safetyDesc}>{it.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ---------- Final CTA ---------- */
const FinalCta: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className={styles.finalCta}>
      <div className={styles.finalCtaBg1} />
      <div className={styles.finalCtaBg2} />
      <div className={styles.finalCtaBg3} />
      <div className={`${styles.container} ${styles.finalCtaInner}`}>
        <div className={styles.finalCtaContent}>
          <span className={styles.finalCtaTag}><ClockCircleOutlined /> Дедлайн ближе, чем кажется</span>
          <h2 className={styles.finalCtaTitle}>
            Не теряй ещё <em>одну</em> ночь<br />над курсовой
          </h2>
          <p className={styles.finalCtaSub}>
            Эксперт начнёт работу уже через 3 минуты после оплаты.
            Первый отклик гарантируем за 7 минут — или вернём деньги.
          </p>
          <div className={styles.finalCtaActions}>
            <button className={styles.finalCtaBtn} onClick={() => navigate('/login')}>
              Оформить заявку — бесплатно
            </button>
            <button className={styles.finalCtaBtnSec} onClick={() => navigate('/login')}>
              Уже клиент? Войти
            </button>
          </div>
          <div className={styles.finalCtaTrust}>
            <div className={styles.finalCtaAvatars}>
              <img src="/assets/landing-v2/expert1.jpg" alt="" />
              <img src="/assets/landing-v2/expert2.jpg" alt="" />
              <img src="/assets/landing-v2/expert3.jpg" alt="" />
              <img src="/assets/landing-v2/expert6.jpg" alt="" />
              <img src="/assets/landing-v2/expert7.jpg" alt="" />
            </div>
            <span><strong>16 экспертов</strong> готовы взять работу прямо сейчас</span>
          </div>
        </div>
        <div className={styles.finalCtaVisual}>
          <div className={`${styles.finalDoc} ${styles.finalDoc1}`}>
            <div className={styles.finalDocBar} />
            <div className={styles.finalDocLine} />
            <div className={styles.finalDocLine} />
            <div className={styles.finalDocLine} style={{ width: '60%' }} />
            <div className={styles.finalDocStamp}>5</div>
          </div>
          <div className={`${styles.finalDoc} ${styles.finalDoc2}`}>
            <div className={styles.finalDocBar} />
            <div className={styles.finalDocLine} />
            <div className={styles.finalDocLine} style={{ width: '80%' }} />
            <div className={styles.finalDocApproved}>Антиплагиат 92%</div>
          </div>
          <div className={`${styles.finalDoc} ${styles.finalDoc3}`}>
            <div className={styles.finalDocBar} />
            <div className={styles.finalDocLine} />
            <div className={styles.finalDocLine} />
            <div className={styles.finalDocApprovedGreen}>✓ Принято</div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------- Footer ---------- */
const FooterDark: React.FC = () => (
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
          <a href="mailto:support@site.ru">support@site.ru</a>
          <a href="tel:88003243423">8 800 (324) 34-23</a>
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

/* ---------- Page ---------- */
const LandingV2: React.FC = () => {
  useEffect(() => {
    document.title = 'Око Знаний — Помощь студентам онлайн | Эксперты, гарантия, авторский подход';
  }, []);
  return (
    <div className={styles.page}>
      <SEO
        title="Око Знаний — Помощь студентам онлайн | Эксперты, гарантия, авторский подход"
        description="8 000+ проверенных авторов. Курсовые, дипломы, рефераты, контрольные. Антиплагиат от 80%, 0% AI, бессрочная гарантия, рассрочка 0%."
      />
      <TopBar />
      <Hero />
      <StatsDark />
      <HowItWorks />
      <VsChatGPT />
      <ExpertsGrid />
      <ReviewsBlock />
      <SafetyBand />
      <FinalCta />
      <FooterDark />
    </div>
  );
};

export default LandingV2;
