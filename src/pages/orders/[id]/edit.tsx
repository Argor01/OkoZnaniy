import React, { useEffect } from 'react';
import { Typography, Form, Button, DatePicker, InputNumber, message } from 'antd';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { FormField } from '@/components/shared/Form/FormField';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { fetchOrderById, updateOrder } from '@/store/slices/ordersSlice';
import dayjs from 'dayjs';
import locale from 'antd/locale/ru_RU';

const { Title } = Typography;

interface OrderFormData {
  title: string;
  description: string;
  deadline: string;
  budget: number;
}

const EditOrderPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const dispatch = useDispatch<AppDispatch>();
  const { currentOrder: order, loading } = useSelector(
    (state: RootState) => state.orders
  );
  const [form] = Form.useForm<OrderFormData>();

  useEffect(() => {
    if (id) {
      dispatch(fetchOrderById(Number(id)));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (order) {
      form.setFieldsValue({
        ...order,
        deadline: dayjs(order.deadline),
      });
    }
  }, [form, order]);

  const handleSubmit = async (values: OrderFormData) => {
    if (!id) return;

    try {
      await dispatch(
        updateOrder({
          id: Number(id),
          data: {
            ...values,
            deadline: values.deadline,
          },
        })
      ).unwrap();
      message.success('Заказ успешно обновлен');
      router.push(`/orders/${id}`);
    } catch (error) {
      // Ошибка уже обработана в useApi
      console.error('Update order error:', error);
    }
  };

  if (!order) {
    return null;
  }

  return (
    <ProtectedRoute roles={['client']}>
      <div className="edit-order-page">
        <Title level={2}>Редактирование заказа #{order.id}</Title>

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
              Сохранить изменения
            </Button>
          </Form.Item>
        </Form>

        <style jsx>{`
          .edit-order-page {
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

export default EditOrderPage; 