import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Layout,
  Menu,
  Card, 
  Typography, 
  Button, 
  Table, 
  Statistic, 
  Row, 
  Col, 
  message, 
  Input,
  Space,
  Tag,
  Modal,
  Form,
  InputNumber,
  Select,
  Spin,
  Result,
  Alert,
  Tooltip,
  Drawer,
  Grid
} from 'antd';
import { 
  UserOutlined, 
  TeamOutlined, 
  DollarOutlined,
  TrophyOutlined,
  EditOutlined,
  EyeOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  LogoutOutlined,
  SettingOutlined,
  BarChartOutlined,
  FileTextOutlined,
  BellOutlined,
  MessageOutlined,
  HourglassOutlined,
  MenuOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { adminApi, type Partner, type PartnerEarning, type UpdatePartnerRequest, type Arbitrator } from '../api/admin';
import { disputesApi, type Dispute } from '../api/disputes';
import { authApi, type User } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import AdminLogin from '../components/admin/AdminLogin';
import DirectorCommunication from '../components/admin/DirectorCommunication';
import { 
  ClaimStatus, 
  ClaimType,
  getClaimTypeLabel, 
  getClaimPriorityLabel, 
  getClaimPriorityColor,
  getClaimStatusLabel,
  getClaimStatusColor,
  getDirectorCommunicationStatusLabel
} from '../types/claims';
import { 
  getMockClaimsByStatus, 
  getMockClaims,
  getMockDirectorCommunications 
} from '../mocks/claimsData';

const { Header, Sider, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;

type MenuItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
  component: React.ReactNode;
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  
  // Сразу проверяем наличие токена
  const hasToken = !!localStorage.getItem('access_token');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState<string>('overview');
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [form] = Form.useForm();

  const isMobile = !screens.md;
  const isTablet = screens.md && !screens.lg;

  // Проверка аутентификации
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      setUser(null);
      return;
    }
    
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      // Токен невалиден
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Обработчик успешного входа
  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setLoading(false);
  };

  // Определяем, можно ли загружать данные (только для admin с валидным токеном)
  const canLoadData = hasToken && !!user && user.role === 'admin';

  // Получение данных партнеров (только если пользователь авторизован и имеет нужную роль)
  const { data: partners, isLoading: partnersLoading, error: partnersError } = useQuery({
    queryKey: ['admin-partners'],
    queryFn: adminApi.getPartners,
    enabled: canLoadData,
    retry: false,
    retryOnMount: false,
    select: (data: any) => {
      // Обрабатываем разные форматы ответа
      if (Array.isArray(data)) return data;
      if (data?.results && Array.isArray(data.results)) return data.results;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    },
    onError: (error: any) => {
      console.error('Error fetching partners:', error);
      if (error.response?.status !== 401) {
        message.error('Ошибка при загрузке данных партнеров');
      }
    },
  });

  // Получение начислений (только если пользователь авторизован и имеет нужную роль)
  const { data: earnings, isLoading: earningsLoading, error: earningsError } = useQuery({
    queryKey: ['admin-earnings'],
    queryFn: adminApi.getEarnings,
    enabled: canLoadData,
    retry: false,
    retryOnMount: false,
    select: (data: any) => {
      // Обрабатываем разные форматы ответа
      if (Array.isArray(data)) return data;
      if (data?.results && Array.isArray(data.results)) return data.results;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    },
    onError: (error: any) => {
      console.error('Error fetching earnings:', error);
      if (error.response?.status !== 401) {
        message.error('Ошибка при загрузке данных начислений');
      }
    },
  });

  // Получение споров (только если пользователь авторизован и имеет нужную роль)
  const { data: disputes, isLoading: disputesLoading, error: disputesError } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: disputesApi.getDisputes,
    enabled: canLoadData,
    retry: false,
    retryOnMount: false,
    select: (data: any) => {
      // API возвращает пагинированный ответ: {count: 2, next: null, previous: null, results: Array}
      if (data?.data?.results && Array.isArray(data.data.results)) {
        return data.data.results;
      }
      
      // Обрабатываем разные форматы ответа
      if (Array.isArray(data)) {
        return data;
      }
      if (data?.results && Array.isArray(data.results)) {
        return data.results;
      }
      if (data?.data && Array.isArray(data.data)) {
        return data.data;
      }
      return [];
    },
    onError: (error: any) => {
      console.error('Error fetching disputes:', error);
      // Не показываем ошибку, если это 404 (споры могут отсутствовать)
      if (error.response?.status !== 401 && error.response?.status !== 404) {
        message.warning('Не удалось загрузить данные о спорах');
      }
    },
  });

  // Получение арбитров (только если пользователь авторизован и имеет нужную роль)
  const { data: arbitrators, isLoading: arbitratorsLoading, error: arbitratorsError } = useQuery<Arbitrator[]>({
    queryKey: ['admin-arbitrators'],
    queryFn: adminApi.getArbitrators,
    enabled: canLoadData,
    retry: false,
    retryOnMount: false,
    select: (data: any) => {
      if (Array.isArray(data)) return data;
      if (data?.results && Array.isArray(data.results)) return data.results;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    },
    onError: (error: any) => {
      console.error('Error fetching arbitrators:', error);
      if (error.response?.status !== 401) {
        message.error('Ошибка при загрузке данных арбитров');
      }
    },
  });

  // Мутации для обновления данных (должны быть объявлены до условных возвратов)
  const markEarningPaidMutation = useMutation({
    mutationFn: adminApi.markEarningPaid,
    onMutate: async (earningId) => {
      // Отменяем исходящие запросы, чтобы не перезаписать оптимистичное обновление
      await queryClient.cancelQueries({ queryKey: ['admin-earnings'] });
      
      // Сохраняем предыдущее значение для отката
      const previousEarnings = queryClient.getQueryData(['admin-earnings']);
      
      // Оптимистично обновляем данные
      queryClient.setQueryData(['admin-earnings'], (old: PartnerEarning[] | undefined) => {
        if (!old) return old;
        return old.map(earning => 
          earning.id === earningId 
            ? { ...earning, is_paid: true }
            : earning
        );
      });
      
      return { previousEarnings };
    },
    onSuccess: () => {
      message.success('Начисление отмечено как выплаченное');
      queryClient.invalidateQueries({ queryKey: ['admin-earnings'] });
    },
    onError: (error: any, earningId, context) => {
      // Откатываем изменения в случае ошибки
      if (context?.previousEarnings) {
        queryClient.setQueryData(['admin-earnings'], context.previousEarnings);
      }
      console.error('Error marking earning as paid:', error);
      message.error(error?.message || 'Ошибка при отметке начисления');
    },
  });

  const updatePartnerMutation = useMutation({
    mutationFn: ({ partnerId, data }: { partnerId: number; data: UpdatePartnerRequest }) =>
      adminApi.updatePartner(partnerId, data),
    onSuccess: () => {
      message.success('Партнер обновлен');
      setEditModalVisible(false);
      setSelectedPartner(null);
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] });
      queryClient.refetchQueries({ queryKey: ['admin-partners'] });
    },
    onError: () => {
      message.error('Ошибка обновления партнера');
    },
  });

  // Статистика
  const totalPartners = partners?.length || 0;
  const totalReferrals = partners?.reduce((sum: number, p: any) => sum + p.total_referrals, 0) || 0;
  const totalEarnings = partners?.reduce((sum: number, p: any) => sum + p.total_earnings, 0) || 0;
  const unpaidEarnings = earnings?.filter((e: any) => !e.is_paid).length || 0;
  const totalDisputes = disputes?.length || 0;
  const resolvedDisputes = disputes?.filter((d: any) => d.resolved).length || 0;
  const pendingDisputes = totalDisputes - resolvedDisputes;

  // Колонки таблиц
  const partnersColumns = [
    {
      title: 'Партнер',
      dataIndex: 'username',
      key: 'username',
      render: (username: string, record: Partner) => (
        <div>
          <div><strong>{username}</strong></div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.email}</div>
        </div>
      ),
    },
    {
      title: 'Реферальный код',
      dataIndex: 'referral_code',
      key: 'referral_code',
      render: (code: string) => (
        <Tag color="blue" style={{ fontFamily: 'monospace' }}>
          {code}
        </Tag>
      ),
    },
    {
      title: 'Процент',
      dataIndex: 'partner_commission_rate',
      key: 'partner_commission_rate',
      render: (rate: number) => `${rate}%`,
    },
    {
      title: 'Рефералы',
      key: 'referrals',
      render: (record: Partner) => (
        <div>
          <div>Всего: {record.total_referrals}</div>
          <div style={{ color: '#52c41a' }}>Активных: {record.active_referrals}</div>
        </div>
      ),
    },
    {
      title: 'Доходы',
      dataIndex: 'total_earnings',
      key: 'total_earnings',
      render: (amount: number) => `${amount} ₽`,
    },
    {
      title: 'Статус',
      dataIndex: 'is_verified',
      key: 'is_verified',
      render: (isVerified: boolean) => (
        <Tag color={isVerified ? 'green' : 'orange'}>
          {isVerified ? 'Верифицирован' : 'Не верифицирован'}
        </Tag>
      ),
    },
    {
      title: 'Дата регистрации',
      dataIndex: 'date_joined',
      key: 'date_joined',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (record: Partner) => (
        <Space>
          <Button 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEditPartner(record)}
          >
            Изменить
          </Button>
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewPartner(record)}
          >
            Подробно
          </Button>
        </Space>
      ),
    },
  ];

  const earningsColumns = [
    {
      title: 'Партнер',
      dataIndex: 'partner',
      key: 'partner',
    },
    {
      title: 'Реферал',
      dataIndex: 'referral',
      key: 'referral',
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `${amount} ₽`,
    },
    {
      title: 'Тип',
      dataIndex: 'earning_type',
      key: 'earning_type',
      render: (type: string) => {
        const typeMap = {
          order: 'Заказ',
          registration: 'Регистрация',
          bonus: 'Бонус',
        };
        return typeMap[type as keyof typeof typeMap] || type;
      },
    },
    {
      title: 'Статус',
      dataIndex: 'is_paid',
      key: 'is_paid',
      render: (isPaid: boolean) => (
        <Tag color={isPaid ? 'green' : 'orange'}>
          {isPaid ? 'Выплачено' : 'Ожидает'}
        </Tag>
      ),
    },
    {
      title: 'Дата',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (record: PartnerEarning) => (
        <Space>
          {!record.is_paid && (
            <Button 
              size="small" 
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleMarkAsPaid(record.id)}
            >
              Выплатить
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const disputesColumns = [
    {
      title: 'Заказ',
      dataIndex: ['order', 'title'],
      key: 'order_title',
      render: (title: string, record: Dispute) => (
        <div>
          <div><strong>#{record.order.id}</strong></div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {title || 'Без названия'}
          </div>
        </div>
      ),
    },
    {
      title: 'Участники',
      key: 'participants',
      width: 250,
      render: (record: Dispute) => (
        <div>
          <div><UserOutlined /> Клиент: {record.order.client.username}</div>
          {record.order.expert && (
            <div><UserOutlined /> Эксперт: {record.order.expert.username}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Причина спора',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason: string) => (
        <div style={{ maxWidth: 200 }}>
          <Text ellipsis={{ tooltip: reason }}>
            {reason}
          </Text>
        </div>
      ),
    },
    {
      title: 'Арбитр',
      dataIndex: ['arbitrator', 'username'],
      key: 'arbitrator',
      render: (arbitrator: string) => arbitrator || 'Не назначен',
    },
    {
      title: 'Статус',
      dataIndex: 'resolved',
      key: 'resolved',
      render: (resolved: boolean) => (
        <Tag color={resolved ? 'green' : 'orange'} icon={resolved ? <CheckCircleOutlined /> : <ClockCircleOutlined />}>
          {resolved ? 'Решен' : 'В рассмотрении'}
        </Tag>
      ),
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (record: Dispute) => (
        <Space>
          <Tooltip title="Подробно">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handleViewDispute(record)}
            />
          </Tooltip>
          {!record.resolved && !record.arbitrator && (
            <Tooltip title="Назначить арбитра">
              <Button 
                size="small" 
                type="primary"
                icon={<UserOutlined />}
                onClick={() => handleAssignArbitrator(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // Обработчики
  const handleEditPartner = (partner: Partner) => {
    setSelectedPartner(partner);
    form.setFieldsValue(partner);
    setEditModalVisible(true);
  };

  const handleViewPartner = (partner: Partner) => {
    setSelectedPartner(partner);
    setViewModalVisible(true);
  };

  const handleMarkAsPaid = (earningId: number) => {
    markEarningPaidMutation.mutate(earningId);
  };

  const handleUpdatePartner = async (values: UpdatePartnerRequest) => {
    if (!selectedPartner) return;
    updatePartnerMutation.mutate({ partnerId: selectedPartner.id, data: values });
  };

  const handleViewDispute = (dispute: Dispute) => {
    // Показать детали спора
    Modal.info({
      title: `Спор по заказу #${dispute.order.id}`,
      content: (
        <div>
          <p><strong>Клиент:</strong> {dispute.order.client.username}</p>
          {dispute.order.expert && <p><strong>Эксперт:</strong> {dispute.order.expert.username}</p>}
          <p><strong>Причина спора:</strong></p>
          <p>{dispute.reason}</p>
          {dispute.arbitrator && <p><strong>Арбитр:</strong> {dispute.arbitrator.username}</p>}
          {dispute.resolved && dispute.result && (
            <div>
              <p><strong>Решение:</strong></p>
              <p>{dispute.result}</p>
            </div>
          )}
        </div>
      ),
      width: 600,
      maskStyle: {
        backdropFilter: 'blur(4px)',
      },
    });
  };

  const handleAssignArbitrator = (dispute: Dispute) => {
    if (!arbitrators || arbitrators.length === 0) {
      message.warning('Нет доступных арбитров');
      return;
    }

    let selectedArbitratorId: number | null = null;

    Modal.confirm({
      title: 'Назначить арбитра',
      content: (
        <div>
          <p>Выберите арбитра для спора #{dispute.id}:</p>
          <Select
            placeholder="Выберите арбитра"
            style={{ width: '100%', marginTop: 8 }}
            onChange={(value) => {
              selectedArbitratorId = value;
            }}
          >
            {arbitrators.map((arbitrator) => (
              <Select.Option key={arbitrator.id} value={arbitrator.id}>
                {arbitrator.username} ({arbitrator.first_name} {arbitrator.last_name})
              </Select.Option>
            ))}
          </Select>
        </div>
      ),
      okText: 'Назначить',
      cancelText: 'Отмена',
      maskStyle: {
        backdropFilter: 'blur(4px)',
      },
      onOk: async () => {
        if (!selectedArbitratorId) {
          message.error('Выберите арбитра');
          return;
        }

        try {
          await disputesApi.assignArbitrator(dispute.id, {
            arbitrator_id: selectedArbitratorId,
          });
          message.success('Арбитр назначен успешно');
          queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
        } catch (error: any) {
          message.error(error?.response?.data?.error || 'Не удалось назначить арбитра');
        }
      },
    });
  };

  const handleQuickLogin = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await authApi.login({ username: email, password });
      
      // Сохраняем токены
      localStorage.setItem('access_token', response.access);
      localStorage.setItem('refresh_token', response.refresh);
      
      // Получаем данные пользователя
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      
      message.success(`Вход выполнен как ${currentUser.username}`);
      
      // Перенаправляем в зависимости от роли
      if (currentUser.role === 'partner') {
        navigate('/partner');
      } else if (currentUser.role === 'arbitrator') {
        navigate('/arbitrator');
      } else if (currentUser.email === 'director@test.com') {
        navigate('/director');
      } else if (currentUser.role === 'admin') {
        // Остаемся на админ-панели
        queryClient.invalidateQueries();
      }
    } catch (error: any) {
      message.error('Ошибка входа: ' + (error?.response?.data?.detail || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

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
          queryClient.clear();
          setUser(null);
          setLoading(false);
          message.success('Вы вышли из системы');
        } catch (error) {
          authApi.logout();
          queryClient.clear();
          setUser(null);
          setLoading(false);
          message.success('Вы вышли из системы');
        }
      },
    });
  };

  // Компоненты для разделов
  const OverviewSection = () => (
    <div>
      <Title level={3}>Обзор</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Всего партнеров"
              value={totalPartners}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Всего рефералов"
              value={totalReferrals}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Невыплаченные"
              value={unpaidEarnings}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8} md={8}>
          <Card>
            <Statistic
              title="Всего споров"
              value={totalDisputes}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={8}>
          <Card>
            <Statistic
              title="Решено"
              value={resolvedDisputes}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={8}>
          <Card>
            <Statistic
              title="В рассмотрении"
              value={pendingDisputes}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );

  const PartnersSection = () => (
    <div>
      <Title level={3}>Управление партнерами</Title>
      <Card>
        <Table
          columns={partnersColumns}
          dataSource={partners || []}
          rowKey="id"
          loading={partnersLoading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Партнеры не найдены' }}
        />
      </Card>
    </div>
  );

  const EarningsSection = () => (
    <div>
      <Title level={3}>История начислений</Title>
      <Card>
        <Table
          columns={earningsColumns}
          dataSource={earnings || []}
          rowKey="id"
          loading={earningsLoading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Начисления не найдены' }}
        />
      </Card>
    </div>
  );

  const DisputesSection = () => (
    <div>
      <Title level={3}>Управление спорами</Title>
      <Card>
        {disputesError ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ color: '#ff4d4f' }}>
              Ошибка загрузки споров: {disputesError?.message || 'Неизвестная ошибка'}
            </p>
            <p style={{ color: '#666', fontSize: '12px' }}>
              Проверьте, что вы вошли как администратор
            </p>
          </div>
        ) : (
          <Table
            columns={disputesColumns}
            dataSource={disputes || []}
            rowKey="id"
            loading={disputesLoading}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'Споры не найдены' }}
          />
        )}
      </Card>
    </div>
  );

  // Новые секции для обращений
  const NewClaimsSection = () => {
    const newClaims = getMockClaimsByStatus(ClaimStatus.NEW);
    
    const claimsColumns = [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 60,
        render: (id: number) => `#${id}`,
      },
      {
        title: 'Пользователь',
        dataIndex: 'user',
        key: 'user',
        render: (user: any) => (
          <div>
            <div><strong>{user.username}</strong></div>
            <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
          </div>
        ),
      },
      {
        title: 'Тип',
        dataIndex: 'claimType',
        key: 'claimType',
        render: (type: string) => getClaimTypeLabel(type),
      },
      {
        title: 'Приоритет',
        dataIndex: 'priority',
        key: 'priority',
        render: (priority: string) => (
          <Tag color={getClaimPriorityColor(priority)}>
            {getClaimPriorityLabel(priority)}
          </Tag>
        ),
      },
      {
        title: 'Тема',
        dataIndex: 'subject',
        key: 'subject',
        ellipsis: true,
      },
      {
        title: 'Дата создания',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
      },
      {
        title: 'Действия',
        key: 'actions',
        width: 100,
        render: (record: any) => (
          <Space>
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => {
                Modal.info({
                  title: `Обращение #${record.id}`,
                  content: (
                    <div>
                      <p><strong>От:</strong> {record.user.username} ({record.user.email})</p>
                      <p><strong>Тип:</strong> {getClaimTypeLabel(record.claimType)}</p>
                      <p><strong>Приоритет:</strong> {getClaimPriorityLabel(record.priority)}</p>
                      <p><strong>Тема:</strong> {record.subject}</p>
                      <p><strong>Описание:</strong></p>
                      <p>{record.description}</p>
                      {record.relatedOrder && (
                        <p><strong>Связанный заказ:</strong> #{record.relatedOrder.id} - {record.relatedOrder.title}</p>
                      )}
                    </div>
                  ),
                  width: 600,
                  maskStyle: {
                    backdropFilter: 'blur(4px)',
                  },
                });
              }}
            />
            <Button 
              size="small" 
              type="primary"
              icon={<UserOutlined />}
              onClick={() => {
                message.success(`Обращение #${record.id} назначено на вас`);
              }}
            />
          </Space>
        ),
      },
    ];
    
    return (
      <div>
        <Card>
          <Table
            columns={claimsColumns}
            dataSource={newClaims}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'Нет новых обращений' }}
          />
        </Card>
      </div>
    );
  };

  const InProgressClaimsSection = () => {
    const inProgressClaims = getMockClaimsByStatus(ClaimStatus.IN_PROGRESS);
    
    const claimsColumns = [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 60,
        render: (id: number) => `#${id}`,
      },
      {
        title: 'Пользователь',
        dataIndex: 'user',
        key: 'user',
        render: (user: any) => (
          <div>
            <div><strong>{user.username}</strong></div>
            <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
          </div>
        ),
      },
      {
        title: 'Тип',
        dataIndex: 'claimType',
        key: 'claimType',
        render: (type: string) => getClaimTypeLabel(type),
      },
      {
        title: 'Приоритет',
        dataIndex: 'priority',
        key: 'priority',
        render: (priority: string) => (
          <Tag color={getClaimPriorityColor(priority)}>
            {getClaimPriorityLabel(priority)}
          </Tag>
        ),
      },
      {
        title: 'Тема',
        dataIndex: 'subject',
        key: 'subject',
        ellipsis: true,
      },
      {
        title: 'Администратор',
        dataIndex: 'assignedAdmin',
        key: 'assignedAdmin',
        render: (admin: any) => admin?.username || 'Не назначен',
      },
      {
        title: 'В работе',
        dataIndex: 'startedAt',
        key: 'startedAt',
        render: (date: string) => {
          const hours = dayjs().diff(dayjs(date), 'hour');
          const isOverdue = hours > 24;
          return (
            <span style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
              {hours}ч {isOverdue && <ExclamationCircleOutlined />}
            </span>
          );
        },
      },
      {
        title: 'Действия',
        key: 'actions',
        width: 100,
        render: (record: any) => (
          <Space>
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => {
                Modal.info({
                  title: `Обращение #${record.id}`,
                  content: (
                    <div>
                      <p><strong>От:</strong> {record.user.username} ({record.user.email})</p>
                      <p><strong>Тип:</strong> {getClaimTypeLabel(record.claimType)}</p>
                      <p><strong>Приоритет:</strong> {getClaimPriorityLabel(record.priority)}</p>
                      <p><strong>Тема:</strong> {record.subject}</p>
                      <p><strong>Описание:</strong></p>
                      <p>{record.description}</p>
                      {record.messages && record.messages.length > 0 && (
                        <>
                          <p><strong>Сообщения:</strong></p>
                          {record.messages.map((msg: any) => (
                            <div key={msg.id} style={{ marginBottom: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                {msg.author.username} - {dayjs(msg.createdAt).format('DD.MM.YYYY HH:mm')}
                                {msg.isInternal && <Tag color="orange" style={{ marginLeft: 8 }}>Внутренняя</Tag>}
                              </div>
                              <div>{msg.message}</div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  ),
                  width: 700,
                  maskStyle: {
                    backdropFilter: 'blur(4px)',
                  },
                });
              }}
            />
            <Button 
              size="small" 
              type="primary"
              icon={<MessageOutlined />}
              onClick={() => {
                message.success(`Ответ на обращение #${record.id} отправлен`);
              }}
            />
          </Space>
        ),
      },
    ];
    
    return (
      <div>
        <Card>
          <Table
            columns={claimsColumns}
            dataSource={inProgressClaims}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'Нет обращений в работе' }}
          />
        </Card>
      </div>
    );
  };

  const CompletedClaimsSection = () => {
    const completedClaims = getMockClaimsByStatus(ClaimStatus.RESOLVED);
    
    const claimsColumns = [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 60,
        render: (id: number) => `#${id}`,
      },
      {
        title: 'Пользователь',
        dataIndex: 'user',
        key: 'user',
        render: (user: any) => (
          <div>
            <div><strong>{user.username}</strong></div>
            <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
          </div>
        ),
      },
      {
        title: 'Тип',
        dataIndex: 'claimType',
        key: 'claimType',
        render: (type: string) => getClaimTypeLabel(type),
      },
      {
        title: 'Тема',
        dataIndex: 'subject',
        key: 'subject',
        ellipsis: true,
      },
      {
        title: 'Решение',
        dataIndex: 'resolution',
        key: 'resolution',
        ellipsis: true,
        render: (resolution: string) => (
          <Text ellipsis={{ tooltip: resolution }}>
            {resolution}
          </Text>
        ),
      },
      {
        title: 'Дата решения',
        dataIndex: 'resolvedAt',
        key: 'resolvedAt',
        render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
      },
      {
        title: 'Время обработки',
        key: 'processingTime',
        render: (record: any) => {
          const hours = dayjs(record.resolvedAt).diff(dayjs(record.createdAt), 'hour');
          return `${hours}ч`;
        },
      },
      {
        title: 'Действия',
        key: 'actions',
        width: 80,
        render: (record: any) => (
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => {
              Modal.info({
                title: `Обращение #${record.id} (Решено)`,
                content: (
                  <div>
                    <p><strong>От:</strong> {record.user.username} ({record.user.email})</p>
                    <p><strong>Тип:</strong> {getClaimTypeLabel(record.claimType)}</p>
                    <p><strong>Тема:</strong> {record.subject}</p>
                    <p><strong>Описание:</strong></p>
                    <p>{record.description}</p>
                    <p><strong>Решение:</strong></p>
                    <p style={{ background: '#f0f9ff', padding: 12, borderRadius: 4 }}>{record.resolution}</p>
                    <p><strong>Время обработки:</strong> {dayjs(record.resolvedAt).diff(dayjs(record.createdAt), 'hour')} часов</p>
                  </div>
                ),
                width: 700,
                maskStyle: {
                  backdropFilter: 'blur(4px)',
                },
              });
            }}
          />
        ),
      },
    ];
    
    return (
      <div>
        <Card>
          <Table
            columns={claimsColumns}
            dataSource={completedClaims}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'Нет завершённых обращений' }}
          />
        </Card>
      </div>
    );
  };

  const PendingApprovalSection = () => {
    const pendingClaims = getMockClaimsByStatus(ClaimStatus.PENDING_DIRECTOR);
    
    const claimsColumns = [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 60,
        render: (id: number) => `#${id}`,
      },
      {
        title: 'Пользователь',
        dataIndex: 'user',
        key: 'user',
        render: (user: any) => (
          <div>
            <div><strong>{user.username}</strong></div>
            <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
          </div>
        ),
      },
      {
        title: 'Тип',
        dataIndex: 'claimType',
        key: 'claimType',
        render: (type: string) => getClaimTypeLabel(type),
      },
      {
        title: 'Приоритет',
        dataIndex: 'priority',
        key: 'priority',
        render: (priority: string) => (
          <Tag color={getClaimPriorityColor(priority)}>
            {getClaimPriorityLabel(priority)}
          </Tag>
        ),
      },
      {
        title: 'Тема',
        dataIndex: 'subject',
        key: 'subject',
        ellipsis: true,
      },
      {
        title: 'Эскалировано',
        key: 'escalatedTime',
        render: (record: any) => {
          const lastHistory = record.statusHistory[record.statusHistory.length - 1];
          return dayjs(lastHistory.createdAt).format('DD.MM.YYYY HH:mm');
        },
      },
      {
        title: 'Статус обсуждения',
        key: 'discussionStatus',
        render: () => (
          <Tag color="processing">
            Обсуждается с дирекцией
          </Tag>
        ),
      },
      {
        title: 'Действия',
        key: 'actions',
        width: 100,
        render: (record: any) => (
          <Space>
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => {
                Modal.info({
                  title: `Обращение #${record.id} (Ожидает решения)`,
                  content: (
                    <div>
                      <p><strong>От:</strong> {record.user.username} ({record.user.email})</p>
                      <p><strong>Тип:</strong> {getClaimTypeLabel(record.claimType)}</p>
                      <p><strong>Приоритет:</strong> {getClaimPriorityLabel(record.priority)}</p>
                      <p><strong>Тема:</strong> {record.subject}</p>
                      <p><strong>Описание:</strong></p>
                      <p>{record.description}</p>
                      <Alert
                        message="Обращение эскалировано в дирекцию"
                        description="Ожидается решение от дирекции. Проверьте раздел 'Коммуникация с дирекцией' для получения обновлений."
                        type="warning"
                        showIcon
                        style={{ marginTop: 16 }}
                      />
                    </div>
                  ),
                  width: 700,
                  maskStyle: {
                    backdropFilter: 'blur(4px)',
                  },
                });
              }}
            />
            <Button 
              size="small" 
              type="primary"
              icon={<MessageOutlined />}
              onClick={() => {
                message.info('Переход к обсуждению с дирекцией');
              }}
            />
          </Space>
        ),
      },
    ];
    
    return (
      <div>
        <Card>
          <Table
            columns={claimsColumns}
            dataSource={pendingClaims}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'Нет обращений, ожидающих решения' }}
          />
        </Card>
      </div>
    );
  };

  const ClaimsProcessingSection = () => {
    // Фильтруем только претензии и жалобы
    const complaints = getMockClaims().filter((claim: any) => 
      claim.claimType === ClaimType.USER_COMPLAINT || claim.claimType === ClaimType.ORDER_ISSUE
    );
    
    const complaintsColumns = [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 60,
        render: (id: number) => `#${id}`,
      },
      {
        title: 'Заявитель',
        dataIndex: 'user',
        key: 'user',
        render: (user: any) => (
          <div>
            <div><strong>{user.username}</strong></div>
            <div style={{ fontSize: '12px', color: '#666' }}>{user.role === 'client' ? 'Клиент' : 'Эксперт'}</div>
          </div>
        ),
      },
      {
        title: 'Ответчик',
        key: 'respondent',
        render: (record: any) => {
          if (record.relatedOrder) {
            const respondent = record.user.role === 'client' ? record.relatedOrder.expert : record.relatedOrder.client;
            return respondent ? (
              <div>
                <div><strong>{respondent.username}</strong></div>
                <div style={{ fontSize: '12px', color: '#666' }}>{respondent.role === 'client' ? 'Клиент' : 'Эксперт'}</div>
              </div>
            ) : '-';
          }
          return '-';
        },
      },
      {
        title: 'Связанный заказ',
        dataIndex: 'relatedOrder',
        key: 'relatedOrder',
        render: (order: any) => order ? (
          <div>
            <div><strong>#{order.id}</strong></div>
            <div style={{ fontSize: '12px', color: '#666' }}>{order.title}</div>
          </div>
        ) : '-',
      },
      {
        title: 'Тип',
        dataIndex: 'claimType',
        key: 'claimType',
        render: (type: string) => getClaimTypeLabel(type),
      },
      {
        title: 'Приоритет',
        dataIndex: 'priority',
        key: 'priority',
        render: (priority: string) => (
          <Tag color={getClaimPriorityColor(priority)}>
            {getClaimPriorityLabel(priority)}
          </Tag>
        ),
      },
      {
        title: 'Статус',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => (
          <Tag color={getClaimStatusColor(status)}>
            {getClaimStatusLabel(status)}
          </Tag>
        ),
      },
      {
        title: 'Действия',
        key: 'actions',
        width: 100,
        render: (record: any) => (
          <Space>
            <Button 
              size="small" 
              icon={<CheckOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: `Претензия #${record.id}`,
                  content: (
                    <div>
                      <p><strong>Заявитель:</strong> {record.user.username}</p>
                      <p><strong>Тип:</strong> {getClaimTypeLabel(record.claimType)}</p>
                      <p><strong>Тема:</strong> {record.subject}</p>
                      <p><strong>Описание:</strong></p>
                      <p>{record.description}</p>
                      {record.relatedOrder && (
                        <p><strong>Заказ:</strong> #{record.relatedOrder.id} - {record.relatedOrder.title}</p>
                      )}
                      <div style={{ marginTop: 16 }}>
                        <p><strong>Выберите действие:</strong></p>
                      </div>
                    </div>
                  ),
                  width: 700,
                  okText: 'Удовлетворить',
                  cancelText: 'Отклонить',
                  maskStyle: {
                    backdropFilter: 'blur(4px)',
                  },
                  onOk: () => {
                    message.success(`Претензия #${record.id} удовлетворена`);
                  },
                  onCancel: () => {
                    message.info(`Претензия #${record.id} отклонена`);
                  },
                });
              }}
            />
            <Button 
              size="small" 
              danger
              icon={<ExclamationCircleOutlined />}
              onClick={() => {
                message.warning(`Претензия #${record.id} эскалирована в дирекцию`);
              }}
            />
          </Space>
        ),
      },
    ];
    
    return (
      <div>
        <Card>
          <Alert
            message="Претензии и жалобы"
            description="В этом разделе отображаются все обращения типа 'Жалоба на пользователя' и 'Проблема с заказом', требующие особого внимания."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Table
            columns={complaintsColumns}
            dataSource={complaints}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'Нет претензий для обработки' }}
          />
        </Card>
      </div>
    );
  };

  const CommunicationSection = () => {
    const communications = getMockDirectorCommunications();
    
    const communicationsColumns = [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 60,
        render: (id: number) => `#${id}`,
      },
      {
        title: 'Тема',
        dataIndex: 'subject',
        key: 'subject',
        ellipsis: true,
      },
      {
        title: 'Приоритет',
        dataIndex: 'priority',
        key: 'priority',
        render: (priority: string) => (
          <Tag color={getClaimPriorityColor(priority)}>
            {getClaimPriorityLabel(priority)}
          </Tag>
        ),
      },
      {
        title: 'Статус',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => {
          const colors: Record<string, string> = {
            open: 'blue',
            in_discussion: 'processing',
            resolved: 'success',
            closed: 'default',
          };
          return (
            <Tag color={colors[status]}>
              {getDirectorCommunicationStatusLabel(status)}
            </Tag>
          );
        },
      },
      {
        title: 'Связанное обращение',
        dataIndex: 'relatedClaim',
        key: 'relatedClaim',
        render: (claim: any) => claim ? `#${claim.id}` : '-',
      },
      {
        title: 'Непрочитанных',
        dataIndex: 'unreadCount',
        key: 'unreadCount',
        render: (count: number) => count > 0 ? (
          <Tag color="red">{count}</Tag>
        ) : (
          <span style={{ color: '#999' }}>0</span>
        ),
      },
      {
        title: 'Последнее обновление',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
      },
      {
        title: 'Действия',
        key: 'actions',
        width: 150,
        render: (record: any) => (
          <Button 
            size="small" 
            type="primary"
            icon={<MessageOutlined />}
            onClick={() => {
              Modal.info({
                title: record.subject,
                content: (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <Tag color={getClaimPriorityColor(record.priority)}>
                        {getClaimPriorityLabel(record.priority)}
                      </Tag>
                      {record.relatedClaim && (
                        <Tag color="blue">Обращение #{record.relatedClaim.id}</Tag>
                      )}
                    </div>
                    
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                      {record.messages.map((msg: any) => (
                        <div 
                          key={msg.id} 
                          style={{ 
                            marginBottom: 12, 
                            padding: 12, 
                            background: msg.author.role === 'director' ? '#e6f7ff' : '#f5f5f5',
                            borderRadius: 8,
                            borderLeft: `3px solid ${msg.author.role === 'director' ? '#1890ff' : '#d9d9d9'}`
                          }}
                        >
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#666', 
                            marginBottom: 4,
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}>
                            <span>
                              <strong>{msg.author.username}</strong>
                              {msg.author.role === 'director' && <Tag color="purple" style={{ marginLeft: 8, fontSize: '11px' }}>Дирекция</Tag>}
                            </span>
                            <span>{dayjs(msg.createdAt).format('DD.MM HH:mm')}</span>
                          </div>
                          <div>{msg.message}</div>
                        </div>
                      ))}
                    </div>
                    
                    {record.decision && (
                      <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Решение:</div>
                        <div>{record.decision}</div>
                      </div>
                    )}
                    
                    <div style={{ marginTop: 16 }}>
                      <Input.TextArea 
                        placeholder="Введите ваше сообщение..."
                        rows={3}
                        style={{ marginBottom: 8 }}
                      />
                      <Button type="primary" icon={<MessageOutlined />}>
                        Отправить сообщение
                      </Button>
                    </div>
                  </div>
                ),
                width: 800,
                maskStyle: {
                  backdropFilter: 'blur(4px)',
                },
                okText: 'Закрыть',
              });
            }}
          >
            Открыть
          </Button>
        ),
      },
    ];
    
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16 }}>
          <Button 
            type="primary" 
            icon={<MessageOutlined />}
            onClick={() => {
              message.info('Создание нового обсуждения');
            }}
          >
            Новое обсуждение
          </Button>
        </div>
        <Card>
          <Table
            columns={communicationsColumns}
            dataSource={communications}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'Нет обсуждений с дирекцией' }}
          />
        </Card>
      </div>
    );
  };

  // Если загрузка - показываем спиннер
  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  // Если нет токена или пользователь не авторизован - показываем форму входа
  if (!hasToken || !user) {
    return <AdminLogin onSuccess={handleLoginSuccess} />;
  }

  // Если пользователь - директор (проверяем по email, так как в БД у него роль admin)
  if (user.role === 'admin' && user.email === 'director@test.com') {
    navigate('/director');
    return null;
  }

  // Если пользователь авторизован, но не имеет роли admin - показываем ошибку доступа
  if (user.role !== 'admin') {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Result
            status="403"
            title="Доступ запрещен"
            subTitle="У вас нет прав для доступа к личному кабинету администратора."
            extra={
              <Button type="primary" onClick={() => navigate('/')}>
                Вернуться на главную
              </Button>
            }
          />
        </Content>
      </Layout>
    );
  }

  // Маппинг ключей на компоненты
  const componentMap: Record<string, React.ReactNode> = {
    overview: <OverviewSection />,
    partners: <PartnersSection />,
    earnings: <EarningsSection />,
    disputes: <DisputesSection />,
    new_claims: <NewClaimsSection />,
    in_progress_claims: <InProgressClaimsSection />,
    completed_claims: <CompletedClaimsSection />,
    pending_approval: <PendingApprovalSection />,
    claims_processing: <ClaimsProcessingSection />,
    communication: <DirectorCommunication />,
  };

  // Маппинг ключей на заголовки
  const titleMap: Record<string, string> = {
    overview: 'Обзор',
    partners: 'Партнеры',
    earnings: 'Начисления',
    disputes: 'Споры',
    new_claims: 'Новые обращения',
    in_progress_claims: 'В работе',
    completed_claims: 'Завершённые',
    pending_approval: 'Ожидают решения',
    claims_processing: 'Обработка претензий',
    communication: 'Коммуникация с дирекцией',
  };

  const handleMenuClick = (key: string) => {
    setSelectedMenu(key);
    // Если выбран подпункт обращений, открываем меню "Обращения"
    if (['new_claims', 'in_progress_claims', 'completed_claims', 'pending_approval'].includes(key)) {
      setOpenKeys(['claims']);
    }
    // Закрываем drawer на мобильных после выбора
    if (isMobile) {
      setDrawerVisible(false);
    }
  };

  const currentComponent = componentMap[selectedMenu];
  const currentTitle = titleMap[selectedMenu] || 'Личный кабинет администратора';

  const menuItems = [
    {
      key: 'overview',
      icon: <BarChartOutlined />,
      label: 'Обзор',
    },
    {
      key: 'partners',
      icon: <TeamOutlined />,
      label: 'Партнеры',
    },
    {
      key: 'earnings',
      icon: <DollarOutlined />,
      label: 'Начисления',
    },
    {
      key: 'disputes',
      icon: <FileTextOutlined />,
      label: 'Споры',
    },
    {
      key: 'claims',
      icon: <FileTextOutlined />,
      label: 'Обращения',
      children: [
        {
          key: 'new_claims',
          icon: <BellOutlined />,
          label: 'Новые обращения',
        },
        {
          key: 'in_progress_claims',
          icon: <ClockCircleOutlined />,
          label: 'В работе',
        },
        {
          key: 'completed_claims',
          icon: <CheckCircleOutlined />,
          label: 'Завершённые',
        },
        {
          key: 'pending_approval',
          icon: <HourglassOutlined />,
          label: 'Ожидают решения',
        },
      ],
    },
    {
      key: 'claims_processing',
      icon: <FileTextOutlined />,
      label: 'Обработка претензий',
    },
    {
      key: 'communication',
      icon: <MessageOutlined />,
      label: 'Коммуникация с дирекцией',
    },
  ];

  const renderMenu = () => (
    <Menu
      mode="inline"
      selectedKeys={[selectedMenu]}
      openKeys={openKeys}
      onClick={({ key }) => handleMenuClick(key as string)}
      onOpenChange={(keys) => setOpenKeys(keys)}
      style={{
        borderRight: 0,
        height: isMobile ? 'auto' : 'calc(100vh - 120px)',
      }}
      items={menuItems}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sider
          width={isTablet ? 200 : 250}
          style={{
            background: '#fff',
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          }}
          breakpoint="lg"
          collapsedWidth="0"
        >
          <div
            style={{
              padding: isTablet ? '16px' : '24px',
              textAlign: 'center',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <SettingOutlined style={{ fontSize: isTablet ? '28px' : '32px', color: '#1890ff', marginBottom: '8px' }} />
            <Title level={4} style={{ margin: 0, fontSize: isTablet ? '14px' : '16px' }}>
              ЛК администратора
            </Title>
          </div>
          {renderMenu()}
        </Sider>
      )}

      {/* Drawer для мобильных */}
      <Drawer
        title="Меню"
        placement="left"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={280}
        styles={{ body: { padding: 0 } }}
      >
        <div
          style={{
            padding: '16px',
            textAlign: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <SettingOutlined style={{ fontSize: '28px', color: '#1890ff', marginBottom: '8px' }} />
          <Title level={5} style={{ margin: 0 }}>
            ЛК администратора
          </Title>
        </div>
        {renderMenu()}
      </Drawer>
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
          <Space>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setDrawerVisible(true)}
                style={{ fontSize: '18px' }}
              />
            )}
            <Title level={isMobile ? 5 : 3} style={{ margin: 0 }}>
              {isMobile ? titleMap[selectedMenu]?.split(' ')[0] || 'Админ' : currentTitle}
            </Title>
          </Space>
          <Button
            type="default"
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            size={isMobile ? 'small' : 'middle'}
          >
            {!isMobile && 'Выйти'}
          </Button>
        </Header>
        <Content
          style={{
            margin: isMobile ? '12px' : isTablet ? '16px' : '24px',
            padding: isMobile ? '12px' : isTablet ? '16px' : '24px',
            background: '#fff',
            borderRadius: '8px',
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          {currentComponent}
        </Content>
        {!isMobile && (
          <Footer style={{ textAlign: 'center', background: '#fff', padding: isTablet ? '12px' : '24px' }}>
            Личный кабинет администратора © {new Date().getFullYear()}
          </Footer>
        )}
      </Layout>

      {/* Модальное окно просмотра партнера */}
      <Modal
        title="Информация о партнере"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setSelectedPartner(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setViewModalVisible(false);
            setSelectedPartner(null);
          }}>
            Закрыть
          </Button>,
          <Button 
            key="edit" 
            type="primary"
            onClick={() => {
              setViewModalVisible(false);
              if (selectedPartner) {
                handleEditPartner(selectedPartner);
              }
            }}
          >
            Редактировать
          </Button>,
        ]}
        width={700}
        maskStyle={{
          backdropFilter: 'blur(4px)',
        }}
      >
        {selectedPartner && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Paragraph><strong>Имя:</strong> {selectedPartner.first_name}</Paragraph>
              </Col>
              <Col span={12}>
                <Paragraph><strong>Фамилия:</strong> {selectedPartner.last_name}</Paragraph>
              </Col>
              <Col span={12}>
                <Paragraph><strong>Email:</strong> {selectedPartner.email}</Paragraph>
              </Col>
              <Col span={12}>
                <Paragraph><strong>Имя пользователя:</strong> {selectedPartner.username}</Paragraph>
              </Col>
              <Col span={12}>
                <Paragraph><strong>Реферальный код:</strong> 
                  <Tag color="blue" style={{ marginLeft: 8, fontFamily: 'monospace' }}>
                    {selectedPartner.referral_code}
                  </Tag>
                </Paragraph>
              </Col>
              <Col span={12}>
                <Paragraph><strong>Процент комиссии:</strong> {selectedPartner.partner_commission_rate}%</Paragraph>
              </Col>
              <Col span={12}>
                <Paragraph><strong>Всего рефералов:</strong> {selectedPartner.total_referrals}</Paragraph>
              </Col>
              <Col span={12}>
                <Paragraph><strong>Активных рефералов:</strong> {selectedPartner.active_referrals}</Paragraph>
              </Col>
              <Col span={12}>
                <Paragraph><strong>Общий доход:</strong> {selectedPartner.total_earnings.toLocaleString('ru-RU')} ₽</Paragraph>
              </Col>
              <Col span={12}>
                <Paragraph><strong>Статус верификации:</strong> 
                  <Tag color={selectedPartner.is_verified ? 'green' : 'orange'} style={{ marginLeft: 8 }}>
                    {selectedPartner.is_verified ? 'Верифицирован' : 'Не верифицирован'}
                  </Tag>
                </Paragraph>
              </Col>
              <Col span={24}>
                <Paragraph><strong>Дата регистрации:</strong> {dayjs(selectedPartner.date_joined).format('DD.MM.YYYY HH:mm')}</Paragraph>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* Модальное окно редактирования партнера */}
      <Modal
        title="Редактировать партнера"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedPartner(null);
        }}
        onOk={() => form.submit()}
        width={600}
        maskStyle={{
          backdropFilter: 'blur(4px)',
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdatePartner}
        >
          <Form.Item label="Имя" name="first_name">
            <Input />
          </Form.Item>
          <Form.Item label="Фамилия" name="last_name">
            <Input />
          </Form.Item>
          <Form.Item label="Процент комиссии" name="partner_commission_rate">
            <InputNumber min={0} max={100} suffix="%" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Статус верификации" name="is_verified">
            <Select>
              <Select.Option value={true}>Верифицирован</Select.Option>
              <Select.Option value={false}>Не верифицирован</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default AdminDashboard;
