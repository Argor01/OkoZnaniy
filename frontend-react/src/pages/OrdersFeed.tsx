import React, { useState } from 'react';
import { Card, Typography, Tag, Button, Space, Empty, Spin, Input, Select, Row, Col, InputNumber, Badge, Layout, message, Avatar, Divider } from 'antd';
import { ClockCircleOutlined, DollarOutlined, SearchOutlined, FilterOutlined, UserOutlined, MenuOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../api/orders';
import { catalogApi } from '../api/catalog';
import { authApi } from '../api/auth';
import Sidebar, { MobileMenuButton } from '../components/layout/Sidebar';
import { ORDER_STATUS_COLORS, ORDER_STATUS_TEXTS } from '../config/orderStatuses';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Title, Text, Paragraph } = Typography;
const { Header, Content } = Layout;

const OrdersFeed: React.FC = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<number | undefined>();
  const [selectedWorkType, setSelectedWorkType] = useState<number | undefined>();
  const [budgetRange, setBudgetRange] = useState<[number, number]>([0, 30000]);
  const [responsesFilter, setResponsesFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 840);

  // Загружаем профиль пользователя
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 840);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    authApi.logout();
    message.success('Вы вышли из системы');
    navigate('/');
    window.location.reload();
  };

  // Загружаем заказы
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders-feed'],
    queryFn: () => ordersApi.getMyOrders(),
  });

  // Загружаем справочники
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  const { data: workTypes = [] } = useQuery({
    queryKey: ['workTypes'],
    queryFn: () => catalogApi.getWorkTypes(),
  });

  // Используем реальные данные с API
  const orders = ordersData?.results || ordersData || [];

  // Фильтрация заказов
  const filteredOrders = orders.filter((order: any) => {
    const matchesSearch = !searchText || 
      order.title?.toLowerCase().includes(searchText.toLowerCase()) ||
      order.description?.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesSubject = !selectedSubject || order.subject_id === selectedSubject;
    const matchesWorkType = !selectedWorkType || order.work_type_id === selectedWorkType;
    
    const matchesBudget = order.budget >= budgetRange[0] && order.budget <= budgetRange[1];
    
    const matchesResponses = 
      responsesFilter === 'all' ||
      (responsesFilter === 'none' && order.responses_count === 0) ||
      (responsesFilter === 'few' && order.responses_count > 0 && order.responses_count <= 5) ||
      (responsesFilter === 'many' && order.responses_count > 5);

    return matchesSearch && matchesSubject && matchesWorkType && matchesBudget && matchesResponses;
  });

  const getStatusColor = (status: string) => ORDER_STATUS_COLORS[status] || 'default';
  const getStatusText = (status: string) => ORDER_STATUS_TEXTS[status] || status;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar
        selectedKey="orders-feed"
        onMenuSelect={(key) => {}}
        userProfile={userProfile}
        unreadMessages={0}
        unreadNotifications={0}
        onLogout={handleLogout}
        mobileDrawerOpen={mobileMenuVisible}
        onMobileDrawerChange={setMobileMenuVisible}
      />
      
      <Layout style={{ 
        marginLeft: isMobile ? 0 : 250,
        padding: isMobile ? 0 : '24px',
        background: '#f5f5f5'
      }}>
        {/* Хедер для мобильных */}
        {isMobile && (
          <Header
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1000,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              height: 64,
            }}
          >
            <MobileMenuButton onClick={() => setMobileMenuVisible(true)} />
            <Title level={4} style={{ margin: 0, color: '#1f2937'}}>
              Биржа
            </Title>
            <div style={{ width: 44 }} />
          </Header>
        )}

        <Content style={{ 
          padding: isMobile ? '80px 16px 24px' : '0',
          background: 'transparent',
          minHeight: isMobile ? '100vh' : 'calc(100vh - 48px)'
        }}>
            {/* Заголовок и кнопка создания */}
            {!isMobile && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: 24,
                flexWrap: 'wrap',
                gap: 16
              }}>
                <div>
                  <Title level={2} style={{ margin: 0, marginBottom: 8 }}>
                    Лента работ
                  </Title>
                  <Text type="secondary">
                    Найдите подходящий заказ или создайте свой
                  </Text>
                </div>
                <Button 
                  type="primary" 
                  size="large"
                  onClick={() => navigate('/create-order')}
                  style={{
                    background: '#1E90FF',
                    border: 'none',
                    borderRadius: 12,
                    height: 48,
                    padding: '0 32px',
                    fontSize: 16,
                    fontWeight: 500,
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  Создать заказ
                </Button>
              </div>
            )}

      {/* Фильтры */}
      <Card 
        style={{ 
          marginBottom: 24,
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={24} md={12} lg={8}>
            <Input
              size="large"
              placeholder="Поиск по названию или описанию..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={8}>
            <Select
              size="large"
              placeholder="Предмет"
              style={{ width: '100%' }}
              value={selectedSubject}
              onChange={setSelectedSubject}
              allowClear
              suffixIcon={<FilterOutlined />}
            >
              <Select.Option value={1}>Математика</Select.Option>
              <Select.Option value={2}>Физика</Select.Option>
              <Select.Option value={3}>Информатика</Select.Option>
              <Select.Option value={4}>Химия</Select.Option>
              <Select.Option value={5}>История</Select.Option>
              <Select.Option value={6}>Английский язык</Select.Option>
              <Select.Option value={7}>Философия</Select.Option>
              <Select.Option value={8}>Маркетинг</Select.Option>
              <Select.Option value={9}>Экономика</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6} lg={8}>
            <Select
              size="large"
              placeholder="Тип работы"
              style={{ width: '100%' }}
              value={selectedWorkType}
              onChange={setSelectedWorkType}
              allowClear
              suffixIcon={<FilterOutlined />}
            >
              <Select.Option value={1}>Реферат</Select.Option>
              <Select.Option value={2}>Курсовая работа</Select.Option>
              <Select.Option value={3}>Лабораторная работа</Select.Option>
              <Select.Option value={4}>Контрольная работа</Select.Option>
              <Select.Option value={5}>Дипломная работа</Select.Option>
              <Select.Option value={6}>Решение задач</Select.Option>
              <Select.Option value={7}>Эссе</Select.Option>
              <Select.Option value={8}>Презентация</Select.Option>
              <Select.Option value={9}>Отчет</Select.Option>
            </Select>
          </Col>
        </Row>

        {/* Дополнительные фильтры */}
        <div style={{ marginTop: 16 }}>
          <Button 
            type="link" 
            onClick={() => setShowFilters(!showFilters)}
            style={{ padding: 0, marginBottom: showFilters ? 16 : 0 }}
          >
            {showFilters ? '▼ Скрыть фильтры' : '▶ Показать больше фильтров'}
          </Button>
        </div>

        {showFilters && (
          <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
            <Col xs={24} sm={12} md={8}>
              <div style={{ marginBottom: 8 }}>
                <Text strong>Бюджет</Text>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text style={{ whiteSpace: 'nowrap' }}>От</Text>
                  <InputNumber
                    size="large"
                    min={0}
                    max={budgetRange[1]}
                    value={budgetRange[0]}
                    onChange={(value) => setBudgetRange([value || 0, budgetRange[1]])}
                    placeholder="0"
                    controls={false}
                    style={{ width: 120 }}
                    formatter={(value) => `${value} ₽`}
                    parser={(value) => value?.replace(' ₽', '') as any}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text style={{ whiteSpace: 'nowrap' }}>До</Text>
                  <InputNumber
                    size="large"
                    min={budgetRange[0]}
                    max={100000}
                    value={budgetRange[1]}
                    onChange={(value) => setBudgetRange([budgetRange[0], value || 30000])}
                    placeholder="30000"
                    controls={false}
                    style={{ width: 120 }}
                    formatter={(value) => `${value} ₽`}
                    parser={(value) => value?.replace(' ₽', '') as any}
                  />
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div style={{ marginBottom: 8 }}>
                <Text strong>Количество откликов</Text>
              </div>
              <Select
                size="large"
                placeholder="Все заказы"
                style={{ width: '100%' }}
                value={responsesFilter}
                onChange={setResponsesFilter}
              >
                <Select.Option value="all">Все заказы</Select.Option>
                <Select.Option value="none">Без откликов</Select.Option>
                <Select.Option value="few">1-5 откликов</Select.Option>
                <Select.Option value="many">Более 5 откликов</Select.Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div style={{ marginBottom: 8 }}>
                <Text strong>Найдено заказов</Text>
              </div>
              <div style={{ 
                fontSize: 24, 
                fontWeight: 600, 
                color: '#667eea',
                lineHeight: '40px'
              }}>
                {filteredOrders.length}
              </div>
            </Col>
          </Row>
        )}
      </Card>

      {/* Список заказов */}
      {ordersLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Empty
          description={
            <div>
              <Text style={{ fontSize: 16, color: '#999' }}>
                {searchText || selectedSubject || selectedWorkType 
                  ? 'Заказы не найдены. Попробуйте изменить фильтры.'
                  : 'Пока нет доступных заказов'}
              </Text>
            </div>
          }
          style={{ padding: '60px 0' }}
        >
          <Button 
            type="primary" 
            size="large"
            onClick={() => navigate('/create-order')}
          >
            Создать первый заказ
          </Button>
        </Empty>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filteredOrders.map((order: any) => (
            <Card
              key={order.id}
              hoverable
              style={{
                borderRadius: 16,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'all 0.3s ease',
              }}
              styles={{ body: { padding: 24 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <Title level={4} style={{ margin: 0, marginBottom: 12, fontSize: 20, fontWeight: 700 }}>
                    {order.title}
                  </Title>
                  <Space size={8} wrap>
                    <Tag color={getStatusColor(order.status)}>
                      {getStatusText(order.status)}
                    </Tag>
                    {(order.subject?.name || order.subject_name) && (
                      <Tag color="blue">{order.subject?.name || order.subject_name}</Tag>
                    )}
                    {(order.work_type?.name || order.work_type_name) && (
                      <Tag>{order.work_type?.name || order.work_type_name}</Tag>
                    )}
                    {order.topic?.name && (
                      <Tag color="purple">Тема: {order.topic.name}</Tag>
                    )}
                  </Space>
                </div>
                <div style={{ textAlign: 'right', marginLeft: 16 }}>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#667eea' }}>
                    {order.budget ? `${order.budget} ₽` : 'Договорная'}
                  </div>
                </div>
              </div>

              <Paragraph 
                ellipsis={{ rows: 2 }}
                style={{ color: '#666', marginBottom: 16 }}
              >
                {order.description}
              </Paragraph>

              {/* Прикрепленные файлы */}
              {order.files && order.files.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                    Прикрепленные файлы:
                  </Text>
                  <Space size={8} wrap>
                    {order.files.map((file: any) => (
                      <Tag key={file.id} icon={<SearchOutlined />}>
                        {file.filename}
                      </Tag>
                    ))}
                  </Space>
                </div>
              )}

              <Space size={16} wrap style={{ marginBottom: 16 }}>
                <Space size={4}>
                  <ClockCircleOutlined style={{ color: '#999' }} />
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    {order.deadline ? dayjs(order.deadline).fromNow() : 'Не указан'}
                  </Text>
                </Space>
                {order.created_at && (
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    Создан {dayjs(order.created_at).fromNow()}
                  </Text>
                )}
                <Space size={4}>
                  <UserOutlined style={{ color: '#999' }} />
                  <Text 
                    style={{ 
                      fontSize: 14, 
                      fontWeight: 600,
                      color: (order.bids?.length || order.responses_count || 0) === 0 ? '#999' : 
                             (order.bids?.length || order.responses_count || 0) > 5 ? '#ff4d4f' : '#52c41a'
                    }}
                  >
                    {order.bids?.length || order.responses_count || 0}
                  </Text>
                </Space>
              </Space>

              <Divider style={{ margin: '16px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <Space size={10}>
                  <Avatar 
                    size={24}
                    src={order.client?.avatar || order.client_avatar || userProfile?.avatar}
                    icon={<UserOutlined />}
                    style={{ backgroundColor: '#667eea' }}
                  />
                  <div>
                    <Text strong style={{ display: 'block', fontSize: 14 }}>
                      {order.client?.username || order.client_name || 
                       (order.client?.first_name && order.client?.last_name 
                         ? `${order.client.first_name} ${order.client.last_name}` 
                         : userProfile?.username || 'Заказчик')}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Заказов: {order.client_orders_count || 1}
                    </Text>
                  </div>
                </Space>
                <Button 
                  type="primary"
                  onClick={() => navigate(`/expert`)}
                  style={{
                    background: '#52c41a',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 500
                  }}
                >
                  Откликнуться
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

            {/* Кнопка создания для мобильных */}
            {isMobile && (
              <Button 
                type="primary" 
                size="large"
                block
                onClick={() => navigate('/create-order')}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: 12,
                  height: 48,
                  fontSize: 16,
                  fontWeight: 500,
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  marginBottom: 16
                }}
              >
                Создать заказ
              </Button>
            )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default OrdersFeed;
