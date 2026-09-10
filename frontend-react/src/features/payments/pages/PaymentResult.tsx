import React, { useEffect, useRef, useState } from 'react';
import { Button, Result, Space, Spin, Typography } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '@/api/client';
import { API_ENDPOINTS } from '@/config/endpoints';

const { Paragraph, Text } = Typography;

type PaymentState = {
  payment_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  amount: string;
  order_id: number | null;
  purpose: string;
};

// Плательщик возвращается с формы раньше, чем приходит уведомление, поэтому
// страница опрашивает статус. Ограничиваем ожидание: если за это время
// подтверждение не пришло, честнее сказать «обрабатывается», чем крутить
// спиннер бесконечно.
const POLL_INTERVAL_MS = 2000;
const POLL_LIMIT = 30;

const PaymentResult: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get('payment');

  const [payment, setPayment] = useState<PaymentState | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const timer = useRef<number | null>(null);

  const settled = payment?.status === 'completed'
    || payment?.status === 'failed'
    || payment?.status === 'refunded';
  const givenUp = attempts >= POLL_LIMIT;

  useEffect(() => {
    if (!paymentId || settled || givenUp || notFound) {
      return undefined;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const { data } = await apiClient.get(API_ENDPOINTS.payments.status, {
          params: { payment: paymentId },
        });
        if (!cancelled) {
          setPayment(data);
        }
      } catch (e: unknown) {
        const code = (e as { response?: { status?: number } })?.response?.status;
        if (!cancelled && code === 404) {
          setNotFound(true);
          return;
        }
      }
      if (!cancelled) {
        setAttempts((n) => n + 1);
      }
    };

    timer.current = window.setTimeout(poll, attempts === 0 ? 0 : POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer.current) {
        window.clearTimeout(timer.current);
      }
    };
  }, [paymentId, attempts, settled, givenUp, notFound]);

  const backToWallet = (
    <Button type="primary" onClick={() => navigate('/wallet')}>
      В кошелёк
    </Button>
  );

  const backToOrder = payment?.order_id
    ? (
      <Button onClick={() => navigate(`/orders/${payment.order_id}`)}>
        К заказу
      </Button>
    )
    : null;

  if (!paymentId) {
    return (
      <Result
        status="warning"
        title="Не указан платёж"
        subTitle="Похоже, вы открыли эту страницу напрямую."
        extra={backToWallet}
      />
    );
  }

  if (notFound) {
    return (
      <Result
        status="404"
        title="Платёж не найден"
        subTitle="Возможно, он был создан под другой учётной записью."
        extra={backToWallet}
      />
    );
  }

  if (payment?.status === 'completed') {
    return (
      <Result
        status="success"
        title="Оплата прошла"
        subTitle={(
          <>
            Платёж на <Text strong>{payment.amount} ₽</Text> подтверждён.
            {payment.purpose === 'topup'
              ? ' Деньги зачислены на кошелёк.'
              : ' Средства зарезервированы по заказу.'}
          </>
        )}
        extra={<Space>{backToWallet}{backToOrder}</Space>}
      />
    );
  }

  if (payment?.status === 'failed') {
    return (
      <Result
        status="error"
        title="Платёж не прошёл"
        subTitle="Банк отклонил оплату или истекло время на подтверждение. Деньги не списаны — попробуйте ещё раз."
        extra={<Space>{backToWallet}{backToOrder}</Space>}
      />
    );
  }

  if (payment?.status === 'refunded') {
    return (
      <Result
        status="info"
        title="Платёж возвращён"
        subTitle={<>Возврат на сумму <Text strong>{payment.amount} ₽</Text> оформлен.</>}
        extra={<Space>{backToWallet}{backToOrder}</Space>}
      />
    );
  }

  if (givenUp) {
    return (
      <Result
        status="info"
        title="Платёж обрабатывается"
        subTitle={(
          <Paragraph>
            Банк ещё не прислал подтверждение. Это нормально и обычно занимает
            несколько минут — деньги не потеряются. Баланс обновится сам,
            уходить со страницы не нужно.
          </Paragraph>
        )}
        extra={<Space>{backToWallet}{backToOrder}</Space>}
      />
    );
  }

  return (
    <Result
      icon={<Spin size="large" />}
      title="Проверяем оплату"
      subTitle="Ждём подтверждения от банка, это занимает несколько секунд."
    />
  );
};

export default PaymentResult;
