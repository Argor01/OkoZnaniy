import React, { useEffect, useState, useCallback } from 'react';
import { Tooltip } from 'antd';
import { WalletOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { walletApi, WalletBalance } from '../api/wallet';

import styles from './WalletBadge.module.css';

const formatMoney = (s: string | undefined) => {
  if (!s) return '—';
  const n = Number(s);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n) + ' ₽';
};

interface Props {
  compact?: boolean;
}

const WalletBadge: React.FC<Props> = ({ compact = false }) => {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const navigate = useNavigate();


  const fetchBalance = useCallback(async () => {
    if (!localStorage.getItem("access_token")) return;
    try {
      const data = await walletApi.me();
      setBalance(data);
    } catch {
      /* network or 401 — ignore silently to avoid noisy header */
    }
  }, []);

  useEffect(() => {
    let stopped = false;
    fetchBalance();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !stopped) fetchBalance();
    };
    const onWalletEvent = () => fetchBalance();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('wallet:refresh', onWalletEvent);
    const id = window.setInterval(fetchBalance, 45000);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('wallet:refresh', onWalletEvent);
      window.clearInterval(id);
    };
  }, [fetchBalance]);

  if (!localStorage.getItem('access_token')) return null;

  const display = balance ? formatMoney(balance.available_balance) : '...';
  const title = balance
    ? `Доступно: ${formatMoney(balance.available_balance)} · Заморожено: ${formatMoney(balance.frozen_balance)}`
    : 'Загрузка баланса...';

  return (
    <Tooltip title={title} placement="bottom">
      <button
        style={{marginTop: '16px'}}
        type="button"
        className={`${styles.badge} ${compact ? styles.badgeCompact : ''}`}
        onClick={() => navigate('/wallet')}
        aria-label="Кошелёк"
      >
        <WalletOutlined className={styles.icon} />
        {!compact && <span className={styles.amount}>{display}</span>}
      </button>
    </Tooltip>
  );
};

export default WalletBadge;
