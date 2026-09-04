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
  /** Если передана активная ставка — модалка работает в режиме редактирования. */
  existingBid?: { id: number; amount?: string | number; prepayment_percent?: number; comment?: string | null } | null;
}

type BidFormValues = {
  amount: number;
  prepayment_percent: number;
  comment?: string;
  is_negotiable?: boolean;
};

const BidModal: React.FC<BidModalProps> = ({ visible, onClose, orderId, orderTitle, orderBudget, onBidSubmitted, existingBid }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [bidSuccess, setBidSuccess] = useState(false);
  const [isNegotiable, setIsNegotiable] = useState(false);
  const submitGuardRef = useRef(false);

  const placeBidMutation = useMutation({
    mutationFn: (data: { amount: number; prepayment_percent: number; comment?: string }) => 
      ordersApi.placeBid(orderId, data),
    onSuccess: async (createdBid) => {
      message.success('Отклик успешно отправлен!');
      setBidSuccess(true);

      const createdBidId = Number(createdBid?.id);
      if (Number.isFinite(createdBidId) && createdBidId > 0) {
        queryClient.setQueryData(['order-bids', String(orderId)], (prev: unknown) => {
          const list = Array.isArray(prev) ? prev : [];
          return list.some((bid: any) => Number(bid?.id) === createdBidId) ? list : [...list, createdBid];
        });
        queryClient.setQueryData(['order-bids', orderId], (prev: unknown) => {
          const list = Array.isArray(prev) ? prev : [];
          return list.some((bid: any) => Number(bid?.id) === createdBidId) ? list : [...list, createdBid];
        });
      }

      const patchOrder = (data: any): any => {
        if (!data) return data;
        if (Array.isArray(data)) return data.map((item) => item?.id === orderId ? { ...item, user_has_bid: true } : item);
        if (typeof data !== 'object') return data;
        if (Array.isArray(data.results)) return { ...data, results: patchOrder(data.results) };
        return data?.id === orderId ? { ...data, user_has_bid: true } : data;
      };
      queryClient.setQueriesData({ queryKey: ['orders-feed'] }, patchOrder);
      queryClient.setQueriesData({ queryKey: ['available-orders'] }, patchOrder);
      queryClient.setQueriesData({ queryKey: ['orders'] }, patchOrder);
      queryClient.setQueriesData({ queryKey: ['order', String(orderId)] }, patchOrder);
      queryClient.setQueriesData({ queryKey: ['order', orderId] }, patchOrder);

      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['order-bids', String(orderId)], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['order', String(orderId)], type: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['orders-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['available-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['user-orders'] }),
      ]);
      onBidSubmitted?.(orderId);
    },
    onError: (error: unknown) => {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || 'Не удалось отправить отклик');
    },
  });

  const isEdit = !!existingBid;

  const updateBidMutation = useMutation({
    mutationFn: (data: { amount: number; prepayment_percent: number; comment?: string }) =>
      ordersApi.updateBid(orderId, Number(existingBid?.id), data),
    onSuccess: async () => {
      message.success('Ставка обновлена');
      setBidSuccess(true);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['order-bids', String(orderId)], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['order-bids', orderId], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['order', String(orderId)], type: 'active' }),
      ]);
      onBidSubmitted?.(orderId);
    },
    onError: (error: unknown) => {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || 'Не удалось изменить ставку');
    },
  });

  const isPending = placeBidMutation.isPending || updateBidMutation.isPending;

  // При открытии в режиме редактирования подставляем текущие значения ставки.
  React.useEffect(() => {
    if (!visible || !existingBid) return;
    const amountNum = Number(existingBid.amount ?? 0);
    const negotiable = !Number.isFinite(amountNum) || amountNum === 0;
    setIsNegotiable(negotiable);
    form.setFieldsValue({
      amount: negotiable ? undefined : amountNum,
      prepayment_percent: Number(existingBid.prepayment_percent ?? 50),
      comment: existingBid.comment ?? '',
      is_negotiable: negotiable,
    });
  }, [visible, existingBid, form]);

  const handleSubmit = async (values: BidFormValues) => {
    const activeMutation = isEdit ? updateBidMutation : placeBidMutation;
    if (activeMutation.isPending || submitGuardRef.current) return;
    submitGuardRef.current = true;
    try {
      await activeMutation.mutateAsync({
        amount: isNegotiable ? 0 : Number(values.amount),
        prepayment_percent: Number(values.prepayment_percent),
        comment: values.comment,
      });
    } finally {
      submitGuardRef.current = false;
    }
  };

  const handleClose = () => {
    if (isPending) return;
    form.resetFields();
    setBidSuccess(false);
    setIsNegotiable(false);
    onClose();
  };

  return (
    <Modal
      title={bidSuccess ? (isEdit ? 'Ставка обновлена!' : 'Отклик отправлен!') : (isEdit ? 'Изменить ставку' : 'Откликнуться на заказ')}
      open={visible}
      onCancel={handleClose}
      footer={null}
      className={styles.bidModal}
      width="min(500px, calc(100vw - 24px))"
      closable={!isPending}
      maskClosable={!isPending}
      keyboard={!isPending}
    >
      {bidSuccess ? (
        <Result
          status="success"
          title={isEdit ? 'Ставка обновлена!' : 'Ваш отклик успешно отправлен!'}
          subTitle={isEdit ? 'Заказчик увидит новую сумму вашей ставки' : 'Заказчик получит уведомление и сможет связаться с вами'}
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
                disabled={isNegotiable || isPending}
              />
            </Form.Item>

            <Form.Item name="is_negotiable" valuePropName="checked" style={{ marginBottom: 12, marginTop: -12 }}>
              <Checkbox
                disabled={isPending}
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
                disabled={isPending}
              />
            </Form.Item>

            <Form.Item
              name="comment"
              label="Комментарий (опционально)"
            >
              <AppInput.TextArea
                rows={4}
                placeholder="Напишите, почему вы подходите для этого заказа..."
                disabled={isPending}
              />
            </Form.Item>

            <div className={styles.formActions}>
              <AppButton variant="secondary" onClick={handleClose} disabled={isPending}>
                Отмена
              </AppButton>
              <AppButton
                variant="primary"
                htmlType="submit"
                loading={isPending}
                disabled={isPending || bidSuccess}
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
