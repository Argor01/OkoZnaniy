import React, { useState, useRef } from 'react';
import { Layout, Typography, Modal, Button, Space, Input, Avatar, Badge, Tabs, Select, Rate, Menu, Collapse, DatePicker, Row, Col, Form, InputNumber, Upload, Tag, Popover, Spin, Card, Empty, Statistic } from 'antd';
import { LogoutOutlined, MenuOutlined, UserOutlined, PlusOutlined, DeleteOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, EditOutlined, ArrowLeftOutlined, MessageOutlined, TrophyOutlined, LikeOutlined, DislikeOutlined, ShoppingOutlined, FileDoneOutlined, SettingOutlined, BellOutlined, CalendarOutlined, WalletOutlined, ShopOutlined, TeamOutlined, HeartOutlined, GiftOutlined, DollarOutlined, PoweroffOutlined, SearchOutlined, StarOutlined, StarFilled, MobileOutlined, SendOutlined, SmileOutlined, PaperClipOutlined, QuestionCircleOutlined, DownOutlined, FileTextOutlined, CommentOutlined, UploadOutlined, EyeOutlined, FilterOutlined } from '@ant-design/icons';
import EmojiPicker from 'emoji-picker-react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '../../components/layout/Sidebar';
import { authApi } from '../../api/auth';
import { ordersApi } from '../../api/orders';
import { catalogApi } from '../../api/catalog';
import styles from './MyWorks.module.css';

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

const { Content, Header } = Layout;
const { Title, Text, Paragraph } = Typography;

const MyWorks: React.FC = () => {
  const navigate = useNavigate();
  const [isTablet, setIsTablet] = useState(window.innerWidth > 840 && window.innerWidth <= 1024);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  
  // Состояния для модальных окон
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

  const [editingSpecialization, setEditingSpecialization] = useState<any>(null);
  
  // Дополнительные состояния
  const [messageTab, setMessageTab] = useState<string>('all');
  const [messageText, setMessageText] = useState<string>('');
  const [notificationTab, setNotificationTab] = useState<string>('all');
  const [arbitrationStatusFilter, setArbitrationStatusFilter] = useState<string>('all');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 840);
  
  // Состояния для работ
  const [activeTab, setActiveTab] = useState<string>('completed');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [selectedWork, setSelectedWork] = useState<any>(null);
  const [workDetailModalVisible, setWorkDetailModalVisible] = useState(false);
  
  // Refs
  const uploadRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Загрузка профиля пользователя
  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  // Загружаем завершенные работы
  const { data: completedWorks, isLoading: completedLoading } = useQuery({
    queryKey: ['my-orders-completed'],
    queryFn: async () => {
      try {
        const data = await ordersApi.getMyOrders({ status: 'completed' });
        if (!data || data.length === 0) {
          // Возвращаем тестовые данные если нет данных с сервера
          return [
            {
              id: 1001,
              title: 'Решение задач по высшей математике',
              description: 'Выполнено 15 задач по математическому анализу, включая пределы, производные и интегралы. Все решения оформлены с подробными пояснениями.',
              budget: 3500,
              status: 'completed',
              subject: { id: 1, name: 'Математика' },
              work_type: { id: 1, name: 'Контрольная работа' },
              deadline: '2024-11-20',
              created_at: '2024-11-15',
              completed_at: '2024-11-19',
              client: { id: 101, username: 'student_ivan', first_name: 'Иван', last_name: 'Петров' },
              rating: 5,
              review: 'Отличная работа! Все выполнено качественно и в срок. Решения подробно расписаны, все понятно. Рекомендую этого исполнителя!'
            }
          ] as any;
        }
        return data;
      } catch (error) {
        console.error('Error loading completed works:', error);
        return [];
      }
    },
  });

  // Загружаем работы в процессе
  const { data: inProgressWorks, isLoading: inProgressLoading } = useQuery({
    queryKey: ['my-orders-in-progress'],
    queryFn: async () => {
      try {
        const data = await ordersApi.getMyOrders({ status: 'in_progress' });
        if (!data || data.length === 0) {
          return [] as any;
        }
        return data;
      } catch (error) {
        console.error('Error loading in-progress works:', error);
        return [];
      }
    },
  });

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 840);
      setIsTablet(window.innerWidth > 840 && window.innerWidth <= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    authApi.logout();
    navigate('/login');
  };

  const handleMenuSelect = (key: string) => {
    if (key === 'orders') navigate('/expert');
    if (key === 'shop-ready-works') navigate('/shop/ready-works');
    if (key === 'shop-add-work') navigate('/shop/add-work');
    if (key === 'shop-my-works' || key === 'works') return;
    if (key === 'shop-purchased') navigate('/shop/purchased');
    if (key === 'profile') navigate('/expert');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#f59e0b';
      case 'review': return '#8b5cf6';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Завершен';
      case 'in_progress': return 'В работе';
      case 'review': return 'На проверке';
      case 'cancelled': return 'Отменен';
      default: return status;
    }
  };

  const filteredWorks = (works: any[]) => {
    if (!works) return [];
    
    let filtered = works;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(work => work.status === statusFilter);
    }
    
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(work => 
        work.title.toLowerCase().includes(search) ||
        work.description.toLowerCase().includes(search) ||
        work.subject?.name.toLowerCase().includes(search) ||
        work.work_type?.name.toLowerCase().includes(search) ||
        work.client?.first_name?.toLowerCase().includes(search) ||
        work.client?.last_name?.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  };

  return (
    <>
    <Layout style={{ minHeight: '100vh' }} className={styles.myWorksPage}>
      <Sidebar
        selectedKey="works"
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
        userProfile={profile ? {
          username: profile.username,
          avatar: profile.avatar,
          role: profile.role
        } : undefined}
      />
      <Layout style={{ marginLeft: isMobile ? 0 : 250 }}>
        <Header
          style={{
            background: '#fff',
            padding: isMobile ? '0 16px' : '0 24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 100,
            margin: 0,
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <Button
                type="primary"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuVisible(true)}
                style={{
                  borderRadius: '8px',
                  height: '40px',
                  width: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            )}
            <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
              Мои работы
            </Title>
          </div>
          <Space>
            <Button
              type="default"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              size={isMobile ? 'middle' : 'middle'}
            >
              {!isMobile && 'Выйти'}
            </Button>
          </Space>
        </Header>
        <Content
          style={{
            margin: isMobile ? '0' : '24px',
            padding: isMobile ? '16px' : '24px',
            background: '#fff',
            borderRadius: isMobile ? '0' : '8px',
            minHeight: 'calc(100vh - 112px)',
            marginBottom: isMobile ? '80px' : '24px',
          }}
        >
          <div className={styles.contentContainer}>
            {/* Статистика */}
            <Row gutter={[24, 24]} style={{ marginTop: 24, marginBottom: 32 }}>
              <Col xs={24} sm={12} md={6}>
                <Card className={styles.statsCard}>
                  <Statistic
                    title="Завершенные работы"
                    value={completedWorks?.length || 0}
                    prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />}
                    valueStyle={{ color: '#10b981' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className={styles.statsCard}>
                  <Statistic
                    title="В работе"
                    value={inProgressWorks?.length || 0}
                    prefix={<ClockCircleOutlined style={{ color: '#f59e0b' }} />}
                    valueStyle={{ color: '#f59e0b' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className={styles.statsCard}>
                  <Statistic
                    title="Общий доход"
                    value={completedWorks?.reduce((sum: number, work: any) => sum + (work.budget || 0), 0) || 0}
                    prefix={<DollarOutlined style={{ color: '#3b82f6' }} />}
                    suffix="₽"
                    valueStyle={{ color: '#3b82f6' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className={styles.statsCard}>
                  <Statistic
                    title="Средний рейтинг"
                    value={completedWorks?.length ? 
                      (completedWorks.reduce((sum: number, work: any) => sum + (work.rating || 0), 0) / completedWorks.length).toFixed(1) : 
                      '0.0'
                    }
                    prefix={<StarFilled style={{ color: '#fbbf24' }} />}
                    valueStyle={{ color: '#fbbf24' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Фильтры и поиск */}
            <Card className={styles.filterCard}>
              <Row gutter={[24, 24]} align="middle">
                <Col xs={24} sm={12} md={8}>
                  <Input
                    placeholder="Поиск по работам..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                    className={styles.searchInput}
                  />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Select
                    placeholder="Фильтр по статусу"
                    style={{ width: '100%' }}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    suffixIcon={<FilterOutlined />}
                    className={styles.filterSelect}
                  >
                    <Select.Option value="all">Все статусы</Select.Option>
                    <Select.Option value="completed">Завершенные</Select.Option>
                    <Select.Option value="in_progress">В работе</Select.Option>
                    <Select.Option value="review">На проверке</Select.Option>
                    <Select.Option value="cancelled">Отмененные</Select.Option>
                  </Select>
                </Col>
              </Row>
            </Card>

            {/* Вкладки работ */}
            <div className={styles.tabsContainer}>
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                  {
                    key: 'completed',
                    label: `Завершенные (${completedWorks?.length || 0})`,
                    children: (
                      <div>
                        {completedLoading ? (
                          <div style={{ textAlign: 'center', padding: '50px 0' }}>
                            <Spin size="large" />
                          </div>
                        ) : filteredWorks(completedWorks || []).length === 0 ? (
                          <Empty
                            description="Нет завершенных работ"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                          />
                        ) : (
                          <Row gutter={[24, 24]}>
                            {filteredWorks(completedWorks || []).map((work: any) => (
                              <Col xs={24} sm={12} lg={8} key={work.id}>
                                <Card
                                  hoverable
                                  className={styles.workCard}
                                  actions={[
                                    <Button
                                      type="link"
                                      icon={<EyeOutlined />}
                                      onClick={() => {
                                        setSelectedWork(work);
                                        setWorkDetailModalVisible(true);
                                      }}
                                    >
                                      Подробнее
                                    </Button>,
                                    <Button
                                      type="link"
                                      icon={<MessageOutlined />}
                                      onClick={() => setMessageModalVisible(true)}
                                    >
                                      Написать
                                    </Button>
                                  ]}
                                >
                                  <div style={{ marginBottom: 12 }}>
                                    <Typography.Title level={5} style={{ margin: 0, marginBottom: 8 }}>
                                      {work.title}
                                    </Typography.Title>
                                    <Tag color="green" style={{ marginBottom: 8 }}>
                                      {getStatusText(work.status)}
                                    </Tag>
                                  </div>
                                  
                                  <Typography.Paragraph
                                    ellipsis={{ rows: 2 }}
                                    style={{ color: '#6b7280', marginBottom: 12 }}
                                  >
                                    {work.description}
                                  </Typography.Paragraph>

                                  <div style={{ marginBottom: 12 }}>
                                    <Space wrap>
                                      <Tag color="blue">{work.subject?.name}</Tag>
                                      <Tag>{work.work_type?.name}</Tag>
                                    </Space>
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Typography.Text strong style={{ fontSize: 16, color: '#10b981' }}>
                                      {work.budget?.toLocaleString('ru-RU')} ₽
                                    </Typography.Text>
                                    {work.rating && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Rate disabled defaultValue={work.rating} style={{ fontSize: 14 }} />
                                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                          {work.rating}/5
                                        </Typography.Text>
                                      </div>
                                    )}
                                  </div>

                                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                    Заказчик: {work.client?.first_name} {work.client?.last_name}
                                  </Typography.Text>
                                  <br />
                                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                    Завершено: {dayjs(work.completed_at).format('DD.MM.YYYY')}
                                  </Typography.Text>
                                </Card>
                              </Col>
                            ))}
                          </Row>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'in_progress',
                    label: `В работе (${inProgressWorks?.length || 0})`,
                    children: (
                      <div>
                        {inProgressLoading ? (
                          <div style={{ textAlign: 'center', padding: '50px 0' }}>
                            <Spin size="large" />
                          </div>
                        ) : filteredWorks(inProgressWorks || []).length === 0 ? (
                          <Empty
                            description="Нет работ в процессе"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                          />
                        ) : (
                          <Row gutter={[24, 24]}>
                            {filteredWorks(inProgressWorks || []).map((work: any) => (
                              <Col xs={24} sm={12} lg={8} key={work.id}>
                                <Card
                                  hoverable
                                  className={styles.workCard}
                                >
                                  <Typography.Title level={5} style={{ margin: 0, marginBottom: 8 }}>
                                    {work.title}
                                  </Typography.Title>
                                </Card>
                              </Col>
                            ))}
                          </Row>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>

      {/* Модальные окна */}
      <ProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        profile={profile}
        userProfile={profile}
      />
      
      <ApplicationModal
        visible={applicationModalVisible}
        onClose={() => setApplicationModalVisible(false)}
      />
      
      <WelcomeModal
        visible={welcomeModalVisible}
        onClose={() => setWelcomeModalVisible(false)}
        userProfile={profile}
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
        profile={profile}
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

export default MyWorks;
