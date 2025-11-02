import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Button, 
  Input, 
  InputNumber,
  Select, 
  Card, 
  Space, 
  Typography, 
  Row,
  Col,
  Avatar,
  Badge,
  Menu,
  Modal,
  Collapse,
  DatePicker,
  message
} from 'antd';
import { 
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
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
  LinkOutlined,
  PictureOutlined,
  UndoOutlined,
  RedoOutlined,
  StarOutlined,
  StarFilled,
  MobileOutlined,
  SendOutlined,
  SmileOutlined,
  PaperClipOutlined,
  CommentOutlined,
  SearchOutlined,
  PlusOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
const { RangePicker } = DatePicker;
import { authApi } from '../api/auth';
import styles from './ExpertDashboard.module.css';

const { Text, Title } = Typography;
const { TextArea } = Input;
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

const AddWorkToShop: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMenuKey, setSelectedMenuKey] = useState<string>('shop-add-work');
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    price: 0,
    type: '',
    subject: '',
    language: 'russian',
    description: '',
    tableOfContents: '',
    bibliography: ''
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  // Состояния для модальных окон
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [messageTab, setMessageTab] = useState<string>('all');
  const [messageText, setMessageText] = useState<string>('');
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [financeModalVisible, setFinanceModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [notificationTab, setNotificationTab] = useState<string>('all');
  const [arbitrationModalVisible, setArbitrationModalVisible] = useState(false);

  // Компонент тулбара редактора
  const EditorToolbar: React.FC<{ 
    onFormat: (format: string) => void;
    onInsert: (type: 'link' | 'image') => void;
  }> = ({ onFormat, onInsert }) => (
    <div style={{ 
      display: 'flex', 
      gap: 4, 
      padding: '8px 12px',
      borderBottom: '1px solid #e5e7eb',
      background: '#f9fafb',
      borderRadius: '8px 8px 0 0'
    }}>
      <Space size="small" wrap>
        <Button 
          type="text" 
          size="small"
          icon={<BoldOutlined />}
          onClick={() => onFormat('bold')}
          style={{ fontSize: 14 }}
        />
        <Button 
          type="text" 
          size="small"
          icon={<ItalicOutlined />}
          onClick={() => onFormat('italic')}
          style={{ fontSize: 14 }}
        />
        <Button 
          type="text" 
          size="small"
          icon={<UnderlineOutlined />}
          onClick={() => onFormat('underline')}
          style={{ fontSize: 14 }}
        />
        <Button 
          type="text" 
          size="small"
          icon={<StrikethroughOutlined />}
          onClick={() => onFormat('strikethrough')}
          style={{ fontSize: 14 }}
        />
        <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 4px' }} />
        <Button 
          type="text" 
          size="small"
          icon={<AlignLeftOutlined />}
          onClick={() => onFormat('alignLeft')}
          style={{ fontSize: 14 }}
        />
        <Button 
          type="text" 
          size="small"
          icon={<AlignCenterOutlined />}
          onClick={() => onFormat('alignCenter')}
          style={{ fontSize: 14 }}
        />
        <Button 
          type="text" 
          size="small"
          icon={<AlignRightOutlined />}
          onClick={() => onFormat('alignRight')}
          style={{ fontSize: 14 }}
        />
        <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 4px' }} />
        <Button 
          type="text" 
          size="small"
          icon={<LinkOutlined />}
          onClick={() => onInsert('link')}
          style={{ fontSize: 14 }}
        />
        <Button 
          type="text" 
          size="small"
          icon={<PictureOutlined />}
          onClick={() => onInsert('image')}
          style={{ fontSize: 14 }}
        />
        <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 4px' }} />
        <Button 
          type="text" 
          size="small"
          icon={<UndoOutlined />}
          onClick={() => onFormat('undo')}
          style={{ fontSize: 14 }}
        />
        <Button 
          type="text" 
          size="small"
          icon={<RedoOutlined />}
          onClick={() => onFormat('redo')}
          style={{ fontSize: 14 }}
        />
      </Space>
    </div>
  );

  // Компонент редактора
  const RichTextEditor: React.FC<{ 
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  }> = ({ value, onChange, placeholder }) => {
    const handleFormat = (format: string) => {
      // Простая реализация форматирования
      // В реальном проекте можно использовать document.execCommand или библиотеку
      console.log('Format:', format);
    };

    const handleInsert = (type: 'link' | 'image') => {
      console.log('Insert:', type);
    };

    return (
      <div style={{ 
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#ffffff'
      }}>
        <EditorToolbar onFormat={handleFormat} onInsert={handleInsert} />
        <TextArea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={8}
          style={{
            border: 'none',
            borderRadius: 0,
            resize: 'vertical'
          }}
        />
      </div>
    );
  };

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
                navigate('/works');
                return;
              }
              if (key === 'shop-ready-works') {
                navigate('/shop/ready-works');
                return;
              }
              if (key === 'shop-add-work') {
                // Уже на этой странице
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
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {/* Заголовок */}
            <Title level={2} style={{ marginBottom: 32, color: '#1f2937', textAlign: 'center' }}>
              Добавить новую работу
            </Title>

            {/* Форма */}
            <Card 
              style={{ 
                borderRadius: 16,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* Первая строка */}
                <Row gutter={16}>
                  <Col span={12}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      Название работы
                    </Text>
                    <Input
                      placeholder="Введите название работы"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      style={{ borderRadius: 8 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      Стоимость работы
                    </Text>
                    <InputNumber
                      placeholder="Введите стоимость работы"
                      value={formData.price}
                      onChange={(value) => setFormData({ ...formData, price: value || 0 })}
                      style={{ width: '100%', borderRadius: 8 }}
                      min={0}
                      addonAfter="₽"
                    />
                  </Col>
                </Row>

                {/* Вторая строка */}
                <Row gutter={16}>
                  <Col span={8}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      Выбрать тип
                    </Text>
                    <Select
                      placeholder="Выбрать тип"
                      value={formData.type}
                      onChange={(value) => setFormData({ ...formData, type: value })}
                      style={{ width: '100%', borderRadius: 8 }}
                    >
                      <Option value="practical">Практическая работа</Option>
                      <Option value="control">Контрольная работа</Option>
                      <Option value="essay">Эссе</Option>
                      <Option value="coursework">Курсовая работа</Option>
                      <Option value="thesis">Дипломная работа</Option>
                    </Select>
                  </Col>
                  <Col span={8}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      Выбрать предмет
                    </Text>
                    <Select
                      placeholder="Выбрать предмет"
                      value={formData.subject}
                      onChange={(value) => setFormData({ ...formData, subject: value })}
                      style={{ width: '100%', borderRadius: 8 }}
                    >
                      <Option value="math">Математика</Option>
                      <Option value="physics">Физика</Option>
                      <Option value="chemistry">Химия</Option>
                      <Option value="history">История</Option>
                      <Option value="literature">Литература</Option>
                    </Select>
                  </Col>
                  <Col span={8}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      Язык
                    </Text>
                    <Select
                      value={formData.language}
                      onChange={(value) => setFormData({ ...formData, language: value })}
                      style={{ width: '100%', borderRadius: 8 }}
                    >
                      <Option value="russian">Русский</Option>
                      <Option value="english">English</Option>
                      <Option value="german">Deutsch</Option>
                      <Option value="french">Français</Option>
                    </Select>
                  </Col>
                </Row>

                {/* Подробное описание */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 12 }}>
                    Подробное описание
                  </Text>
                  <RichTextEditor
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    placeholder="Подробное описание вашей работы"
                  />
                </div>

                {/* Оглавление */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 12 }}>
                    Оглавление
                  </Text>
                  <RichTextEditor
                    value={formData.tableOfContents}
                    onChange={(value) => setFormData({ ...formData, tableOfContents: value })}
                    placeholder="Оглавление работы"
                  />
                </div>

                {/* Список литературы */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 12 }}>
                    Список литературы
                  </Text>
                  <RichTextEditor
                    value={formData.bibliography}
                    onChange={(value) => setFormData({ ...formData, bibliography: value })}
                    placeholder="Список литературы"
                  />
                </div>

                {/* Кнопки действий */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                  <Button
                    onClick={() => navigate('/shop/ready-works')}
                    style={{ borderRadius: 8, height: 40 }}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => {
                      // Логика сохранения работы
                      console.log('Save work:', formData);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                      border: 'none',
                      borderRadius: 8,
                      height: 40
                    }}
                  >
                    Сохранить
                  </Button>
                </div>
              </Space>
            </Card>
          </div>
        </div>
      </div>

      {/* Модальные окна - те же что и в ShopReadyWorks */}
      {/* Модальное окно сообщений */}
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
          <div style={{ 
            width: '300px', 
            background: '#f3f4f6', 
            borderRight: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column'
          }}>
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
            <div style={{ padding: '12px', background: '#ffffff' }}>
              <Input
                prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                placeholder="Поиск пользователя"
                style={{ borderRadius: 8 }}
              />
            </div>
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
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            background: '#ffffff'
          }}>
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

      {/* Модальное окно FAQ - код идентичен ShopReadyWorks */}
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ fontSize: 20, color: '#1f2937', display: 'block', marginBottom: 20 }}>
              История операций
            </Text>
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              <Select defaultValue="all" style={{ width: 180 }} suffixIcon={<DownOutlined />}>
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
          <div style={{ width: 300, flexShrink: 0 }}>
            <div style={{ 
              background: '#f9fafb', 
              borderRadius: 16, 
              padding: '24px',
              border: '1px solid #e5e7eb'
            }}>
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
          <Text strong style={{ fontSize: 24, color: '#1f2937', display: 'block', marginBottom: 24 }}>
            Уведомления
          </Text>
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
          </div>
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
          <Text strong style={{ 
            fontSize: 24, 
            color: '#1f2937', 
            display: 'block', 
            marginBottom: 24 
          }}>
            Арбитраж
          </Text>
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
    </div>
  );
};

export default AddWorkToShop;

