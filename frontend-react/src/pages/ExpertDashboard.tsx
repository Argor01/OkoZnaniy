import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, List, Typography, Tag, message, Upload, Space, InputNumber, Input, Spin, Modal, Form, InputNumber as AntInputNumber } from 'antd';
import { UploadOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ordersApi, type Order, type OrderComment } from '../api/orders';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  avatar?: string;
  bio?: string;
  experience_years?: number;
  hourly_rate?: number;
  education?: string;
  skills?: string;
  portfolio_url?: string;
  is_verified?: boolean;
}

const { Title, Text } = Typography;

const ExpertDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [bidLoading, setBidLoading] = useState<Record<number, boolean>>({});
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['available-orders'],
    queryFn: () => ordersApi.getAvailableOrders(),
  });

  const { data: myInProgress } = useQuery({
    queryKey: ['my-orders-in-progress'],
    queryFn: () => ordersApi.getMyOrders({ status: 'in_progress' }),
  });

  const { data: myCompleted } = useQuery({
    queryKey: ['my-orders-completed'],
    queryFn: () => ordersApi.getMyOrders({ status: 'completed' }),
  });

  // Загружаем профиль пользователя
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  React.useEffect(() => {
    if (userProfile) {
      setProfile(userProfile);
    }
  }, [userProfile]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'blue';
      case 'in_progress': return 'orange';
      case 'review': return 'purple';
      case 'revision': return 'magenta';
      case 'completed': return 'green';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new': return 'Создан';
      case 'in_progress': return 'В работе';
      case 'review': return 'На проверке';
      case 'revision': return 'На доработке';
      case 'completed': return 'Завершен';
      case 'cancelled': return 'Отменен';
      default: return status;
    }
  };

  const takeMutation = useMutation({
    mutationFn: (orderId: number) => ordersApi.takeOrder(orderId),
    onSuccess: () => {
      message.success('Заказ взят в работу');
      queryClient.invalidateQueries({ queryKey: ['available-orders'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Не удалось взять заказ');
    },
  });

  if (isLoading) return <Text>Загрузка...</Text>;
  if (isError) return <Text type="danger">Ошибка загрузки заказов</Text>;

  const orders: Order[] = data || [];

  return (
    <div style={{ maxWidth: 900, margin: '24px auto' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>Кабинет эксперта</Title>
        <Space>
          <Button onClick={() => setProfileModalVisible(true)}>Редактировать профиль</Button>
          <Button onClick={() => navigate(-1)}>Назад</Button>
          <Button
            onClick={() => {
              authApi.logout();
              navigate('/');
              window.location.reload();
            }}
          >
            Выйти
          </Button>
        </Space>
      </div>
      <Title level={2}>Доступные заказы</Title>
      <List
        dataSource={orders}
        locale={{ emptyText: 'Нет доступных заказов' }}
        renderItem={(order) => (
          <List.Item
            actions={[
              <Button
                type="primary"
                onClick={() => takeMutation.mutate(order.id)}
                loading={takeMutation.isPending}
              >
                Взять в работу
              </Button>,
              <Space>
                <InputNumber
                  min={1}
                  step={1}
                  precision={0}
                  placeholder="Ваша цена"
                  onChange={(value) => (order as any)._bidAmount = value}
                  style={{ width: 120 }}
                />
                <Button
                  loading={bidLoading[order.id]}
                  onClick={async () => {
                    try {
                      const amount = (order as any)._bidAmount;
                      if (!amount || amount <= 0) {
                        message.error('Укажите корректную сумму');
                        return;
                      }
                      setBidLoading(prev => ({ ...prev, [order.id]: true }));
                      await ordersApi.placeBid(order.id, { amount });
                      message.success('Ставка отправлена');
                      queryClient.invalidateQueries({ queryKey: ['available-orders'] });
                      queryClient.invalidateQueries({ queryKey: ['clientOrders'] });
                    } catch (e: any) {
                      message.error(e?.response?.data?.detail || e?.response?.data?.amount || 'Не удалось отправить ставку');
                    } finally {
                      setBidLoading(prev => ({ ...prev, [order.id]: false }));
                    }
                  }}
                >
                  Предложить
                </Button>
              </Space>
            ]}
          >
            <Card style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <Title level={4} style={{ margin: 0 }}>{order.title}</Title>
                  <Text type="secondary">#{order.id}</Text>
                  <div style={{ marginTop: 8 }}>
                    <Tag color="blue">{order.subject?.name}</Tag>
                    <Tag>{order.work_type?.name}</Tag>
                    <Tag color="green">до {dayjs(order.deadline).format('DD.MM.YYYY')}</Tag>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Title level={4} style={{ margin: 0 }}>{order.budget} ₽</Title>
                  <Tag color={getStatusColor(order.status)}>{getStatusText(order.status)}</Tag>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Text>{order.description}</Text>
              </div>
              <div style={{ marginTop: 12 }}>
                <strong>Чат по заказу</strong>
                <OrderChat orderId={order.id} />
              </div>
            </Card>
          </List.Item>
        )}
      />

      <Title level={3} style={{ marginTop: 32 }}>Мои заказы (в работе)</Title>
      <List
        dataSource={(myInProgress as Order[] | undefined) || []}
        locale={{ emptyText: 'Нет заказов в работе' }}
        renderItem={(order) => (
          <List.Item
            actions={[
              <Button
                type="primary"
                onClick={async () => {
                  try {
                    await ordersApi.submitOrder(order.id);
                    message.success('Отправлено на проверку');
                    queryClient.invalidateQueries({ queryKey: ['my-orders-in-progress'] });
                  } catch (e: any) {
                    message.error(e?.response?.data?.detail || 'Не удалось отправить на проверку');
                  }
                }}
              >
                Отправить на проверку
              </Button>,
              <Upload
                beforeUpload={async (file) => {
                  try {
                    await ordersApi.uploadOrderFile(order.id, file, { file_type: 'solution' });
                    message.success('Файл загружен');
                    queryClient.invalidateQueries({ queryKey: ['my-orders-in-progress'] });
                  } catch (e: any) {
                    message.error(e?.response?.data?.detail || 'Ошибка загрузки файла');
                  }
                  return false;
                }}
                showUploadList={false}
              >
                <Button icon={<UploadOutlined />}>Загрузить файл</Button>
              </Upload>,
            ]}
          >
            <Card style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <Title level={4} style={{ margin: 0 }}>{order.title}</Title>
                  <Text type="secondary">#{order.id}</Text>
                  <div style={{ marginTop: 8 }}>
                    <Tag color="blue">{order.subject?.name}</Tag>
                    <Tag>{order.work_type?.name}</Tag>
                    <Tag color="green">до {dayjs(order.deadline).format('DD.MM.YYYY')}</Tag>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Title level={4} style={{ margin: 0 }}>{order.budget} ₽</Title>
                  <Tag color={getStatusColor(order.status)}>{getStatusText(order.status)}</Tag>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Text>{order.description}</Text>
              </div>
              <div style={{ marginTop: 12 }}>
                <strong>Чат по заказу</strong>
                <OrderChat orderId={order.id} />
              </div>
            </Card>
          </List.Item>
        )}
      />

      <Title level={3} style={{ marginTop: 32 }}>Мои заказы (завершенные)</Title>
      <List
        dataSource={(myCompleted as Order[] | undefined) || []}
        locale={{ emptyText: 'Нет завершенных заказов' }}
        renderItem={(order) => (
          <List.Item>
            <Card style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <Title level={4} style={{ margin: 0 }}>{order.title}</Title>
                  <Text type="secondary">#{order.id}</Text>
                  <div style={{ marginTop: 8 }}>
                    <Tag color="blue">{order.subject?.name}</Tag>
                    <Tag>{order.work_type?.name}</Tag>
                    <Tag color="green">до {dayjs(order.deadline).format('DD.MM.YYYY')}</Tag>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Title level={4} style={{ margin: 0 }}>{order.budget} ₽</Title>
                  <Tag color={getStatusColor(order.status)}>{getStatusText(order.status)}</Tag>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Text>{order.description}</Text>
              </div>
            </Card>
          </List.Item>
        )}
      />

      {/* Модальное окно редактирования профиля */}
      <Modal
        title="Редактировать профиль"
        open={profileModalVisible}
        onCancel={() => setProfileModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={profile || {}}
          onFinish={async (values) => {
            try {
              await authApi.updateProfile(values);
              message.success('Профиль обновлен');
              setProfileModalVisible(false);
              queryClient.invalidateQueries({ queryKey: ['user-profile'] });
            } catch (e: any) {
              message.error(e?.response?.data?.detail || 'Не удалось обновить профиль');
            }
          }}
        >
          <Form.Item label="Аватар" name="avatar">
            <Upload
              name="avatar"
              listType="picture-card"
              showUploadList={false}
              beforeUpload={(file) => {
                const isImage = file.type.startsWith('image/');
                if (!isImage) {
                  message.error('Можно загружать только изображения!');
                  return false;
                }
                const isLt2M = file.size / 1024 / 1024 < 2;
                if (!isLt2M) {
                  message.error('Размер файла должен быть меньше 2MB!');
                  return false;
                }
                return true;
              }}
              customRequest={async ({ file, onSuccess, onError }) => {
                try {
                  const formData = new FormData();
                  formData.append('avatar', file as File);
                  
                  const response = await fetch('http://localhost:8000/api/users/update_me/', {
                    method: 'PATCH',
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    },
                    body: formData,
                  });
                  
                  if (response.ok) {
                    const result = await response.json();
                    form.setFieldsValue({ avatar: result.avatar });
                    onSuccess?.(result);
                    message.success('Аватар обновлен!');
                    queryClient.invalidateQueries({ queryKey: ['user-profile'] });
                  } else {
                    throw new Error('Ошибка загрузки');
                  }
                } catch (error) {
                  onError?.(error as Error);
                  message.error('Не удалось загрузить аватар');
                }
              }}
            >
              {profile?.avatar ? (
                <img 
                  src={`http://localhost:8000${profile.avatar}`} 
                  alt="avatar" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div>
                  <UserOutlined />
                  <div style={{ marginTop: 8 }}>Загрузить</div>
                </div>
              )}
            </Upload>
          </Form.Item>
          <Form.Item label="Имя" name="first_name">
            <Input />
          </Form.Item>
          <Form.Item label="Фамилия" name="last_name">
            <Input />
          </Form.Item>
          <Form.Item label="О себе" name="bio">
            <Input.TextArea rows={4} placeholder="Расскажите о себе, своем опыте и специализации" />
          </Form.Item>
          <Form.Item label="Опыт работы (лет)" name="experience_years">
            <AntInputNumber min={0} max={50} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Почасовая ставка (₽)" name="hourly_rate">
            <AntInputNumber min={0} step={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Образование" name="education">
            <Input.TextArea rows={3} placeholder="Укажите ваше образование и квалификации" />
          </Form.Item>
          <Form.Item label="Навыки" name="skills">
            <Input.TextArea rows={3} placeholder="Перечислите ваши навыки и компетенции" />
          </Form.Item>
          <Form.Item label="Портфолио (ссылка)" name="portfolio_url">
            <Input placeholder="https://example.com/portfolio" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExpertDashboard;

// Простой чат-компонент для заказа (MVP)
const OrderChat: React.FC<{ orderId: number }> = ({ orderId }) => {
  const [text, setText] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['order-comments', orderId],
    queryFn: () => ordersApi.getComments(orderId),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const raw = (data as any) || [];
  const comments: OrderComment[] = Array.isArray(raw) ? raw : Array.isArray(raw.results) ? raw.results : [];

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments?.length]);

  const authorName = (c: OrderComment) => c?.author?.username || (c?.author?.id ? `Пользователь #${c.author.id}` : 'Пользователь');

  return (
    <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12, marginTop: 8 }}>
      <div ref={scrollRef} style={{ maxHeight: 200, overflowY: 'auto', paddingRight: 8 }}>
        {isLoading ? (
          <Spin size="small" />
        ) : comments.length === 0 ? (
          <div style={{ color: '#999', fontStyle: 'italic' }}>Сообщений пока нет</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {comments.map((c) => (
              <li key={c.id} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {authorName(c)} — {dayjs(c.created_at).format('DD.MM HH:mm')}
                </div>
                <div>{c.text}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Input.TextArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoSize={{ minRows: 1, maxRows: 3 }}
          placeholder="Напишите сообщение"
        />
        <Button
          type="primary"
          disabled={!text.trim() || sending}
          loading={sending}
          onClick={async () => {
            if (!text.trim()) return;
            try {
              setSending(true);
              await ordersApi.addComment(orderId, text.trim());
              setText('');
              await refetch();
            } catch (e: any) {
              message.error(e?.response?.data?.detail || 'Не удалось отправить сообщение');
            } finally {
              setSending(false);
            }
          }}
        >
          Отправить
        </Button>
      </div>
    </div>
  );
};
