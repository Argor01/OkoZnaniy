import React from 'react';
import { Typography, Form, Button, DatePicker, InputNumber, message } from 'antd';
import { useRouter } from 'next/router';
import { useDispatch } from 'react-redux';
import { FormField } from '@/components/shared/Form/FormField';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useApi } from '@/hooks/useApi';
import { createOrder } from '@/store/slices/ordersSlice';
import type { AppDispatch } from '@/store';
import locale from 'antd/locale/ru_RU';

const { Title } = Typography;

interface OrderFormData {
  title: string;
  description: string;
  deadline: string;
  budget: number;
}

const NewOrderPage: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [form] = Form.useForm<OrderFormData>();

  const handleSubmit = async (values: OrderFormData) => {
    try {
      await dispatch(createOrder(values)).unwrap();
      message.success('Заказ успешно создан');
      router.push('/orders');
    } catch (error) {
      // Ошибка уже обработана в useApi
      console.error('Create order error:', error);
    }
  };

  return (
    <ProtectedRoute roles={['client']}>
      <div className="new-order-page">
        <Title level={2}>Создание нового заказа</Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="order-form"
        >
          <FormField
            name="title"
            label="Название"
            required
            rules={[
              {
                min: 10,
                message: 'Название должно содержать минимум 10 символов',
              },
            ]}
          />

          <FormField
            name="description"
            label="Описание"
            type="textarea"
            required
            rules={[
              {
                min: 50,
                message: 'Описание должно содержать минимум 50 символов',
              },
            ]}
          />

          <Form.Item
            name="deadline"
            label="Срок сдачи"
            required
            rules={[
              {
                required: true,
                message: 'Пожалуйста, укажите срок сдачи',
              },
            ]}
          >
            <DatePicker
              showTime
              format="DD.MM.YYYY HH:mm"
              placeholder="Выберите дату и время"
              style={{ width: '100%' }}
              locale={locale.DatePicker}
            />
          </Form.Item>

          <Form.Item
            name="budget"
            label="Бюджет"
            required
            rules={[
              {
                required: true,
                message: 'Пожалуйста, укажите бюджет',
              },
              {
                type: 'number',
                min: 500,
                message: 'Минимальный бюджет - 500 ₽',
              },
            ]}
          >
            <InputNumber
              min={500}
              step={100}
              formatter={(value: number | undefined) => 
                value ? `${value} ₽` : ''
              }
              parser={(value: string) => value.replace(/[^\d]/g, '')}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Создать заказ
            </Button>
          </Form.Item>
        </Form>

        <style jsx>{`
          .new-order-page {
            max-width: 800px;
            margin: 0 auto;
            padding: 24px;
          }
          .order-form {
            margin-top: 24px;
            background: white;
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
};

export default NewOrderPage; 