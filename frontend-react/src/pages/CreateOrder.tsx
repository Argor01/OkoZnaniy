import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Card, Typography, message, DatePicker, Space, InputNumber } from 'antd';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { catalogApi } from '../api/catalog';
import { ordersApi, type CreateOrderRequest } from '../api/orders';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

const CreateOrder: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [hasExistingOrders, setHasExistingOrders] = useState<boolean>(false);
  const [checkingOrders, setCheckingOrders] = useState<boolean>(true);
  // const [selectedSubject, setSelectedSubject] = useState<number | undefined>();

  // Проверяем наличие заказов при загрузке компонента
  useEffect(() => {
    const checkOrders = async () => {
      try {
        const ordersData = await ordersApi.getClientOrders();
        const orders = ordersData?.results || ordersData || [];
        setHasExistingOrders(orders.length > 0);
      } catch (error) {
        console.error('Ошибка при проверке заказов:', error);
        setHasExistingOrders(false);
      } finally {
        setCheckingOrders(false);
      }
    };

    checkOrders();
  }, []);

  // Загружаем данные каталога
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: catalogApi.getSubjects,
  });

  const { data: workTypes = [], isLoading: workTypesLoading } = useQuery({
    queryKey: ['workTypes'],
    queryFn: catalogApi.getWorkTypes,
  });

  // Мутация для создания заказа
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: CreateOrderRequest) => ordersApi.createOrder(orderData),
    onSuccess: () => {
      message.success('Заказ создан успешно!');
      form.resetFields();
      navigate('/dashboard');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.deadline?.[0] || 
                          error?.response?.data?.detail || 
                          'Ошибка создания заказа';
      message.error(errorMessage);
    },
  });

  const onFinish = (values: any) => {
    const orderData: CreateOrderRequest = {
      title: values.title,
      description: values.description,
      deadline: values.deadline?.format('YYYY-MM-DDTHH:mm:ss'),
      subject_id: values.subject_id,
      custom_topic: values.custom_topic,
      work_type_id: values.work_type_id,
      budget: values.budget,
    };
    createOrderMutation.mutate(orderData);
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <Title level={2} style={{ margin: 0 }}>
            Создать заказ
          </Title>
          {!checkingOrders && hasExistingOrders && (
            <Button 
              type="default" 
              onClick={() => navigate('/dashboard')}
            >
              Перейти в дашборд
            </Button>
          )}
        </div>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            deadline: dayjs().add(7, 'day'),
          }}
        >
          <Form.Item
            name="title"
            label="Название заказа"
            rules={[{ required: true, message: 'Введите название заказа' }]}
          >
            <Input placeholder="Например: Курсовая работа по экономике" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание задания"
            rules={[{ required: true, message: 'Введите описание задания' }]}
          >
            <TextArea
              rows={4}
              placeholder="Подробно опишите задание, требования, объем работы..."
            />
          </Form.Item>

          <Form.Item
            name="subject_id"
            label="Предмет"
            rules={[{ required: true, message: 'Выберите предмет' }]}
          >
            <Select
              placeholder="Выберите предмет"
              loading={subjectsLoading}
              onChange={() => {}}
            >
              {subjects.map((subject) => (
                <Select.Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="custom_topic"
            label="Тема"
            rules={[{ required: true, message: 'Введите тему' }]}
          >
            <Input placeholder="Введите тему работы" />
          </Form.Item>

          <Form.Item
            name="work_type_id"
            label="Тип работы"
            rules={[{ required: true, message: 'Выберите тип работы' }]}
          >
            <Select
              placeholder="Выберите тип работы"
              loading={workTypesLoading}
            >
              {workTypes.map((workType) => (
                <Select.Option key={workType.id} value={workType.id}>
                  {workType.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="budget"
            label="Желаемая цена (₽)"
            rules={[
              { required: true, message: 'Укажите желаемую цену' },
              { type: 'number', min: 1, message: 'Цена должна быть больше 0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Введите желаемую цену"
              min={1}
              step={100}
              precision={0}
            />
          </Form.Item>


          <Form.Item
            name="deadline"
            label="Срок выполнения"
            rules={[
              { required: true, message: 'Выберите срок выполнения' },
              {
                validator: (_, value) => {
                  if (value && value.isBefore(dayjs().add(1, 'hour'))) {
                    return Promise.reject(new Error('Дедлайн не может быть в прошлом или менее чем через час'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <DatePicker
              style={{ width: '100%' }}
              showTime
              disabledDate={(current) => current && current < dayjs().startOf('day')}
              disabledTime={(current) => {
                if (current && current.isSame(dayjs(), 'day')) {
                  return {
                    disabledHours: () => {
                      const now = dayjs();
                      const hours = [];
                      for (let i = 0; i < now.hour(); i++) {
                        hours.push(i);
                      }
                      return hours;
                    },
                    disabledMinutes: (selectedHour) => {
                      if (selectedHour === dayjs().hour()) {
                        const now = dayjs();
                        const minutes = [];
                        for (let i = 0; i <= now.minute(); i++) {
                          minutes.push(i);
                        }
                        return minutes;
                      }
                      return [];
                    }
                  };
                }
                return {};
              }}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createOrderMutation.isPending}>
                Создать заказ
              </Button>
              <Button onClick={() => form.resetFields()}>
                Очистить
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CreateOrder;
