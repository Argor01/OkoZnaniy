import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Typography, Tag, message, Upload, Space, InputNumber, Input, Spin, Modal, Form, InputNumber as AntInputNumber, Row, Col, Avatar, Badge, Tabs, Select, Rate, Menu, Collapse, DatePicker, Layout, Popover } from 'antd';
import { UploadOutlined, UserOutlined, PlusOutlined, DeleteOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, LogoutOutlined, EditOutlined, ArrowLeftOutlined, MessageOutlined, TrophyOutlined, LikeOutlined, DislikeOutlined, ShoppingOutlined, FileDoneOutlined, SettingOutlined, BellOutlined, CalendarOutlined, WalletOutlined, ShopOutlined, TeamOutlined, HeartOutlined, GiftOutlined, DollarOutlined, PoweroffOutlined, SearchOutlined, StarOutlined, StarFilled, MobileOutlined, SendOutlined, SmileOutlined, PaperClipOutlined, QuestionCircleOutlined, DownOutlined, FileTextOutlined, CommentOutlined } from '@ant-design/icons';
import EmojiPicker from 'emoji-picker-react';
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

interface Notification {
  id: number;
  type: 'order' | 'claim' | 'forum' | 'question' | 'system';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  icon?: React.ReactNode;
  actionUrl?: string;
}

interface ArbitrationCase {
  id: number;
  orderId: number;
  orderTitle: string;
  clientName: string;
  status: 'pending' | 'in_review' | 'resolved' | 'rejected';
  reason: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  amount: number;
  decision?: string;
  documents?: string[];
}

interface ChatMessage {
  id: number;
  chatId: number;
  userName: string;
  userAvatar?: string;
  lastMessage: string;
  timestamp: string;
  isRead: boolean;
  isOnline: boolean;
  unreadCount: number;
  messages: {
    id: number;
    text: string;
    timestamp: string;
    isMine: boolean;
    isRead: boolean;
  }[];
}

const { Title, Text, Paragraph } = Typography;
const { Header, Sider, Content, Footer } = Layout;

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
  const [arbitrationStatusFilter, setArbitrationStatusFilter] = useState<string>('all');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [createOrderModalVisible, setCreateOrderModalVisible] = useState(false);
  const [friendChatModalVisible, setFriendChatModalVisible] = useState(false);
  const [friendProfileModalVisible, setFriendProfileModalVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 840);
  const uploadRef = useRef<any>(null);

  // Forms
  const [profileForm] = Form.useForm();
  const [applicationForm] = Form.useForm();
  const [specializationForm] = Form.useForm();
  const [createOrderForm] = Form.useForm();

  // Тестовые данные для уведомлений
  const mockNotifications: Notification[] = [
    {
      id: 1,
      type: 'order',
      title: 'Новый заказ доступен',
      message: 'Появился новый заказ по математике. Срок выполнения: 3 дня. Бюджет: 5000₽',
      timestamp: '2 минуты назад',
      isRead: false,
      icon: <FileDoneOutlined style={{ color: '#3b82f6' }} />
    },
    {
      id: 2,
      type: 'order',
      title: 'Заказ принят',
      message: 'Ваша ставка на заказ "Решение задач по физике" была принята заказчиком',
      timestamp: '1 час назад',
      isRead: false,
      icon: <CheckCircleOutlined style={{ color: '#10b981' }} />
    },
    {
      id: 3,
      type: 'claim',
      title: 'Новая претензия',
      message: 'Заказчик открыл претензию по заказу #1234. Требуется ваш ответ',
      timestamp: '3 часа назад',
      isRead: true,
      icon: <TrophyOutlined style={{ color: '#f59e0b' }} />
    },
    {
      id: 4,
      type: 'forum',
      title: 'Новый комментарий',
      message: 'Пользователь Иван ответил на ваш вопрос в форуме "Методы решения интегралов"',
      timestamp: '5 часов назад',
      isRead: true,
      icon: <CommentOutlined style={{ color: '#8b5cf6' }} />
    },
    {
      id: 5,
      type: 'question',
      title: 'Вопрос от заказчика',
      message: 'Заказчик задал вопрос по заказу "Курсовая работа по экономике"',
      timestamp: '1 день назад',
      isRead: true,
      icon: <QuestionCircleOutlined style={{ color: '#06b6d4' }} />
    },
    {
      id: 6,
      type: 'system',
      title: 'Обновление профиля',
      message: 'Ваш профиль успешно верифицирован. Теперь вы можете принимать больше заказов',
      timestamp: '2 дня назад',
      isRead: true,
      icon: <CheckCircleOutlined style={{ color: '#10b981' }} />
    },
    {
      id: 7,
      type: 'order',
      title: 'Заказ завершен',
      message: 'Заказ "Лабораторная работа по химии" успешно завершен. Средства зачислены на ваш счет',
      timestamp: '3 дня назад',
      isRead: true,
      icon: <DollarOutlined style={{ color: '#10b981' }} />
    },
    {
      id: 8,
      type: 'forum',
      title: 'Новая тема в форуме',
      message: 'Создана новая тема "Лучшие практики оформления дипломных работ"',
      timestamp: '4 дня назад',
      isRead: true,
      icon: <CommentOutlined style={{ color: '#8b5cf6' }} />
    }
  ];

  // Тестовые данные для арбитража
  const mockArbitrationCases: ArbitrationCase[] = [
    {
      id: 1,
      orderId: 1234,
      orderTitle: 'Решение задач по высшей математике',
      clientName: 'Иван Петров',
      status: 'pending',
      reason: 'Несоответствие качества работы',
      description: 'Заказчик утверждает, что решения задач содержат ошибки и не соответствуют требованиям задания. Требует полного возврата средств.',
      createdAt: '2 дня назад',
      updatedAt: '1 день назад',
      amount: 5000,
      documents: ['solution.pdf', 'requirements.docx']
    },
    {
      id: 2,
      orderId: 1189,
      orderTitle: 'Курсовая работа по экономике',
      clientName: 'Мария Сидорова',
      status: 'in_review',
      reason: 'Нарушение сроков выполнения',
      description: 'Работа была сдана с опозданием на 3 дня. Заказчик требует компенсацию за нарушение сроков.',
      createdAt: '5 дней назад',
      updatedAt: '2 часа назад',
      amount: 8000,
      documents: ['coursework.pdf', 'chat_history.txt']
    },
    {
      id: 3,
      orderId: 1056,
      orderTitle: 'Лабораторная работа по физике',
      clientName: 'Алексей Смирнов',
      status: 'resolved',
      reason: 'Плагиат',
      description: 'Заказчик обнаружил, что часть работы была скопирована из интернета без указания источников.',
      createdAt: '10 дней назад',
      updatedAt: '3 дня назад',
      amount: 3500,
      decision: 'Арбитраж решен в пользу заказчика. Произведен частичный возврат средств (50%).',
      documents: ['lab_work.pdf', 'plagiarism_report.pdf']
    },
    {
      id: 4,
      orderId: 987,
      orderTitle: 'Дипломная работа по программированию',
      clientName: 'Елена Козлова',
      status: 'rejected',
      reason: 'Необоснованная претензия',
      description: 'Заказчик требовал дополнительные правки, не предусмотренные первоначальным заданием.',
      createdAt: '15 дней назад',
      updatedAt: '7 дней назад',
      amount: 15000,
      decision: 'Претензия отклонена. Работа выполнена в полном соответствии с техническим заданием.',
      documents: ['diploma.pdf', 'technical_requirements.docx', 'correspondence.txt']
    }
  ];

  // Тестовые данные для сообщений
  const mockMessages: ChatMessage[] = [
    {
      id: 1,
      chatId: 1,
      userName: 'Иван Петров',
      userAvatar: undefined,
      lastMessage: 'Здравствуйте! Когда будет готова работа?',
      timestamp: '2 мин назад',
      isRead: false,
      isOnline: true,
      unreadCount: 3,
      messages: [
        { id: 1, text: 'Здравствуйте! Я хотел бы заказать решение задач по математике', timestamp: '10:30', isMine: false, isRead: true },
        { id: 2, text: 'Здравствуйте! Конечно, пришлите задание', timestamp: '10:32', isMine: true, isRead: true },
        { id: 3, text: 'Вот файл с заданием', timestamp: '10:35', isMine: false, isRead: true },
        { id: 4, text: 'Принял в работу. Срок выполнения - 2 дня', timestamp: '10:40', isMine: true, isRead: true },
        { id: 5, text: 'Отлично, спасибо!', timestamp: '10:42', isMine: false, isRead: true },
        { id: 6, text: 'Здравствуйте! Когда будет готова работа?', timestamp: '14:25', isMine: false, isRead: false }
      ]
    },
    {
      id: 2,
      chatId: 2,
      userName: 'Мария Сидорова',
      userAvatar: undefined,
      lastMessage: 'Спасибо за помощь! Все отлично',
      timestamp: '1 час назад',
      isRead: true,
      isOnline: false,
      unreadCount: 0,
      messages: [
        { id: 1, text: 'Добрый день! Нужна помощь с курсовой по экономике', timestamp: 'Вчера 15:20', isMine: false, isRead: true },
        { id: 2, text: 'Здравствуйте! Какая тема курсовой?', timestamp: 'Вчера 15:25', isMine: true, isRead: true },
        { id: 3, text: 'Макроэкономический анализ', timestamp: 'Вчера 15:30', isMine: false, isRead: true },
        { id: 4, text: 'Хорошо, могу помочь. Срок - неделя', timestamp: 'Вчера 15:35', isMine: true, isRead: true },
        { id: 5, text: 'Спасибо за помощь! Все отлично', timestamp: '1 час назад', isMine: false, isRead: true }
      ]
    },
    {
      id: 3,
      chatId: 3,
      userName: 'Алексей Смирнов',
      userAvatar: undefined,
      lastMessage: 'Можете взять еще один заказ?',
      timestamp: '3 часа назад',
      isRead: false,
      isOnline: true,
      unreadCount: 1,
      messages: [
        { id: 1, text: 'Здравствуйте! Вы делаете лабораторные по физике?', timestamp: 'Вчера 12:00', isMine: false, isRead: true },
        { id: 2, text: 'Да, конечно. Какая тема?', timestamp: 'Вчера 12:15', isMine: true, isRead: true },
        { id: 3, text: 'Механика, колебания', timestamp: 'Вчера 12:20', isMine: false, isRead: true },
        { id: 4, text: 'Хорошо, пришлите задание', timestamp: 'Вчера 12:25', isMine: true, isRead: true },
        { id: 5, text: 'Можете взять еще один заказ?', timestamp: '3 часа назад', isMine: false, isRead: false }
      ]
    },
    {
      id: 4,
      chatId: 4,
      userName: 'Елена Козлова',
      userAvatar: undefined,
      lastMessage: 'Хорошо, жду результат',
      timestamp: '5 часов назад',
      isRead: true,
      isOnline: false,
      unreadCount: 0,
      messages: [
        { id: 1, text: 'Добрый вечер! Нужна дипломная работа', timestamp: '2 дня назад', isMine: false, isRead: true },
        { id: 2, text: 'Здравствуйте! Какая специальность?', timestamp: '2 дня назад', isMine: true, isRead: true },
        { id: 3, text: 'Программирование, веб-разработка', timestamp: '2 дня назад', isMine: false, isRead: true },
        { id: 4, text: 'Хорошо, жду результат', timestamp: '5 часов назад', isMine: false, isRead: true }
      ]
    },
    {
      id: 5,
      chatId: 5,
      userName: 'Дмитрий Волков',
      userAvatar: undefined,
      lastMessage: 'Отлично, договорились!',
      timestamp: '1 день назад',
      isRead: true,
      isOnline: false,
      unreadCount: 0,
      messages: [
        { id: 1, text: 'Здравствуйте! Нужна помощь с рефератом', timestamp: '3 дня назад', isMine: false, isRead: true },
        { id: 2, text: 'Добрый день! По какому предмету?', timestamp: '3 дня назад', isMine: true, isRead: true },
        { id: 3, text: 'История России', timestamp: '3 дня назад', isMine: false, isRead: true },
        { id: 4, text: 'Отлично, договорились!', timestamp: '1 день назад', isMine: false, isRead: true }
      ]
    }
  ];

  const [selectedChat, setSelectedChat] = useState<ChatMessage | null>(null);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [form] = Form.useForm();

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
    queryFn: async () => {
      const data = await ordersApi.getMyOrders({ status: 'completed' });
      // Если нет данных с сервера, возвращаем тестовые данные
      if (!data || data.length === 0) {
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
            client: { id: 101, username: 'student_ivan', first_name: 'Иван', last_name: 'Петров' }
          },
          {
            id: 1002,
            title: 'Курсовая работа по программированию',
            description: 'Разработано веб-приложение на React с использованием TypeScript. Реализованы все требуемые функции, включая авторизацию, CRUD операции и адаптивный дизайн.',
            budget: 8000,
            status: 'completed',
            subject: { id: 5, name: 'Программирование' },
            work_type: { id: 3, name: 'Курсовая работа' },
            deadline: '2024-11-18',
            created_at: '2024-11-10',
            client: { id: 102, username: 'maria_s', first_name: 'Мария', last_name: 'Сидорова' }
          },
          {
            id: 1003,
            title: 'Лабораторные работы по физике',
            description: 'Выполнено 5 лабораторных работ по механике и термодинамике. Все расчеты проверены, графики построены, выводы сформулированы.',
            budget: 2500,
            status: 'completed',
            subject: { id: 2, name: 'Физика' },
            work_type: { id: 2, name: 'Лабораторная работа' },
            deadline: '2024-11-22',
            created_at: '2024-11-17',
            client: { id: 103, username: 'alex_k', first_name: 'Алексей', last_name: 'Козлов' }
          },
          {
            id: 1004,
            title: 'Реферат по истории России',
            description: 'Написан реферат на тему "Реформы Петра I" объемом 20 страниц. Использованы научные источники, оформление по ГОСТ.',
            budget: 1500,
            status: 'completed',
            subject: { id: 8, name: 'История' },
            work_type: { id: 5, name: 'Реферат' },
            deadline: '2024-11-19',
            created_at: '2024-11-14',
            client: { id: 104, username: 'olga_v', first_name: 'Ольга', last_name: 'Васильева' }
          },
          {
            id: 1005,
            title: 'Дипломная работа по экономике',
            description: 'Выполнена дипломная работа на тему "Анализ финансового состояния предприятия". Проведен полный финансовый анализ, построены модели, сформулированы рекомендации.',
            budget: 15000,
            status: 'completed',
            subject: { id: 6, name: 'Экономика' },
            work_type: { id: 4, name: 'Дипломная работа' },
            deadline: '2024-11-25',
            created_at: '2024-11-01',
            client: { id: 105, username: 'dmitry_n', first_name: 'Дмитрий', last_name: 'Новиков' }
          }
        ] as any;
      }
      return data;
    },
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

  // Handle window resize for mobile responsiveness
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 840);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) return <Text>Загрузка...</Text>;
  if (isError) return <Text type="danger">Ошибка загрузки заказов</Text>;

  const orders: Order[] = data || [];

  const handleLogout = () => {
    Modal.confirm({
      title: 'Выход из системы',
      content: 'Вы уверены, что хотите выйти?',
      okText: 'Выйти',
      cancelText: 'Отмена',
      maskStyle: {
        backdropFilter: 'blur(4px)',
      },
      onOk: async () => {
        try {
          authApi.logout();
          message.success('Вы вышли из системы');
          navigate('/');
          window.location.reload();
        } catch (error) {
          authApi.logout();
          message.success('Вы вышли из системы');
          navigate('/');
          window.location.reload();
        }
      },
    });
  };

  return (
    <>
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={250}
        breakpoint="md"
        collapsedWidth={isMobile ? 0 : 80}
        collapsed={isMobile ? !mobileMenuVisible : undefined}
        onCollapse={(collapsed) => {
          if (isMobile) {
            setMobileMenuVisible(!collapsed);
          }
        }}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          position: isMobile ? 'fixed' : 'relative',
          bottom: isMobile ? 0 : 'auto',
          left: isMobile ? 0 : 'auto',
          right: isMobile ? 0 : 'auto',
          zIndex: isMobile ? 1000 : 'auto',
          height: isMobile ? 'auto' : '100vh',
          borderTop: isMobile ? '1px solid #f0f0f0' : 'none',
          borderRight: isMobile ? 'none' : '1px solid #f0f0f0',
        }}
      >
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <UserOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '8px' }} />
          <Title level={4} style={{ margin: 0, fontSize: '16px' }}>
            Личный кабинет
          </Title>
        </div>
        <Menu
          mode={isMobile ? "horizontal" : "inline"}
          selectedKeys={[selectedMenuKey]}
          openKeys={isMobile ? [] : openKeys}
          onOpenChange={setOpenKeys}
          triggerSubMenuAction="hover"
          onClick={({ key }) => {
            if (isMobile) {
              setMobileMenuVisible(false);
            }
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
            if (key === 'logout') {
              handleLogout();
              return;
            }
            setSelectedMenuKey(key);
          }}
          style={{
            borderRight: 0,
            height: 'calc(100vh - 120px)',
          }}
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
            {!isMobile ? (
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
            ) : (
              <Menu.Item key="orders" icon={<ShoppingOutlined />}>
                Заказы
              </Menu.Item>
            )}
            <Menu.Item key="works" icon={<FileDoneOutlined />}>
              Мои работы
            </Menu.Item>
            {!isMobile && (
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
            )}
            <Menu.Item key="friends" icon={<TeamOutlined />}>
              Мои друзья
            </Menu.Item>
            <Menu.Item key="faq" icon={<QuestionCircleOutlined />}>
              FAQ
            </Menu.Item>
          <Menu.Item 
            key="logout" 
            icon={<LogoutOutlined />}
            danger
          >
            Выйти
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: isMobile ? '0 16px' : '0 24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
              Личный кабинет
            </Title>
          </div>
          <Space>
            <Button
              type="default"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              size={isMobile ? 'small' : 'middle'}
            >
              {!isMobile && 'Выйти'}
            </Button>
          </Space>
        </Header>
        <Content
          style={{
            margin: isMobile ? '12px' : '24px',
            padding: isMobile ? '16px' : '24px',
            background: '#fff',
            borderRadius: '8px',
            minHeight: 'calc(100vh - 112px)',
            marginBottom: isMobile ? '80px' : '24px',
          }}
        >
        {/* Profile Header Block */}
        <div className={styles.profileBlock}>
          <div className={styles.profileBlockContent}>
            <div className={styles.profileLeft}>
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
                  <div className={styles.sectionCardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className={styles.sectionTitle}>О себе</h2>
                    <Button 
                      type="primary"
                      icon={<EditOutlined />}
                      className={styles.buttonPrimary}
                      onClick={() => {
                        profileForm.setFieldsValue({
                          bio: profile?.bio || 'Здравствуйте! Я опытный специалист с 5-летним стажем работы в сфере образования. Специализируюсь на помощи студентам в выполнении учебных работ по математике, физике и программированию. Имею высшее техническое образование и опыт преподавания в университете. Гарантирую качественное выполнение работ в срок, индивидуальный подход к каждому заказу и полное соответствие требованиям. Всегда на связи и готов ответить на любые вопросы по выполняемой работе.',
                          education: profile?.education || 'Московский государственный технический университет им. Н.Э. Баумана, факультет информатики и систем управления, специальность "Прикладная математика и информатика", 2015-2020 гг. Диплом с отличием.',
                          skills: profile?.skills || 'Математический анализ, Линейная алгебра, Дифференциальные уравнения, Теория вероятностей, Python, C++, JavaScript, Физика, Механика, Электродинамика'
                        });
                        setProfileModalVisible(true);
                      }}
                    >
                      Редактировать
                    </Button>
                  </div>
                  <Paragraph style={{ fontSize: 16, lineHeight: 1.8, color: '#4b5563' }}>
                    {profile?.bio || 'Здравствуйте! Я опытный специалист с 5-летним стажем работы в сфере образования. Специализируюсь на помощи студентам в выполнении учебных работ по математике, физике и программированию. Имею высшее техническое образование и опыт преподавания в университете. Гарантирую качественное выполнение работ в срок, индивидуальный подход к каждому заказу и полное соответствие требованиям. Всегда на связи и готов ответить на любые вопросы по выполняемой работе.'}
                  </Paragraph>
                  <div style={{ marginTop: 24 }}>
                    <Title level={4} style={{ marginBottom: 12 }}>Образование</Title>
                    <Paragraph style={{ fontSize: 16, lineHeight: 1.8, color: '#4b5563' }}>
                      {profile?.education || 'Московский государственный технический университет им. Н.Э. Баумана, факультет информатики и систем управления, специальность "Прикладная математика и информатика", 2015-2020 гг. Диплом с отличием.'}
                    </Paragraph>
                  </div>
                  <div style={{ marginTop: 24 }}>
                    <Title level={4} style={{ marginBottom: 12 }}>Навыки</Title>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {(profile?.skills ? profile.skills.split(',') : ['Математический анализ', 'Линейная алгебра', 'Дифференциальные уравнения', 'Теория вероятностей', 'Python', 'C++', 'JavaScript', 'Физика', 'Механика', 'Электродинамика']).map((skill: string, index: number) => (
                        <Tag key={index} color="blue" style={{ padding: '4px 12px', fontSize: 14 }}>
                          {skill.trim()}
                        </Tag>
                      ))}
                    </div>
                  </div>
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
              label: `Отзывы 3`,
              children: (
                <div className={styles.sectionCard}>
                  <div className={styles.sectionCardHeader}>
                    <h2 className={styles.sectionTitle}>Отзывы</h2>
                  </div>
                  <div style={{ display: 'grid', gap: 16 }}>
                    <div className={styles.orderCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <Text strong style={{ fontSize: 16 }}>Иван Петров</Text>
                          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>15.11.2024</Text>
                        </div>
                        <Rate disabled defaultValue={5} style={{ fontSize: 16 }} />
                      </div>
                      <Paragraph style={{ color: '#6b7280', marginBottom: 8 }}>
                        Отличная работа! Все выполнено качественно и в срок. Решения подробно расписаны, все понятно. Рекомендую этого исполнителя!
                      </Paragraph>
                      <Text type="secondary" style={{ fontSize: 12 }}>Заказ: Решение задач по высшей математике</Text>
                    </div>
                    <div className={styles.orderCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <Text strong style={{ fontSize: 16 }}>Мария Сидорова</Text>
                          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>10.11.2024</Text>
                        </div>
                        <Rate disabled defaultValue={5} style={{ fontSize: 16 }} />
                      </div>
                      <Paragraph style={{ color: '#6b7280', marginBottom: 8 }}>
                        Очень довольна результатом! Курсовая работа выполнена на высоком уровне, все требования учтены. Спасибо за оперативность и профессионализм!
                      </Paragraph>
                      <Text type="secondary" style={{ fontSize: 12 }}>Заказ: Курсовая работа по экономике</Text>
                    </div>
                    <div className={styles.orderCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <Text strong style={{ fontSize: 16 }}>Алексей Смирнов</Text>
                          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>05.11.2024</Text>
                        </div>
                        <Rate disabled defaultValue={4} style={{ fontSize: 16 }} />
                      </div>
                      <Paragraph style={{ color: '#6b7280', marginBottom: 8 }}>
                        Хорошая работа, все сделано правильно. Единственное - хотелось бы чуть больше комментариев в коде. В целом доволен.
                      </Paragraph>
                      <Text type="secondary" style={{ fontSize: 12 }}>Заказ: Лабораторная работа по программированию</Text>
                    </div>
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
                            fontWeight: 500
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
            {
              key: 'friends',
              label: `Мои друзья 5`,
              children: (
                <div className={styles.sectionCard}>
                  <div className={styles.sectionCardHeader}>
                    <h2 className={styles.sectionTitle}>Мои друзья</h2>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    <div className={styles.orderCard} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar size={64} style={{ backgroundColor: '#3b82f6' }}>ИП</Avatar>
                        <div style={{ flex: 1 }}>
                          <Text strong style={{ fontSize: 16, display: 'block' }}>Иван Петров</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>Математика, Физика</Text>
                          <div style={{ marginTop: 4 }}>
                            <Rate disabled defaultValue={5} style={{ fontSize: 12 }} />
                            <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>127 работ</Text>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <Button 
                          type="primary" 
                          size="small" 
                          icon={<MessageOutlined />} 
                          style={{ flex: 1 }}
                          onClick={() => {
                            setSelectedFriend({ name: 'Иван Петров', specialization: 'Математика, Физика' });
                            setFriendChatModalVisible(true);
                            setFriendsModalVisible(false);
                          }}
                        >
                          Написать
                        </Button>
                        <Button 
                          size="small" 
                          icon={<UserOutlined />}
                          onClick={() => {
                            setSelectedFriend({ 
                              name: 'Иван Петров', 
                              specialization: 'Математика, Физика',
                              rating: 5,
                              worksCount: 127,
                              avatar: 'ИП',
                              avatarColor: '#3b82f6',
                              bio: 'Опытный преподаватель математики и физики с 10-летним стажем. Специализируюсь на подготовке к ЕГЭ и олимпиадам.',
                              education: 'МГУ им. М.В. Ломоносова, Механико-математический факультет',
                              experience: '10 лет',
                              skills: ['Высшая математика', 'Физика', 'Подготовка к ЕГЭ', 'Олимпиадная математика']
                            });
                            setFriendProfileModalVisible(true);
                            setFriendsModalVisible(false);
                          }}
                        >
                          Профиль
                        </Button>
                      </div>
                    </div>

                    <div className={styles.orderCard} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar size={64} style={{ backgroundColor: '#10b981' }}>МС</Avatar>
                        <div style={{ flex: 1 }}>
                          <Text strong style={{ fontSize: 16, display: 'block' }}>Мария Сидорова</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>Экономика, Бухучет</Text>
                          <div style={{ marginTop: 4 }}>
                            <Rate disabled defaultValue={5} style={{ fontSize: 12 }} />
                            <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>89 работ</Text>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <Button 
                          type="primary" 
                          size="small" 
                          icon={<MessageOutlined />} 
                          style={{ flex: 1 }}
                          onClick={() => {
                            setSelectedFriend({ name: 'Мария Сидорова', specialization: 'Экономика, Бухучет' });
                            setFriendChatModalVisible(true);
                            setFriendsModalVisible(false);
                          }}
                        >
                          Написать
                        </Button>
                        <Button 
                          size="small" 
                          icon={<UserOutlined />}
                          onClick={() => {
                            setSelectedFriend({ 
                              name: 'Мария Сидорова', 
                              specialization: 'Экономика, Бухучет',
                              rating: 5,
                              worksCount: 89,
                              avatar: 'МС',
                              avatarColor: '#10b981',
                              bio: 'Экономист с опытом работы в крупных компаниях. Помогаю студентам разобраться в сложных экономических концепциях.',
                              education: 'РЭУ им. Г.В. Плеханова, Экономический факультет',
                              experience: '7 лет',
                              skills: ['Микроэкономика', 'Макроэкономика', 'Бухгалтерский учет', 'Финансовый анализ']
                            });
                            setFriendProfileModalVisible(true);
                            setFriendsModalVisible(false);
                          }}
                        >
                          Профиль
                        </Button>
                      </div>
                    </div>

                    <div className={styles.orderCard} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar size={64} style={{ backgroundColor: '#f59e0b' }}>АС</Avatar>
                        <div style={{ flex: 1 }}>
                          <Text strong style={{ fontSize: 16, display: 'block' }}>Алексей Смирнов</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>Программирование</Text>
                          <div style={{ marginTop: 4 }}>
                            <Rate disabled defaultValue={4} style={{ fontSize: 12 }} />
                            <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>156 работ</Text>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <Button 
                          type="primary" 
                          size="small" 
                          icon={<MessageOutlined />} 
                          style={{ flex: 1 }}
                          onClick={() => {
                            setSelectedFriend({ name: 'Алексей Смирнов', specialization: 'Программирование' });
                            setFriendChatModalVisible(true);
                            setFriendsModalVisible(false);
                          }}
                        >
                          Написать
                        </Button>
                        <Button 
                          size="small" 
                          icon={<UserOutlined />}
                          onClick={() => {
                            setSelectedFriend({ 
                              name: 'Алексей Смирнов', 
                              specialization: 'Программирование',
                              rating: 4,
                              worksCount: 156,
                              avatar: 'АС',
                              avatarColor: '#f59e0b',
                              bio: 'Разработчик с опытом в веб-разработке и мобильных приложениях. Помогаю студентам освоить программирование с нуля.',
                              education: 'МФТИ, Факультет инноваций и высоких технологий',
                              experience: '8 лет',
                              skills: ['Python', 'JavaScript', 'React', 'Node.js', 'Алгоритмы']
                            });
                            setFriendProfileModalVisible(true);
                            setFriendsModalVisible(false);
                          }}
                        >
                          Профиль
                        </Button>
                      </div>
                    </div>

                    <div className={styles.orderCard} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar size={64} style={{ backgroundColor: '#8b5cf6' }}>ЕК</Avatar>
                        <div style={{ flex: 1 }}>
                          <Text strong style={{ fontSize: 16, display: 'block' }}>Елена Козлова</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>Химия, Биология</Text>
                          <div style={{ marginTop: 4 }}>
                            <Rate disabled defaultValue={5} style={{ fontSize: 12 }} />
                            <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>203 работы</Text>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <Button 
                          type="primary" 
                          size="small" 
                          icon={<MessageOutlined />} 
                          style={{ flex: 1 }}
                          onClick={() => {
                            setSelectedFriend({ name: 'Елена Козлова', specialization: 'Химия, Биология' });
                            setFriendChatModalVisible(true);
                            setFriendsModalVisible(false);
                          }}
                        >
                          Написать
                        </Button>
                        <Button 
                          size="small" 
                          icon={<UserOutlined />}
                          onClick={() => {
                            setSelectedFriend({ 
                              name: 'Елена Козлова', 
                              specialization: 'Химия, Биология',
                              rating: 5,
                              worksCount: 203,
                              avatar: 'ЕК',
                              avatarColor: '#8b5cf6',
                              bio: 'Кандидат химических наук. Специализируюсь на органической химии и биохимии. Готовлю к ЕГЭ и вступительным экзаменам.',
                              education: 'МГУ им. М.В. Ломоносова, Химический факультет',
                              experience: '12 лет',
                              skills: ['Органическая химия', 'Неорганическая химия', 'Биология', 'Биохимия']
                            });
                            setFriendProfileModalVisible(true);
                            setFriendsModalVisible(false);
                          }}
                        >
                          Профиль
                        </Button>
                      </div>
                    </div>

                    <div className={styles.orderCard} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar size={64} style={{ backgroundColor: '#ec4899' }}>ДН</Avatar>
                        <div style={{ flex: 1 }}>
                          <Text strong style={{ fontSize: 16, display: 'block' }}>Дмитрий Новиков</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>История, Философия</Text>
                          <div style={{ marginTop: 4 }}>
                            <Rate disabled defaultValue={4} style={{ fontSize: 12 }} />
                            <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>74 работы</Text>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <Button 
                          type="primary" 
                          size="small" 
                          icon={<MessageOutlined />} 
                          style={{ flex: 1 }}
                          onClick={() => {
                            setSelectedFriend({ name: 'Дмитрий Новиков', specialization: 'История, Философия' });
                            setFriendChatModalVisible(true);
                            setFriendsModalVisible(false);
                          }}
                        >
                          Написать
                        </Button>
                        <Button 
                          size="small" 
                          icon={<UserOutlined />}
                          onClick={() => {
                            setSelectedFriend({ 
                              name: 'Дмитрий Новиков', 
                              specialization: 'История, Философия',
                              rating: 4,
                              worksCount: 74,
                              avatar: 'ДН',
                              avatarColor: '#ec4899',
                              bio: 'Историк и философ. Помогаю понять сложные исторические процессы и философские концепции.',
                              education: 'СПбГУ, Исторический факультет',
                              experience: '6 лет',
                              skills: ['История России', 'Всемирная история', 'Философия', 'Обществознание']
                            });
                            setFriendProfileModalVisible(true);
                            setFriendsModalVisible(false);
                          }}
                        >
                          Профиль
                        </Button>
                      </div>
                    </div>
                  </div>
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
        </Content>
        <Footer style={{ textAlign: 'center', background: '#fff' }}>
          Личный кабинет © {new Date().getFullYear()}
        </Footer>
      </Layout>
    </Layout>

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
            <AntInputNumber 
              min={0} 
              max={50} 
              precision={0}
              parser={(value) => {
                const parsed = value?.replace(/\D/g, '');
                return parsed ? Number(parsed) : 0;
              }}
              style={{ width: '100%' }} 
              className={styles.inputField} 
              size="large"
              placeholder="0"
            />
          </Form.Item>
          <Form.Item label="Почасовая ставка (₽)" name="hourly_rate">
            <AntInputNumber 
              min={0} 
              step={100}
              precision={0}
              parser={(value) => {
                const parsed = value?.replace(/\D/g, '');
                return parsed ? Number(parsed) : 0;
              }}
              style={{ width: '100%' }} 
              className={styles.inputField} 
              size="large"
              placeholder="0"
            />
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
            color: '#1890ff'
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
              precision={0}
              parser={(value) => value?.replace(/\D/g, '') || ''}
              style={{ width: '100%' }}
              className={styles.inputField}
              size="large"
              placeholder="0"
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
                      <Row gutter={16} align="middle">
                        <Col span={10}>
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
                        <Col span={4}>
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
                              precision={0}
                              parser={(value) => value?.replace(/\D/g, '') || ''}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
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
                              precision={0}
                              parser={(value) => value?.replace(/\D/g, '') || ''}
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
                        <Col span={2} style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                            style={{ marginTop: 0 }}
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
            color: '#1f2937'
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
            label="Опыт работы (лет)"
            name="experience_years"
            rules={[{ required: true, message: 'Укажите опыт работы' }]}
          >
            <AntInputNumber 
              min={0} 
              max={50}
              precision={0}
              parser={(value) => {
                const parsed = value?.replace(/\D/g, '');
                return parsed ? Number(parsed) : 0;
              }}
              style={{ width: '100%' }}
              className={styles.inputField}
              size="large"
              placeholder="0"
            />
          </Form.Item>
          <Form.Item
            label="Часовая ставка (₽)"
            name="hourly_rate"
            rules={[{ required: true, message: 'Укажите часовую ставку' }]}
          >
            <AntInputNumber 
              min={0}
              precision={0}
              parser={(value) => {
                const parsed = value?.replace(/\D/g, '');
                return parsed ? Number(parsed) : 0;
              }} 
              step={100}
              style={{ width: '100%' }}
              className={styles.inputField}
              size="large"
              placeholder="0"
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
                  padding: '12px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderBottom: messageTab === 'all' ? '2px solid #3b82f6' : '2px solid transparent',
                  color: messageTab === 'all' ? '#3b82f6' : '#6b7280',
                  fontWeight: messageTab === 'all' ? 600 : 400,
                  fontSize: 13
                }}
              >
                <MessageOutlined style={{ marginRight: 4, fontSize: 14 }} />
                Все
              </div>
              <div
                onClick={() => setMessageTab('unread')}
                style={{
                  flex: 1,
                  padding: '12px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderBottom: messageTab === 'unread' ? '2px solid #3b82f6' : '2px solid transparent',
                  color: messageTab === 'unread' ? '#3b82f6' : '#6b7280',
                  fontWeight: messageTab === 'unread' ? 600 : 400,
                  fontSize: 13
                }}
              >
                <BellOutlined style={{ marginRight: 4, fontSize: 14 }} />
                Непрочитанные
              </div>
              <div
                onClick={() => setMessageTab('favorites')}
                style={{
                  flex: 1,
                  padding: '12px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderBottom: messageTab === 'favorites' ? '2px solid #3b82f6' : '2px solid transparent',
                  color: messageTab === 'favorites' ? '#3b82f6' : '#6b7280',
                  fontWeight: messageTab === 'favorites' ? 600 : 400,
                  fontSize: 13
                }}
              >
                <StarOutlined style={{ marginRight: 4, fontSize: 14 }} />
                Избранные
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
              {mockMessages
                .filter(chat => {
                  if (messageTab === 'unread') return !chat.isRead;
                  return true;
                })
                .map((chat) => (
                  <div 
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                      background: selectedChat?.id === chat.id ? '#eff6ff' : (chat.isRead ? '#ffffff' : '#f0fdf4'),
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedChat?.id !== chat.id) {
                        e.currentTarget.style.background = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedChat?.id !== chat.id) {
                        e.currentTarget.style.background = chat.isRead ? '#ffffff' : '#f0fdf4';
                      }
                    }}
                  >
                    <Badge dot={chat.isOnline} offset={[-5, 35]}>
                      <Avatar
                        size={40}
                        icon={<UserOutlined />}
                        style={{ backgroundColor: chat.isOnline ? '#10b981' : '#6b7280' }}
                      />
                    </Badge>
                    <div style={{ flex: 1, marginLeft: 12, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <Text strong style={{ 
                          fontSize: 14, 
                          color: '#1f2937',
                          fontWeight: chat.isRead ? 500 : 600
                        }}>
                          {chat.userName}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11, color: '#9ca3af' }}>
                          {chat.timestamp}
                        </Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text 
                          ellipsis 
                          style={{ 
                            fontSize: 12, 
                            color: chat.isRead ? '#6b7280' : '#059669',
                            fontWeight: chat.isRead ? 400 : 500,
                            maxWidth: '180px'
                          }}
                        >
                          {chat.lastMessage}
                        </Text>
                        {chat.unreadCount > 0 && (
                          <Badge 
                            count={chat.unreadCount} 
                            style={{ 
                              backgroundColor: '#10b981',
                              fontSize: 10,
                              height: 18,
                              minWidth: 18,
                              lineHeight: '18px'
                            }} 
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
              background: selectedChat ? '#ffffff' : '#e0f2fe',
              padding: '12px 16px',
              paddingRight: '56px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: `1px solid ${selectedChat ? '#e5e7eb' : '#bae6fd'}`
            }}>
              {selectedChat ? (
                <>
                  <Space>
                    <Badge dot={selectedChat.isOnline} offset={[-5, 35]}>
                      <Avatar
                        size={36}
                        icon={<UserOutlined />}
                        style={{ backgroundColor: selectedChat.isOnline ? '#10b981' : '#6b7280' }}
                      />
                    </Badge>
                    <div>
                      <Text style={{ fontSize: 15, color: '#1f2937', fontWeight: 500, display: 'block' }}>
                        {selectedChat.userName}
                      </Text>
                      <Text style={{ fontSize: 12, color: selectedChat.isOnline ? '#10b981' : '#6b7280' }}>
                        {selectedChat.isOnline ? 'В сети' : 'Не в сети'}
                      </Text>
                    </div>
                  </Space>
                  <Button 
                    type="primary" 
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateOrderModalVisible(true)}
                    style={{ fontSize: 14 }}
                  >
                    Создать заказ
                  </Button>
                </>
              ) : (
                <>
                  <Space>
                    <StarFilled style={{ color: '#0ea5e9', fontSize: 16 }} />
                    <Text style={{ fontSize: 14, color: '#0369a1', fontWeight: 500 }}>
                      Важные сообщения
                    </Text>
                  </Space>
                  <Button 
                    type="primary" 
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateOrderModalVisible(true)}
                    style={{ fontSize: 14 }}
                  >
                    Создать заказ
                  </Button>
                </>
              )}
            </div>

            {/* Messages Area */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto',
              padding: '20px',
              background: '#f9fafb'
            }}>
              {selectedChat ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedChat.messages.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: msg.isMine ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '70%',
                          padding: '10px 14px',
                          borderRadius: msg.isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: msg.isMine ? '#3b82f6' : '#ffffff',
                          color: msg.isMine ? '#ffffff' : '#1f2937',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                          border: msg.isMine ? 'none' : '1px solid #e5e7eb'
                        }}
                      >
                        <Text style={{ 
                          fontSize: 14, 
                          color: msg.isMine ? '#ffffff' : '#1f2937',
                          display: 'block',
                          marginBottom: 4
                        }}>
                          {msg.text}
                        </Text>
                        <Text style={{ 
                          fontSize: 11, 
                          color: msg.isMine ? 'rgba(255, 255, 255, 0.7)' : '#9ca3af'
                        }}>
                          {msg.timestamp}
                          {msg.isMine && msg.isRead && (
                            <CheckCircleOutlined style={{ marginLeft: 4, fontSize: 11 }} />
                          )}
                        </Text>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#9ca3af', 
                  paddingTop: '100px',
                  fontSize: 14
                }}>
                  <MessageOutlined style={{ fontSize: 48, color: '#d1d5db', marginBottom: 16, display: 'block' }} />
                  Выберите чат для начала общения
                </div>
              )}
            </div>

            {/* Input Area */}
            <div style={{ 
              padding: '16px',
              borderTop: '1px solid #e5e7eb',
              background: '#ffffff'
            }}>
              {fileList.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <Upload
                    fileList={fileList}
                    onRemove={(file) => {
                      setFileList(fileList.filter((f) => f.uid !== file.uid));
                    }}
                    beforeUpload={() => false}
                  />
                </div>
              )}
              <div style={{ 
                display: 'flex',
                gap: 8,
                alignItems: 'flex-end'
              }}>
                <Input.TextArea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Введите сообщение..."
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  style={{ 
                    flex: 1,
                    borderRadius: 8,
                    border: '1px solid #d1d5db'
                  }}
                />
                <Upload
                  fileList={fileList}
                  onChange={({ fileList }) => setFileList(fileList)}
                  beforeUpload={() => false}
                  multiple
                  showUploadList={false}
                >
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
                </Upload>
                <Popover
                  content={
                    <EmojiPicker
                      onEmojiClick={(emojiData: any) => {
                        setMessageText(messageText + emojiData.emoji);
                        setEmojiPickerOpen(false);
                      }}
                      width={350}
                      height={400}
                    />
                  }
                  trigger="click"
                  open={emojiPickerOpen}
                  onOpenChange={setEmojiPickerOpen}
                  placement="topRight"
                >
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
                </Popover>
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
                      setFileList([]);
                      message.success('Сообщение отправлено');
                    }
                  }}
                />
              </div>
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
            padding: '16px'
          }}>
            {mockNotifications
              .filter(notification => {
                if (notificationTab === 'all') return true;
                if (notificationTab === 'orders') return notification.type === 'order';
                if (notificationTab === 'claims') return notification.type === 'claim';
                if (notificationTab === 'forum') return notification.type === 'forum';
                if (notificationTab === 'questions') return notification.type === 'question';
                return false;
              })
              .map((notification) => (
                <div
                  key={notification.id}
                  style={{
                    padding: '16px',
                    marginBottom: '12px',
                    background: notification.isRead ? '#ffffff' : '#eff6ff',
                    borderRadius: 12,
                    border: `1px solid ${notification.isRead ? '#e5e7eb' : '#bfdbfe'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    gap: 16,
                    alignItems: 'flex-start'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Иконка */}
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: notification.isRead ? '#f3f4f6' : '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0
                  }}>
                    {notification.icon}
                  </div>

                  {/* Контент */}
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: 4
                    }}>
                      <Text strong style={{ 
                        fontSize: 15, 
                        color: '#1f2937',
                        fontWeight: notification.isRead ? 500 : 600
                      }}>
                        {notification.title}
                      </Text>
                      {!notification.isRead && (
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#3b82f6',
                          flexShrink: 0,
                          marginLeft: 8,
                          marginTop: 6
                        }} />
                      )}
                    </div>
                    <Text style={{ 
                      fontSize: 14, 
                      color: '#6b7280',
                      display: 'block',
                      marginBottom: 8,
                      lineHeight: 1.5
                    }}>
                      {notification.message}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12, color: '#9ca3af' }}>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      {notification.timestamp}
                    </Text>
                  </div>
                </div>
              ))}
            
            {mockNotifications.filter(notification => {
              if (notificationTab === 'all') return true;
              if (notificationTab === 'orders') return notification.type === 'order';
              if (notificationTab === 'claims') return notification.type === 'claim';
              if (notificationTab === 'forum') return notification.type === 'forum';
              if (notificationTab === 'questions') return notification.type === 'question';
              return false;
            }).length === 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 24px',
                minHeight: '400px'
              }}>
                <BellOutlined style={{ fontSize: 48, color: '#d1d5db', marginBottom: 16 }} />
                <Text type="secondary" style={{ fontSize: 14 }}>
                  Нет уведомлений в этой категории
                </Text>
              </div>
            )}
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

          {/* Фильтр статусов */}
          <div style={{ 
            display: 'flex', 
            gap: 0,
            background: '#f9fafb',
            borderRadius: 12,
            padding: '4px',
            border: '1px solid #e5e7eb'
          }}>
            <div
              onClick={() => setArbitrationStatusFilter('all')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '12px 8px',
                cursor: 'pointer',
                borderRadius: 8,
                background: arbitrationStatusFilter === 'all' ? '#ffffff' : 'transparent',
                borderBottom: arbitrationStatusFilter === 'all' ? '2px solid #3b82f6' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              <TrophyOutlined style={{ 
                fontSize: 16, 
                color: arbitrationStatusFilter === 'all' ? '#3b82f6' : '#6b7280' 
              }} />
              <Text style={{ 
                fontSize: 12, 
                color: arbitrationStatusFilter === 'all' ? '#1f2937' : '#6b7280',
                fontWeight: arbitrationStatusFilter === 'all' ? 500 : 400,
                whiteSpace: 'nowrap'
              }}>
                Все
              </Text>
            </div>
            <div
              onClick={() => setArbitrationStatusFilter('pending')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '12px 8px',
                cursor: 'pointer',
                borderRadius: 8,
                background: arbitrationStatusFilter === 'pending' ? '#ffffff' : 'transparent',
                borderBottom: arbitrationStatusFilter === 'pending' ? '2px solid #f59e0b' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              <ClockCircleOutlined style={{ 
                fontSize: 16, 
                color: arbitrationStatusFilter === 'pending' ? '#f59e0b' : '#6b7280' 
              }} />
              <Text style={{ 
                fontSize: 12, 
                color: arbitrationStatusFilter === 'pending' ? '#1f2937' : '#6b7280',
                fontWeight: arbitrationStatusFilter === 'pending' ? 500 : 400,
                whiteSpace: 'nowrap'
              }}>
                Ожидает
              </Text>
            </div>
            <div
              onClick={() => setArbitrationStatusFilter('in_review')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '12px 8px',
                cursor: 'pointer',
                borderRadius: 8,
                background: arbitrationStatusFilter === 'in_review' ? '#ffffff' : 'transparent',
                borderBottom: arbitrationStatusFilter === 'in_review' ? '2px solid #3b82f6' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              <FileDoneOutlined style={{ 
                fontSize: 16, 
                color: arbitrationStatusFilter === 'in_review' ? '#3b82f6' : '#6b7280' 
              }} />
              <Text style={{ 
                fontSize: 12, 
                color: arbitrationStatusFilter === 'in_review' ? '#1f2937' : '#6b7280',
                fontWeight: arbitrationStatusFilter === 'in_review' ? 500 : 400,
                whiteSpace: 'nowrap'
              }}>
                На рассмотрении
              </Text>
            </div>
            <div
              onClick={() => setArbitrationStatusFilter('resolved')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '12px 8px',
                cursor: 'pointer',
                borderRadius: 8,
                background: arbitrationStatusFilter === 'resolved' ? '#ffffff' : 'transparent',
                borderBottom: arbitrationStatusFilter === 'resolved' ? '2px solid #10b981' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              <CheckCircleOutlined style={{ 
                fontSize: 16, 
                color: arbitrationStatusFilter === 'resolved' ? '#10b981' : '#6b7280' 
              }} />
              <Text style={{ 
                fontSize: 12, 
                color: arbitrationStatusFilter === 'resolved' ? '#1f2937' : '#6b7280',
                fontWeight: arbitrationStatusFilter === 'resolved' ? 500 : 400,
                whiteSpace: 'nowrap'
              }}>
                Решено
              </Text>
            </div>
            <div
              onClick={() => setArbitrationStatusFilter('rejected')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '12px 8px',
                cursor: 'pointer',
                borderRadius: 8,
                background: arbitrationStatusFilter === 'rejected' ? '#ffffff' : 'transparent',
                borderBottom: arbitrationStatusFilter === 'rejected' ? '2px solid #ef4444' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              <CloseCircleOutlined style={{ 
                fontSize: 16, 
                color: arbitrationStatusFilter === 'rejected' ? '#ef4444' : '#6b7280' 
              }} />
              <Text style={{ 
                fontSize: 12, 
                color: arbitrationStatusFilter === 'rejected' ? '#1f2937' : '#6b7280',
                fontWeight: arbitrationStatusFilter === 'rejected' ? 500 : 400,
                whiteSpace: 'nowrap'
              }}>
                Отклонено
              </Text>
            </div>
          </div>

          {/* Область контента */}
          <div style={{ 
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            padding: '16px',
            minHeight: '350px'
          }}>
            {mockArbitrationCases.filter(arbitration => {
              if (arbitrationStatusFilter === 'all') return true;
              return arbitration.status === arbitrationStatusFilter;
            }).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {mockArbitrationCases
                  .filter(arbitration => {
                    if (arbitrationStatusFilter === 'all') return true;
                    return arbitration.status === arbitrationStatusFilter;
                  })
                  .map((arbitration) => {
                  const getStatusConfig = (status: string) => {
                    switch (status) {
                      case 'pending':
                        return { color: '#f59e0b', bg: '#fef3c7', text: 'Ожидает рассмотрения', icon: <ClockCircleOutlined /> };
                      case 'in_review':
                        return { color: '#3b82f6', bg: '#dbeafe', text: 'На рассмотрении', icon: <FileDoneOutlined /> };
                      case 'resolved':
                        return { color: '#10b981', bg: '#d1fae5', text: 'Решено', icon: <CheckCircleOutlined /> };
                      case 'rejected':
                        return { color: '#ef4444', bg: '#fee2e2', text: 'Отклонено', icon: <CloseCircleOutlined /> };
                      default:
                        return { color: '#6b7280', bg: '#f3f4f6', text: 'Неизвестно', icon: <QuestionCircleOutlined /> };
                    }
                  };

                  const statusConfig = getStatusConfig(arbitration.status);

                  return (
                    <div
                      key={arbitration.id}
                      style={{
                        padding: '20px',
                        background: '#ffffff',
                        borderRadius: 12,
                        border: '1px solid #e5e7eb',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {/* Заголовок и статус */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                          <Text strong style={{ fontSize: 16, color: '#1f2937', display: 'block', marginBottom: 4 }}>
                            Заказ #{arbitration.orderId}: {arbitration.orderTitle}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            Заказчик: {arbitration.clientName}
                          </Text>
                        </div>
                        <div style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          background: statusConfig.bg,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginLeft: 16
                        }}>
                          <span style={{ color: statusConfig.color, fontSize: 14 }}>
                            {statusConfig.icon}
                          </span>
                          <Text style={{ fontSize: 13, color: statusConfig.color, fontWeight: 500 }}>
                            {statusConfig.text}
                          </Text>
                        </div>
                      </div>

                      {/* Причина */}
                      <div style={{ 
                        padding: '12px', 
                        background: '#fef3c7', 
                        borderRadius: 8, 
                        marginBottom: 12,
                        borderLeft: '3px solid #f59e0b'
                      }}>
                        <Text strong style={{ fontSize: 13, color: '#92400e', display: 'block', marginBottom: 4 }}>
                          Причина претензии:
                        </Text>
                        <Text style={{ fontSize: 13, color: '#78350f' }}>
                          {arbitration.reason}
                        </Text>
                      </div>

                      {/* Описание */}
                      <Paragraph 
                        ellipsis={{ rows: 2, expandable: true, symbol: 'Показать больше' }}
                        style={{ fontSize: 14, color: '#4b5563', marginBottom: 12 }}
                      >
                        {arbitration.description}
                      </Paragraph>

                      {/* Решение (если есть) */}
                      {arbitration.decision && (
                        <div style={{ 
                          padding: '12px', 
                          background: arbitration.status === 'resolved' ? '#d1fae5' : '#fee2e2', 
                          borderRadius: 8, 
                          marginBottom: 12,
                          borderLeft: `3px solid ${arbitration.status === 'resolved' ? '#10b981' : '#ef4444'}`
                        }}>
                          <Text strong style={{ 
                            fontSize: 13, 
                            color: arbitration.status === 'resolved' ? '#065f46' : '#991b1b', 
                            display: 'block', 
                            marginBottom: 4 
                          }}>
                            Решение арбитража:
                          </Text>
                          <Text style={{ 
                            fontSize: 13, 
                            color: arbitration.status === 'resolved' ? '#047857' : '#b91c1c' 
                          }}>
                            {arbitration.decision}
                          </Text>
                        </div>
                      )}

                      {/* Документы */}
                      {arbitration.documents && arbitration.documents.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                            Прикрепленные документы:
                          </Text>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {arbitration.documents.map((doc, index) => (
                              <div
                                key={index}
                                style={{
                                  padding: '6px 12px',
                                  background: '#f3f4f6',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  color: '#4b5563',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6
                                }}
                              >
                                <PaperClipOutlined style={{ fontSize: 12 }} />
                                {doc}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Футер с информацией */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        paddingTop: 12,
                        borderTop: '1px solid #e5e7eb'
                      }}>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            <CalendarOutlined style={{ marginRight: 4 }} />
                            Создано: {arbitration.createdAt}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            <ClockCircleOutlined style={{ marginRight: 4 }} />
                            Обновлено: {arbitration.updatedAt}
                          </Text>
                        </div>
                        <Text strong style={{ fontSize: 15, color: '#1f2937' }}>
                          <DollarOutlined style={{ marginRight: 4 }} />
                          {arbitration.amount.toLocaleString('ru-RU')} ₽
                        </Text>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 24px',
                minHeight: '350px'
              }}>
                <TrophyOutlined style={{ fontSize: 48, color: '#d1d5db', marginBottom: 16 }} />
                <Text type="secondary" style={{ fontSize: 14, color: '#6b7280' }}>
                  {arbitrationStatusFilter === 'all' 
                    ? 'У вас нет арбитражей' 
                    : `Нет арбитражей со статусом "${
                        arbitrationStatusFilter === 'pending' ? 'Ожидает рассмотрения' :
                        arbitrationStatusFilter === 'in_review' ? 'На рассмотрении' :
                        arbitrationStatusFilter === 'resolved' ? 'Решено' :
                        arbitrationStatusFilter === 'rejected' ? 'Отклонено' : ''
                      }"`
                  }
                </Text>
              </div>
            )}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            <div style={{ 
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: '16px',
              transition: 'all 0.3s',
              cursor: 'pointer'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar size={56} style={{ backgroundColor: '#3b82f6' }}>ИП</Avatar>
                <div style={{ flex: 1 }}>
                  <Text strong style={{ fontSize: 16, display: 'block' }}>Иван Петров</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>Математика, Физика</Text>
                  <div style={{ marginTop: 4 }}>
                    <Rate disabled defaultValue={5} style={{ fontSize: 12 }} />
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>127 работ</Text>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<MessageOutlined />} 
                  style={{ flex: 1 }}
                  onClick={() => {
                    setSelectedFriend({ name: 'Иван Петров', specialization: 'Математика, Физика' });
                    setFriendChatModalVisible(true);
                  }}
                >
                  Написать
                </Button>
                <Button 
                  size="small" 
                  icon={<UserOutlined />}
                  onClick={() => {
                    setSelectedFriend({ 
                      name: 'Иван Петров', 
                      specialization: 'Математика, Физика',
                      rating: 5,
                      worksCount: 127,
                      avatar: 'ИП',
                      avatarColor: '#3b82f6',
                      bio: 'Опытный преподаватель математики и физики с 10-летним стажем. Специализируюсь на подготовке к ЕГЭ и олимпиадам.',
                      education: 'МГУ им. М.В. Ломоносова, Механико-математический факультет',
                      experience: '10 лет',
                      skills: ['Высшая математика', 'Физика', 'Подготовка к ЕГЭ', 'Олимпиадная математика']
                    });
                    setFriendProfileModalVisible(true);
                  }}
                >
                  Профиль
                </Button>
              </div>
            </div>

            <div style={{ 
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: '16px',
              transition: 'all 0.3s',
              cursor: 'pointer'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar size={56} style={{ backgroundColor: '#10b981' }}>МС</Avatar>
                <div style={{ flex: 1 }}>
                  <Text strong style={{ fontSize: 16, display: 'block' }}>Мария Сидорова</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>Экономика, Бухучет</Text>
                  <div style={{ marginTop: 4 }}>
                    <Rate disabled defaultValue={5} style={{ fontSize: 12 }} />
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>89 работ</Text>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<MessageOutlined />} 
                  style={{ flex: 1 }}
                  onClick={() => {
                    setSelectedFriend({ name: 'Мария Сидорова', specialization: 'Экономика, Бухучет' });
                    setFriendChatModalVisible(true);
                  }}
                >
                  Написать
                </Button>
                <Button 
                  size="small" 
                  icon={<UserOutlined />}
                  onClick={() => {
                    setSelectedFriend({ 
                      name: 'Мария Сидорова', 
                      specialization: 'Экономика, Бухучет',
                      rating: 5,
                      worksCount: 89,
                      avatar: 'МС',
                      avatarColor: '#10b981',
                      bio: 'Экономист с опытом работы в крупных компаниях. Помогаю студентам разобраться в сложных экономических концепциях.',
                      education: 'РЭУ им. Г.В. Плеханова, Экономический факультет',
                      experience: '7 лет',
                      skills: ['Микроэкономика', 'Макроэкономика', 'Бухгалтерский учет', 'Финансовый анализ']
                    });
                    setFriendProfileModalVisible(true);
                  }}
                >
                  Профиль
                </Button>
              </div>
            </div>

            <div style={{ 
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: '16px',
              transition: 'all 0.3s',
              cursor: 'pointer'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar size={56} style={{ backgroundColor: '#f59e0b' }}>АС</Avatar>
                <div style={{ flex: 1 }}>
                  <Text strong style={{ fontSize: 16, display: 'block' }}>Алексей Смирнов</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>Программирование</Text>
                  <div style={{ marginTop: 4 }}>
                    <Rate disabled defaultValue={4} style={{ fontSize: 12 }} />
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>156 работ</Text>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<MessageOutlined />} 
                  style={{ flex: 1 }}
                  onClick={() => {
                    setSelectedFriend({ name: 'Алексей Смирнов', specialization: 'Программирование' });
                    setFriendChatModalVisible(true);
                  }}
                >
                  Написать
                </Button>
                <Button 
                  size="small" 
                  icon={<UserOutlined />}
                  onClick={() => {
                    setSelectedFriend({ 
                      name: 'Алексей Смирнов', 
                      specialization: 'Программирование',
                      rating: 4,
                      worksCount: 156,
                      avatar: 'АС',
                      avatarColor: '#f59e0b',
                      bio: 'Разработчик с опытом в веб-разработке и мобильных приложениях. Помогаю студентам освоить программирование с нуля.',
                      education: 'МФТИ, Факультет инноваций и высоких технологий',
                      experience: '8 лет',
                      skills: ['Python', 'JavaScript', 'React', 'Node.js', 'Алгоритмы']
                    });
                    setFriendProfileModalVisible(true);
                  }}
                >
                  Профиль
                </Button>
              </div>
            </div>

            <div style={{ 
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: '16px',
              transition: 'all 0.3s',
              cursor: 'pointer'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar size={56} style={{ backgroundColor: '#8b5cf6' }}>ЕК</Avatar>
                <div style={{ flex: 1 }}>
                  <Text strong style={{ fontSize: 16, display: 'block' }}>Елена Козлова</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>Химия, Биология</Text>
                  <div style={{ marginTop: 4 }}>
                    <Rate disabled defaultValue={5} style={{ fontSize: 12 }} />
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>203 работы</Text>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<MessageOutlined />} 
                  style={{ flex: 1 }}
                  onClick={() => {
                    setSelectedFriend({ name: 'Елена Козлова', specialization: 'Химия, Биология' });
                    setFriendChatModalVisible(true);
                  }}
                >
                  Написать
                </Button>
                <Button 
                  size="small" 
                  icon={<UserOutlined />}
                  onClick={() => {
                    setSelectedFriend({ 
                      name: 'Елена Козлова', 
                      specialization: 'Химия, Биология',
                      rating: 5,
                      worksCount: 203,
                      avatar: 'ЕК',
                      avatarColor: '#8b5cf6',
                      bio: 'Кандидат химических наук. Специализируюсь на органической химии и биохимии. Готовлю к ЕГЭ и вступительным экзаменам.',
                      education: 'МГУ им. М.В. Ломоносова, Химический факультет',
                      experience: '12 лет',
                      skills: ['Органическая химия', 'Неорганическая химия', 'Биология', 'Биохимия']
                    });
                    setFriendProfileModalVisible(true);
                  }}
                >
                  Профиль
                </Button>
              </div>
            </div>

            <div style={{ 
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: '16px',
              transition: 'all 0.3s',
              cursor: 'pointer'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar size={56} style={{ backgroundColor: '#ec4899' }}>ДН</Avatar>
                <div style={{ flex: 1 }}>
                  <Text strong style={{ fontSize: 16, display: 'block' }}>Дмитрий Новиков</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>История, Философия</Text>
                  <div style={{ marginTop: 4 }}>
                    <Rate disabled defaultValue={4} style={{ fontSize: 12 }} />
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>74 работы</Text>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<MessageOutlined />} 
                  style={{ flex: 1 }}
                  onClick={() => {
                    setSelectedFriend({ name: 'Дмитрий Новиков', specialization: 'История, Философия' });
                    setFriendChatModalVisible(true);
                  }}
                >
                  Написать
                </Button>
                <Button 
                  size="small" 
                  icon={<UserOutlined />}
                  onClick={() => {
                    setSelectedFriend({ 
                      name: 'Дмитрий Новиков', 
                      specialization: 'История, Философия',
                      rating: 4,
                      worksCount: 74,
                      avatar: 'ДН',
                      avatarColor: '#ec4899',
                      bio: 'Историк и философ. Помогаю понять сложные исторические процессы и философские концепции.',
                      education: 'СПбГУ, Исторический факультет',
                      experience: '6 лет',
                      skills: ['История России', 'Всемирная история', 'Философия', 'Обществознание']
                    });
                    setFriendProfileModalVisible(true);
                  }}
                >
                  Профиль
                </Button>
              </div>
            </div>

            <div style={{ 
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: '16px',
              transition: 'all 0.3s',
              cursor: 'pointer'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar size={56} style={{ backgroundColor: '#06b6d4' }}>ОВ</Avatar>
                <div style={{ flex: 1 }}>
                  <Text strong style={{ fontSize: 16, display: 'block' }}>Ольга Васильева</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>Английский язык</Text>
                  <div style={{ marginTop: 4 }}>
                    <Rate disabled defaultValue={5} style={{ fontSize: 12 }} />
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>312 работ</Text>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<MessageOutlined />} 
                  style={{ flex: 1 }}
                  onClick={() => {
                    setSelectedFriend({ name: 'Ольга Васильева', specialization: 'Английский язык' });
                    setFriendChatModalVisible(true);
                  }}
                >
                  Написать
                </Button>
                <Button 
                  size="small" 
                  icon={<UserOutlined />}
                  onClick={() => {
                    setSelectedFriend({ 
                      name: 'Ольга Васильева', 
                      specialization: 'Английский язык',
                      rating: 5,
                      worksCount: 312,
                      avatar: 'ОВ',
                      avatarColor: '#06b6d4',
                      bio: 'Преподаватель английского языка с международными сертификатами. Готовлю к IELTS, TOEFL и ЕГЭ.',
                      education: 'МГЛУ, Факультет английского языка',
                      experience: '15 лет',
                      skills: ['Английский язык', 'IELTS', 'TOEFL', 'Деловой английский', 'Разговорная практика']
                    });
                    setFriendProfileModalVisible(true);
                  }}
                >
                  Профиль
                </Button>
              </div>
            </div>
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

      {/* Модальное окно создания заказа */}
      <Modal
        title={
          <div style={{ 
            fontSize: 24, 
            fontWeight: 600, 
            color: '#1890ff'
          }}>
            Создать заказ
          </div>
        }
        open={createOrderModalVisible}
        onCancel={() => setCreateOrderModalVisible(false)}
        onOk={() => {
          message.info('Функция создания заказа в разработке');
          setCreateOrderModalVisible(false);
        }}
        width={750}
        okText="Создать"
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
        <Form layout="vertical" form={createOrderForm}>
          <Form.Item label="Название заказа" name="title" rules={[{ required: true, message: 'Введите название' }]}>
            <Input 
              placeholder="Введите название заказа" 
              className={styles.inputField}
              size="large"
            />
          </Form.Item>
          <Form.Item label="Описание" name="description" rules={[{ required: true, message: 'Введите описание' }]}>
            <Input.TextArea 
              rows={4} 
              placeholder="Опишите задание подробно" 
              className={styles.textareaField}
              style={{ fontSize: 15 }}
            />
          </Form.Item>
          <Form.Item label="Предмет" name="subject" rules={[{ required: true, message: 'Выберите предмет' }]}>
            <Select 
              placeholder="Выберите предмет"
              className={styles.inputField}
              size="large"
            >
              <Select.Option value="math">Математика</Select.Option>
              <Select.Option value="physics">Физика</Select.Option>
              <Select.Option value="chemistry">Химия</Select.Option>
              <Select.Option value="programming">Программирование</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="Тип работы" name="work_type" rules={[{ required: true, message: 'Выберите тип работы' }]}>
            <Select 
              placeholder="Выберите тип работы"
              className={styles.inputField}
              size="large"
            >
              <Select.Option value="essay">Реферат</Select.Option>
              <Select.Option value="coursework">Курсовая</Select.Option>
              <Select.Option value="diploma">Диплом</Select.Option>
              <Select.Option value="test">Контрольная</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="Срок выполнения" name="deadline" rules={[{ required: true, message: 'Выберите дату' }]}>
            <DatePicker 
              style={{ width: '100%', height: 48, borderRadius: 8, fontSize: 14 }} 
              placeholder="Выберите дату"
              format="DD.MM.YYYY"
              disabledDate={(current) => {
                return current && current < dayjs().startOf('day');
              }}
              inputReadOnly
            />
          </Form.Item>
          <Form.Item label="Бюджет (₽)" name="budget" rules={[{ required: true, message: 'Укажите бюджет' }]}>
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              placeholder="Укажите бюджет"
              className={styles.inputField}
              size="large"
              precision={0}
              parser={(value) => value?.replace(/\D/g, '') || ''}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Profile Edit Modal */}
      <Modal
        title={
          <div style={{ 
            fontSize: 24, 
            fontWeight: 600, 
            color: '#1890ff'
          }}>
            Редактировать профиль
          </div>
        }
        open={profileModalVisible}
        onCancel={() => setProfileModalVisible(false)}
        onOk={() => profileForm.submit()}
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
          form={profileForm}
          layout="vertical"
          onFinish={(values) => {
            // Update profile logic here
            setProfile({
              ...profile!,
              bio: values.bio,
              education: values.education,
              skills: values.skills
            });
            message.success('Профиль успешно обновлен');
            setProfileModalVisible(false);
          }}
        >
          <Form.Item
            label="О себе"
            name="bio"
            rules={[{ required: true, message: 'Расскажите о себе' }]}
          >
            <Input.TextArea 
              rows={6} 
              placeholder="Расскажите о своем опыте, образовании и подходе к работе" 
              className={styles.textareaField}
              style={{ fontSize: 15 }}
            />
          </Form.Item>

          <Form.Item
            label="Образование"
            name="education"
            rules={[{ required: true, message: 'Укажите образование' }]}
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Укажите ваше образование и квалификации" 
              className={styles.textareaField}
              style={{ fontSize: 15 }}
            />
          </Form.Item>

          <Form.Item
            label="Навыки"
            name="skills"
            rules={[{ required: true, message: 'Укажите навыки' }]}
            extra="Перечислите навыки через запятую"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Например: Математический анализ, Python, C++, Физика" 
              className={styles.textareaField}
              style={{ fontSize: 15 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Friend Chat Modal */}
      <Modal
        title={
          <div style={{ 
            fontSize: 20, 
            fontWeight: 600, 
            color: '#1890ff',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <MessageOutlined />
            {selectedFriend ? `Чат с ${selectedFriend.name}` : 'Чат'}
          </div>
        }
        open={friendChatModalVisible}
        onCancel={() => setFriendChatModalVisible(false)}
        footer={null}
        width={600}
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
            padding: '20px 24px',
            borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
            borderRadius: '24px 24px 0 0'
          },
          body: {
            padding: '0',
            background: 'rgba(255, 255, 255, 0.95)',
            height: '500px',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '500px'
        }}>
          {/* Chat messages area */}
          <div style={{ 
            flex: 1, 
            padding: '20px 24px', 
            overflowY: 'auto',
            background: '#f8f9fa'
          }}>
            <div style={{ 
              textAlign: 'center', 
              color: '#8c8c8c', 
              fontSize: 14,
              marginBottom: 20
            }}>
              Начало переписки с {selectedFriend?.name}
            </div>
            
            {/* Sample messages */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ 
                background: '#e6f7ff', 
                padding: '12px 16px', 
                borderRadius: '12px 12px 12px 4px',
                maxWidth: '70%',
                marginLeft: 'auto',
                border: '1px solid #91d5ff'
              }}>
                <Text>Привет! Как дела с проектом?</Text>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4, textAlign: 'right' }}>
                  14:30
                </div>
              </div>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <div style={{ 
                background: '#ffffff', 
                padding: '12px 16px', 
                borderRadius: '12px 12px 4px 12px',
                maxWidth: '70%',
                border: '1px solid #d9d9d9'
              }}>
                <Text>Привет! Всё отлично, работаю над задачами. А у тебя как успехи?</Text>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                  14:32
                </div>
              </div>
            </div>
          </div>
          
          {/* Message input area */}
          <div style={{ 
            padding: '16px 24px', 
            borderTop: '1px solid rgba(102, 126, 234, 0.1)',
            background: 'rgba(255, 255, 255, 0.95)'
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <Input.TextArea 
                placeholder="Напишите сообщение..."
                autoSize={{ minRows: 1, maxRows: 4 }}
                style={{ 
                  borderRadius: 12,
                  resize: 'none'
                }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    message.info('Сообщение отправлено!');
                  }
                }}
              />
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                style={{ 
                  borderRadius: 12,
                  height: 40,
                  minWidth: 40
                }}
                onClick={() => {
                  message.info('Сообщение отправлено!');
                }}
              />
            </div>
            <div style={{ 
              fontSize: 12, 
              color: '#8c8c8c', 
              marginTop: 8,
              textAlign: 'center'
            }}>
              Нажмите Enter для отправки, Shift+Enter для новой строки
            </div>
          </div>
        </div>
      </Modal>

      {/* Friend Profile Modal */}
      <Modal
        title={null}
        open={friendProfileModalVisible}
        onCancel={() => setFriendProfileModalVisible(false)}
        footer={null}
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
          body: {
            padding: 0
          }
        }}
      >
        {selectedFriend && (
          <div>
            {/* Header with gradient background */}
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '40px 32px',
              position: 'relative'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 20 
              }}>
                <Avatar 
                  size={100} 
                  style={{ 
                    backgroundColor: selectedFriend.avatarColor,
                    fontSize: 36,
                    fontWeight: 600,
                    border: '4px solid rgba(255, 255, 255, 0.3)'
                  }}
                >
                  {selectedFriend.avatar}
                </Avatar>
                <div style={{ flex: 1 }}>
                  <Text 
                    strong 
                    style={{ 
                      fontSize: 28, 
                      display: 'block',
                      color: '#ffffff',
                      marginBottom: 8
                    }}
                  >
                    {selectedFriend.name}
                  </Text>
                  <Text 
                    style={{ 
                      fontSize: 16, 
                      color: 'rgba(255, 255, 255, 0.9)',
                      display: 'block',
                      marginBottom: 12
                    }}
                  >
                    {selectedFriend.specialization}
                  </Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div>
                      <Rate 
                        disabled 
                        defaultValue={selectedFriend.rating} 
                        style={{ fontSize: 16, color: '#fbbf24' }} 
                      />
                    </div>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 14 }}>
                      {selectedFriend.worksCount} работ
                    </Text>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '32px' }}>
              {/* Bio Section */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  marginBottom: 12
                }}>
                  <UserOutlined style={{ fontSize: 20, color: '#667eea' }} />
                  <Text strong style={{ fontSize: 18, color: '#1f2937' }}>
                    О себе
                  </Text>
                </div>
                <Text style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.6 }}>
                  {selectedFriend.bio}
                </Text>
              </div>

              {/* Education Section */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  marginBottom: 12
                }}>
                  <TrophyOutlined style={{ fontSize: 20, color: '#667eea' }} />
                  <Text strong style={{ fontSize: 18, color: '#1f2937' }}>
                    Образование
                  </Text>
                </div>
                <Text style={{ fontSize: 15, color: '#4b5563' }}>
                  {selectedFriend.education}
                </Text>
              </div>

              {/* Experience Section */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  marginBottom: 12
                }}>
                  <ClockCircleOutlined style={{ fontSize: 20, color: '#667eea' }} />
                  <Text strong style={{ fontSize: 18, color: '#1f2937' }}>
                    Опыт работы
                  </Text>
                </div>
                <Text style={{ fontSize: 15, color: '#4b5563' }}>
                  {selectedFriend.experience}
                </Text>
              </div>

              {/* Skills Section */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  marginBottom: 12
                }}>
                  <StarFilled style={{ fontSize: 20, color: '#667eea' }} />
                  <Text strong style={{ fontSize: 18, color: '#1f2937' }}>
                    Навыки
                  </Text>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selectedFriend.skills?.map((skill: string, index: number) => (
                    <Tag 
                      key={index}
                      style={{ 
                        padding: '6px 16px',
                        fontSize: 14,
                        borderRadius: 20,
                        border: '1px solid #e0e7ff',
                        background: '#f5f7ff',
                        color: '#667eea'
                      }}
                    >
                      {skill}
                    </Tag>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ 
                display: 'flex', 
                gap: 12,
                paddingTop: 24,
                borderTop: '1px solid #e5e7eb'
              }}>
                <Button 
                  type="primary" 
                  size="large"
                  icon={<MessageOutlined />}
                  style={{ 
                    flex: 1,
                    height: 48,
                    borderRadius: 12,
                    fontSize: 16
                  }}
                  onClick={() => {
                    setFriendProfileModalVisible(false);
                    setFriendChatModalVisible(true);
                  }}
                >
                  Написать сообщение
                </Button>
                <Button 
                  size="large"
                  icon={<HeartOutlined />}
                  style={{ 
                    height: 48,
                    borderRadius: 12,
                    fontSize: 16
                  }}
                >
                  В избранное
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
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
