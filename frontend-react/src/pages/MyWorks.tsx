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
  Modal
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
  CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { authApi } from '../api/auth';
import styles from './ExpertDashboard.module.css';

const { Text, Title } = Typography;
const { Option } = Select;

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
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [financeModalVisible, setFinanceModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [arbitrationModalVisible, setArbitrationModalVisible] = useState(false);

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
        <div className={styles.sidebar}>
          {/* User Profile Section */}
          <div className={styles.sidebarProfile}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
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
            <div style={{ flex: 1, marginLeft: 12 }}>
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
              if (key.startsWith('works-')) {
                setSelectedMenuKey(key);
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
            <Menu.Item key="calendar" icon={<CalendarOutlined />}>
              {dayjs().format('DD MMMM YYYY')}
            </Menu.Item>
            <Menu.Item key="arbitration" icon={<TrophyOutlined />}>
              Арбитраж
            </Menu.Item>
            <Menu.SubMenu key="balance" icon={<WalletOutlined />} title="На счету: 0.00 ₽">
              <Menu.Item key="balance-available" style={{ color: '#10b981' }}>
                Доступно к выводу: 0.00 ₽
              </Menu.Item>
              <Menu.Item key="balance-blocked" style={{ color: '#ef4444' }}>
                Заблокировано: 0.00 ₽
              </Menu.Item>
              <Menu.Item key="balance-held" style={{ color: '#6b7280' }}>
                Удержано: 0.00 ₽
              </Menu.Item>
            </Menu.SubMenu>
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
            <Menu.SubMenu key="works" icon={<FileDoneOutlined />} title="Мои работы">
              <Menu.Item key="works-all">Все (0)</Menu.Item>
              <Menu.Item key="works-open">Открыт (0)</Menu.Item>
              <Menu.Item key="works-confirming">На подтверждении (0)</Menu.Item>
              <Menu.Item key="works-progress">На выполнении (0)</Menu.Item>
              <Menu.Item key="works-payment">Ожидает оплаты (0)</Menu.Item>
              <Menu.Item key="works-review">На проверке (0)</Menu.Item>
              <Menu.Item key="works-completed">Выполнен (0)</Menu.Item>
              <Menu.Item key="works-revision">На доработке (0)</Menu.Item>
              <Menu.Item key="works-download">Ожидает скачивания (0)</Menu.Item>
              <Menu.Item key="works-closed">Закрыт (0)</Menu.Item>
            </Menu.SubMenu>
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
      <Modal
        open={messageModalVisible}
        onCancel={() => setMessageModalVisible(false)}
        footer={null}
        title="Сообщения"
      >
        <Text>Функционал сообщений будет реализован</Text>
      </Modal>
      <Modal
        open={faqModalVisible}
        onCancel={() => setFaqModalVisible(false)}
        footer={null}
        title="FAQ"
      >
        <Text>FAQ будет реализован</Text>
      </Modal>
      <Modal
        open={financeModalVisible}
        onCancel={() => setFinanceModalVisible(false)}
        footer={null}
        title="Финансы"
      >
        <Text>Финансы будут реализованы</Text>
      </Modal>
      <Modal
        open={notificationsModalVisible}
        onCancel={() => setNotificationsModalVisible(false)}
        footer={null}
        title="Уведомления"
      >
        <Text>Уведомления будут реализованы</Text>
      </Modal>
      <Modal
        open={arbitrationModalVisible}
        onCancel={() => setArbitrationModalVisible(false)}
        footer={null}
        title="Арбитраж"
      >
        <Text>Арбитраж будет реализован</Text>
      </Modal>
    </div>
  );
};

export default MyWorks;

