import React, { useRef, useState } from 'react';
import { Modal, Form, message, Result, Checkbox } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/features/orders/api/orders';
import { AppButton, AppInput } from '@/components/ui';
import styles from './BidModal.module.css';

interface BidModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: number;
  orderTitle: string;
  orderBudget?: number;
  onBidSubmitted?: (orderId: number) => void;
}

type BidFormValues = {
  amount: number;
  prepayment_percent: number;
  comment?: string;
  is_negotiable?: boolean;
};

const BidModal: React.FC<BidModalProps> = ({ visible, onClose, orderId, orderTitle, orderBudget, onBidSubmitted }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [bidSuccess, setBidSuccess] = useState(false);
  const [isNegotiable, setIsNegotiable] = useState(false);
  const submitGuardRef = useRef(false);

  const placeBidMutation = useMutation({
    mutationFn: (data: { amount: number; prepayment_percent: number; comment?: string }) => 
      ordersApi.placeBid(orderId, data),
    onSuccess: () => {
      message.success('Отклик успешно отправлен!');
      setBidSuccess(true);
      onBidSubmitted?.(orderId);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-feed'] });
      queryClient.invalidateQueries({ queryKey: ['order-bids', orderId] });
    },
    onError: (error: unknown) => {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || 'Не удалось отправить отклик');
    },
  });

  const handleSubmit = async (values: BidFormValues) => {
    if (placeBidMutation.isPending || submitGuardRef.current) return;
    submitGuardRef.current = true;
    try {
      await placeBidMutation.mutateAsync({
        amount: isNegotiable ? 0 : Number(values.amount),
        prepayment_percent: Number(values.prepayment_percent),
        comment: values.comment,
      });
    } finally {
      submitGuardRef.current = false;
    }
  };

  const handleClose = () => {
    if (placeBidMutation.isPending) return;
    form.resetFields();
    setBidSuccess(false);
    setIsNegotiable(false);
    onClose();
  };

  return (
    <Modal
      title={bidSuccess ? 'Отклик отправлен!' : 'Откликнуться на заказ'}
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={500}
      closable={!placeBidMutation.isPending}
      maskClosable={!placeBidMutation.isPending}
      keyboard={!placeBidMutation.isPending}
    >
      {bidSuccess ? (
        <Result
          status="success"
          title="Ваш отклик успешно отправлен!"
          subTitle="Заказчик получит уведомление и сможет связаться с вами"
          extra={[
            <AppButton variant="primary" key="close" onClick={handleClose}>
              Закрыть
            </AppButton>,
          ]}
        />
      ) : (
        <>
                    <div className={styles.bidHeader}>
            <strong>{orderTitle}</strong>
            {orderBudget !== undefined && orderBudget !== null && orderBudget !== 0 && (
              <div className={styles.bidBudget}>
                Бюджет заказчика: {orderBudget.toLocaleString('ru-RU')} ₽
              </div>
            )}
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ amount: orderBudget, prepayment_percent: 50, is_negotiable: false }}
          >
            <Form.Item
              name="amount"
              label="Ваша цена"
              rules={[
                { required: !isNegotiable, message: 'Укажите цену' },
                { 
                  validator: (_, value) => {
                    if (isNegotiable) return Promise.resolve();
                    if (!value || Number(value) < 1) {
                      return Promise.reject(new Error('Цена должна быть больше 0'));
                    }
                    return Promise.resolve();
                  }
                },
              ]}
            >
              <AppInput 
                placeholder="Например: 5000" 
                type="number" 
                disabled={isNegotiable || placeBidMutation.isPending}
              />
            </Form.Item>

            <Form.Item name="is_negotiable" valuePropName="checked" style={{ marginBottom: 12, marginTop: -12 }}>
              <Checkbox
                disabled={placeBidMutation.isPending}
                onChange={(e) => {
                  setIsNegotiable(e.target.checked);
                  if (e.target.checked) {
                    form.setFieldsValue({ amount: undefined });
                  } else if (orderBudget) {
                    form.setFieldsValue({ amount: orderBudget });
                  }
                }}
              >
                Договорная цена
              </Checkbox>
            </Form.Item>

            <Form.Item
              name="prepayment_percent"
              label="Процент предоплаты"
              rules={[
                { required: true, message: 'Укажите процент предоплаты' },
                {
                  validator: (_, value) => {
                    const num = Number(value);
                    if (!Number.isFinite(num) || num < 0 || num > 100) {
                      return Promise.reject(new Error('Процент должен быть от 0 до 100'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <AppInput
                placeholder="Например: 50"
                type="number"
                min={0}
                max={100}
                disabled={placeBidMutation.isPending}
              />
            </Form.Item>

            <Form.Item
              name="comment"
              label="Комментарий (опционально)"
            >
              <AppInput.TextArea
                rows={4}
                placeholder="Напишите, почему вы подходите для этого заказа..."
                disabled={placeBidMutation.isPending}
              />
            </Form.Item>

            <div className={styles.formActions}>
              <AppButton variant="secondary" onClick={handleClose} disabled={placeBidMutation.isPending}>
                Отмена
              </AppButton>
              <AppButton
                variant="primary"
                htmlType="submit"
                loading={placeBidMutation.isPending}
                disabled={placeBidMutation.isPending || bidSuccess}
              >
                Отправить отклик
              </AppButton>
            </div>
          </Form>
        </>
      )}
    </Modal>
  );
};

export default BidModal;
