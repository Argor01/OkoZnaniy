import React, { useEffect, useState } from 'react';
import { Modal, Radio, Typography, message, Space, Input } from 'antd';
import { CreditCardOutlined, BankOutlined, WalletOutlined, QrcodeOutlined } from '@ant-design/icons';
import {
  paymentsApi, type AvailablePaymentMethod, type PaymentMethod,
} from '../api/payments';
import { walletApi, type PaymentQuote } from '@/features/wallet/api/wallet';

const { Text } = Typography;

// Чек по 54-ФЗ уходит на почту, поэтому опечатка стоит дорого:
// человек оплатит, а документ не получит.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: number;
  amount: number;
  onSuccess?: () => void;
}

// Оформление способов оплаты. Какие показать, решает сервер: он знает,
// какие эквайеры настроены.
const METHOD_ICONS: Record<string, React.ReactNode> = {
  tbank: <img src="/assets/banks/tbank.svg" alt="Т-Банк" width={112} height={32} />,
  sberpay_qr: <QrcodeOutlined />,
  yookassa: <CreditCardOutlined />,
  card: <CreditCardOutlined />,
  sbp: <QrcodeOutlined />,
};

const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  onClose,
  orderId,
  amount,
  onSuccess,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('sberpay_qr');
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [methods, setMethods] = useState<AvailablePaymentMethod[]>([]);
  // Поле показываем только после отказа сервера: у большинства почта есть.
  const [needEmail, setNeedEmail] = useState(false);
  const [receiptEmail, setReceiptEmail] = useState('');

  useEffect(() => {
    if (!visible) {
      return;
    }
    paymentsApi
      .methods()
      .then((list) => {
        setMethods(list);
        if (list.length && !list.some((m) => m.value === selectedMethod)) {
          setSelectedMethod(list[0].value);
        }
      })
      .catch(() => setMethods([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Раньше сборы считались здесь по зашитым 25% и 1,5%. У клиента может
  // быть индивидуальная ставка сервисного сбора, а ставка эквайринга
  // зависит от договора, поэтому разбивку отдаёт сервер.
  useEffect(() => {
    if (!visible || !amount) {
      return undefined;
    }
    let cancelled = false;
    walletApi
      .quote(amount, 'order')
      .then((q) => { if (!cancelled) setQuote(q); })
      .catch(() => { if (!cancelled) setQuote(null); });
    return () => { cancelled = true; };
  }, [visible, amount]);

  const handlePay = async () => {
    const email = receiptEmail.trim();
    if (needEmail && !EMAIL_RE.test(email)) {
      message.warning('Укажите почту, на неё придёт чек');
      return;
    }
    try {
      setLoading(true);
      const response = await paymentsApi.createPayment({
        order_id: orderId,
        amount,
        payment_method: selectedMethod,
        ...(email ? { receipt_email: email } : {}),
      });

      if (response.payment_link) {
        window.location.href = response.payment_link;
      } else {
        message.success('Платёж создан');
        onSuccess?.();
        onClose();
      }
    } catch (e: unknown) {
      const data = (e as {
        response?: { data?: { detail?: string; error?: string; code?: string } };
      })?.response?.data;
      if (data?.code === 'receipt_email_required') {
        setNeedEmail(true);
        message.info('Укажите почту для чека — и повторите оплату');
        return;
      }
      message.error(data?.detail || data?.error || 'Ошибка создания платежа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={visible}
      centered
      onCancel={onClose}
      onOk={handlePay}
      okText="Оплатить"
      okButtonProps={{ disabled: !methods.length }}
      cancelText="Отмена"
      title="Выберите способ оплаты"
      confirmLoading={loading}
      destroyOnClose
    >
      <div style={{ padding: '16px 0' }}>
        <Text style={{ marginBottom: 16, display: 'block' }}>
          Стоимость работы: <Text strong>{amount.toLocaleString('ru-RU')} ₽</Text><br />
          {quote ? (
            <>
              Сервисный сбор {quote.service_fee_percent}%:{' '}
              <Text strong>{Number(quote.service_fee).toLocaleString('ru-RU')} ₽</Text><br />
              Эквайринг {quote.acquiring_fee_percent}%:{' '}
              <Text strong>{Number(quote.acquiring_fee).toLocaleString('ru-RU')} ₽</Text><br />
              Итого: <Text strong>{Number(quote.total).toLocaleString('ru-RU')} ₽</Text>
            </>
          ) : (
            <Text type="secondary">Считаем итоговую сумму…</Text>
          )}
        </Text>
        {needEmail && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Почта для чека
            </Text>
            <Input
              type="email"
              size="large"
              placeholder="example@mail.ru"
              value={receiptEmail}
              onChange={(e) => setReceiptEmail(e.target.value)}
            />
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              В профиле не указана почта, а без неё не выдать чек. Мы сохраним
              её в профиле, чтобы не спрашивать снова.
            </Text>
          </div>
        )}

        <Radio.Group
          value={selectedMethod}
          onChange={(e) => setSelectedMethod(e.target.value)}
          style={{ width: '100%' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {methods.map((method) => (
              <Radio
                key={method.value}
                value={method.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 8,
                  width: '100%',
                  borderColor: selectedMethod === method.value ? '#1890ff' : '#d9d9d9',
                  background: selectedMethod === method.value ? '#f0f5ff' : '#fff',
                }}
              >
                <Space>
                  <span style={{ fontSize: 20 }}>{METHOD_ICONS[method.value]}</span>
                  <div>
                    <Text strong>{method.label}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{method.hint}</Text>
                  </div>
                </Space>
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      </div>
    </Modal>
  );
};

export default PaymentModal;
