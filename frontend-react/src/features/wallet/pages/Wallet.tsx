import React, { useEffect, useMemo, useState } from 'react';
import {
  Button, Card, Col, Empty, Input, message, Modal, Radio, Row,
  Segmented, Skeleton, Space, Tag, Tooltip, Typography,
} from 'antd';
import {
  ArrowDownOutlined, ArrowUpOutlined, BankOutlined, CreditCardOutlined,
  HistoryOutlined, LockOutlined, PlusOutlined, QrcodeOutlined,
  ReloadOutlined, WalletOutlined,
} from '@ant-design/icons';
import { walletApi, WalletBalance, WalletStats, WalletTransaction } from '../api/wallet';
import styles from './Wallet.module.css';

const { Title, Text, Paragraph } = Typography;

const FILTERS = [
  { value: '', label: 'Все' },
  { value: 'topup', label: 'Пополнения' },
  { value: 'hold,release,refund', label: 'По заказам' },
  { value: 'payout', label: 'Выплаты' },
  { value: 'withdrawal', label: 'Выводы' },
  { value: 'purchase', label: 'Покупки' },
];

const QUICK_SUMS = [500, 1000, 5000, 10000];

const METHODS = [
  { value: 'sberpay_qr', label: 'СберPay QR', icon: <QrcodeOutlined />, hint: 'Сканируй QR в Сбер Онлайн' },
];

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

  useEffect(() => { reload(); /* eslint-disable-line */ }, [filter]);

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
                <div className={styles.balanceSmallValue}>{formatMoney(balance?.frozen_balance)} ₽</div>
              </div>
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
                    {t.order_id && <span className={styles.txOrder}>Заказ #{t.order_id}</span>}
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

  const submit = async () => {
    if (!amount || amount < 100) {
      message.warning('Минимальная сумма пополнения — 100 ₽');
      return;
    }
    setBusy(true);
    try {
      const res = await walletApi.topup({ amount, payment_method: method });
      message.success('Создан платёж — переходим к оплате');
      if (res.payment_url) {
        // For SberPay QR the link may be a `data:` URI with the QR image —
        // open in a new tab so the user can scan with their phone.
        window.open(res.payment_url, '_blank', 'noopener');
      }
      onDone();
    } catch (e: any) {
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

      <Text strong className={styles.topupSectionLabel}>Способ оплаты</Text>
      <Radio.Group
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        className={styles.topupMethods}
      >
        {METHODS.map((m) => (
          <Radio key={m.value} value={m.value} className={styles.topupMethod}>
            <div className={styles.topupMethodInner}>
              <span className={styles.topupMethodIcon}>{m.icon}</span>
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
        onClick={submit}
        className={styles.topupSubmit}
      >
        Пополнить на {formatMoney(amount)} ₽
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
        Доступно к выводу: <b>{formatMoney(available)} ₽</b>. Средства спишутся сразу, выплата на карту обычно занимает до 3 рабочих дней.
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
