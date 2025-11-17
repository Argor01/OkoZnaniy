import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Button, 
  Input, 
  Select, 
  Card, 
  Space, 
  Typography, 
  Switch, 
  Avatar,
  Badge,
  Menu,
  Modal,
  Collapse,
  message,
  DatePicker
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  DownOutlined,
  UserOutlined,
  SettingOutlined,
  MessageOutlined,
  BellOutlined,
  CalendarOutlined,
  TrophyOutlined,
  WalletOutlined,
  ShoppingOutlined,
  FileDoneOutlined,
  ShopOutlined,
  TeamOutlined,
  HeartOutlined,
  GiftOutlined,
  DollarOutlined,
  PoweroffOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  StarOutlined,
  StarFilled,
  SendOutlined,
  SmileOutlined,
  PaperClipOutlined,
  MobileOutlined,
  CommentOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { authApi } from '../api/auth';
import styles from './ExpertDashboard.module.css';

const { Text, Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  avatar?: string;
}

const MyWorks: React.FC = () => {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<string>('newness');
  const [selectedMenuKey, setSelectedMenuKey] = useState<string>('works-all');
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  
  // Состояния для модальных окон (заглушки для полноты функциональности)
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [messageTab, setMessageTab] = useState<string>('all');
  const [messageText, setMessageText] = useState<string>('');
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [financeModalVisible, setFinanceModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [notificationTab, setNotificationTab] = useState<string>('all');
  const [arbitrationModalVisible, setArbitrationModalVisible] = useState(false);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  // Пример данных работ (заглушка)
  const works: any[] = [];

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
              onClick={() => navigate('/expert')}
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
              onClick={() => navigate('/expert')}
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
              onClick={() => navigate('/expert')}
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
              if (key === 'balance' || key.startsWith('balance-')) {
                setFinanceModalVisible(true);
                return;
              }
              if (key.startsWith('orders-')) {
                navigate('/expert');
                return;
              }
              if (key === 'works') {
                // Уже на этой странице
                return;
              }
              if (key === 'shop-ready-works') {
                navigate('/shop/ready-works');
                return;
              }
              if (key === 'shop-add-work') {
                navigate('/shop/add-work');
                return;
              }
              if (key === 'shop-my-works') {
                // Уже на этой странице
                return;
              }
              if (key === 'shop-purchased') {
                navigate('/shop/purchased');
                return;
              }
              if (key === 'logout') {
                authApi.logout();
                navigate('/');
                window.location.reload();
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
              <Menu.Item key="shop-ready-works">Магазин готовых работ</Menu.Item>
              <Menu.Item key="shop-add-work">Добавить работу в магазин</Menu.Item>
              <Menu.Item key="shop-my-works">Мои работы</Menu.Item>
              <Menu.Item key="shop-purchased">Купленные работы</Menu.Item>
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
          <div style={{ 
            display: 'flex',
            gap: '24px'
          }}>
            {/* Левая боковая панель для поиска */}
            <div style={{ width: '320px', flexShrink: 0 }}>
              {/* Поиск работ */}
              <Card 
                style={{ 
                  borderRadius: 16, 
                  marginBottom: 16,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
              >
                <Title level={5} style={{ marginBottom: 16 }}>
                  Поиск работ
                </Title>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Input 
                    placeholder="Текст поиска"
                    style={{ borderRadius: 8 }}
                  />
                  <Select 
                    defaultValue="all" 
                    style={{ width: '100%' }}
                    suffixIcon={<DownOutlined />}
                  >
                    <Option value="all">Все разделы</Option>
                  </Select>
                  <Select 
                    placeholder="Выбрать предмет"
                    style={{ width: '100%' }}
                    suffixIcon={<DownOutlined />}
                  >
                    <Option value="math">Математика</Option>
                    <Option value="physics">Физика</Option>
                  </Select>
                  <Select 
                    placeholder="Тип работы"
                    style={{ width: '100%' }}
                    suffixIcon={<DownOutlined />}
                  >
                    <Option value="practical">Практическая работа</Option>
                    <Option value="control">Контрольная работа</Option>
                  </Select>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14 }}>Только без покупок</Text>
                    <Switch size="small" />
                  </div>
                  <Button 
                    type="primary"
                    icon={<SearchOutlined />}
                    block
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                      border: 'none',
                      borderRadius: 8,
                      height: 40
                    }}
                  >
                    Поиск
                  </Button>
                </Space>
              </Card>

              {/* Призыв к действию */}
              <Card 
                style={{ 
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
              >
                <Title level={5} style={{ color: '#ffffff', marginBottom: 8 }}>
                  Здесь вам помогут написать учебную работу.
                </Title>
                <Text style={{ color: '#ffffff', display: 'block', marginBottom: 16, fontSize: 14 }}>
                  Размести задание и выбери лучшего специалиста!
                </Text>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Input 
                    placeholder="Название работы"
                    style={{ borderRadius: 8 }}
                  />
                  <Select 
                    placeholder="Тип работы"
                    style={{ width: '100%' }}
                    suffixIcon={<DownOutlined />}
                  >
                    <Option value="practical">Практическая работа</Option>
                    <Option value="control">Контрольная работа</Option>
                  </Select>
                  <Button 
                    type="default"
                    block
                    style={{
                      background: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      height: 40,
                      color: '#667eea',
                      fontWeight: 500
                    }}
                    onClick={() => navigate('/create-order')}
                  >
                    Разместить заказ
                  </Button>
                </Space>
              </Card>
            </div>

            {/* Основной контент */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Заголовок */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 24
              }}>
                <Title level={2} style={{ margin: 0, color: '#1f2937' }}>
                  Мои работы
                </Title>
                <Space>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>
                    Всего <Text strong style={{ color: '#3b82f6' }}>{works.length}</Text> работ
                  </Text>
                  <Button 
                    type="primary"
                    icon={<PlusOutlined />}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                      border: 'none',
                      borderRadius: 8,
                      height: 40
                    }}
                    onClick={() => navigate('/shop/add-work')}
                  >
                    Добавить работу
                  </Button>
                </Space>
              </div>

              {/* Сортировка */}
              <div style={{ 
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                <Text style={{ fontSize: 14, color: '#6b7280' }}>Сортировать по:</Text>
                <Button 
                  type={sortBy === 'price' ? 'primary' : 'text'}
                  onClick={() => setSortBy('price')}
                  style={{ 
                    color: sortBy === 'price' ? '#ffffff' : '#6b7280',
                    background: sortBy === 'price' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' : 'transparent',
                    border: 'none'
                  }}
                >
                  Цена
                </Button>
                <Button 
                  type={sortBy === 'popularity' ? 'primary' : 'text'}
                  onClick={() => setSortBy('popularity')}
                  style={{ 
                    color: sortBy === 'popularity' ? '#ffffff' : '#6b7280',
                    background: sortBy === 'popularity' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' : 'transparent',
                    border: 'none'
                  }}
                >
                  Популярности
                </Button>
                <Button 
                  type={sortBy === 'newness' ? 'primary' : 'text'}
                  onClick={() => setSortBy('newness')}
                  icon={sortBy === 'newness' && <DownOutlined />}
                  style={{ 
                    color: sortBy === 'newness' ? '#ffffff' : '#6b7280',
                    background: sortBy === 'newness' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' : 'transparent',
                    border: 'none'
                  }}
                >
                  Новизне
                </Button>
              </div>

              {/* Список работ */}
              <div style={{ 
                background: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                padding: '48px 24px',
                minHeight: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Text type="secondary" style={{ fontSize: 14 }}>
                  {works.length === 0 ? 'Нет работ' : 'Список работ будет отображаться здесь'}
                </Text>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Модальные окна - минимальные заглушки для полноты функциональности */}
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
              paddingRight: '48px',
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
      <Modal
        open={friendsModalVisible}
        onCancel={() => setFriendsModalVisible(false)}
        footer={null}
        title="Мои друзья"
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
    </div>
  );
};

export default MyWorks;

