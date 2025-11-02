import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Typography, Tag, message, Upload, Space, InputNumber, Input, Spin, Modal, Form, InputNumber as AntInputNumber, Row, Col, Avatar, Badge, Tabs, Select, Rate, Menu, Collapse, DatePicker } from 'antd';
import { UploadOutlined, UserOutlined, PlusOutlined, DeleteOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, LogoutOutlined, EditOutlined, ArrowLeftOutlined, MessageOutlined, TrophyOutlined, LikeOutlined, DislikeOutlined, ShoppingOutlined, FileDoneOutlined, SettingOutlined, BellOutlined, CalendarOutlined, WalletOutlined, ShopOutlined, TeamOutlined, HeartOutlined, GiftOutlined, DollarOutlined, PoweroffOutlined, SearchOutlined, StarOutlined, StarFilled, MobileOutlined, SendOutlined, SmileOutlined, PaperClipOutlined, QuestionCircleOutlined, DownOutlined, FileTextOutlined, CommentOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
const { RangePicker } = DatePicker;
import { ordersApi, type Order, type OrderComment } from '../api/orders';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { expertsApi, type ExpertApplication, type Education, type Specialization } from '../api/experts';
import { catalogApi } from '../api/catalog';
import styles from './ExpertDashboard.module.css';

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

const { Title, Text, Paragraph } = Typography;

const ExpertDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [bidLoading, setBidLoading] = useState<Record<number, boolean>>({});
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [applicationModalVisible, setApplicationModalVisible] = useState(false);
  const [welcomeModalVisible, setWelcomeModalVisible] = useState(false);
  const [specializationModalVisible, setSpecializationModalVisible] = useState(false);
  const [editingSpecialization, setEditingSpecialization] = useState<Specialization | null>(null);
  const [activeTab, setActiveTab] = useState<string>('about');
  const [selectedMenuKey, setSelectedMenuKey] = useState<string>('orders');
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [messageTab, setMessageTab] = useState<string>('all');
  const [messageText, setMessageText] = useState<string>('');
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [financeModalVisible, setFinanceModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [notificationTab, setNotificationTab] = useState<string>('all');
  const [arbitrationModalVisible, setArbitrationModalVisible] = useState(false);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [form] = Form.useForm();
  const [applicationForm] = Form.useForm();
  const [specializationForm] = Form.useForm();

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

  // Загружаем анкету эксперта
  const { data: application, isLoading: applicationLoading } = useQuery({
    queryKey: ['expert-application'],
    queryFn: async () => {
      try {
        const app = await expertsApi.getMyApplication();
        return app;
      } catch {
        // Анкета не найдена - это нормально, значит её ещё нет
        return null;
      }
    },
    retry: false
  });

  // Загружаем специализации
  const { data: specializations = [], isLoading: specializationsLoading } = useQuery({
    queryKey: ['expert-specializations'],
    queryFn: () => expertsApi.getSpecializations(),
  });

  // Загружаем статистику эксперта
  const { data: expertStats } = useQuery({
    queryKey: ['expert-statistics', userProfile?.id],
    queryFn: () => expertsApi.getExpertStatistics(userProfile!.id),
    enabled: !!userProfile?.id,
  });

  // Загружаем предметы для выбора специализаций
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  React.useEffect(() => {
    if (userProfile) {
      setProfile(userProfile);
    }
  }, [userProfile]);

  // Автоматически открываем форму анкеты, если её нет и пользователь только что зарегистрировался
  React.useEffect(() => {
    if (!applicationLoading && !application && userProfile?.role === 'expert') {
      // Проверяем, был ли эксперт только что зарегистрирован
      const isNewExpert = localStorage.getItem('expert_just_registered');
      if (isNewExpert === 'true') {
        setApplicationModalVisible(true);
        localStorage.removeItem('expert_just_registered');
      }
    }
  }, [application, applicationLoading, userProfile]);

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

  const createApplicationMutation = useMutation({
    mutationFn: (data: any) => expertsApi.createApplication(data),
    onSuccess: () => {
      message.success('Анкета успешно создана');
      setApplicationModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['expert-application'] });
      // Показываем модальное окно приветствия
      setWelcomeModalVisible(true);
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Не удалось создать анкету');
    },
  });

  const createSpecializationMutation = useMutation({
    mutationFn: (data: any) => expertsApi.createSpecialization(data),
    onSuccess: () => {
      message.success('Специализация добавлена');
      setSpecializationModalVisible(false);
      specializationForm.resetFields();
      setEditingSpecialization(null);
      queryClient.invalidateQueries({ queryKey: ['expert-specializations'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Не удалось добавить специализацию');
    },
  });

  const updateSpecializationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => expertsApi.updateSpecialization(id, data),
    onSuccess: () => {
      message.success('Специализация обновлена');
      setSpecializationModalVisible(false);
      specializationForm.resetFields();
      setEditingSpecialization(null);
      queryClient.invalidateQueries({ queryKey: ['expert-specializations'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Не удалось обновить специализацию');
    },
  });

  const deleteSpecializationMutation = useMutation({
    mutationFn: (id: number) => expertsApi.deleteSpecialization(id),
    onSuccess: () => {
      message.success('Специализация удалена');
      queryClient.invalidateQueries({ queryKey: ['expert-specializations'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Не удалось удалить специализацию');
    },
  });

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      default: return 'default';
    }
  };

  const getApplicationStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <ClockCircleOutlined />;
      case 'approved': return <CheckCircleOutlined />;
      case 'rejected': return <CloseCircleOutlined />;
      default: return null;
    }
  };

  if (isLoading) return <Text>Загрузка...</Text>;
  if (isError) return <Text type="danger">Ошибка загрузки заказов</Text>;

  const orders: Order[] = data || [];

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        {/* Sidebar */}
        <div className={`${styles.sidebar} ${styles.collapsed}`}>
          {/* User Profile Section */}
          <div className={styles.sidebarProfile}>
            <div 
              style={{ 
                position: 'relative', 
                display: 'inline-block',
                cursor: 'pointer'
              }}
              onClick={() => setProfileModalVisible(true)}
            >
              <Badge 
                count={<CheckCircleOutlined style={{ color: '#10b981', fontSize: 12 }} />} 
                offset={[-2, 2]}
              >
                <Badge 
                  count={<span style={{ 
                    background: '#f97316', 
                    color: 'white', 
                    fontSize: 10, 
                    padding: '2px 6px', 
                    borderRadius: 10,
                    fontWeight: 600
                  }}>pro</span>} 
                  offset={[10, -5]}
                >
                  <Avatar
                    size={56}
                    src={profile?.avatar ? `http://localhost:8000${profile.avatar}` : undefined}
                    icon={!profile?.avatar && <UserOutlined />}
                    style={{ 
                      backgroundColor: profile?.avatar ? 'transparent' : '#667eea',
                      border: '2px solid #fff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                </Badge>
              </Badge>
            </div>
            <div 
              style={{ 
                flex: 1, 
                marginLeft: 12,
                cursor: 'pointer'
              }}
              onClick={() => setProfileModalVisible(true)}
            >
              <Text strong style={{ fontSize: 15, color: '#1f2937', display: 'block' }}>
                {profile?.username || profile?.email || 'Эксперт'}
              </Text>
            </div>
            <Button
              type="text"
              icon={<SettingOutlined />}
              size="small"
              style={{ color: '#6b7280' }}
              onClick={() => setProfileModalVisible(true)}
            />
          </div>

          {/* Navigation Menu */}
            <Menu
              mode="inline"
              selectedKeys={[selectedMenuKey]}
              openKeys={openKeys}
              onOpenChange={setOpenKeys}
              triggerSubMenuAction="hover"
              onSelect={({ key }) => {
                if (key === 'messages') {
                  setMessageModalVisible(true);
                  return;
                }
                if (key === 'faq') {
                  setFaqModalVisible(true);
                  return;
                }
                if (key === 'friends') {
                  setFriendsModalVisible(true);
                  return;
                }
                if (key === 'notifications') {
                  setNotificationsModalVisible(true);
                  return;
                }
                if (key === 'arbitration') {
                  setArbitrationModalVisible(true);
                  return;
                }
                // Обработка подпунктов "На счету"
                if (key === 'balance' || key.startsWith('balance-')) {
                  setFinanceModalVisible(true);
                  return;
                }
                // Обработка подпунктов "Мои заказы"
                if (key.startsWith('orders-')) {
                  setSelectedMenuKey('orders');
                  setActiveTab('orders');
                  setTimeout(() => {
                    if (tabsRef.current) {
                      tabsRef.current.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                      });
                    }
                  }, 100);
                  return;
                }
                // Обработка "Мои работы"
                if (key === 'works') {
                  navigate('/works');
                  return;
                }
                // Обработка подпунктов "Авторский магазин"
                if (key === 'shop-ready-works') {
                  navigate('/shop/ready-works');
                  return;
                }
                if (key === 'shop-add-work') {
                  navigate('/shop/add-work');
                  return;
                }
                if (key === 'shop-my-works') {
                  navigate('/works');
                  return;
                }
                if (key === 'shop-purchased') {
                  navigate('/shop/purchased');
                  return;
                }
                // Обработка клика на основное меню "Мои заказы" или "Мои работы"
                if (key === 'orders') {
                  setSelectedMenuKey(key);
                  setActiveTab(key);
                  setTimeout(() => {
                    if (tabsRef.current) {
                      tabsRef.current.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                      });
                    }
                  }, 100);
                  return;
                }
                if (key === 'works') {
                  navigate('/works');
                  return;
                }
                setSelectedMenuKey(key);
              }}
              className={styles.sidebarMenu}
            >
              <Menu.Item key="messages" icon={<MessageOutlined />}>
                Сообщения
              </Menu.Item>
            <Menu.Item key="notifications" icon={<BellOutlined />}>
              У вас нет уведомлений
            </Menu.Item>
            <Menu.Item key="arbitration" icon={<TrophyOutlined />}>
              Арбитраж
            </Menu.Item>
            <Menu.Item key="balance" icon={<WalletOutlined />}>
              Счет: 0.00 ₽
            </Menu.Item>
            <Menu.SubMenu key="orders" icon={<ShoppingOutlined />} title="Мои заказы">
              <Menu.Item key="orders-all">Все (0)</Menu.Item>
              <Menu.Item key="orders-open">Открыт ()</Menu.Item>
              <Menu.Item key="orders-confirming">На подтверждении ()</Menu.Item>
              <Menu.Item key="orders-progress">На выполнении ()</Menu.Item>
              <Menu.Item key="orders-payment">Ожидает оплаты ()</Menu.Item>
              <Menu.Item key="orders-review">На проверке ()</Menu.Item>
              <Menu.Item key="orders-completed">Выполнен ()</Menu.Item>
              <Menu.Item key="orders-revision">На доработке ()</Menu.Item>
              <Menu.Item key="orders-download">Ожидает скачивания ()</Menu.Item>
              <Menu.Item key="orders-closed">Закрыт ()</Menu.Item>
            </Menu.SubMenu>
            <Menu.Item key="works" icon={<FileDoneOutlined />}>
              Мои работы
            </Menu.Item>
            <Menu.SubMenu key="shop" icon={<ShopOutlined />} title="Авторский магазин">
              <Menu.Item key="shop-ready-works">
                Магазин готовых работ
              </Menu.Item>
              <Menu.Item key="shop-add-work">
                Добавить работу в магазин
              </Menu.Item>
              <Menu.Item key="shop-my-works">
                Мои работы
              </Menu.Item>
              <Menu.Item key="shop-purchased">
                Купленные работы
              </Menu.Item>
            </Menu.SubMenu>
            <Menu.Item key="friends" icon={<TeamOutlined />}>
              Мои друзья
            </Menu.Item>
            <Menu.Item key="favorites" icon={<HeartOutlined />}>
              Избранное
            </Menu.Item>
            <Menu.Item key="bonuses" icon={<GiftOutlined />}>
              Бонусы
            </Menu.Item>
            <Menu.Item key="paid-services" icon={<DollarOutlined />}>
              Платные услуги
            </Menu.Item>
            <Menu.Item key="faq" icon={<QuestionCircleOutlined />}>
              FAQ
            </Menu.Item>
            <Menu.Item 
              key="logout" 
              icon={<PoweroffOutlined />}
              danger
              onClick={() => {
                authApi.logout();
                navigate('/');
                window.location.reload();
              }}
              className={styles.logoutMenuItem}
            >
              Выход
            </Menu.Item>
          </Menu>
        </div>

        {/* Main Content */}
        <div className={styles.mainContent}>
          {/* Header and Profile Block Container */}
          <div className={styles.headerProfileContainer}>
          {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>Личный кабинет эксперта</h1>
          <Space>
            <Button 
              type="primary"
              className={styles.buttonPrimary}
              onClick={() => navigate('/create-order')}
            >
              Разместить задание
            </Button>
            <Button 
              icon={<EditOutlined />}
              className={styles.buttonSecondary}
              onClick={() => setProfileModalVisible(true)}
            >
              Редактировать профиль
            </Button>
            <Button 
              icon={<ArrowLeftOutlined />}
              className={styles.buttonSecondary}
              onClick={() => navigate(-1)}
            >
              Назад
            </Button>
          </Space>
        </div>

        {/* Profile Header Block */}
        <div className={styles.profileBlock}>
          <div className={styles.profileBlockContent}>
            <div className={styles.profileLeft}>
              <Badge 
                count={<TrophyOutlined style={{ color: '#f97316', fontSize: 16 }} />} 
                offset={[-5, 5]}
              >
                <Avatar
                  size={80}
                  src={profile?.avatar ? `http://localhost:8000${profile.avatar}` : undefined}
                  icon={!profile?.avatar && <UserOutlined />}
                  style={{ 
                    backgroundColor: profile?.avatar ? 'transparent' : '#667eea',
                    border: '3px solid #fff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                />
              </Badge>
              <div className={styles.profileInfo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <Title level={3} style={{ margin: 0, color: '#1f2937', fontSize: 20 }}>
                    {profile?.username || profile?.email || 'Эксперт'}
                  </Title>
                  <Button 
                    type="primary" 
                    size="small"
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      borderRadius: 8,
                      height: 28,
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '0 12px'
                    }}
                  >
                    Готов к работе
                  </Button>
                </div>
                <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 14, color: '#6b7280' }}>
                  Онлайн
                </Text>
                <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Text style={{ fontSize: 14, color: '#1f2937', marginBottom: 4 }}>Рейтинг исполнителя:</Text>
                      <Rate
                        disabled
                        value={typeof expertStats?.average_rating === 'number' ? expertStats.average_rating : 0}
                        allowHalf
                        style={{ fontSize: 16 }}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {typeof expertStats?.average_rating === 'number' ? expertStats.average_rating.toFixed(1) : '0.0'} / 5.0
                      </Text>
                    </Space>
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Text style={{ fontSize: 14, color: '#1f2937', marginBottom: 4 }}>Рейтинг заказчика:</Text>
                      <Rate
                        disabled
                        value={0}
                        allowHalf
                        style={{ fontSize: 16 }}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        0.0 / 5.0
                      </Text>
                    </Space>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.profileRight}>
              <div className={styles.profileStats}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 14, color: '#6b7280' }}>
                  На сайте: <span className={styles.statsNumber}>{userProfile?.date_joined ? Math.floor((Date.now() - new Date(userProfile.date_joined).getTime()) / (1000 * 60 * 60 * 24)) : 0}</span> дней
                </Text>
                <div>
                  <Space>
                    <TrophyOutlined style={{ color: '#667eea', fontSize: 16 }} />
                    <Text style={{ fontSize: 14, color: '#1f2937' }}>
                      Статистика работ:{' '}
                      <span className={styles.statsNumber}>{expertStats?.total_orders || 0}</span>
                      {' | '}
                      <span className={styles.statsNumberCompleted}>{expertStats?.completed_orders || 0}</span>
                      {' | '}
                      <span className={styles.statsNumberSuccess}>{expertStats?.success_rate ? Number(expertStats.success_rate).toFixed(0) : 0}</span>%
                      {' | '}
                      <span className={styles.statsNumberEarnings}>{expertStats?.total_earnings || 0}</span>₽
                    </Text>
                  </Space>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Application Status Display */}
        {applicationLoading ? (
          <div className={styles.card} style={{ textAlign: 'center', padding: '48px' }}>
            <Spin size="large" />
          </div>
        ) : application && typeof application === 'object' && 'status' in application ? (
          <div className={styles.applicationCard}>
            <div className={styles.applicationHeader}>
              <div>
                <h3 className={styles.applicationTitle}>Анкета</h3>
                <p className={styles.applicationSubtitle}>Статус рассмотрения</p>
              </div>
              <div 
                className={`${styles.statusBadge} ${
                  (application as ExpertApplication).status === 'pending' ? styles.statusPending :
                  (application as ExpertApplication).status === 'approved' ? styles.statusApproved :
                  styles.statusRejected
                }`}
              >
                {getApplicationStatusIcon((application as ExpertApplication).status)}
                <span>{(application as ExpertApplication).status_display}</span>
              </div>
            </div>
            {(application as ExpertApplication).status === 'rejected' && (application as ExpertApplication).rejection_reason && (
              <div style={{ marginTop: 16, padding: 12, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 12 }}>
                <Text type="danger" style={{ fontSize: 14 }}>
                  <strong>Причина отклонения:</strong> {(application as ExpertApplication).rejection_reason}
                </Text>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.emptyApplicationCard}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Text style={{ fontSize: 16, color: '#6b7280' }}>
                У вас ещё нет анкеты. Заполните анкету для работы на платформе.
              </Text>
              <Button 
                type="primary" 
                size="large"
                className={styles.buttonPrimary}
                onClick={() => setApplicationModalVisible(true)}
                style={{ marginTop: 8 }}
              >
                Заполнить анкету
              </Button>
            </Space>
          </div>
        )}

        {/* Navigation Tabs */}
        <div ref={tabsRef}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'about',
              label: `О себе`,
              children: (
                <div className={styles.sectionCard}>
                  <div className={styles.sectionCardHeader}>
                    <h2 className={styles.sectionTitle}>О себе</h2>
                  </div>
                  <Paragraph style={{ fontSize: 16, lineHeight: 1.8, color: '#4b5563' }}>
                    {profile?.bio || 'Расскажите о себе, своем опыте и специализации...'}
                  </Paragraph>
                  {profile?.education && (
                    <div style={{ marginTop: 24 }}>
                      <Title level={4} style={{ marginBottom: 12 }}>Образование</Title>
                      <Paragraph style={{ fontSize: 16, lineHeight: 1.8, color: '#4b5563' }}>
                        {profile.education}
                      </Paragraph>
                    </div>
                  )}
                  {profile?.skills && (
                    <div style={{ marginTop: 24 }}>
                      <Title level={4} style={{ marginBottom: 12 }}>Навыки</Title>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {profile.skills.split(',').map((skill: string, index: number) => (
                          <Tag key={index} color="blue" style={{ padding: '4px 12px', fontSize: 14 }}>
                            {skill.trim()}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'specializations',
              label: `Специализации ${specializations.length || 0}`,
              children: (
                <div className={styles.sectionCard}>
                  <div className={styles.sectionCardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className={styles.sectionTitle}>Мои специализации</h2>
                    <Button 
                      type="primary"
                      className={styles.buttonPrimary}
                      onClick={() => {
                        setEditingSpecialization(null);
                        specializationForm.resetFields();
                        setSpecializationModalVisible(true);
                      }}
                    >
                      Редактировать
                    </Button>
                  </div>
                  {specializationsLoading ? (
                    <div className={styles.emptyState}>
                      <Spin size="large" />
                    </div>
                  ) : specializations.length === 0 ? (
                    <div className={styles.emptyState}>
                      <Text>У вас пока нет специализаций. Добавьте первую специализацию, чтобы начать получать заказы.</Text>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 16 }}>
                      {specializations.map((spec) => (
                        <div key={spec.id} className={styles.orderCard}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
                                {spec.subject.name}
                                {spec.is_verified && (
                                  <CheckCircleOutlined style={{ color: '#10b981', marginLeft: 8 }} />
                                )}
                              </Title>
                              <Text type="secondary" style={{ fontSize: 14 }}>
                                Опыт: {spec.experience_years} лет | Ставка: {spec.hourly_rate} ₽/час
                              </Text>
                              {spec.description && (
                                <Paragraph style={{ marginTop: 8, color: '#6b7280' }}>
                                  {spec.description}
                                </Paragraph>
                              )}
                            </div>
                            <Space>
                              <Button
                                size="small"
                                onClick={() => {
                                  setEditingSpecialization(spec);
                                  specializationForm.setFieldsValue({
                                    subject_id: spec.subject.id,
                                    experience_years: spec.experience_years,
                                    hourly_rate: spec.hourly_rate,
                                    description: spec.description,
                                  });
                                  setSpecializationModalVisible(true);
                                }}
                              >
                                Изменить
                              </Button>
                              <Button
                                size="small"
                                danger
                                onClick={() => {
                                  if (window.confirm('Вы уверены, что хотите удалить эту специализацию?')) {
                                    deleteSpecializationMutation.mutate(spec.id);
                                  }
                                }}
                              >
                                Удалить
                              </Button>
                            </Space>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'reviews',
              label: `Отзывы 0`,
              children: (
                <div className={styles.sectionCard}>
                  <div className={styles.sectionCardHeader}>
                    <h2 className={styles.sectionTitle}>Отзывы</h2>
                  </div>
                  <div className={styles.emptyState}>
                    <Text>Отзывов пока нет</Text>
                  </div>
                </div>
              ),
            },
            {
              key: 'orders',
              label: `Заказы ${orders.length || 0}`,
              children: (
                <div>
                  {/* Search and Filters Section */}
                  <div style={{ 
                    background: '#ffffff',
                    borderRadius: 16,
                    padding: 24,
                    marginBottom: 24,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}>
                    <h3 style={{ 
                      fontSize: 20, 
                      fontWeight: 600, 
                      color: '#1f2937',
                      marginBottom: 24 
                    }}>
                      Поиск по работам
                    </h3>
                    
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12} lg={6}>
                        <Input 
                          placeholder="Текст поиска" 
                          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                          style={{ 
                            height: 48,
                            borderRadius: 8,
                            fontSize: 14
                          }}
                        />
                      </Col>
                      
                      <Col xs={24} sm={12} lg={6}>
                        <Select
                          placeholder="Тип работы"
                          suffixIcon={<DownOutlined style={{ color: '#9ca3af' }} />}
                          style={{ width: '100%' }}
                          size="large"
                          options={[
                            { value: 'all', label: 'Все типы' },
                            { value: 'essay', label: 'Реферат' },
                            { value: 'coursework', label: 'Курсовая' },
                            { value: 'diploma', label: 'Диплом' },
                            { value: 'test', label: 'Контрольная' },
                          ]}
                        />
                      </Col>
                      
                      <Col xs={24} sm={12} lg={6}>
                        <Select
                          placeholder="Выбрать предмет"
                          suffixIcon={<DownOutlined style={{ color: '#9ca3af' }} />}
                          style={{ width: '100%' }}
                          size="large"
                          options={[
                            { value: 'all', label: 'Все предметы' },
                            { value: 'math', label: 'Математика' },
                            { value: 'physics', label: 'Физика' },
                            { value: 'chemistry', label: 'Химия' },
                            { value: 'history', label: 'История' },
                          ]}
                        />
                      </Col>
                      
                      <Col xs={24} sm={12} lg={6}>
                        <Row gutter={[8, 8]}>
                          <Col span={12}>
                            <Input 
                              placeholder="Исполнитель" 
                              style={{ 
                                height: 48,
                                borderRadius: 8,
                                fontSize: 14
                              }}
                            />
                          </Col>
                          <Col span={12}>
                            <DatePicker
                              placeholder="Дата"
                              style={{ 
                                width: '100%',
                                height: 48,
                                borderRadius: 8,
                                fontSize: 14
                              }}
                              format="DD.MM.YYYY"
                            />
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                    
                    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                      <Col xs={24} sm={12} lg={6}>
                        <Select
                          placeholder="Все"
                          defaultValue="all"
                          suffixIcon={<DownOutlined style={{ color: '#9ca3af' }} />}
                          style={{ width: '100%' }}
                          size="large"
                          options={[
                            { value: 'all', label: 'Все' },
                            { value: 'new', label: 'Новые' },
                            { value: 'in_progress', label: 'В работе' },
                            { value: 'completed', label: 'Завершённые' },
                          ]}
                        />
                      </Col>
                      
                      <Col xs={24} sm={12} lg={6}>
                        <Button 
                          type="primary"
                          icon={<SearchOutlined />}
                          size="large"
                          block
                          style={{
                            height: 48,
                            borderRadius: 8,
                            fontSize: 15,
                            fontWeight: 500,
                            background: 'linear-gradient(135deg, #FFA726 0%, #FF9800 100%)',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
                          }}
                        >
                          Поиск
                        </Button>
                      </Col>
                    </Row>
                  </div>

                  {/* Available Orders Section */}
                  <div className={styles.sectionCard}>
                    <div className={styles.sectionCardHeader}>
                      <h2 className={styles.sectionTitle}>Доступные заказы</h2>
                    </div>
                    {orders.length === 0 ? (
                      <div className={styles.emptyState}>
                        <Text>Нет доступных заказов</Text>
                      </div>
                    ) : (
                      <div>
                        {orders.map((order) => (
                          <div key={order.id} className={styles.orderCard}>
                            <div className={styles.orderHeader}>
                              <div style={{ flex: 1 }}>
                                <h4 className={styles.orderTitle}>{order.title}</h4>
                                <Text type="secondary" style={{ fontSize: 14 }}>#{order.id}</Text>
                                <div className={styles.orderTags} style={{ marginTop: 12 }}>
                                  {order.subject && <span className={styles.tagBlue}>{order.subject.name}</span>}
                                  {order.work_type && <span className={styles.tag}>{order.work_type.name}</span>}
                                  <span className={styles.tagGreen}>до {dayjs(order.deadline).format('DD.MM.YYYY')}</span>
                                  <span className={styles.tag} style={{ 
                                    background: `rgba(${getStatusColor(order.status) === 'blue' ? '59, 130, 246' : 
                                      getStatusColor(order.status) === 'green' ? '16, 185, 129' : 
                                      getStatusColor(order.status) === 'orange' ? '249, 115, 22' : '107, 114, 128'}, 0.1)`,
                                    color: getStatusColor(order.status) === 'blue' ? '#3b82f6' :
                                      getStatusColor(order.status) === 'green' ? '#10b981' :
                                      getStatusColor(order.status) === 'orange' ? '#f97316' : '#6b7280'
                                  }}>
                                    {getStatusText(order.status)}
                                  </span>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <p className={styles.orderBudget}>{order.budget} ₽</p>
                              </div>
                            </div>
                            <div style={{ marginTop: 16, marginBottom: 16 }}>
                              <Text style={{ color: '#6b7280', fontSize: 14 }}>{order.description}</Text>
                            </div>
                            <div className={styles.actionButtons}>
                              <Button
                                type="primary"
                                className={styles.buttonPrimary}
                                onClick={() => takeMutation.mutate(order.id)}
                                loading={takeMutation.isPending}
                              >
                                Взять в работу
                              </Button>
                              <Space>
                                <InputNumber
                                  min={1}
                                  step={1}
                                  precision={0}
                                  placeholder="Ваша цена"
                                  onChange={(value) => (order as any)._bidAmount = value}
                                  style={{ width: 140, borderRadius: 12 }}
                                  className={styles.inputField}
                                />
                                <Button
                                  className={styles.buttonSecondary}
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
                            </div>
                            <div style={{ marginTop: 20, padding: 16, background: '#f9fafb', borderRadius: 12 }}>
                              <strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Чат по заказу</strong>
                              <OrderChat orderId={order.id} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ),
            },
            {
              key: 'works',
              label: `Работы ${(myCompleted as Order[] | undefined)?.length || 0}`,
              children: (
                <div className={styles.sectionCard}>
                  <div className={styles.sectionCardHeader}>
                    <h2 className={styles.sectionTitle}>Мои работы</h2>
                  </div>
                  {(myCompleted as Order[] | undefined)?.length === 0 ? (
                    <div className={styles.emptyState}>
                      <Text>У вас пока нет завершенных работ</Text>
                    </div>
                  ) : (
                    <div>
                      {((myCompleted as Order[] | undefined) || []).map((order) => (
                        <div key={order.id} className={styles.orderCard}>
                          <div className={styles.orderHeader}>
                            <div style={{ flex: 1 }}>
                              <h4 className={styles.orderTitle}>{order.title}</h4>
                              <Text type="secondary" style={{ fontSize: 14 }}>#{order.id}</Text>
                              <div className={styles.orderTags} style={{ marginTop: 12 }}>
                                {order.subject && <span className={styles.tagBlue}>{order.subject.name}</span>}
                                {order.work_type && <span className={styles.tag}>{order.work_type.name}</span>}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <p className={styles.orderBudget}>{order.budget} ₽</p>
                            </div>
                          </div>
                          <div style={{ marginTop: 16 }}>
                            <Text style={{ color: '#6b7280', fontSize: 14 }}>{order.description}</Text>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ),
            },
          ]}
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: 24,
            padding: '24px',
            marginBottom: 32,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        />
        </div>
        </div>
      </div>

      {/* Profile Edit Modal */}
      <Modal
        title={
          <div style={{ 
            fontSize: 24, 
            fontWeight: 600, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Редактировать профиль
          </div>
        }
        open={profileModalVisible}
        onCancel={() => setProfileModalVisible(false)}
        onOk={() => form.submit()}
        width={750}
        okText="Сохранить"
        cancelText="Отмена"
        okButtonProps={{
          className: styles.buttonPrimary,
          size: 'large',
          style: { 
            borderRadius: 12,
            height: 44,
            fontSize: 16,
            fontWeight: 500
          }
        }}
        cancelButtonProps={{
          className: styles.buttonSecondary,
          size: 'large',
          style: { 
            borderRadius: 12,
            height: 44,
            fontSize: 16,
            fontWeight: 500
          }
        }}
        styles={{
          mask: {
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
          },
          content: { 
            borderRadius: 24, 
            padding: 0,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
          },
          header: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: '24px 32px',
            borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
            borderRadius: '24px 24px 0 0'
          },
          body: {
            padding: '32px',
            background: 'rgba(255, 255, 255, 0.95)'
          },
          footer: {
            padding: '24px 32px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderTop: '1px solid rgba(102, 126, 234, 0.1)',
            borderRadius: '0 0 24px 24px'
          }
        }}
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
            <Input className={styles.inputField} size="large" />
          </Form.Item>
          <Form.Item label="Фамилия" name="last_name">
            <Input className={styles.inputField} size="large" />
          </Form.Item>
          <Form.Item label="О себе" name="bio">
            <Input.TextArea rows={4} placeholder="Расскажите о себе, своем опыте и специализации" className={styles.textareaField} style={{ fontSize: 15 }} />
          </Form.Item>
          <Form.Item label="Опыт работы (лет)" name="experience_years">
            <AntInputNumber min={0} max={50} style={{ width: '100%' }} className={styles.inputField} size="large" />
          </Form.Item>
          <Form.Item label="Почасовая ставка (₽)" name="hourly_rate">
            <AntInputNumber min={0} step={100} style={{ width: '100%' }} className={styles.inputField} size="large" />
          </Form.Item>
          <Form.Item label="Образование" name="education">
            <Input.TextArea rows={3} placeholder="Укажите ваше образование и квалификации" className={styles.textareaField} style={{ fontSize: 15 }} />
          </Form.Item>
          <Form.Item label="Навыки" name="skills">
            <Input.TextArea rows={3} placeholder="Перечислите ваши навыки и компетенции" className={styles.textareaField} style={{ fontSize: 15 }} />
          </Form.Item>
          <Form.Item label="Портфолио (ссылка)" name="portfolio_url">
            <Input placeholder="https://example.com/portfolio" className={styles.inputField} size="large" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Expert Application Modal */}
      <Modal
        title={
          <div style={{ 
            fontSize: 24, 
            fontWeight: 600, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Заполнение анкеты эксперта
          </div>
        }
        open={applicationModalVisible}
        onCancel={() => setApplicationModalVisible(false)}
        onOk={() => applicationForm.submit()}
        width={750}
        okText="Отправить"
        cancelText="Отмена"
        okButtonProps={{
          className: styles.buttonPrimary,
          size: 'large',
          style: { 
            borderRadius: 12,
            height: 44,
            fontSize: 16,
            fontWeight: 500
          }
        }}
        cancelButtonProps={{
          className: styles.buttonSecondary,
          size: 'large',
          style: { 
            borderRadius: 12,
            height: 44,
            fontSize: 16,
            fontWeight: 500
          }
        }}
        styles={{
          mask: {
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
          },
          content: { 
            borderRadius: 24, 
            padding: 0,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
          },
          header: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: '24px 32px',
            borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
            borderRadius: '24px 24px 0 0'
          },
          body: {
            padding: '32px',
            background: 'rgba(255, 255, 255, 0.95)'
          },
          footer: {
            padding: '24px 32px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderTop: '1px solid rgba(102, 126, 234, 0.1)',
            borderRadius: '0 0 24px 24px'
          }
        }}
      >
        <Form
          form={applicationForm}
          layout="vertical"
          initialValues={{ educations: [{}] }}
          onFinish={(values) => {
            // Filter out empty education entries
            const educations = values.educations?.filter((edu: Education) => 
              edu.university && edu.start_year
            ) || [];
            
            if (educations.length === 0) {
              message.error('Добавьте хотя бы одно образование');
              return;
            }
            
            createApplicationMutation.mutate({
              ...values,
              educations
            });
          }}
        >
          <Form.Item
            label="ФИО"
            name="full_name"
            rules={[{ required: true, message: 'Введите ФИО' }]}
          >
            <Input 
              placeholder="Иванов Иван Иванович" 
              className={styles.inputField}
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Опыт работы (лет)"
            name="work_experience_years"
            rules={[{ required: true, message: 'Укажите опыт работы' }]}
          >
            <AntInputNumber 
              min={0} 
              max={50} 
              style={{ width: '100%' }}
              className={styles.inputField}
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Специальности"
            name="specializations"
            rules={[{ required: true, message: 'Введите специальности' }]}
            extra="Укажите специальности, которые вы пишете (можно через запятую или каждую на новой строке)"
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Например: Математика, Физика, Информатика или каждую на новой строке"
              className={styles.textareaField}
              style={{ fontSize: 15 }}
            />
          </Form.Item>

          <Form.Item label="Образование">
            <Form.List name="educations">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} className={styles.modalEducationRow}>
                      <Row gutter={16}>
                        <Col span={9}>
                          <Form.Item
                            {...restField}
                            name={[name, 'university']}
                            rules={[{ required: true, message: 'Введите ВУЗ' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <Input 
                              placeholder="Название ВУЗа" 
                              className={styles.inputField}
                              size="large"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={5}>
                          <Form.Item
                            {...restField}
                            name={[name, 'start_year']}
                            rules={[{ required: true, message: 'Год начала' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <AntInputNumber 
                              min={1950} 
                              max={2100} 
                              placeholder="Год начала" 
                              style={{ width: '100%' }}
                              className={styles.inputField}
                              size="large"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={5}>
                          <Form.Item
                            {...restField}
                            name={[name, 'end_year']}
                            style={{ marginBottom: 0 }}
                          >
                            <AntInputNumber 
                              min={1950} 
                              max={2100} 
                              placeholder="Год окончания" 
                              style={{ width: '100%' }}
                              className={styles.inputField}
                              size="large"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item
                            {...restField}
                            name={[name, 'degree']}
                            style={{ marginBottom: 0 }}
                          >
                            <Input 
                              placeholder="Степень" 
                              className={styles.inputField}
                              size="large"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={1}>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                            style={{ marginTop: 4 }}
                          />
                        </Col>
                      </Row>
                    </div>
                  ))}
                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                      size="large"
                      style={{
                        borderRadius: 12,
                        height: 48,
                        fontSize: 15,
                        fontWeight: 500,
                        borderColor: 'rgba(102, 126, 234, 0.3)',
                        color: '#667eea'
                      }}
                    >
                      Добавить образование
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form.Item>
        </Form>
      </Modal>

      {/* Specialization Modal */}
      <Modal
        title={
          <div style={{ 
            fontSize: 24, 
            fontWeight: 600, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {editingSpecialization ? 'Редактировать специализацию' : 'Добавить специализацию'}
          </div>
        }
        open={specializationModalVisible}
        onCancel={() => {
          setSpecializationModalVisible(false);
          setEditingSpecialization(null);
          specializationForm.resetFields();
        }}
        onOk={() => specializationForm.submit()}
        width={600}
        okText={editingSpecialization ? 'Сохранить' : 'Добавить'}
        cancelText="Отмена"
        okButtonProps={{
          className: styles.buttonPrimary,
          size: 'large',
          style: { 
            borderRadius: 12,
            height: 44,
            fontSize: 16,
            fontWeight: 500
          }
        }}
        cancelButtonProps={{
          className: styles.buttonSecondary,
          size: 'large',
          style: { 
            borderRadius: 12,
            height: 44,
            fontSize: 16,
            fontWeight: 500
          }
        }}
        styles={{
          mask: {
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
          },
          content: { 
            borderRadius: 24, 
            padding: 0,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
          },
          header: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: '24px 32px',
            borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
            borderRadius: '24px 24px 0 0'
          },
          body: {
            padding: '32px',
            background: 'rgba(255, 255, 255, 0.95)'
          },
          footer: {
            padding: '24px 32px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderTop: '1px solid rgba(102, 126, 234, 0.1)',
            borderRadius: '0 0 24px 24px'
          }
        }}
      >
        <Form
          form={specializationForm}
          layout="vertical"
          onFinish={(values) => {
            if (editingSpecialization) {
              updateSpecializationMutation.mutate({ id: editingSpecialization.id, data: values });
            } else {
              createSpecializationMutation.mutate(values);
            }
          }}
        >
          <Form.Item
            label="Предмет"
            name="subject_id"
            rules={[{ required: true, message: 'Выберите предмет' }]}
          >
            <Select 
              placeholder="Выберите предмет"
              className={styles.inputField}
              size="large"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={subjects.map((subject) => ({
                label: subject.name,
                value: subject.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            label="Опыт работы (лет)"
            name="experience_years"
            rules={[{ required: true, message: 'Укажите опыт работы' }]}
          >
            <AntInputNumber 
              min={0} 
              max={50} 
              style={{ width: '100%' }}
              className={styles.inputField}
              size="large"
            />
          </Form.Item>
          <Form.Item
            label="Часовая ставка (₽)"
            name="hourly_rate"
            rules={[{ required: true, message: 'Укажите часовую ставку' }]}
          >
            <AntInputNumber 
              min={0} 
              step={100}
              style={{ width: '100%' }}
              className={styles.inputField}
              size="large"
            />
          </Form.Item>
          <Form.Item
            label="Описание"
            name="description"
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Опишите ваш опыт в этой области"
              className={styles.textareaField}
              style={{ fontSize: 15 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно мессенджера */}
      <Modal
        open={messageModalVisible}
        onCancel={() => setMessageModalVisible(false)}
        footer={null}
        width={900}
        styles={{
          mask: {
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
          },
          content: { 
            borderRadius: 24, 
            padding: 0,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
          },
          header: {
            display: 'none'
          },
          body: {
            padding: 0,
            background: 'rgba(255, 255, 255, 0.95)',
            height: '600px',
            display: 'flex'
          }
        }}
      >
        <div style={{ display: 'flex', height: '100%', width: '100%' }}>
          {/* Left Sidebar */}
          <div style={{ 
            width: '300px', 
            background: '#f3f4f6', 
            borderRight: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Tabs */}
            <div style={{ 
              display: 'flex', 
              borderBottom: '1px solid #e5e7eb',
              background: '#ffffff',
              padding: '0 8px'
            }}>
              <div
                onClick={() => setMessageTab('all')}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderBottom: messageTab === 'all' ? '2px solid #3b82f6' : '2px solid transparent',
                  color: messageTab === 'all' ? '#3b82f6' : '#6b7280',
                  fontWeight: messageTab === 'all' ? 600 : 400,
                  fontSize: 14
                }}
              >
                <MessageOutlined style={{ marginRight: 6, fontSize: 16 }} />
                Все
              </div>
              <div
                onClick={() => setMessageTab('unread')}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderBottom: messageTab === 'unread' ? '2px solid #3b82f6' : '2px solid transparent',
                  color: messageTab === 'unread' ? '#3b82f6' : '#6b7280',
                  fontWeight: messageTab === 'unread' ? 600 : 400,
                  fontSize: 14
                }}
              >
                <BellOutlined style={{ marginRight: 6, fontSize: 16 }} />
                Непрочитанные
              </div>
              <div
                onClick={() => setMessageTab('favorites')}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderBottom: messageTab === 'favorites' ? '2px solid #3b82f6' : '2px solid transparent',
                  color: messageTab === 'favorites' ? '#3b82f6' : '#6b7280',
                  fontWeight: messageTab === 'favorites' ? 600 : 400,
                  fontSize: 14
                }}
              >
                <StarOutlined style={{ marginRight: 6, fontSize: 16 }} />
                Избранные
              </div>
              <div
                onClick={() => setMessageTab('sms')}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderBottom: messageTab === 'sms' ? '2px solid #3b82f6' : '2px solid transparent',
                  color: messageTab === 'sms' ? '#3b82f6' : '#6b7280',
                  fontWeight: messageTab === 'sms' ? 600 : 400,
                  fontSize: 14
                }}
              >
                <MobileOutlined style={{ marginRight: 6, fontSize: 16 }} />
                SMS
              </div>
            </div>

            {/* Search */}
            <div style={{ padding: '12px', background: '#ffffff' }}>
              <Input
                prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                placeholder="Поиск пользователя"
                style={{ borderRadius: 8 }}
              />
            </div>

            {/* Contact List */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto',
              background: '#ffffff'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '12px',
                cursor: 'pointer',
                borderBottom: '1px solid #f3f4f6'
              }}>
                <Avatar
                  size={40}
                  src={profile?.avatar ? `http://localhost:8000${profile.avatar}` : undefined}
                  icon={!profile?.avatar && <UserOutlined />}
                  style={{ backgroundColor: '#667eea' }}
                />
                <div style={{ flex: 1, marginLeft: 12 }}>
                  <Text strong style={{ fontSize: 14, color: '#1f2937', display: 'block' }}>
                    {profile?.username || profile?.email || 'Пользователь'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12, color: '#6b7280' }}>
                    Онлайн
                  </Text>
                </div>
                <Space style={{ marginLeft: 8 }}>
                  <CheckCircleOutlined style={{ color: '#9ca3af', fontSize: 14 }} />
                  <StarOutlined style={{ color: '#9ca3af', fontSize: 14 }} />
                </Space>
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            background: '#ffffff'
          }}>
            {/* Header */}
            <div style={{
              background: '#e0f2fe',
              padding: '12px 16px',
              paddingRight: '48px', // Отступ справа для крестика закрытия
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #bae6fd'
            }}>
              <Space>
                <StarFilled style={{ color: '#0ea5e9', fontSize: 16 }} />
                <Text style={{ fontSize: 14, color: '#0369a1', fontWeight: 500 }}>
                  Важные сообщения
                </Text>
              </Space>
              <Button 
                type="text" 
                size="small"
                icon={<MobileOutlined />}
                style={{ color: '#0369a1', fontSize: 14, marginRight: 0 }}
              >
                Отправить SMS
              </Button>
            </div>

            {/* Messages Area */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto',
              padding: '20px',
              background: '#ffffff'
            }}>
              <div style={{ 
                textAlign: 'center', 
                color: '#9ca3af', 
                paddingTop: '100px',
                fontSize: 14
              }}>
                Нет сообщений
              </div>
            </div>

            {/* Input Area */}
            <div style={{ 
              padding: '16px',
              borderTop: '1px solid #e5e7eb',
              background: '#ffffff',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end'
            }}>
              <Input.TextArea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Введите сообщение..."
                autoSize={{ minRows: 1, maxRows: 4 }}
                style={{ 
                  flex: 1,
                  borderRadius: 8,
                  border: '1px solid #d1d5db'
                }}
              />
              <Button
                type="default"
                shape="circle"
                icon={<PaperClipOutlined />}
                style={{ 
                  width: 40, 
                  height: 40,
                  border: '1px solid #d1d5db',
                  background: '#ffffff'
                }}
              />
              <Button
                type="default"
                shape="circle"
                icon={<SmileOutlined />}
                style={{ 
                  width: 40, 
                  height: 40,
                  border: '1px solid #d1d5db',
                  background: '#ffffff'
                }}
              />
              <Button
                type="primary"
                shape="circle"
                icon={<SendOutlined />}
                style={{ 
                  width: 40, 
                  height: 40,
                  background: '#3b82f6',
                  border: 'none'
                }}
                onClick={() => {
                  if (messageText.trim()) {
                    // Здесь будет логика отправки сообщения
                    setMessageText('');
                    message.success('Сообщение отправлено');
                  }
                }}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Модальное окно FAQ */}
      <Modal
        title={
          <div style={{ 
            fontSize: 24, 
            fontWeight: 600, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 8
          }}>
            Часто задаваемые вопросы
          </div>
        }
        open={faqModalVisible}
        onCancel={() => setFaqModalVisible(false)}
        footer={null}
        width={800}
        styles={{
          mask: {
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
          },
          content: { 
            borderRadius: 24, 
            padding: '32px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
          },
          body: {
            maxHeight: '70vh',
            overflowY: 'auto',
            padding: '0'
          }
        }}
      >
        <div style={{ paddingTop: 16 }}>
          <Text style={{ fontSize: 15, color: '#6b7280', display: 'block', marginBottom: 24 }}>
            Мы постарались собрать самые распространенные вопросы и дать на них ответы. Чтобы вам было легче разобраться с нашим сервисом.
          </Text>
          
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 18, color: '#1f2937', display: 'block', marginBottom: 16 }}>
              Заказы
            </Text>
            
            <Collapse
              expandIcon={({ isActive }) => (
                <PlusOutlined 
                  style={{ 
                    fontSize: 16, 
                    color: '#667eea',
                    transform: isActive ? 'rotate(45deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s'
                  }} 
                />
              )}
              expandIconPosition="end"
              style={{ 
                background: 'transparent',
                border: 'none'
              }}
              items={[
                {
                  key: '1',
                  label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Как пользоваться сервисом SHELP?</Text>,
                  children: (
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                      Сервис SHELP предназначен для помощи студентам в выполнении различных учебных заданий. 
                      Заказчики размещают задания, а эксперты выполняют их за определенную плату. 
                      После регистрации вы можете создать заказ или стать экспертом и начать выполнять задания.
                    </Text>
                  ),
                  style: { 
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 8,
                    border: '1px solid #e5e7eb'
                  }
                },
                {
                  key: '2',
                  label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Как разместить заказ на сервисе SHELP?</Text>,
                  children: (
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                      Чтобы разместить заказ, перейдите в раздел "Разместить задание" в верхней части страницы. 
                      Заполните форму с описанием задания, укажите тему, предмет, сроки выполнения и желаемую цену. 
                      После публикации заказа эксперты смогут предложить свою цену или вы сможете выбрать подходящего исполнителя.
                    </Text>
                  ),
                  style: { 
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 8,
                    border: '1px solid #e5e7eb'
                  }
                },
                {
                  key: '3',
                  label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Как взять заказ на выполнение на сервисе SHELP?</Text>,
                  children: (
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                      Если вы зарегистрированы как эксперт, просматривайте доступные заказы в разделе "Заказы". 
                      Выберите подходящий заказ и нажмите кнопку "Предложить цену". 
                      После согласования цены с заказчиком заказ будет назначен вам на выполнение.
                    </Text>
                  ),
                  style: { 
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 8,
                    border: '1px solid #e5e7eb'
                  }
                },
                {
                  key: '4',
                  label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Как пользоваться меню?</Text>,
                  children: (
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                      Боковое меню содержит все основные разделы личного кабинета. 
                      Через меню вы можете перейти к сообщениям, уведомлениям, календарю, балансу, 
                      вашим заказам и работам, а также другим разделам сервиса.
                    </Text>
                  ),
                  style: { 
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 8,
                    border: '1px solid #e5e7eb'
                  }
                },
                {
                  key: '5',
                  label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Как выбрать специалиста?</Text>,
                  children: (
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                      При просмотре заказов вы увидите список предложений от разных экспертов с их ценами. 
                      Изучите профили экспертов: рейтинг, отзывы, специализации и примеры работ. 
                      Это поможет вам выбрать наиболее подходящего специалиста для вашего задания.
                    </Text>
                  ),
                  style: { 
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 8,
                    border: '1px solid #e5e7eb'
                  }
                },
                {
                  key: '6',
                  label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Как оплатить заказ?</Text>,
                  children: (
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                      Оплата заказа происходит безопасно через внутреннюю систему сервиса. 
                      Средства резервируются на вашем балансе и переводятся исполнителю только после принятия работы. 
                      Вы можете пополнить баланс через банковскую карту или электронные кошельки.
                    </Text>
                  ),
                  style: { 
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 8,
                    border: '1px solid #e5e7eb'
                  }
                },
                {
                  key: '7',
                  label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Какие гарантии предоставляет сервис SHELP для своих пользователей?</Text>,
                  children: (
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                      Сервис SHELP гарантирует безопасность сделок через систему гарантий. 
                      Деньги находятся в резерве до принятия работы заказчиком. 
                      При возникновении споров работает система арбитража. 
                      Мы проверяем работы на уникальность и обеспечиваем возврат средств в случае несоответствия требованиям.
                    </Text>
                  ),
                  style: { 
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 8,
                    border: '1px solid #e5e7eb'
                  }
                },
                {
                  key: '8',
                  label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Что делать если заказ выполнен не качественно?</Text>,
                  children: (
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                      Если работа не соответствует требованиям, вы можете отправить её на доработку без дополнительной оплаты. 
                      Специалист обязан доработать работу в течение указанного срока. 
                      В случае, если специалист отказывается дорабатывать или качество работы не улучшается, 
                      вы можете обратиться в арбитраж для возврата средств.
                    </Text>
                  ),
                  style: { 
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 8,
                    border: '1px solid #e5e7eb'
                  }
                },
                {
                  key: '9',
                  label: <Text style={{ fontSize: 15, color: '#1f2937' }}>В течении какого срока может быть выполнен заказ?</Text>,
                  children: (
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                      Сроки выполнения заказа определяются при размещении задания. 
                      Минимальный срок зависит от сложности и объема работы. 
                      Стандартные сроки: от 1 до 7 дней для простых работ, от 7 до 30 дней для сложных. 
                      За срочные задания (менее 24 часов) может взиматься дополнительная плата.
                    </Text>
                  ),
                  style: { 
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 8,
                    border: '1px solid #e5e7eb'
                  }
                },
                {
                  key: '10',
                  label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Как регулируются отношения между специалистом и заказчиком?</Text>,
                  children: (
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                      Отношения регулируются Публичной офертой, правилами использования сервиса и договором оказания услуг. 
                      Все условия работы фиксируются в чате внутри заказа. 
                      В случае споров работает система арбитража, где независимые эксперты рассматривают спорные ситуации и принимают решение.
                    </Text>
                  ),
                  style: { 
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 8,
                    border: '1px solid #e5e7eb'
                  }
                },
              ]}
            />
          </div>

          {/* Раздел Финансы */}
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 18, color: '#1f2937', display: 'block', marginBottom: 16 }}>
              Финансы
            </Text>
            
            <Collapse
              expandIcon={({ isActive }) => (
                <PlusOutlined 
                  style={{ 
                    fontSize: 16, 
                    color: '#667eea',
                    transform: isActive ? 'rotate(45deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s'
                  }} 
                />
              )}
              expandIconPosition="end"
              style={{ 
                background: 'transparent',
                border: 'none'
              }}
              items={[
                {
                  key: '11',
                  label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Как пополнить баланс пользователя?</Text>,
                  children: (
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                      Для пополнения баланса перейдите в раздел "На счету" в боковом меню и нажмите кнопку "Пополнить баланс". 
                      Вы можете пополнить баланс банковской картой, через систему быстрых платежей (СБП) или электронными кошельками. 
                      Минимальная сумма пополнения - 100 рублей.
                    </Text>
                  ),
                  style: { 
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 8,
                    border: '1px solid #e5e7eb'
                  }
                },
                {
                  key: '12',
                  label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Как вывести денежные средства?</Text>,
                  children: (
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                      Для вывода средств перейдите в раздел "На счету" и выберите "История операций". 
                      Нажмите кнопку "Вывести средства" и выберите способ вывода: на банковскую карту или электронный кошелек. 
                      Минимальная сумма вывода - 500 рублей. 
                      Средства поступят на ваш счет в течение 1-3 рабочих дней.
                    </Text>
                  ),
                  style: { 
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 8,
                    border: '1px solid #e5e7eb'
                  }
                },
                {
                  key: '13',
                  label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Схема оплаты на сервисе SHELP ("Безопасная сделка")</Text>,
                  children: (
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                      Система "Безопасная сделка" обеспечивает защиту интересов обеих сторон. 
                      Средства заказчика блокируются на время выполнения заказа. 
                      После принятия работы заказчиком средства автоматически переводятся специалисту. 
                      При возникновении споров средства остаются заблокированными до решения арбитража.
                    </Text>
                  ),
                  style: { 
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 8,
                    border: '1px solid #e5e7eb'
                  }
                },
              ]}
            />
          </div>

          {/* Раздел Профиль */}
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 18, color: '#1f2937', display: 'block', marginBottom: 16 }}>
              Профиль
            </Text>
            
            <Collapse
              expandIcon={({ isActive }) => (
                <PlusOutlined 
                  style={{ 
                    fontSize: 16, 
                    color: '#667eea',
                    transform: isActive ? 'rotate(45deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s'
                  }} 
                />
              )}
              expandIconPosition="end"
              style={{ 
                background: 'transparent',
                border: 'none'
              }}
              items={[
                {
                  key: '14',
                  label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Какие пользователи существуют на сервисе?</Text>,
                  children: (
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                      На сервисе SHELP существует несколько типов пользователей: заказчик - размещает задания и оплачивает работы; 
                      специалист - выполняет заказы за вознаграждение; менеджер SHELP - персональный помощник по работе с сервисом; 
                      независимый эксперт - арбитр для решения споров; администратор и модераторы - обеспечивают работу сервиса.
                    </Text>
                  ),
                  style: { 
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 8,
                    border: '1px solid #e5e7eb'
                  }
                },
                {
                  key: '15',
                  label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Кто такой специалист?</Text>,
                  children: (
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                      Специалист - это пользователь, который выполняет учебные задания за вознаграждение. 
                      Чтобы стать специалистом, нужно зарегистрироваться, заполнить анкету и пройти проверку администрацией. 
                      Специалисты имеют специализации, рейтинг, отзывы от заказчиков и могут зарабатывать, выполняя заказы.
                    </Text>
                  ),
                  style: { 
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 8,
                    border: '1px solid #e5e7eb'
                  }
                },
                {
                  key: '16',
                  label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Кто такой заказчик?</Text>,
                  children: (
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                      Заказчик - это пользователь, который размещает задания для выполнения специалистами и оплачивает выполненные работы. 
                      Заказчик может выбирать специалистов, общаться с ними, отслеживать выполнение заказа и принимать или отклонять работу.
                    </Text>
                  ),
                  style: { 
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 8,
                    border: '1px solid #e5e7eb'
                  }
                },
                {
                  key: '17',
                  label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Кто такой менеджер SHELP (персональный менеджер)?</Text>,
                  children: (
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                      Персональный менеджер SHELP - это сотрудник сервиса, который помогает пользователям в работе с платформой. 
                      Менеджер консультирует по вопросам размещения заказов, выбора специалистов, решения споров и использования сервиса.
                    </Text>
                  ),
                  style: { 
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 8,
                    border: '1px solid #e5e7eb'
                  }
                },
                {
                  key: '18',
                  label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Кто такой независимый эксперт?</Text>,
                  children: (
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                      Независимый эксперт - это опытный пользователь, который помогает решать споры между заказчиками и специалистами в системе арбитража. 
                      Эксперты объективно оценивают качество выполненных работ и принимают решения о возврате средств, доработке или закрытии заказа.
                    </Text>
                  ),
                  style: { 
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 8,
                    border: '1px solid #e5e7eb'
                  }
                },
                {
                  key: '19',
                  label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Чем занимается администрация и модераторы сервиса?</Text>,
                  children: (
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                      Администрация сервиса управляет платформой, обеспечивает её работу, обрабатывает заявки на регистрацию специалистов, 
                      решает технические вопросы. Модераторы следят за соблюдением правил пользователями, проверяют контент, 
                      блокируют нарушителей и поддерживают порядок на платформе.
                    </Text>
                  ),
                  style: { 
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 8,
                    border: '1px solid #e5e7eb'
                  }
                },
              ]}
            />
          </div>
        </div>
      </Modal>

      {/* Модальное окно Финансы */}
      <Modal
        title={
          <div style={{ 
            fontSize: 24, 
            fontWeight: 600, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 8
          }}>
            Финансы
          </div>
        }
        open={financeModalVisible}
        onCancel={() => setFinanceModalVisible(false)}
        footer={null}
        width={1200}
        styles={{
          mask: {
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
          },
          content: { 
            borderRadius: 24, 
            padding: '32px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
          },
          body: {
            padding: '0',
            maxHeight: '80vh',
            overflowY: 'auto'
          }
        }}
      >
        <div style={{ display: 'flex', gap: 24, minHeight: '600px' }}>
          {/* Левая часть - История операций */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ fontSize: 20, color: '#1f2937', display: 'block', marginBottom: 20 }}>
              История операций
            </Text>

            {/* Фильтры */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              <Select
                defaultValue="all"
                style={{ width: 180 }}
                suffixIcon={<DownOutlined />}
              >
                <Select.Option value="all">Все операции</Select.Option>
                <Select.Option value="income">Поступления</Select.Option>
                <Select.Option value="expense">Списания</Select.Option>
              </Select>
              
              <RangePicker
                defaultValue={[dayjs().startOf('month'), dayjs().endOf('month')]}
                format="DD.MM.YYYY"
                style={{ width: 280 }}
              />

              <Input
                placeholder="Поиск по операциям"
                prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                style={{ flex: 1, minWidth: 200, maxWidth: 400 }}
              />
            </div>

            {/* Статистика за период */}
            <div style={{ 
              background: '#f9fafb', 
              borderRadius: 12, 
              padding: '16px', 
              marginBottom: 24,
              border: '1px solid #e5e7eb'
            }}>
              <Text strong style={{ fontSize: 14, color: '#1f2937', display: 'block', marginBottom: 12 }}>
                Операции за данный период:
              </Text>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 13, color: '#6b7280' }}>
                  Всего заказов: <Text strong style={{ color: '#1f2937' }}>0</Text>
                </Text>
                <Text style={{ fontSize: 13, color: '#6b7280' }}>
                  Выполнено заказов: <Text strong style={{ color: '#1f2937' }}>0</Text>
                </Text>
                <Text style={{ fontSize: 13, color: '#6b7280' }}>
                  Поступлений: <Text strong style={{ color: '#10b981' }}>0</Text>
                </Text>
                <Text style={{ fontSize: 13, color: '#6b7280' }}>
                  Списаний: <Text strong style={{ color: '#ef4444' }}>0</Text>
                </Text>
              </div>
            </div>

            {/* Область для списка операций */}
            <div style={{ 
              minHeight: '400px',
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Text type="secondary" style={{ fontSize: 14 }}>
                Нет операций за выбранный период
              </Text>
            </div>
          </div>

          {/* Правая часть - Боковая панель */}
          <div style={{ width: 300, flexShrink: 0 }}>
            <div style={{ 
              background: '#f9fafb', 
              borderRadius: 16, 
              padding: '24px',
              border: '1px solid #e5e7eb'
            }}>
              {/* Текущий баланс */}
              <div style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 14, color: '#6b7280', display: 'block', marginBottom: 8 }}>
                  Текущий баланс:
                </Text>
                <Text strong style={{ fontSize: 32, color: '#1f2937', display: 'block', marginBottom: 16 }}>
                  0.00 ₽
                </Text>
                <Button 
                  type="primary"
                  block
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                    border: 'none',
                    borderRadius: 8,
                    height: 40
                  }}
                >
                  Пополнить баланс
                </Button>
              </div>

              {/* Детализация баланса */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ 
                    width: 12, 
                    height: 12, 
                    background: '#10b981', 
                    borderRadius: 2, 
                    marginRight: 8 
                  }} />
                  <Text style={{ fontSize: 13, color: '#6b7280' }}>Доступно к выводу:</Text>
                </div>
                <Text strong style={{ fontSize: 16, color: '#1f2937', marginLeft: 20, display: 'block' }}>
                  0.00 ₽
                </Text>

                <div style={{ display: 'flex', alignItems: 'center', marginTop: 16, marginBottom: 12 }}>
                  <div style={{ 
                    width: 12, 
                    height: 12, 
                    background: '#ef4444', 
                    borderRadius: 2, 
                    marginRight: 8 
                  }} />
                  <Text style={{ fontSize: 13, color: '#6b7280' }}>Заблокировано:</Text>
                </div>
                <Text strong style={{ fontSize: 16, color: '#1f2937', marginLeft: 20, display: 'block' }}>
                  0.00 ₽
                </Text>

                <div style={{ display: 'flex', alignItems: 'center', marginTop: 16, marginBottom: 12 }}>
                  <div style={{ 
                    width: 12, 
                    height: 12, 
                    background: '#6b7280', 
                    borderRadius: 2, 
                    marginRight: 8 
                  }} />
                  <Text style={{ fontSize: 13, color: '#6b7280' }}>Удерживается:</Text>
                </div>
                <Text strong style={{ fontSize: 16, color: '#1f2937', marginLeft: 20, display: 'block' }}>
                  0.00 ₽
                </Text>
              </div>

              {/* Быстрые ссылки */}
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
                <Text strong style={{ fontSize: 14, color: '#1f2937', display: 'block', marginBottom: 12 }}>
                  Быстрые ссылки:
                </Text>
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  <Button 
                    type="text" 
                    block 
                    style={{ textAlign: 'left', height: 36 }}
                    onClick={() => {
                      // Переход к истории операций
                    }}
                  >
                    История операций
                  </Button>
                  <Button 
                    type="text" 
                    block 
                    style={{ textAlign: 'left', height: 36 }}
                    onClick={() => {
                      // Переход к заблокированным
                    }}
                  >
                    Заблокировано
                  </Button>
                  <Button 
                    type="text" 
                    block 
                    style={{ textAlign: 'left', height: 36 }}
                    onClick={() => {
                      // Переход к удерживаемым
                    }}
                  >
                    Удерживается
                  </Button>
                  <Button 
                    type="text" 
                    block 
                    style={{ textAlign: 'left', height: 36 }}
                    onClick={() => {
                      // Переход к платным услугам
                    }}
                  >
                    Платные услуги
                  </Button>
                </Space>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Модальное окно Уведомления */}
      <Modal
        title={null}
        open={notificationsModalVisible}
        onCancel={() => setNotificationsModalVisible(false)}
        footer={null}
        width={900}
        styles={{
          mask: {
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
          },
          content: { 
            borderRadius: 24, 
            padding: '32px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
          },
          body: {
            padding: '0',
            maxHeight: '80vh',
            overflowY: 'auto'
          },
          header: {
            display: 'none'
          }
        }}
      >
        <div style={{ padding: '0' }}>
          {/* Заголовок */}
          <Text strong style={{ fontSize: 24, color: '#1f2937', display: 'block', marginBottom: 24 }}>
            Уведомления
          </Text>

          {/* Навигационные вкладки */}
          <div style={{ 
            display: 'flex', 
            gap: 0,
            marginBottom: 24,
            background: '#f9fafb',
            borderRadius: 12,
            padding: '4px',
            border: '1px solid #e5e7eb'
          }}>
            <div
              onClick={() => setNotificationTab('all')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 16px',
                cursor: 'pointer',
                borderRadius: 8,
                background: notificationTab === 'all' ? '#ffffff' : 'transparent',
                borderBottom: notificationTab === 'all' ? '2px solid #3b82f6' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              <BellOutlined style={{ 
                fontSize: 18, 
                color: notificationTab === 'all' ? '#3b82f6' : '#6b7280' 
              }} />
              <Text style={{ 
                fontSize: 14, 
                color: notificationTab === 'all' ? '#1f2937' : '#6b7280',
                fontWeight: notificationTab === 'all' ? 500 : 400
              }}>
                Все
              </Text>
            </div>
            <div
              onClick={() => setNotificationTab('orders')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 16px',
                cursor: 'pointer',
                borderRadius: 8,
                background: notificationTab === 'orders' ? '#ffffff' : 'transparent',
                borderBottom: notificationTab === 'orders' ? '2px solid #3b82f6' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              <FileDoneOutlined style={{ 
                fontSize: 18, 
                color: notificationTab === 'orders' ? '#3b82f6' : '#6b7280' 
              }} />
              <Text style={{ 
                fontSize: 14, 
                color: notificationTab === 'orders' ? '#1f2937' : '#6b7280',
                fontWeight: notificationTab === 'orders' ? 500 : 400
              }}>
                Заказы
              </Text>
            </div>
            <div
              onClick={() => setNotificationTab('claims')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 16px',
                cursor: 'pointer',
                borderRadius: 8,
                background: notificationTab === 'claims' ? '#ffffff' : 'transparent',
                borderBottom: notificationTab === 'claims' ? '2px solid #3b82f6' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              <TrophyOutlined style={{ 
                fontSize: 18, 
                color: notificationTab === 'claims' ? '#3b82f6' : '#6b7280' 
              }} />
              <Text style={{ 
                fontSize: 14, 
                color: notificationTab === 'claims' ? '#1f2937' : '#6b7280',
                fontWeight: notificationTab === 'claims' ? 500 : 400
              }}>
                Претензии
              </Text>
            </div>
            <div
              onClick={() => setNotificationTab('forum')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 16px',
                cursor: 'pointer',
                borderRadius: 8,
                background: notificationTab === 'forum' ? '#ffffff' : 'transparent',
                borderBottom: notificationTab === 'forum' ? '2px solid #3b82f6' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              <CommentOutlined style={{ 
                fontSize: 18, 
                color: notificationTab === 'forum' ? '#3b82f6' : '#6b7280' 
              }} />
              <Text style={{ 
                fontSize: 14, 
                color: notificationTab === 'forum' ? '#1f2937' : '#6b7280',
                fontWeight: notificationTab === 'forum' ? 500 : 400
              }}>
                Форум
              </Text>
            </div>
            <div
              onClick={() => setNotificationTab('questions')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 16px',
                cursor: 'pointer',
                borderRadius: 8,
                background: notificationTab === 'questions' ? '#ffffff' : 'transparent',
                borderBottom: notificationTab === 'questions' ? '2px solid #3b82f6' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              <QuestionCircleOutlined style={{ 
                fontSize: 18, 
                color: notificationTab === 'questions' ? '#3b82f6' : '#6b7280' 
              }} />
              <Text style={{ 
                fontSize: 14, 
                color: notificationTab === 'questions' ? '#1f2937' : '#6b7280',
                fontWeight: notificationTab === 'questions' ? 500 : 400
              }}>
                Вопросы
              </Text>
            </div>
          </div>

          {/* Область контента */}
          <div style={{ 
            minHeight: '500px',
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Нет уведомлений
            </Text>
          </div>
        </div>
      </Modal>

      {/* Модальное окно Арбитраж */}
      <Modal
        title={null}
        open={arbitrationModalVisible}
        onCancel={() => setArbitrationModalVisible(false)}
        footer={null}
        width={900}
        styles={{
          mask: {
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
          },
          content: { 
            borderRadius: 24, 
            padding: '32px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
          },
          body: {
            padding: '0',
            minHeight: '400px',
            background: '#f3f4f6'
          },
          header: {
            display: 'none'
          }
        }}
      >
        <div style={{ 
          background: '#f3f4f6',
          minHeight: '400px',
          padding: '0'
        }}>
          {/* Заголовок */}
          <Text strong style={{ 
            fontSize: 24, 
            color: '#1f2937', 
            display: 'block', 
            marginBottom: 24 
          }}>
            Арбитраж
          </Text>

          {/* Область контента */}
          <div style={{ 
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            padding: '48px 24px',
            minHeight: '350px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Text type="secondary" style={{ fontSize: 14, color: '#6b7280' }}>
              У вас нет арбитражей
            </Text>
          </div>
        </div>
      </Modal>

      {/* Модальное окно Мои друзья */}
      <Modal
        title={
          <div style={{ 
            fontSize: 24, 
            fontWeight: 600, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 8
          }}>
            Мои друзья
          </div>
        }
        open={friendsModalVisible}
        onCancel={() => setFriendsModalVisible(false)}
        footer={null}
        width={800}
        styles={{
          mask: {
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
          },
          content: { 
            borderRadius: 24, 
            padding: '32px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
          },
          body: {
            maxHeight: '70vh',
            overflowY: 'auto',
            padding: '0'
          }
        }}
      >
        <div style={{ paddingTop: 16 }}>
          <Input.Search
            placeholder="Поиск друзей..."
            allowClear
            style={{ marginBottom: 24 }}
            onSearch={(value) => {
              console.log('Поиск:', value);
            }}
          />
          <div style={{ 
            minHeight: '400px',
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <TeamOutlined style={{ 
              fontSize: 64, 
              color: '#d1d5db',
              marginBottom: 16 
            }} />
            <Text type="secondary" style={{ fontSize: 14 }}>
              У вас пока нет друзей
            </Text>
            <Text type="secondary" style={{ fontSize: 13, marginTop: 8 }}>
              Пригласите друзей, чтобы начать общение
            </Text>
          </div>
        </div>
      </Modal>

      {/* Модальное окно приветствия после создания анкеты */}
      <Modal
        title={
          <div style={{ 
            fontSize: 24, 
            fontWeight: 600, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Регистрация прошла успешно!
          </div>
        }
        open={welcomeModalVisible}
        onCancel={() => setWelcomeModalVisible(false)}
        footer={[
          <Button
            key="submit"
            type="primary"
            size="large"
            onClick={() => setWelcomeModalVisible(false)}
            style={{
              borderRadius: 12,
              height: 44,
              fontSize: 16,
              fontWeight: 500,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none'
            }}
          >
            Понятно
          </Button>
        ]}
        width={700}
        styles={{
          mask: {
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
          },
          content: { 
            borderRadius: 24, 
            padding: 0,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
          },
          header: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: '24px 32px',
            borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
            borderRadius: '24px 24px 0 0'
          },
          body: {
            padding: '32px',
            background: 'rgba(255, 255, 255, 0.95)'
          },
          footer: {
            padding: '24px 32px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderTop: '1px solid rgba(102, 126, 234, 0.1)',
            borderRadius: '0 0 24px 24px'
          }
        }}
      >
        <div style={{ lineHeight: 1.8, fontSize: 15, color: '#333' }}>
          <Paragraph style={{ fontSize: 16, marginBottom: 20, fontWeight: 500 }}>
            Добро пожаловать на сервис помощи студентам SHelp,
          </Paragraph>
          
          <Paragraph style={{ fontSize: 16, marginBottom: 20, fontWeight: 600, color: '#667eea' }}>
            {userProfile?.username || userProfile?.email || 'Пользователь'}!
          </Paragraph>

          <Paragraph style={{ fontSize: 15, marginBottom: 16 }}>
            Для того, чтобы заказчики размещали больше заказов по вашему профилю и выбирали именно Вас, Вам необходимо заполнить в профиле следующую информацию:
          </Paragraph>

          <div style={{ marginLeft: 20, marginBottom: 20 }}>
            <Paragraph style={{ marginBottom: 12 }}>
              <strong>1.</strong> Специализации, с которыми Вы можете помочь заказчикам.
            </Paragraph>
            <Paragraph style={{ marginBottom: 12 }}>
              <strong>2.</strong> Описание профиля – здесь можете указать любую информацию о себе: образование, опыт работы, типы работ с которыми помогаете, график работы и другую индивидуальную информацию о себе
            </Paragraph>
            <Paragraph style={{ marginBottom: 0 }}>
              <strong>3.</strong> Загрузите оригинальную аватарку – чтобы выделяться на фоне остальных исполнителей
            </Paragraph>
          </div>

          <Paragraph style={{ fontSize: 15, marginBottom: 16 }}>
            Для комфортной работы, Вы можете ознакомиться с нашим разделом <strong>FAQ</strong>. По всем вопросам, касающихся работы сервиса, можете обращаться к нашему администратору <strong>Admin</strong>
          </Paragraph>

          <Paragraph style={{ fontSize: 15, marginTop: 20, fontWeight: 600, color: '#667eea', textAlign: 'center' }}>
            Желаем легких заказов и высоких доходов!
          </Paragraph>
        </div>
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
