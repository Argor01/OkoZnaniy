import React, { useState } from 'react';
import { Modal, Form, message, Result } from 'antd';
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
}

type BidFormValues = {
  amount: number;
  comment?: string;
};

const BidModal: React.FC<BidModalProps> = ({ visible, onClose, orderId, orderTitle, orderBudget }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [bidSuccess, setBidSuccess] = useState(false);

  const placeBidMutation = useMutation({
    mutationFn: (data: { amount: number; comment?: string }) => 
      ordersApi.placeBid(orderId, data),
    onSuccess: () => {
      message.success('Отклик успешно отправлен!');
      setBidSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-bids', orderId] });
    },
    onError: (error: unknown) => {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || 'Не удалось отправить отклик');
    },
  });

  const handleSubmit = (values: BidFormValues) => {
    placeBidMutation.mutate({
      amount: Number(values.amount),
      comment: values.comment,
    });
  };

  const handleClose = () => {
    form.resetFields();
    setBidSuccess(false);
    onClose();
  };

  return (
    <Modal
      title={bidSuccess ? 'Отклик отправлен!' : 'Откликнуться на заказ'}
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={500}
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
            {orderBudget && (
              <div className={styles.bidBudget}>
                Бюджет заказчика: {orderBudget} ₽
              </div>
            )}
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ amount: orderBudget }}
          >
            <Form.Item
              name="amount"
              label="Ваша цена"
              rules={[
                { required: true, message: 'Укажите цену' },
                { 
                  type: 'number', 
                  min: 1, 
                  message: 'Цена должна быть больше 0',
                  transform: (value) => Number(value)
                },
              ]}
            >
              <AppInput.Number
                style={{ width: '100%' }}
                placeholder="Введите сумму"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="comment"
              label="Комментарий (опционально)"
            >
              <AppInput.TextArea
                rows={4}
                placeholder="Напишите, почему вы подходите для этого заказа..."
              />
            </Form.Item>

            <div className={styles.formActions}>
              <AppButton variant="default" onClick={handleClose}>
                Отмена
              </AppButton>
              <AppButton
                variant="primary"
                htmlType="submit"
                loading={placeBidMutation.isPending}
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
