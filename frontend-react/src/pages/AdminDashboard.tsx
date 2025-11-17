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
  Tooltip
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
  FileTextOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { adminApi, type Partner, type PartnerEarning, type UpdatePartnerRequest, type Arbitrator } from '../api/admin';
import { disputesApi, type Dispute } from '../api/disputes';
import { authApi, type User } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import AdminLogin from '../components/admin/AdminLogin';

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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState<string>('overview');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [form] = Form.useForm();

  // Проверка аутентификации
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
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

  // Определяем, можно ли загружать данные (только для admin)
  const canLoadData = !!user && user.role === 'admin';

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
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Всего партнеров"
              value={totalPartners}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Всего рефералов"
              value={totalReferrals}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Общие доходы"
              value={totalEarnings}
              suffix="₽"
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
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

  // Если пользователь не авторизован - показываем форму входа
  if (!user) {
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
              <Button type="primary" onClick={() => navigate('/dashboard')}>
                Вернуться на главную
              </Button>
            }
          />
        </Content>
      </Layout>
    );
  }

  const menuItems: MenuItem[] = [
    {
      key: 'overview',
      icon: <BarChartOutlined />,
      label: 'Обзор',
      component: <OverviewSection />,
    },
    {
      key: 'partners',
      icon: <TeamOutlined />,
      label: 'Партнеры',
      component: <PartnersSection />,
    },
    {
      key: 'earnings',
      icon: <DollarOutlined />,
      label: 'Начисления',
      component: <EarningsSection />,
    },
    {
      key: 'disputes',
      icon: <FileTextOutlined />,
      label: 'Споры',
      component: <DisputesSection />,
    },
  ];

  const currentMenuItem = menuItems.find((item) => item.key === selectedMenu);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={250}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        }}
      >
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <SettingOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '8px' }} />
          <Title level={4} style={{ margin: 0, fontSize: '16px' }}>
            Личный кабинет администратора
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedMenu]}
          onClick={({ key }) => setSelectedMenu(key)}
          style={{
            borderRight: 0,
            height: 'calc(100vh - 120px)',
          }}
          items={menuItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
          }))}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Title level={3} style={{ margin: 0 }}>
            {currentMenuItem?.label || 'Личный кабинет администратора'}
          </Title>
          <Space>
            <Button
              type="default"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              Выйти
            </Button>
          </Space>
        </Header>
        <Content
          style={{
            margin: '24px',
            padding: '24px',
            background: '#fff',
            borderRadius: '8px',
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          {currentMenuItem?.component}
        </Content>
        <Footer style={{ textAlign: 'center', background: '#fff' }}>
          Личный кабинет администратора © {new Date().getFullYear()}
        </Footer>
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
