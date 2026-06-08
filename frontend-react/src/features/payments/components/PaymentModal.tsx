import React, { useState } from 'react';
import { Modal, Radio, Typography, message, Space } from 'antd';
import { CreditCardOutlined, BankOutlined, WalletOutlined } from '@ant-design/icons';
import { paymentsApi, type PaymentMethod } from '../api/payments';

const { Text } = Typography;

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: number;
  amount: number;
  onSuccess?: () => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: "sberpay_qr",
    label: "СберPay QR",
    icon: <QrcodeOutlined />,
    description: "Сканируй QR в приложении Сбер Онлайн",
  },
];

const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  onClose,
  orderId,
  amount,
  onSuccess,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('sberpay_qr');
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    try {
      setLoading(true);
      const response = await paymentsApi.createPayment({
        order_id: orderId,
        amount,
        payment_method: selectedMethod,
      });

      if (response.payment_link) {
        window.location.href = response.payment_link;
      } else {
        message.success('Платёж создан');
        onSuccess?.();
        onClose();
      }
    } catch (e: unknown) {
      const errorDetail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(errorDetail || 'Ошибка создания платежа');
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
      cancelText="Отмена"
      title="Выберите способ оплаты"
      confirmLoading={loading}
      destroyOnClose
    >
      <div style={{ padding: '16px 0' }}>
        <Text style={{ marginBottom: 16, display: 'block' }}>
          Сумма к оплате: <Text strong>{amount.toLocaleString('ru-RU')} ₽</Text>
        </Text>
        <Radio.Group
          value={selectedMethod}
          onChange={(e) => setSelectedMethod(e.target.value)}
          style={{ width: '100%' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {PAYMENT_METHODS.map((method) => (
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
                  <span style={{ fontSize: 20 }}>{method.icon}</span>
                  <div>
                    <Text strong>{method.label}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{method.description}</Text>
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
