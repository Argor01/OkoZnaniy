import React, { useState } from 'react';
import { Typography, Card, Tag, Button, Space, Empty, Spin, Modal, Descriptions, Divider } from 'antd';
import { ClockCircleOutlined, UserOutlined, EyeOutlined, FileTextOutlined, CalendarOutlined, DollarOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../../../../api/orders';
import { authApi } from '../../../../api/auth';
import { ORDER_STATUS_COLORS, ORDER_STATUS_TEXTS } from '../../../../config/orderStatuses';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';
import styles from '../../ExpertDashboard.module.css';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Text, Paragraph } = Typography;

interface OrdersTabProps {
  isMobile: boolean;
}

const OrdersTab: React.FC<OrdersTabProps> = ({ isMobile }) => {
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Загружаем профиль пользователя
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  // Загружаем заказы
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['user-orders', userProfile?.role],
    queryFn: () => {
      if (userProfile?.role === 'client') {
        return ordersApi.getClientOrders();
      } else if (userProfile?.role === 'expert') {
        return ordersApi.getMyOrders({});
      }
      return null;
    },
    enabled: !!userProfile,
  });

  const orders = Array.isArray(ordersData?.results) ? ordersData.results : (Array.isArray(ordersData) ? ordersData : []);
  const isClient = userProfile?.role === 'client';

  const getStatusColor = (status: string) => ORDER_STATUS_COLORS[status] || 'default';
  const getStatusText = (status: string) => ORDER_STATUS_TEXTS[status] || status;

  const handleShowOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedOrder(null);
  };

  if (isLoading) {
    return (
      <div className={styles.sectionCard}>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.sectionCard}>
        <div className={styles.sectionCardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className={styles.sectionTitle}>
            {isClient ? 'Мои заказы' : 'Доступные заказы'}
          </h2>
          {isClient && (
            <Button 
              type="primary"
              onClick={() => navigate('/create-order')}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: 8,
              }}
            >
              Создать заказ
            </Button>
          )}
        </div>

        {orders.length === 0 ? (
          <Empty
            description={
              <div>
                <Text style={{ fontSize: 16, color: '#999' }}>
                  {isClient 
                    ? 'У вас пока нет заказов'
                    : 'Нет доступных заказов'}
                </Text>
              </div>
            }
            style={{ padding: '60px 0' }}
          >
          </Empty>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {orders.map((order: any) => (
              <Card
                key={order.id}
                hoverable
                style={{
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                }}
                bodyStyle={{ padding: 20 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                      {order.title}
                    </Text>
                    <Space size={8} wrap>
                      <Tag color={getStatusColor(order.status)}>
                        {getStatusText(order.status)}
                      </Tag>
                      {order.subject_name && (
                        <Tag color="blue">{order.subject_name}</Tag>
                      )}
                      {order.work_type_name && (
                        <Tag>{order.work_type_name}</Tag>
                      )}
                    </Space>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: '#667eea' }}>
                      {order.budget ? `${order.budget} ₽` : 'Договорная'}
                    </div>
                  </div>
                </div>

                {order.description && (
                  <Paragraph 
                    ellipsis={{ rows: 2 }}
                    style={{ color: '#666', marginBottom: 12 }}
                  >
                    {order.description}
                  </Paragraph>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <Space size={16} wrap>
                    {order.deadline && (
                      <Space size={4}>
                        <ClockCircleOutlined style={{ color: '#999' }} />
                        <Text type="secondary" style={{ fontSize: 14 }}>
                          {dayjs(order.deadline).fromNow()}
                        </Text>
                      </Space>
                    )}
                    {order.responses_count !== undefined && (
                      <Space size={4}>
                        <UserOutlined style={{ color: '#999' }} />
                        <Text type="secondary" style={{ fontSize: 14 }}>
                          {order.responses_count} откликов
                        </Text>
                      </Space>
                    )}
                  </Space>
                  <Button 
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => handleShowOrderDetails(order)}
                  >
                    Подробнее
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно с подробной информацией о заказе */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileTextOutlined style={{ color: '#667eea' }} />
            <span>Подробная информация о заказе</span>
          </div>
        }
        open={isModalVisible}
        onCancel={handleCloseModal}
        footer={[
          <Button key="close" onClick={handleCloseModal}>
            Закрыть
          </Button>,
          isClient && selectedOrder && (
            <Button 
              key="edit" 
              type="primary"
              onClick={() => {
                handleCloseModal();
                navigate(`/orders/${selectedOrder.id}/edit`);
              }}
            >
              Редактировать
            </Button>
          ),
          !isClient && selectedOrder && (
            <Button 
              key="respond" 
              type="primary"
              onClick={() => {
                handleCloseModal();
                navigate(`/orders/${selectedOrder.id}`);
              }}
            >
              Откликнуться
            </Button>
          ),
        ].filter(Boolean)}
        width={800}
        style={{ top: 20 }}
      >
        {selectedOrder && (
          <div>
            <Descriptions
              title={selectedOrder.title}
              bordered
              column={1}
              size="middle"
              style={{ marginBottom: 24 }}
            >
              <Descriptions.Item 
                label={
                  <Space>
                    <Tag icon={<DollarOutlined />} color="green">Бюджет</Tag>
                  </Space>
                }
              >
                <Text strong style={{ fontSize: 18, color: '#667eea' }}>
                  {selectedOrder.budget ? `${selectedOrder.budget} ₽` : 'Договорная'}
                </Text>
              </Descriptions.Item>

              <Descriptions.Item 
                label={
                  <Space>
                    <Tag color={getStatusColor(selectedOrder.status)}>Статус</Tag>
                  </Space>
                }
              >
                <Tag color={getStatusColor(selectedOrder.status)} style={{ fontSize: 14 }}>
                  {getStatusText(selectedOrder.status)}
                </Tag>
              </Descriptions.Item>

              {selectedOrder.subject_name && (
                <Descriptions.Item label="Предмет">
                  <Tag color="blue">{selectedOrder.subject_name}</Tag>
                </Descriptions.Item>
              )}

              {selectedOrder.work_type_name && (
                <Descriptions.Item label="Тип работы">
                  <Tag>{selectedOrder.work_type_name}</Tag>
                </Descriptions.Item>
              )}

              {selectedOrder.deadline && (
                <Descriptions.Item 
                  label={
                    <Space>
                      <CalendarOutlined />
                      <span>Срок выполнения</span>
                    </Space>
                  }
                >
                  <Space direction="vertical" size={4}>
                    <Text>{dayjs(selectedOrder.deadline).format('DD.MM.YYYY HH:mm')}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ({dayjs(selectedOrder.deadline).fromNow()})
                    </Text>
                  </Space>
                </Descriptions.Item>
              )}

              {selectedOrder.created_at && (
                <Descriptions.Item label="Дата создания">
                  {dayjs(selectedOrder.created_at).format('DD.MM.YYYY HH:mm')}
                </Descriptions.Item>
              )}

              {selectedOrder.responses_count !== undefined && (
                <Descriptions.Item 
                  label={
                    <Space>
                      <UserOutlined />
                      <span>Отклики</span>
                    </Space>
                  }
                >
                  <Text strong>{selectedOrder.responses_count} откликов</Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedOrder.description && (
              <>
                <Divider orientation="left">Описание задания</Divider>
                <Card 
                  size="small" 
                  style={{ 
                    background: '#f8f9fa', 
                    border: '1px solid #e9ecef',
                    marginBottom: 16 
                  }}
                >
                  <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {selectedOrder.description}
                  </Paragraph>
                </Card>
              </>
            )}

            {selectedOrder.custom_topic && (
              <>
                <Divider orientation="left">Тема работы</Divider>
                <Card 
                  size="small" 
                  style={{ 
                    background: '#f0f8ff', 
                    border: '1px solid #d1ecf1',
                    marginBottom: 16 
                  }}
                >
                  <Text>{selectedOrder.custom_topic}</Text>
                </Card>
              </>
            )}

            {selectedOrder.files && selectedOrder.files.length > 0 && (
              <>
                <Divider orientation="left">Прикрепленные файлы</Divider>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selectedOrder.files.map((file: any, index: number) => (
                    <Card 
                      key={index}
                      size="small"
                      style={{ 
                        background: '#fff3cd', 
                        border: '1px solid #ffeaa7' 
                      }}
                    >
                      <Space>
                        <FileTextOutlined />
                        <Text>{file.name || `Файл ${index + 1}`}</Text>
                        {file.size && (
                          <Text type="secondary">
                            ({(file.size / 1024 / 1024).toFixed(2)} МБ)
                          </Text>
                        )}
                      </Space>
                    </Card>
                  ))}
                </Space>
              </>
            )}

            {/* Дополнительная информация для клиентов */}
            {isClient && (
              <>
                <Divider orientation="left">Управление заказом</Divider>
                <Space wrap>
                  <Button 
                    icon={<EyeOutlined />}
                    onClick={() => {
                      handleCloseModal();
                      navigate(`/orders/${selectedOrder.id}`);
                    }}
                  >
                    Открыть страницу заказа
                  </Button>
                  {selectedOrder.status === 'new' && (
                    <Button 
                      type="primary"
                      onClick={() => {
                        handleCloseModal();
                        navigate(`/orders/${selectedOrder.id}/edit`);
                      }}
                    >
                      Редактировать заказ
                    </Button>
                  )}
                </Space>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrdersTab;
