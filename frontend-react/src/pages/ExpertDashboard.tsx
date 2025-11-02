import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Typography, Tag, message, Upload, Space, InputNumber, Input, Spin, Modal, Form, InputNumber as AntInputNumber, Row, Col, Avatar, Badge, Tabs, Select, Rate, Menu } from 'antd';
import { UploadOutlined, UserOutlined, PlusOutlined, DeleteOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, LogoutOutlined, EditOutlined, ArrowLeftOutlined, MessageOutlined, TrophyOutlined, LikeOutlined, DislikeOutlined, ShoppingOutlined, FileDoneOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
      const app = await expertsApi.getMyApplication();
      return app;
    },
    retry: false,
    onError: () => {
      // Анкета не найдена - это нормально, значит её ещё нет
    }
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
        <div className={styles.sidebar}>
          <Menu
            mode="vertical"
            selectedKeys={[selectedMenuKey]}
            onSelect={({ key }) => {
              setSelectedMenuKey(key);
              const tabKey = key === 'orders' ? 'orders' : key === 'works' ? 'works' : 'orders';
              setActiveTab(tabKey);
              
              // Плавная прокрутка к вкладкам
              setTimeout(() => {
                if (tabsRef.current) {
                  tabsRef.current.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                  });
                }
              }, 100);
            }}
            className={styles.sidebarMenu}
          >
            <Menu.Item 
              key="orders" 
              icon={<ShoppingOutlined />}
            >
              Мои заказы
            </Menu.Item>
            <Menu.Item 
              key="works" 
              icon={<FileDoneOutlined />}
            >
              Мои работы
            </Menu.Item>
          </Menu>
        </div>

        {/* Main Content */}
        <div className={styles.mainContent}>
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
            <Button
              icon={<LogoutOutlined />}
              className={styles.buttonDanger}
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
                <Button
                  icon={<MessageOutlined />}
                  className={styles.buttonSecondary}
                  style={{ width: 'fit-content', marginBottom: 16 }}
                >
                  Сообщение
                </Button>
                <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <LikeOutlined style={{ color: '#10b981', fontSize: 16 }} />
                        <Text style={{ fontSize: 14, color: '#1f2937', marginRight: 8 }}>Рейтинг исполнителя:</Text>
                      </div>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <DislikeOutlined style={{ color: '#ef4444', fontSize: 16 }} />
                        <Text style={{ fontSize: 14, color: '#1f2937', marginRight: 8 }}>Рейтинг заказчика:</Text>
                      </div>
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

        {/* Application Status Display */}
        {applicationLoading ? (
          <div className={styles.card} style={{ textAlign: 'center', padding: '48px' }}>
            <Spin size="large" />
          </div>
        ) : application ? (
          <div className={styles.applicationCard}>
            <div className={styles.applicationHeader}>
              <div>
                <h3 className={styles.applicationTitle}>Анкета</h3>
                <p className={styles.applicationSubtitle}>Статус рассмотрения</p>
              </div>
              <div 
                className={`${styles.statusBadge} ${
                  application.status === 'pending' ? styles.statusPending :
                  application.status === 'approved' ? styles.statusApproved :
                  styles.statusRejected
                }`}
              >
                {getApplicationStatusIcon(application.status)}
                <span>{application.status_display}</span>
              </div>
            </div>
            {application.status === 'rejected' && application.rejection_reason && (
              <div style={{ marginTop: 16, padding: 12, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 12 }}>
                <Text type="danger" style={{ fontSize: 14 }}>
                  <strong>Причина отклонения:</strong> {application.rejection_reason}
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
