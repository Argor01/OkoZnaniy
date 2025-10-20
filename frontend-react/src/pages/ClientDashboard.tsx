import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Row, Col, Statistic, List, Button, Tag, Spin, Alert, Empty, message, Space, Modal, Input, Upload, Rate } from 'antd';
import { 
  PlusOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  DollarOutlined,
  FileTextOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { UploadOutlined } from '@ant-design/icons';
import { expertsApi, type ExpertStatistics } from '../api/experts';
import { disputesApi } from '../api/disputes';
import { useNavigate } from 'react-router-dom';
import { ordersApi, type Order, type OrderFile, type Bid, type OrderComment } from '../api/orders';
import { authApi, type User } from '../api/auth';
import dayjs from 'dayjs';

const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);
  const [userError, setUserError] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const me = await authApi.getCurrentUser();
        if (isMounted) setCurrentUser(me);
      } catch (e: any) {
        if (isMounted) setUserError(e?.response?.data?.detail || 'Не удалось получить пользователя');
      } finally {
        if (isMounted) setLoadingUser(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Получаем заказы клиента (только для роли client)
  const { data: ordersData, isLoading, error, refetch } = useQuery({
    queryKey: ['clientOrders', selectedStatus],
    queryFn: () => ordersApi.getClientOrders({ 
      status: selectedStatus || undefined,
      ordering: '-created_at'
    }),
    enabled: !!currentUser && currentUser.role === 'client',
  });

  const orders = ordersData?.results || ordersData || [];

  // Временная отладочная информация
  console.log('=== DEBUG CLIENT DASHBOARD ===');
  console.log('Orders data:', orders);
  console.log('Orders with bids:', orders.filter((order: Order) => order.bids && order.bids.length > 0));
  orders.forEach((order: Order, index: number) => {
    console.log(`Order ${index + 1} (ID: ${order.id}):`, {
      title: order.title,
      status: order.status,
      bids: order.bids,
      bidsCount: order.bids ? order.bids.length : 0
    });
  });
  console.log('=== END DEBUG ===');

  // Статистика
  const totalOrders = orders.length;
  const activeOrders = orders.filter((order: Order) => 
    ['new', 'in_progress'].includes(order.status)
  ).length;
  const completedOrders = orders.filter((order: Order) => 
    order.status === 'completed'
  ).length;
  const totalSpent = orders
    .filter((order: Order) => order.status === 'completed')
    .reduce((sum: number, order: Order) => sum + parseFloat(order.budget), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'blue';
      case 'in_progress': return 'orange';
      case 'completed': return 'green';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new': return 'Создан';
      case 'in_progress': return 'В работе';
      case 'completed': return 'Завершен';
      case 'cancelled': return 'Отменен';
      default: return status;
    }
  };

  if (loadingUser) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  if (userError) {
    return (
      <Alert
        message="Ошибка авторизации"
        description={userError}
        type="error"
        showIcon
      />
    );
  }

  if (currentUser && currentUser.role !== 'client') {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Доступ ограничен"
          description="Этот раздел доступен только клиентам."
          type="warning"
          showIcon
          action={
            <Button type="primary" onClick={() => navigate('/')}>На главную</Button>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>Загрузка дашборда...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Ошибка загрузки данных"
        description="Не удалось загрузить данные дашборда. Пожалуйста, попробуйте позже."
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => refetch()}>
            Попробовать снова
          </Button>
        }
      />
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Дашборд клиента</h1>
        <Space>
          <Button onClick={() => navigate(-1)}>Назад</Button>
          <Button 
            type="default"
            onClick={() => {
              authApi.logout();
              navigate('/');
              window.location.reload();
            }}
          >
            Выйти
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/create-order')}
          >
            Создать заказ
          </Button>
        </Space>
      </div>

      {/* Статистика */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Всего заказов"
              value={totalOrders}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Активные заказы"
              value={activeOrders}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Завершенные"
              value={completedOrders}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Потрачено"
              value={totalSpent}
              prefix={<DollarOutlined />}
              suffix="₽"
              precision={2}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Фильтры */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button 
            type={selectedStatus === '' ? 'primary' : 'default'}
            onClick={() => setSelectedStatus('')}
          >
            Все заказы
          </Button>
          <Button 
            type={selectedStatus === 'new' ? 'primary' : 'default'}
            onClick={() => setSelectedStatus('new')}
          >
            Созданные
          </Button>
          <Button 
            type={selectedStatus === 'in_progress' ? 'primary' : 'default'}
            onClick={() => setSelectedStatus('in_progress')}
          >
            В работе
          </Button>
          <Button 
            type={selectedStatus === 'completed' ? 'primary' : 'default'}
            onClick={() => setSelectedStatus('completed')}
          >
            Завершенные
          </Button>
        </div>
      </Card>

      {/* Список заказов */}
      <Card title="Мои заказы">
        {orders.length === 0 ? (
          <Empty
            description="У вас пока нет заказов"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => navigate('/create-order')}
            >
              Создать первый заказ
            </Button>
          </Empty>
        ) : (
          <List
            itemLayout="vertical"
            dataSource={orders}
            renderItem={(order: Order) => (
              <List.Item
                key={order.id}
                actions={[
                  <Button 
                    type="link" 
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    Подробнее
                  </Button>,
                  (order.status === 'new' || order.status === 'in_progress') && (
                    <Upload
                      beforeUpload={async (file) => {
                        try {
                          await ordersApi.uploadOrderFile(order.id, file, { file_type: 'task' });
                          message.success('Файл прикреплен');
                          refetch();
                        } catch (e: any) {
                          message.error(e?.response?.data?.detail || 'Ошибка загрузки файла');
                        }
                        return false;
                      }}
                      showUploadList={false}
                    >
                      <Button icon={<UploadOutlined />}>Прикрепить файл</Button>
                    </Upload>
                  ),
                  order.status === 'review' && (
                    <Button
                      type="primary"
                      onClick={async () => {
                        try {
                          await ordersApi.approveOrder(order.id);
                          message.success('Работа принята');
                          refetch();
                        } catch (e: any) {
                          message.error(e?.response?.data?.detail || 'Не удалось принять работу');
                        }
                      }}
                    >
                      Принять
                    </Button>
                  ),
                  order.status === 'review' && (
                    <Button
                      danger
                      onClick={async () => {
                        try {
                          await ordersApi.requestRevision(order.id);
                          message.success('Отправлено на доработку');
                          refetch();
                        } catch (e: any) {
                          message.error(e?.response?.data?.detail || 'Не удалось отправить на доработку');
                        }
                      }}
                    >
                      На доработку
                    </Button>
                  ),
                  order.status === 'completed' && !order.expert_rating && (
                    <Button
                      onClick={() => {
                        let ratingValue = 5;
                        let commentValue = '';
                        Modal.confirm({
                          title: 'Оценить работу эксперта',
                          content: (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                              <div>
                                <div style={{ marginBottom: 8 }}>Оценка:</div>
                                <Rate defaultValue={5} onChange={(v) => (ratingValue = v)} />
                              </div>
                              <div>
                                <div style={{ marginBottom: 8 }}>Комментарий (необязательно):</div>
                                <Input.TextArea
                                  rows={3}
                                  placeholder="Поделитесь впечатлением"
                                  onChange={(e) => (commentValue = e.target.value)}
                                />
                              </div>
                            </div>
                          ),
                          okText: 'Отправить',
                          cancelText: 'Отмена',
                          onOk: async () => {
                            try {
                              await expertsApi.rateExpert({ order: order.id, rating: ratingValue, comment: commentValue || undefined });
                              message.success('Оценка отправлена');
                              refetch();
                            } catch (e: any) {
                              message.error(e?.response?.data?.detail || 'Не удалось отправить оценку');
                            }
                          },
                        });
                      }}
                    >
                      Оценить
                    </Button>
                  ),
                  order.status === 'completed' && order.expert_rating && (
                    <span style={{ color: '#52c41a', fontSize: 12 }}>
                      ✓ Оценка оставлена
                    </span>
                  ),
                  (order.status === 'completed' || order.status === 'review') && !order.dispute && (
                    <Button
                      danger
                      onClick={() => {
                        let reasonValue = '';
                        Modal.confirm({
                          title: 'Создать спор',
                          content: (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                              <div>
                                <div style={{ marginBottom: 8 }}>Причина спора:</div>
                                <Input.TextArea
                                  rows={4}
                                  placeholder="Опишите проблему с выполненной работой..."
                                  onChange={(e) => (reasonValue = e.target.value)}
                                />
                              </div>
                            </div>
                          ),
                          okText: 'Создать спор',
                          cancelText: 'Отмена',
                          onOk: async () => {
                            if (!reasonValue.trim()) {
                              message.error('Укажите причину спора');
                              return;
                            }
                            try {
                              await disputesApi.createDispute(order.id, { reason: reasonValue });
                              message.success('Спор создан. Администратор рассмотрит его в ближайшее время.');
                              refetch();
                            } catch (e: any) {
                              message.error(e?.response?.data?.error || 'Не удалось создать спор');
                            }
                          },
                        });
                      }}
                    >
                      Создать спор
                    </Button>
                  ),
                  order.dispute && (
                    <Tag color="orange">
                      Спор создан
                    </Tag>
                  )
                ]}
              >
                <List.Item.Meta
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{order.title}</span>
                      <Tag color={getStatusColor(order.status)}>
                        {getStatusText(order.status)}
                      </Tag>
                    </div>
                  }
                  description={
                    <div>
                      <p>{order.description}</p>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                        <span><strong>Предмет:</strong> {order.subject?.name}</span>
                        <span><strong>Тема:</strong> {order.topic?.name}</span>
                        <span><strong>Тип работы:</strong> {order.work_type?.name}</span>
                      </div>
                      {order.expert && (
                        <div style={{ marginTop: '8px' }}>
                          <strong>Исполнитель:</strong>{' '}
                          <Button 
                            type="link" 
                            style={{ padding: 0, height: 'auto' }}
                            onClick={() => navigate(`/expert/${order.expert?.id}`)}
                          >
                            {order.expert?.username || `Эксперт #${order.expert?.id}`}
                          </Button>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                        <span><strong>Бюджет:</strong> {order.budget} ₽</span>
                        <span><strong>Срок:</strong> {dayjs(order.deadline).format('DD.MM.YYYY')}</span>
                        <span><strong>Создан:</strong> {dayjs(order.created_at).format('DD.MM.YYYY HH:mm')}</span>
                      </div>
                      {Array.isArray(order.files) && order.files.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                          <strong>Файлы:</strong>
                          <ul style={{ marginTop: 8 }}>
                            {order.files.map((f: OrderFile) => (
                              <li key={f.id}>
                                {f.file_url ? (
                                  <a href={f.file_url} target="_blank" rel="noreferrer">
                                    {f.filename}
                                  </a>
                                ) : (
                                  <span>{f.filename}</span>
                                )}
                                {f.file_size ? ` — ${f.file_size}` : ''}
                                {f.file_type_display ? ` (${f.file_type_display})` : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div style={{ marginTop: '12px' }}>
                        <strong>Предложения экспертов:</strong>
                        {Array.isArray(order.bids) && order.bids.length > 0 ? (
                          <ul style={{ marginTop: 8 }}>
                            {order.bids.map((b: Bid) => (
                              <ExpertBidCard key={b.id} bid={b} orderId={order.id} onAccept={refetch} />
                            ))}
                          </ul>
                        ) : (
                          <div style={{ marginTop: 8, color: '#999', fontStyle: 'italic' }}>
                            Пока нет предложений от экспертов
                          </div>
                        )}
                      </div>
                      {/* Чат по заказу */}
                      <div style={{ marginTop: 16 }}>
                        <strong>Чат по заказу</strong>
                        <OrderChat orderId={order.id} />
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default ClientDashboard;

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
  const comments: OrderComment[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.results)
      ? raw.results
      : [];

  React.useEffect(() => {
    // Автопрокрутка вниз при обновлении сообщений
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

// Компонент карточки ставки эксперта с рейтингом
const ExpertBidCard: React.FC<{ bid: Bid; orderId: number; onAccept: () => void }> = ({ bid, orderId, onAccept }) => {
  const navigate = useNavigate();
  const [expertStats, setExpertStats] = React.useState<ExpertStatistics | null>(null);
  const [loadingStats, setLoadingStats] = React.useState(false);

  React.useEffect(() => {
    if (bid.expert?.id) {
      setLoadingStats(true);
      expertsApi.getExpertStatistics(bid.expert.id)
        .then(stats => setExpertStats(stats))
        .catch(() => setExpertStats(null))
        .finally(() => setLoadingStats(false));
    }
  }, [bid.expert?.id]);

  return (
    <li style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, padding: 8, border: '1px solid #f0f0f0', borderRadius: 6 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Button 
            type="link" 
            style={{ padding: 0, height: 'auto' }}
            onClick={() => navigate(`/expert/${bid.expert?.id}`)}
          >
            <span><strong>{bid.expert?.username || `Эксперт #${bid.expert?.id}`}</strong></span>
          </Button>
          {loadingStats ? (
            <Spin size="small" />
          ) : expertStats?.average_rating ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Rate disabled value={Number(expertStats.average_rating)} style={{ fontSize: 12 }} />
              <span style={{ fontSize: 12, color: '#666' }}>
                {Number(expertStats.average_rating).toFixed(1)} ({expertStats.completed_orders} заказов)
              </span>
            </div>
          ) : null}
        </div>
        <div style={{ fontSize: 14, fontWeight: 'bold', color: '#52c41a' }}>
          {bid.amount} ₽
        </div>
        {bid.comment && (
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            {bid.comment}
          </div>
        )}
      </div>
      <Button size="small" type="primary" onClick={() => {
        Modal.confirm({
          title: 'Принять ставку',
          content: `Вы уверены, что хотите принять ставку ${bid.amount} ₽ от ${bid.expert?.username || `эксперта #${bid.expert?.id}`}?`,
          onOk: async () => {
            try {
              await ordersApi.acceptBid(orderId, bid.id);
              message.success('Ставка принята, исполнитель назначен');
              onAccept();
            } catch (e: any) {
              message.error(e?.response?.data?.detail || 'Не удалось принять ставку');
            }
          }
        });
      }}>
        Принять
      </Button>
    </li>
  );
};
