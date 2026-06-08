import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftOutlined, BankOutlined, CheckCircleOutlined, ClockCircleOutlined,
  CrownOutlined, EditOutlined, FileTextOutlined, FireOutlined, GiftOutlined,
  HistoryOutlined, MessageOutlined, PlusOutlined, RightOutlined, RiseOutlined,
  RocketOutlined, ShoppingOutlined, StarFilled, ThunderboltOutlined, TrophyOutlined,
  WalletOutlined,
  AppstoreOutlined, BankOutlined, GiftOutlined, SettingOutlined as _SettingOutlined, FileTextOutlined as _FileTextOutlined,
} from '@ant-design/icons';
import { App, Avatar, Button, Empty, message, Skeleton, Tag, Tooltip, Typography } from 'antd';
import { Segmented } from 'antd';
import { apiClient } from '@/api/client';
import { walletApi } from '@/features/wallet/api/wallet';
import styles from '../ProfileV2.module.css';

const { Title, Text, Paragraph } = Typography;

/* ---------- Hooks ---------- */
function useCounter(target: number, duration = 900) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    if (target === from) return;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = from + (target - from) * eased;
      setV(val);
      if (p < 1) raf = requestAnimationFrame(step);
      else { setV(target); fromRef.current = target; }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return { ref, value: v };
}

const fmtMoney = (n: number | string) => `${Number(n).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`;
const fmtNum = (n: number | string) => Number(n).toLocaleString('ru-RU', { maximumFractionDigits: 0 });

/* ---------- API ---------- */
const fetchMe = async () => (await apiClient.get('/users/me/')).data;
const fetchUserStats = async (id: number) => (await apiClient.get(`/users/${id}/stats/`)).data;
const fetchUserOrders = async (id: number) =>
  (await apiClient.get(`/orders/orders/?client=${id}&limit=5`)).data;
const fetchTransactions = async () => (await apiClient.get('/wallet/transactions/?limit=6')).data;
const fetchBalance = () => walletApi.me();

/* ---------- Components ---------- */
const StatCard: React.FC<{
  label: string;
  value: number;
  suffix?: string;
  hint?: string;
  icon: React.ReactNode;
  tone: 'primary' | 'gold' | 'pink' | 'teal';
  to?: string;
  decimals?: number;
}> = ({ label, value, suffix = '', hint, icon, tone, to, decimals = 0 }) => {
  const { ref, value: animated } = useCounter(value);
  const display = decimals > 0
    ? animated.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : Math.round(animated).toLocaleString('ru-RU');
  const inner = (
    <div className={`${styles.statCard} ${styles[`stat_${tone}`]}`}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statBody}>
        <div className={styles.statValue}>
          <span ref={ref}>{display}</span>
          {suffix && <em className={styles.statSuffix}>{suffix}</em>}
        </div>
        <div className={styles.statLabel}>{label}</div>
        {hint && <div className={styles.statHint}>{hint}</div>}
      </div>
    </div>
  );
  return to ? <Link to={to} className={styles.statLink}>{inner}</Link> : inner;
};

const LevelRing: React.FC<{ points: number; size?: number }> = ({ points, size = 120 }) => {
  const level = Math.floor(points / 100) + 1;
  const progress = Math.min(100, (points % 100));
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <div className={styles.ring} style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} className={styles.ringTrack} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          className={styles.ringFill}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className={styles.ringInner}>
        <div className={styles.ringValue}>{fmtNum(points)}</div>
        <div className={styles.ringSub}>уровень {level}</div>
      </div>
    </div>
  );
};

const ACHIEVEMENTS = [
  { key: 'first_step',  icon: <RocketOutlined />,    name: 'Первый шаг',     hint: 'Зарегистрировались',        cond: (s: any) => true },
  { key: 'week',        icon: <FireOutlined />,      name: 'Неделя с нами',  hint: '7 дней на платформе',       cond: (s: any) => (s?.daysOnSite ?? 0) >= 7 },
  { key: 'first_order', icon: <FileTextOutlined />,  name: 'Первый заказ',   hint: 'Создан первый заказ',       cond: (s: any) => (s?.orders ?? 0) >= 1 },
  { key: 'tidy',        icon: <CheckCircleOutlined />, name: 'Аккуратист',    hint: '5 успешных заказов',         cond: (s: any) => (s?.completed ?? 0) >= 5 },
  { key: 'connoisseur', icon: <TrophyOutlined />,    name: 'Знаток',         hint: '10 успешных заказов',       cond: (s: any) => (s?.completed ?? 0) >= 10 },
  { key: 'top',         icon: <CrownOutlined />,     name: 'Топ',            hint: '100 заказов с рейтингом 4.8+', cond: (s: any) => (s?.completed ?? 0) >= 100 },
];

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const m: Record<string, { label: string; tone: string }> = {
    new: { label: 'Новый', tone: 'blue' },
    in_progress: { label: 'В работе', tone: 'gold' },
    review: { label: 'На проверке', tone: 'purple' },
    completed: { label: 'Выполнен', tone: 'green' },
    cancelled: { label: 'Отменён', tone: 'gray' },
    revision: { label: 'Доработка', tone: 'orange' },
  };
  const o = m[status] || { label: status, tone: 'gray' };
  return <span className={`${styles.statusPill} ${styles[`pill_${o.tone}`]}`}>{o.label}</span>;
};

const txMeta = (type: string): { sign: '+' | '−'; tone: 'income' | 'outcome'; label: string } => {
  const map: Record<string, any> = {
    topup:      { sign: '+', tone: 'income',  label: 'Пополнение' },
    refund:     { sign: '+', tone: 'income',  label: 'Возврат' },
    payout:     { sign: '+', tone: 'income',  label: 'Выплата' },
    release:    { sign: '+', tone: 'income',  label: 'Разморозка' },
    hold:       { sign: '−', tone: 'outcome', label: 'Резерв' },
    purchase:   { sign: '−', tone: 'outcome', label: 'Покупка' },
    withdrawal: { sign: '−', tone: 'outcome', label: 'Вывод' },
    commission: { sign: '−', tone: 'outcome', label: 'Комиссия' },
  };
  return map[type] || { sign: '−', tone: 'outcome', label: type };
};

/* ---------- Page ---------- */
const ProfileV2: React.FC = () => {
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>();
  const { message: msg } = App.useApp();

  const meQ = useQuery({ queryKey: ['me'], queryFn: fetchMe });
  const me = meQ.data;
  const targetUser = username && me?.username !== username ? null : me;

  const statsQ = useQuery({ queryKey: ['userStats', me?.id], queryFn: () => fetchUserStats(me!.id), enabled: !!me?.id });
  const ordersQ = useQuery({ queryKey: ['userOrders', me?.id], queryFn: () => fetchUserOrders(me!.id), enabled: !!me?.id });
  const txQ     = useQuery({ queryKey: ['wTx'], queryFn: fetchTransactions, refetchInterval: 60000 });
  const balQ    = useQuery({ queryKey: ['wBal'], queryFn: fetchBalance, refetchInterval: 60000 });

  // TABS_PATCH_APPLIED
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as 'overview' | 'finance' | 'orders' | 'achievements' | 'settings') || 'overview';
  const setTab = (v: string) => setSearchParams(prev => { prev.set('tab', v); return prev; }, { replace: true });

  const [aboutDraft, setAboutDraft] = useState('');
  const [aboutSaving, setAboutSaving] = useState(false);

  useEffect(() => { if (me?.about_me !== undefined) setAboutDraft(me.about_me || ''); }, [me?.about_me]);

  const saveAbout = async () => {
    setAboutSaving(true);
    try {
      await apiClient.patch('/users/me/', { about_me: aboutDraft });
      msg.success('Сохранено');
    } catch { msg.error('Не удалось сохранить'); }
    finally { setAboutSaving(false); }
  };

  const orders = ordersQ.data?.results ?? ordersQ.data ?? [];
  const txs = txQ.data?.results ?? txQ.data ?? [];

  const daysOnSite = me?.date_joined
    ? Math.max(0, Math.floor((Date.now() - new Date(me.date_joined).getTime()) / 86400000))
    : 0;
  const total = statsQ.data?.total_orders ?? orders.length ?? 0;
  const completed = statsQ.data?.completed_orders ?? 0;
  const active = total - completed;
  const success = total > 0 ? Math.round((completed / total) * 100) : 0;
  const points = me?.knowledge_points ?? 0;
  const rating = Number(me?.rating ?? 0);
  const role = me?.role === 'expert' ? 'Эксперт' : me?.role === 'partner' ? 'Партнёр' : 'Клиент';
  const initials = (me?.first_name?.[0] || me?.username?.[0] || '?').toUpperCase()
    + (me?.last_name?.[0] || '').toUpperCase();

  const achievementContext = { daysOnSite, orders: total, completed };

  if (meQ.isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonHero}><Skeleton active paragraph={{ rows: 3 }} /></div>
        <div className={styles.statsGrid}>{[0,1,2,3].map(i => <Skeleton key={i} active paragraph={{ rows: 1 }} />)}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroDecor} aria-hidden />
        <div className={styles.heroGrid}>
          <div className={styles.heroAvatarWrap}>
            <Avatar
              size={132}
              src={me?.avatar}
              className={styles.heroAvatar}
              style={{ background: 'linear-gradient(135deg, #f6c14a, #ec4899)' }}
            >
              <span style={{ fontSize: 44, fontWeight: 700 }}>{initials}</span>
            </Avatar>
            <span className={styles.heroOnlineDot} />
          </div>

          <div className={styles.heroMain}>
            <div className={styles.heroTags}>
              <span className={`${styles.heroTag} ${styles.heroTagRole}`}><CrownOutlined /> {role}</span>
              {rating > 0 && (
                <span className={`${styles.heroTag} ${styles.heroTagRating}`}>
                  <StarFilled style={{ color: '#f6c14a' }} /> {rating.toFixed(1)}
                </span>
              )}
              <span className={`${styles.heroTag} ${styles.heroTagDays}`}>
                <ClockCircleOutlined /> на сайте {daysOnSite} {daysOnSite === 1 ? 'день' : daysOnSite < 5 ? 'дня' : 'дней'}
              </span>
            </div>
            <h1 className={styles.heroName}>
              {me?.first_name || me?.username} {me?.last_name || ''}
            </h1>
            <div className={styles.heroHandle}>@{me?.username}</div>

            <div className={styles.heroActions}>
              <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => navigate('/orders/place-order')} className={styles.heroBtnPrimary}>
                Новый заказ
              </Button>
              <Button size="large" icon={<ArrowLeftOutlined />} onClick={() => navigate('/expert/profile')} className={styles.heroBtnGhost}>
                Классический вид
              </Button>
            </div>
          </div>

          <div className={styles.heroLevel}>
            <LevelRing points={points} />
            <div className={styles.heroLevelLabel}>Очки знаний</div>
          </div>
        </div>
      </section>

      <div className={styles.tabsBar}>
        <Segmented
          value={tab}
          onChange={(v) => setTab(String(v))}
          size="large"
          block
          options={[
            { value: 'overview',     label: <span className={styles.tabPill}><AppstoreOutlined /> Обзор</span> },
            { value: 'finance',      label: <span className={styles.tabPill}><BankOutlined /> Финансы</span> },
            { value: 'orders',       label: <span className={styles.tabPill}><_FileTextOutlined /> Заказы</span> },
            { value: 'achievements', label: <span className={styles.tabPill}><GiftOutlined /> Достижения</span> },
            { value: 'settings',     label: <span className={styles.tabPill}><_SettingOutlined /> Настройки</span> },
          ]}
        />
      </div>

      {tab === 'overview' && (<>
      <section className={styles.statsGrid}>
        <StatCard
          tone="primary"
          icon={<WalletOutlined />}
          label="Доступно на счету"
          value={Number(balQ.data?.available_balance || 0)}
          suffix="₽"
          hint={balQ.data ? `${fmtMoney(balQ.data.frozen_balance)} в резерве` : 'Загружаем баланс…'}
          to="/wallet"
        />
        <StatCard
          tone="gold"
          icon={<ShoppingOutlined />}
          label="Всего заказов"
          value={total}
          hint={`активных: ${active}`}
        />
        <StatCard
          tone="teal"
          icon={<RiseOutlined />}
          label="Успешность"
          value={success}
          suffix="%"
          hint={`выполнено: ${completed}`}
        />
        <StatCard
          tone="pink"
          icon={<StarFilled />}
          label="Рейтинг"
          value={rating}
          decimals={rating ? 1 : 0}
          hint={rating ? 'из 5,0' : 'пока без оценок'}
        />
      </section>

      {/* BODY */}
      <section className={styles.body}>
        {/* LEFT */}
        <div className={styles.left}>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.cardTitleRow}>
                <EditOutlined className={styles.cardIcon} />
                <h3 className={styles.cardTitle}>О себе</h3>
              </div>
              <Button type="primary" size="small" loading={aboutSaving} onClick={saveAbout}>
                Сохранить
              </Button>
            </div>
            <textarea
              className={styles.aboutInput}
              maxLength={1000}
              rows={5}
              value={aboutDraft}
              onChange={(e) => setAboutDraft(e.target.value)}
              placeholder="Расскажите о себе — это поможет получать заказы по вашей теме"
            />
            <div className={styles.aboutCounter}>{aboutDraft.length} / 1000</div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.cardTitleRow}>
                <TrophyOutlined className={styles.cardIcon} />
                <h3 className={styles.cardTitle}>Достижения</h3>
              </div>
              <span className={styles.cardSub}>{fmtNum(points)} pts</span>
            </div>
            <div className={styles.badgesGrid}>
              {ACHIEVEMENTS.map((a) => {
                const unlocked = a.cond(achievementContext);
                return (
                  <Tooltip title={`${a.name} — ${a.hint}`} key={a.key}>
                    <div className={`${styles.badge} ${unlocked ? styles.badgeOn : styles.badgeOff}`}>
                      <div className={styles.badgeIcon}>{a.icon}</div>
                      <div className={styles.badgeName}>{a.name}</div>
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className={styles.right}>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.cardTitleRow}>
                <FileTextOutlined className={styles.cardIcon} />
                <h3 className={styles.cardTitle}>Последние заказы</h3>
              </div>
              <Link to="/orders" className={styles.cardLink}>все <RightOutlined /></Link>
            </div>
            {orders.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Пока нет заказов" />
            ) : (
              <div className={styles.list}>
                {orders.slice(0, 5).map((o: any) => (
                  <Link to={`/orders/${o.id}`} key={o.id} className={styles.orderRow}>
                    <div className={styles.orderMain}>
                      <div className={styles.orderTitle}>{o.title || `Заказ #${o.id}`}</div>
                      <div className={styles.orderMeta}>
                        <StatusPill status={o.status} />
                        <span className={styles.dot} />
                        <span>{o.created_at ? new Date(o.created_at).toLocaleDateString('ru-RU') : ''}</span>
                      </div>
                    </div>
                    <div className={styles.orderPrice}>{fmtMoney(o.budget || o.final_price || 0)}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.cardTitleRow}>
                <HistoryOutlined className={styles.cardIcon} />
                <h3 className={styles.cardTitle}>Движение по кошельку</h3>
              </div>
              <Link to="/wallet" className={styles.cardLink}>в кошелёк <RightOutlined /></Link>
            </div>
            {txs.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Транзакций пока нет" />
            ) : (
              <div className={styles.list}>
                {txs.slice(0, 6).map((t: any) => {
                  const m = txMeta(t.type);
                  return (
                    <div className={styles.txRow} key={t.id}>
                      <div className={`${styles.txIcon} ${styles[`txIcon_${m.tone}`]}`}>{m.sign}</div>
                      <div className={styles.txBody}>
                        <div className={styles.txLabel}>{t.description || m.label}</div>
                        <div className={styles.txMeta}>{t.timestamp ? new Date(t.timestamp).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</div>
                      </div>
                      <div className={`${styles.txAmount} ${styles[`txAmount_${m.tone}`]}`}>{m.sign} {fmtMoney(t.amount)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
      </>)}

      {tab === 'finance' && (
        <section className={styles.tabPanel}>
          <div className={styles.tabPanelHead}>
            <h2 className={styles.tabPanelTitle}><BankOutlined /> Финансы</h2>
            <Link to="/wallet" className={styles.tabPanelLink}>Открыть кошелёк →</Link>
          </div>
          <div className={styles.financeGrid}>
            <div className={`${styles.card} ${styles.balanceCard}`}>
              <div className={styles.balanceLabel}>Доступно</div>
              <div className={styles.balanceValue}>{fmtMoney(Number(balQ.data?.available_balance ?? 0))}</div>
              <div className={styles.balanceFooter}>
                <span>Заморожено: <strong>{fmtMoney(Number(balQ.data?.frozen_balance ?? 0))}</strong></span>
                <span>Всего: <strong>{fmtMoney(Number(balQ.data?.balance ?? 0))}</strong></span>
              </div>
              <button className={styles.balanceCta} onClick={() => navigate('/wallet')}><PlusOutlined /> Пополнить</button>
            </div>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>История операций</h3>
              {txsAll.length ? (
                <div className={styles.txList}>
                  {txsAll.map(tx => (
                    <div key={tx.id} className={styles.txRow}>
                      <div className={`${styles.txIcon} ${tx.amount.startsWith('-') ? styles.txOut : styles.txIn}`}>
                        {tx.amount.startsWith('-') ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                      </div>
                      <div className={styles.txBody}>
                        <div className={styles.txDesc}>{tx.description || tx.type_display}</div>
                        <div className={styles.txMeta}>{new Date(tx.timestamp).toLocaleString('ru-RU')}</div>
                      </div>
                      <div className={`${styles.txAmount} ${tx.amount.startsWith('-') ? styles.txOut : styles.txIn}`}>
                        {tx.amount.startsWith('-') ? '' : '+'}{fmtMoney(Number(tx.amount))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <Empty description="Транзакций пока нет" />}
            </div>
          </div>
        </section>
      )}

      {tab === 'orders' && (
        <section className={styles.tabPanel}>
          <div className={styles.tabPanelHead}>
            <h2 className={styles.tabPanelTitle}><_FileTextOutlined /> Мои заказы</h2>
            <Link to="/dashboard" className={styles.tabPanelLink}>Все заказы →</Link>
          </div>
          {orders.length ? (
            <div className={styles.card}>
              <div className={styles.orderTable}>
                {orders.slice(0, 20).map((o: any) => (
                  <Link key={o.id} to={`/orders/${o.id}`} className={styles.orderRowWide}>
                    <div className={styles.orderTitleCol}>
                      <div className={styles.orderTitle}>{o.title || 'Без названия'}</div>
                      <div className={styles.orderMeta}>{o.work_type_display || o.work_type || 'Заказ'} · {new Date(o.created_at).toLocaleDateString('ru-RU')}</div>
                    </div>
                    <div className={styles.orderStatusCol}>{statusPill(o.status)}</div>
                    <div className={styles.orderPriceCol}>{o.budget ? `${fmtNum(Number(o.budget))} ₽` : '—'}</div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.card}><Empty description="У тебя пока нет заказов">
              <button className={styles.balanceCta} onClick={() => navigate('/orders/create')}><PlusOutlined /> Создать заказ</button>
            </Empty></div>
          )}
        </section>
      )}

      {tab === 'achievements' && (
        <section className={styles.tabPanel}>
          <div className={styles.tabPanelHead}>
            <h2 className={styles.tabPanelTitle}><GiftOutlined /> Достижения</h2>
            <div className={styles.tabPanelLink}>{achievements.filter(a => a.unlocked).length} из {achievements.length}</div>
          </div>
          <div className={styles.achGridWide}>
            {achievements.map(a => (
              <div key={a.key} className={`${styles.badge} ${a.unlocked ? styles.badgeOn : styles.badgeOff}`}>
                <div className={styles.badgeIcon}>{a.icon}</div>
                <div className={styles.badgeTitle}>{a.title}</div>
                <div className={styles.badgeDesc}>{a.desc}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'settings' && (
        <section className={styles.tabPanel}>
          <div className={styles.tabPanelHead}>
            <h2 className={styles.tabPanelTitle}><_SettingOutlined /> Настройки</h2>
            <Link to="/profile" className={styles.tabPanelLink}>Полные настройки →</Link>
          </div>
          <div className={styles.settingsGrid}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Основное</h3>
              <div className={styles.settingsRow}><MailOutlined /><div><div className={styles.settingsLabel}>Email</div><div className={styles.settingsValue}>{user.email || '—'}</div></div></div>
              <div className={styles.settingsRow}><PhoneOutlined /><div><div className={styles.settingsLabel}>Телефон</div><div className={styles.settingsValue}>{user.phone || 'не указан'}</div></div></div>
              <div className={styles.settingsRow}><MessageOutlined /><div><div className={styles.settingsLabel}>Telegram</div><div className={styles.settingsValue}>{user.telegram || 'не привязан'}</div></div></div>
            </div>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>О себе</h3>
              <Input.TextArea
                value={aboutDraft}
                onChange={(e) => setAboutDraft(e.target.value)}
                autoSize={{ minRows: 4, maxRows: 8 }}
                placeholder="Расскажи о себе"
              />
              <Button
                type="primary"
                style={{ marginTop: 12 }}
                loading={aboutSaving}
                onClick={async () => {
                  try {
                    setAboutSaving(true);
                    await apiClient.patch('/users/me/', { about: aboutDraft });
                    message.success('Сохранено');
                  } catch { message.error('Не удалось сохранить'); }
                  finally { setAboutSaving(false); }
                }}
              >Сохранить</Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ProfileV2;
