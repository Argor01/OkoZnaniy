import React, { useEffect, useMemo, useState } from 'react';
import {
  Button, Card, Col, Empty, Input, message, Modal, Radio, Row,
  Segmented, Skeleton, Space, Tag, Tooltip, Typography,
} from 'antd';
import {
  ArrowDownOutlined, ArrowUpOutlined, BankOutlined, ClockCircleOutlined,
  CreditCardOutlined, HistoryOutlined, LockOutlined, PlusOutlined,
  QrcodeOutlined, ReloadOutlined, WalletOutlined,
} from '@ant-design/icons';
import {
  walletApi, PaymentQuote, WalletBalance, WalletStats, WalletTransaction,
} from '../api/wallet';
import {
  paymentsApi, type AvailablePaymentMethod,
} from '@/features/payments/api/payments';
import styles from './Wallet.module.css';

const { Title, Text, Paragraph } = Typography;

// Чек по 54-ФЗ уходит на почту, поэтому опечатка стоит дорого:
// человек оплатит, а документ не получит.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const FILTERS = [
  { value: '', label: 'Все' },
  { value: 'topup', label: 'Пополнения' },
  { value: 'hold,release,refund,escrow_credit,payout,partner_payout,clawback', label: 'По заказам' },
  { value: 'payout', label: 'Выплаты' },
  { value: 'withdrawal', label: 'Выводы' },
  { value: 'purchase', label: 'Покупки' },
];

const QUICK_SUMS = [500, 1000, 5000, 10000];

// Оформление способов оплаты. Какие из них показать, решает сервер:
// он знает, какие эквайеры настроены.
const METHOD_ICONS: Record<string, React.ReactNode> = {
  tbank: <img src="/assets/banks/tbank.svg" alt="Т-Банк" width={112} height={32} />,
  sberpay_qr: <img src="/assets/banks/sberpay.svg" alt="СберPay" width={112} height={32} />,
  yookassa: <CreditCardOutlined />,
  card: <CreditCardOutlined />,
  sbp: <QrcodeOutlined />,
};

function formatMoney(v: string | number | undefined): string {
  if (v === undefined || v === null) return '0';
  const n = typeof v === 'string' ? Number(v) : v;
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function Wallet() {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [tx, setTx] = useState<WalletTransaction[] | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showTopup, setShowTopup] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const reload = async () => {
    try {
      const [b, s, t] = await Promise.all([
        walletApi.me(), walletApi.stats(),
        walletApi.transactions({ type: filter ? filter.split(',') : undefined }),
      ]);
      setBalance(b); setStats(s); setTx(t);
    } catch (e: any) {
      message.error('Не удалось загрузить кошелёк');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    const refresh = async () => {
      if (disposed || document.hidden || inFlight) return;
      inFlight = true;
      try {
        const [b, s, t] = await Promise.all([
          walletApi.me(), walletApi.stats(),
          walletApi.transactions({ type: filter ? filter.split(',') : undefined }),
        ]);
        if (!disposed) { setBalance(b); setStats(s); setTx(t); setLoading(false); }
      } catch { if (!disposed) setLoading(false); }
      finally { inFlight = false; }
    };
    void refresh();
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      disposed = true; window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [filter]);

  const filteredTx = tx || [];

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroOrb1} />
        <div className={styles.heroOrb2} />
        <div className={styles.heroInner}>
          <div className={styles.heroHeader}>
            <div className={styles.heroIcon}><WalletOutlined /></div>
            <div>
              <Text className={styles.heroLabel}>Мой кошелёк</Text>
              <Title level={2} className={styles.heroTitle}>Личный счёт</Title>
            </div>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={reload}
              className={styles.heroRefresh}
            />
          </div>

          <div className={styles.balanceGrid}>
            <div className={`${styles.balanceCard} ${styles.balanceCardMain}`}>
              <Text className={styles.balanceLabel}>Доступно к расходу</Text>
              {loading ? (
                <Skeleton.Input active size="large" style={{ width: 240 }} />
              ) : (
                <div className={styles.balanceValueBig}>
                  {formatMoney(balance?.available_balance)}<span> ₽</span>
                </div>
              )}
              <div className={styles.balanceActions}>
                <Button
                  type="primary"
                  size="large"
                  icon={<PlusOutlined />}
                  className={styles.btnTopup}
                  onClick={() => setShowTopup(true)}
                >
                  Пополнить
                </Button>
                <Button
                  size="large"
                  icon={<ArrowUpOutlined />}
                  className={styles.btnWithdraw}
                  disabled={loading || Number(balance?.available_balance || 0) <= 0}
                  onClick={() => setShowWithdraw(true)}
                >
                  Вывести
                </Button>
              </div>
            </div>
            <div className={styles.balanceSmallGrid}>
              <div className={styles.balanceCardSmall}>
                <div className={styles.balanceSmallIcon}><LockOutlined /></div>
                <Text className={styles.balanceSmallLabel}>В резерве по заказам</Text>
                {/* У автора резерв — это его заморозка, у заказчика — то, что
                    он внёс по незавершённым заказам: своей заморозки у него
                    нет, и раньше он видел ноль при оплаченном заказе. */}
                <div className={styles.balanceSmallValue}>
                  {formatMoney(
                    Number(balance?.frozen_balance || 0) > 0
                      ? balance?.frozen_balance
                      : balance?.reserved_on_orders,
                  )} ₽
                </div>
              </div>
              {Number(balance?.pending_balance || 0) > 0 && (
                <div className={`${styles.balanceCardSmall} ${styles.pendingCard}`}>
                  <div className={styles.balanceSmallIcon}><ClockCircleOutlined /></div>
                  <Text className={styles.balanceSmallLabel}>Ожидает выплаты</Text>
                  <div className={`${styles.balanceSmallValue} ${styles.pendingValue}`}>{formatMoney(balance?.pending_balance)} ₽</div>
                </div>
              )}
              <div className={styles.balanceCardSmall}>
                <div className={styles.balanceSmallIcon}><WalletOutlined /></div>
                <Text className={styles.balanceSmallLabel}>Всего на счёте</Text>
                <div className={styles.balanceSmallValue}>{formatMoney(balance?.balance)} ₽</div>
              </div>
            </div>
          </div>

          {stats && (
            <div className={styles.statsRow}>
              <div className={styles.statBlock}>
                <Text className={styles.statLabel}>Пополнено</Text>
                <Text className={styles.statValueIn}>+ {formatMoney(stats.total_topup)} ₽</Text>
              </div>
              <div className={styles.statBlock}>
                <Text className={styles.statLabel}>Потрачено</Text>
                <Text className={styles.statValueOut}>− {formatMoney(stats.total_spent)} ₽</Text>
              </div>
              <div className={styles.statBlock}>
                <Text className={styles.statLabel}>Заработано</Text>
                <Text className={styles.statValueIn}>+ {formatMoney(stats.total_earned)} ₽</Text>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.historySection}>
        <div className={styles.historyHeader}>
          <Title level={3} className={styles.historyTitle}>
            <HistoryOutlined /> История операций
          </Title>
          <Segmented
            value={filter}
            onChange={(v) => setFilter(String(v))}
            options={FILTERS}
            className={styles.historyFilter}
          />
        </div>

        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : filteredTx.length === 0 ? (
          <Empty description="Пока нет операций" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className={styles.txList}>
            {filteredTx.map((t) => (
              <div key={t.id} className={styles.txRow}>
                <div className={`${styles.txIcon} ${t.direction === 'in' ? styles.txIn : styles.txOut}`}>
                  {t.direction === 'in' ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
                </div>
                <div className={styles.txMain}>
                  <div className={styles.txTitle}>{t.description || t.type_display}</div>
                  <div className={styles.txMeta}>
                    <Tag className={styles.txTag}>{t.type_display}</Tag>
                    <span className={styles.txDate}>{formatDate(t.timestamp)}</span>
                    {t.order_id && <a className={styles.txOrder} href={`/orders/${t.order_id}`}>Заказ #{t.order_id}</a>}
                  </div>
                </div>
                <div className={`${styles.txAmount} ${t.direction === 'in' ? styles.amtIn : styles.amtOut}`}>
                  {t.direction === 'in' ? '+' : '−'} {formatMoney(t.amount)} ₽
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TopupModal
        open={showTopup}
        onClose={() => setShowTopup(false)}
        onDone={() => { setShowTopup(false); reload(); }}
      />
      <WithdrawModal
        open={showWithdraw}
        available={Number(balance?.available_balance || 0)}
        onClose={() => setShowWithdraw(false)}
        onDone={() => { setShowWithdraw(false); reload(); }}
      />
    </div>
  );
}


function TopupModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState<number>(2000);
  const [method, setMethod] = useState<string>('sberpay_qr');
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [methods, setMethods] = useState<AvailablePaymentMethod[]>([]);
  // Поле показываем только после отказа сервера: у большинства почта есть.
  const [needEmail, setNeedEmail] = useState(false);
  const [receiptEmail, setReceiptEmail] = useState('');
  // QR для СБП приходит картинкой в data:-ссылке. Перейти на неё нельзя,
  // поэтому показываем код прямо здесь.
  const [qrImage, setQrImage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQrImage(null);
      return;
    }
    paymentsApi
      .methods()
      .then((list) => {
        setMethods(list);
        // Выбранный способ мог отключиться, пока окно было закрыто.
        if (list.length && !list.some((m) => m.value === method)) {
          setMethod(list[0].value);
        }
      })
      .catch(() => setMethods([]));
    // method намеренно не в зависимостях: список тянем при открытии окна,
    // а не на каждый выбор способа.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Сумму к списанию считает сервер: проценты зависят от договора с
  // эквайером и от ставки конкретного клиента.
  useEffect(() => {
    if (!open || !amount || amount < 100) {
      setQuote(null);
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      walletApi
        .quote(amount, 'topup')
        .then((q) => { if (!cancelled) setQuote(q); })
        .catch(() => { if (!cancelled) setQuote(null); });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, amount]);

  const submit = async () => {
    if (!amount || amount < 100) {
      message.warning('Минимальная сумма пополнения — 100 ₽');
      return;
    }
    const email = receiptEmail.trim();
    if (needEmail && !EMAIL_RE.test(email)) {
      message.warning('Укажите почту, на неё придёт чек');
      return;
    }
    setBusy(true);
    try {
      const res = await walletApi.topup({
        amount,
        payment_method: method,
        ...(email ? { receipt_email: email } : {}),
      });
      if (!res.payment_url) {
        message.success('Платёж создан');
        onDone();
        return;
      }
      if (res.payment_url.startsWith('data:')) {
        setQrImage(res.payment_url);
        return;
      }
      message.success('Создан платёж — переходим к оплате');
      // Именно переход, а не новое окно: открыть его после ответа сервера
      // браузер не даёт, и человек оставался на пустом месте.
      window.location.assign(res.payment_url);
    } catch (e: any) {
      if (e?.response?.data?.code === 'receipt_email_required') {
        setNeedEmail(true);
        message.info('Укажите почту для чека — и повторите оплату');
        return;
      }
      message.error(e?.response?.data?.detail || 'Не удалось создать платёж');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={<><PlusOutlined /> Пополнить кошелёк</>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
      className={styles.topupModal}
    >
      <Paragraph type="secondary" className={styles.topupHint}>
        Деньги поступят на ваш счёт сразу после подтверждения оплаты. Затем их можно тратить на любые заказы.
      </Paragraph>

      <div className={styles.topupSums}>
        {QUICK_SUMS.map((s) => (
          <button
            key={s}
            type="button"
            className={`${styles.topupSumBtn} ${amount === s ? styles.topupSumActive : ''}`}
            onClick={() => setAmount(s)}
          >
            {formatMoney(s)} ₽
          </button>
        ))}
      </div>

      <Input
        size="large"
        type="number"
        min={100}
        max={500000}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        addonAfter="₽"
        className={styles.topupInput}
      />

      {quote && (
        <Paragraph type="secondary" className={styles.topupHint}>
          Комиссия эквайринга {quote.acquiring_fee_percent}% —{' '}
          {formatMoney(quote.acquiring_fee)} ₽. На баланс поступит{' '}
          {formatMoney(amount)} ₽.
        </Paragraph>
      )}

      {qrImage && (
        <div className={styles.topupQr}>
          <Text strong className={styles.topupSectionLabel}>
            Отсканируйте код в приложении банка
          </Text>
          <img src={qrImage} alt="QR-код для оплаты через СБП" />
          <Paragraph type="secondary" className={styles.topupHint}>
            После оплаты деньги поступят на баланс автоматически.
          </Paragraph>
        </div>
      )}

      {needEmail && (
        <>
          <Text strong className={styles.topupSectionLabel}>Почта для чека</Text>
          <Input
            type="email"
            size="large"
            placeholder="example@mail.ru"
            value={receiptEmail}
            onChange={(e) => setReceiptEmail(e.target.value)}
            className={styles.topupInput}
          />
          <Paragraph type="secondary" className={styles.topupHint}>
            В профиле не указана почта, а без неё не выдать чек. Мы сохраним
            её в профиле, чтобы не спрашивать снова.
          </Paragraph>
        </>
      )}

      <Text strong className={styles.topupSectionLabel}>Способ оплаты</Text>
      <Radio.Group
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        className={styles.topupMethods}
      >
        {methods.map((m) => (
          <Radio key={m.value} value={m.value} className={styles.topupMethod}>
            <div className={styles.topupMethodInner}>
              <span className={styles.topupMethodIcon}>{METHOD_ICONS[m.value]}</span>
              <div>
                <div className={styles.topupMethodLabel}>{m.label}</div>
                <Text type="secondary" className={styles.topupMethodHint}>{m.hint}</Text>
              </div>
            </div>
          </Radio>
        ))}
      </Radio.Group>

      <Button
        type="primary" size="large" block
        loading={busy}
        disabled={!methods.length}
        onClick={submit}
        className={styles.topupSubmit}
      >
        {quote
          ? `Оплатить ${formatMoney(quote.total)} ₽, на баланс ${formatMoney(amount)} ₽`
          : `Пополнить на ${formatMoney(amount)} ₽`}
      </Button>
    </Modal>
  );
}


function WithdrawModal({ open, available, onClose, onDone }: { open: boolean; available: number; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState<number>(0);
  const [card, setCard] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setAmount(0); setCard(''); } }, [open]);

  const submit = async () => {
    if (!amount || amount < 100) { message.warning('Минимальная сумма вывода — 100 ₽'); return; }
    if (amount > available) { message.warning('Сумма превышает доступный баланс'); return; }
    const digits = card.replace(/\D/g, '');
    if (digits.length < 16 || digits.length > 19) { message.warning('Введите корректный номер карты'); return; }
    setBusy(true);
    try {
      await walletApi.withdraw({ amount, card_number: digits });
      message.success('Заявка на вывод создана. Средства списаны, выплата поступит на карту.');
      onDone();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Не удалось создать заявку');
    } finally { setBusy(false); }
  };

  return (
    <Modal
      title={<><ArrowUpOutlined /> Вывести средства</>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
      className={styles.topupModal}
    >
      <Paragraph type="secondary" className={styles.topupHint}>
        Доступно: <b>{formatMoney(available)} ₽</b>. Эквайринг 1,5%. Для автора дополнительно удерживается 15% комиссии платформы. Точная сумма выплаты показывается в заявке.
      </Paragraph>

      <Input
        size="large"
        type="number"
        min={100}
        max={available}
        value={amount || undefined}
        placeholder="Сумма"
        onChange={(e) => setAmount(Number(e.target.value))}
        addonAfter="₽"
        className={styles.topupInput}
      />

      <Text strong className={styles.topupSectionLabel}>Номер карты</Text>
      <Input
        size="large"
        inputMode="numeric"
        value={card}
        placeholder="0000 0000 0000 0000"
        maxLength={23}
        onChange={(e) => setCard(e.target.value)}
        prefix={<CreditCardOutlined />}
        className={styles.topupInput}
      />

      <Button
        type="primary" size="large" block
        loading={busy}
        onClick={submit}
        className={styles.topupSubmit}
        style={{ marginTop: 16 }}
      >
        Вывести {amount ? `${formatMoney(amount)} ₽` : ''}
      </Button>
    </Modal>
  );
}
