import React, { useState } from 'react';
import { Card, Typography, Tag, Button, Space, Empty, Spin, Input, Select, Row, Col, InputNumber, Layout, message, Avatar, Divider, Popconfirm, Tooltip } from 'antd';
import { ClockCircleOutlined, SearchOutlined, FilterOutlined, UserOutlined, DeleteOutlined, FileOutlined, FilePdfOutlined, FileWordOutlined, FileImageOutlined, FileZipOutlined, DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api/orders';
import { catalogApi } from '../../api/catalog';
import { authApi } from '../../api/auth';
import Sidebar, { MobileMenuButton } from '../../components/layout/Sidebar';
import { ORDER_STATUS_COLORS, ORDER_STATUS_TEXTS } from '../../config/orderStatuses';
import { SUBJECTS } from '../../config/subjects';
import { WORK_TYPES } from '../../config/workTypes';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';

// Импорт модальных окон
import ProfileModal from '../ExpertDashboard/modals/ProfileModal';
import ApplicationModal from '../ExpertDashboard/modals/ApplicationModal';
import WelcomeModal from '../ExpertDashboard/modals/WelcomeModal';
import SpecializationModal from '../ExpertDashboard/modals/SpecializationModal';
import MessageModal from '../ExpertDashboard/modals/MessageModalNew';
import NotificationsModal from '../ExpertDashboard/modals/NotificationsModalNew';
import ArbitrationModal from '../ExpertDashboard/modals/ArbitrationModal';
import FinanceModal from '../ExpertDashboard/modals/FinanceModal';
import FriendsModal from '../ExpertDashboard/modals/FriendsModal';
import FaqModal from '../ExpertDashboard/modals/FaqModal';
import FriendProfileModal from '../ExpertDashboard/modals/FriendProfileModal';
import { mockNotifications, mockArbitrationCases } from '../ExpertDashboard/mockData';

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

  // State для модальных окон
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [applicationModalVisible, setApplicationModalVisible] = useState(false);
  const [welcomeModalVisible, setWelcomeModalVisible] = useState(false);
  const [specializationModalVisible, setSpecializationModalVisible] = useState(false);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [arbitrationModalVisible, setArbitrationModalVisible] = useState(false);
  const [financeModalVisible, setFinanceModalVisible] = useState(false);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [friendProfileModalVisible, setFriendProfileModalVisible] = useState(false);

  // Дополнительный state
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [editingSpecialization, setEditingSpecialization] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);

  // Загружаем профиль пользователя
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  const { data: fetchedSubjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  // Обновляем subjects при загрузке
  React.useEffect(() => {
    if (fetchedSubjects.length > 0) {
      setSubjects(fetchedSubjects);
    }
  }, [fetchedSubjects]);

  const handleMenuSelect = (key: string) => {
    if (key === 'orders') return;
    if (key === 'shop-ready-works') navigate('/shop/ready-works');
    if (key === 'shop-add-work') navigate('/shop/add-work');
    if (key === 'shop-my-works' || key === 'works') navigate('/works');
    if (key === 'shop-purchased') navigate('/shop/purchased');
    if (key === 'profile') navigate('/expert');
  };

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

  // Получаем информацию о текущем пользователе
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || window.location.origin}/api/users/me/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      return response.json();
    }
  });

  // Загружаем заказы (все доступные заказы для всех пользователей)
  const { data: ordersData, isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['orders-feed'],
    queryFn: async () => {
      console.log('🔄 Загрузка заказов из API...');
      console.log('👤 Текущий пользователь:', userProfile);
      console.log('🎭 Роль пользователя:', userProfile?.role);
      const data = await ordersApi.getAvailableOrders();
      console.log('📦 Получены заказы:', data);
      console.log('📊 Количество заказов:', data?.results?.length || data?.length || 0);
      if ((data?.results?.length || data?.length || 0) === 0) {
        console.warn('⚠️ Заказов нет! Возможные причины:');
        if (userProfile?.role === 'client') {
          console.warn('   ❗ Вы вошли как КЛИЕНТ - клиенты не видят свои заказы в ленте');
          console.warn('   💡 РЕШЕНИЕ: Перейдите на главный дашборд → https://okoznaniy.ru/expert');
          console.warn('   📋 Там вы увидите все свои созданные заказы во вкладке "Заказы"');
        } else {
          console.warn('   1. Все заказы уже взяты в работу');
          console.warn('   2. Нет заказов в статусе "new"');
          console.warn('   3. Нет заказов от других клиентов');
        }
      }
      return data;
    },
  });

  // Загружаем справочники
  const { data: workTypes = [] } = useQuery({
    queryKey: ['workTypes'],
    queryFn: () => catalogApi.getWorkTypes(),
  });

  // Используем реальные данные с API
  const orders = ordersData?.results || ordersData || [];
  
  // Логируем для отладки
  React.useEffect(() => {
    console.log('🎯 OrdersFeed mounted');
    console.log('📋 ordersData:', ordersData);
    console.log('📋 orders:', orders);
    console.log('⏳ ordersLoading:', ordersLoading);
    console.log('❌ ordersError:', ordersError);
  }, [ordersData, orders, ordersLoading, ordersError]);

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

  // Проверка, является ли пользователь владельцем заказа
  const isOrderOwner = (order: any) => {
    return order.client?.id === userProfile?.id || 
           order.client_id === userProfile?.id;
  };

  // Удаление заказа
  const handleDeleteOrder = async (orderId: number) => {
    try {
      await ordersApi.deleteOrder(orderId);
      message.success('Заказ успешно удален');
      // Обновить список заказов
      window.location.reload();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || 'Ошибка при удалении заказа';
      message.error(errorMessage);
    }
  };

  return (
    <>
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar
        selectedKey="orders"
        onMenuSelect={handleMenuSelect}
        onLogout={handleLogout}
        onProfileClick={() => setProfileModalVisible(true)}
        onSupportClick={() => setApplicationModalVisible(true)}
        onWelcomeClick={() => setWelcomeModalVisible(true)}
        onSpecializationClick={() => setSpecializationModalVisible(true)}
        onMessagesClick={() => setMessageModalVisible(true)}
        onNotificationsClick={() => setNotificationsModalVisible(true)}
        onArbitrationClick={() => setArbitrationModalVisible(true)}
        onFinanceClick={() => setFinanceModalVisible(true)}
        onFriendsClick={() => setFriendsModalVisible(true)}
        onFaqClick={() => setFaqModalVisible(true)}
        mobileDrawerOpen={mobileMenuVisible}
        onMobileDrawerChange={setMobileMenuVisible}
        userProfile={userProfile ? {
          username: userProfile.username,
          avatar: userProfile.avatar,
          role: userProfile.role
        } : undefined}
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
          padding: isMobile ? '96px 16px 24px' : '0',
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
              {SUBJECTS.map((subject) => (
                <Select.Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Select.Option>
              ))}
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
              {WORK_TYPES.map((workType) => (
                <Select.Option key={workType.id} value={workType.id}>
                  {workType.name}
                </Select.Option>
              ))}
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
            {showFilters ? 'Скрыть фильтры' : 'Показать больше фильтров'}
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

      {/* Информационное сообщение для клиентов */}
      {userProfile?.role === 'client' && filteredOrders.length === 0 && !ordersLoading && (
        <Card 
          style={{ 
            marginBottom: 24,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            color: 'white'
          }}
        >
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Title level={4} style={{ color: 'white', marginBottom: 16 }}>
              💡 Подсказка: Где найти свои заказы?
            </Title>
            <Paragraph style={{ color: 'white', fontSize: 16, marginBottom: 20 }}>
              Эта страница показывает заказы <strong>других клиентов</strong> для экспертов.<br />
              Ваши созданные заказы находятся в <strong>главном дашборде</strong>.
            </Paragraph>
            <Space size={12}>
              <Button 
                type="default"
                size="large"
                onClick={() => navigate('/expert')}
                style={{
                  background: 'white',
                  color: '#667eea',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  height: 48,
                  padding: '0 32px'
                }}
              >
                Перейти в дашборд
              </Button>
              <Button 
                size="large"
                onClick={() => navigate('/create-order')}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '2px solid white',
                  borderRadius: 8,
                  fontWeight: 600,
                  height: 48,
                  padding: '0 32px'
                }}
              >
                Создать заказ
              </Button>
            </Space>
          </div>
        </Card>
      )}

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
                  : userProfile?.role === 'client' 
                    ? 'В ленте пока нет заказов от других клиентов'
                    : 'Пока нет доступных заказов'}
              </Text>
            </div>
          }
          style={{ padding: '60px 0' }}
        >
          {userProfile?.role !== 'client' && (
            <Button 
              type="primary" 
              size="large"
              onClick={() => navigate('/create-order')}
            >
              Создать первый заказ
            </Button>
          )}
        </Empty>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filteredOrders.map((order: any) => {
            // Логируем данные заказа для отладки
            if (order.files) {
              console.log(`Заказ #${order.id} имеет ${order.files.length} файлов:`, order.files);
            }
            
            return (
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
                    <Tag 
                      style={{ 
                        borderRadius: 16, 
                        padding: '4px 12px',
                        border: 'none',
                        fontWeight: 600,
                        color: '#fff',
                        textTransform: 'uppercase',
                        background: '#52c41a' // Всегда зеленый для новых заказов
                      }}
                    >
                      {getStatusText(order.status) || 'NEW'}
                    </Tag>
                    {(order.custom_subject || order.subject?.name || order.subject_name) && (
                      <Tag style={{ 
                        borderRadius: 16, 
                        padding: '4px 12px',
                        border: 'none',
                        fontWeight: 600,
                        color: '#fff',
                        background: '#1890ff'
                      }}>
                        {order.custom_subject || order.subject?.name || order.subject_name}
                      </Tag>
                    )}
                    {(order.custom_work_type || order.work_type?.name || order.work_type_name) && (
                      <Tag style={{ 
                        borderRadius: 16, 
                        padding: '4px 12px',
                        border: 'none',
                        fontWeight: 600,
                        color: '#fff',
                        background: '#722ed1'
                      }}>
                        {order.custom_work_type || order.work_type?.name || order.work_type_name}
                      </Tag>
                    )}
                    {order.topic?.name && (
                      <Tag style={{ 
                        borderRadius: 16, 
                        padding: '4px 12px',
                        border: 'none',
                        fontWeight: 600,
                        color: '#fff',
                        background: '#eb2f96'
                      }}>
                        Тема: {order.topic.name}
                      </Tag>
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
                    Прикрепленные файлы ({order.files.length}):
                  </Text>
                  <Space size={8} wrap>
                    {order.files.map((file: any) => {
                      // Определяем иконку по расширению файла
                      const getFileIcon = (filename: string) => {
                        const ext = filename.split('.').pop()?.toLowerCase();
                        if (ext === 'pdf') return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
                        if (['doc', 'docx'].includes(ext || '')) return <FileWordOutlined style={{ color: '#1890ff' }} />;
                        if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext || '')) return <FileImageOutlined style={{ color: '#52c41a' }} />;
                        if (['zip', 'rar', '7z'].includes(ext || '')) return <FileZipOutlined style={{ color: '#fa8c16' }} />;
                        return <FileOutlined style={{ color: '#666' }} />;
                      };

                      return (
                        <Tooltip key={file.id} title={`Скачать ${file.filename} (${file.file_size || 'размер неизвестен'})`}>
                          <Tag 
                            icon={getFileIcon(file.filename)}
                            style={{ 
                              cursor: 'pointer',
                              padding: '4px 12px',
                              fontSize: 13
                            }}
                            onClick={() => {
                              if (file.file_url || file.file) {
                                window.open(file.file_url || file.file, '_blank');
                              } else {
                                message.warning('Файл недоступен для скачивания');
                              }
                            }}
                          >
                            {file.filename} <DownloadOutlined style={{ marginLeft: 4 }} />
                          </Tag>
                        </Tooltip>
                      );
                    })}
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
                <Space size={8}>
                  {isOrderOwner(order) ? (
                    <Button 
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        if (window.confirm('Вы уверены, что хотите удалить этот заказ?')) {
                          handleDeleteOrder(order.id);
                        }
                      }}
                      style={{
                        borderRadius: 8,
                        fontWeight: 500
                      }}
                    >
                      Удалить
                    </Button>
                  ) : (
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
                  )}
                </Space>
              </div>
            </Card>
          );
          })}
        </div>
      )}


        </Content>
      </Layout>
    </Layout>
      <ProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        profile={userProfile}
        userProfile={userProfile}
      />
      
      <ApplicationModal
        visible={applicationModalVisible}
        onClose={() => setApplicationModalVisible(false)}
      />
      
      <WelcomeModal
        visible={welcomeModalVisible}
        onClose={() => setWelcomeModalVisible(false)}
        userProfile={userProfile}
      />
      
      <SpecializationModal
        visible={specializationModalVisible}
        onClose={() => setSpecializationModalVisible(false)}
        editingSpecialization={editingSpecialization}
        subjects={subjects}
      />
      
      <MessageModal
        visible={messageModalVisible}
        onClose={() => setMessageModalVisible(false)}
        isMobile={isMobile}
        isTablet={window.innerWidth > 840 && window.innerWidth <= 1024}
        isDesktop={window.innerWidth > 1024}
        onCreateOrder={() => {
          // Логика создания заказа
        }}
      />
      
      <NotificationsModal
        visible={notificationsModalVisible}
        onClose={() => setNotificationsModalVisible(false)}
        notifications={mockNotifications}
        isMobile={isMobile}
      />
      
      <ArbitrationModal
        visible={arbitrationModalVisible}
        onClose={() => setArbitrationModalVisible(false)}
        cases={mockArbitrationCases}
        isMobile={isMobile}
      />
      
      <FinanceModal
        visible={financeModalVisible}
        onClose={() => setFinanceModalVisible(false)}
        profile={userProfile}
        isMobile={isMobile}
      />
      
      <FriendsModal
        visible={friendsModalVisible}
        onClose={() => setFriendsModalVisible(false)}
        onOpenChat={(chat) => {
          setSelectedChat(chat);
          setMessageModalVisible(true);
          setFriendsModalVisible(false);
        }}
        onOpenProfile={(friend) => {
          setSelectedFriend(friend);
          setFriendProfileModalVisible(true);
          setFriendsModalVisible(false);
        }}
        isMobile={isMobile}
      />
      
      <FaqModal
        visible={faqModalVisible}
        onClose={() => setFaqModalVisible(false)}
        isMobile={isMobile}
      />
      
      <FriendProfileModal
        visible={friendProfileModalVisible}
        onClose={() => setFriendProfileModalVisible(false)}
        friend={selectedFriend}
        onOpenChat={() => {
          setFriendProfileModalVisible(false);
          setMessageModalVisible(true);
        }}
        isMobile={isMobile}
      />
    </>
  );
};

export default OrdersFeed;
