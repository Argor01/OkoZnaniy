import React, { useState } from 'react';
import { Modal, Form, InputNumber, Input, Button, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../api/orders';

const { TextArea } = Input;

interface BidModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: number;
  orderTitle: string;
  orderBudget?: number;
}

const BidModal: React.FC<BidModalProps> = ({ visible, onClose, orderId, orderTitle, orderBudget }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const placeBidMutation = useMutation({
    mutationFn: (data: { amount: number; comment?: string }) => 
      ordersApi.placeBid(orderId, data),
    onSuccess: () => {
      message.success('Отклик успешно отправлен!');
      form.resetFields();
      onClose();
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

  return (
    <Modal
      title={`Откликнуться на заказ`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={500}
    >
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
    </Modal>
  );
};

export default BidModal;
