import React, { useState } from 'react';
import { Modal, Form, InputNumber, Input, Button, message, Result } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../api/orders';
import { chatApi } from '../../api/chat';

const { TextArea } = Input;

interface BidModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: number;
  orderTitle: string;
  orderBudget?: number;
  onOpenChat?: (orderId: number) => void;
}

const BidModal: React.FC<BidModalProps> = ({ visible, onClose, orderId, orderTitle, orderBudget, onOpenChat }) => {
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
    onError: (error: any) => {
      message.error(error.response?.data?.detail || 'Не удалось отправить отклик');
    },
  });

  const handleSubmit = (values: any) => {
    placeBidMutation.mutate(values);
  };

  const handleClose = () => {
    form.resetFields();
    setBidSuccess(false);
    onClose();
  };

  const handleOpenChat = async () => {
    try {
      // Создаем или получаем чат по заказу
      const chat = await chatApi.getOrCreateByOrder(orderId);
      handleClose();
      if (onOpenChat) {
        onOpenChat(orderId);
      }
      message.success('Чат открыт');
    } catch (error) {
      message.error('Не удалось открыть чат');
    }
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
            <Button type="primary" key="chat" onClick={handleOpenChat}>
              Написать заказчику
            </Button>,
            <Button key="close" onClick={handleClose}>
              Закрыть
            </Button>,
          ]}
        />
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <strong>{orderTitle}</strong>
            {orderBudget && (
              <div style={{ color: '#666', marginTop: 4 }}>
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
                { type: 'number', min: 1, message: 'Цена должна быть больше 0' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Введите вашу цену"
                addonAfter="₽"
                min={1}
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="comment"
              label="Комментарий (необязательно)"
            >
              <TextArea
                rows={4}
                placeholder="Расскажите почему вы подходите для этого заказа..."
                maxLength={500}
                showCount
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={placeBidMutation.isPending}
                block
                size="large"
              >
                Отправить отклик
              </Button>
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
};

export default BidModal;
