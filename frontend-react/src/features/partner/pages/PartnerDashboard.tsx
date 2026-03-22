import React, { useState } from 'react';
import { Layout, Menu, Button, Typography, Space, message, Modal, Card, Row, Col, Statistic, Table, Tag, Input, Spin, Alert, Drawer, Grid, DatePicker } from 'antd';
import {
  TeamOutlined,
  DollarOutlined,
  LinkOutlined,
  UserAddOutlined,
  TrophyOutlined,
  LogoutOutlined,
  CopyOutlined,
  FileTextOutlined,
  MenuOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  MessageOutlined,
  FileImageOutlined,
  EnvironmentOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import { authApi } from '@/features/auth/api/auth';
import { partnersApi, type PartnerDashboardData, type Referral, type PartnerEarning } from '@/features/partner/api/partners';
import { PartnerProgram } from './PartnerProgram';
import { PartnerChatsSection } from '../components/InternalCommunication/PartnerChatsSection';
import { PromoMaterials } from '../components/PromoMaterials/PromoMaterials';
import PartnersMap from './PartnersMap';
import PartnerFaqModal from '../modals/PartnerFaqModal';
import { AppFooter } from '@/components/layout/AppFooter';
import '@/styles/modals.css';
import './PartnerDashboard.css';

const { Header, Sider, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;


const StatisticsPanel: React.FC<{ 
  data: PartnerDashboardData;
  dateRange: [Dayjs, Dayjs] | null;
  onDateRangeChange: (dates: [Dayjs, Dayjs] | null) => void;
}> = ({ data, dateRange, onDateRangeChange }) => {
  const partnerInfo = data.partner_info;

  
  const filteredEarnings = dateRange 
    ? data.recent_earnings.filter(earning => {
        const earningDate = dayjs(earning.created_at);
        return earningDate.isAfter(dateRange[0]) && earningDate.isBefore(dateRange[1].add(1, 'day'));
      })
    : data.recent_earnings;

  const filteredTotalEarnings = filteredEarnings.reduce((sum, earning) => sum + earning.amount, 0);
  const filteredActiveOrders = dateRange
    ? data.referrals.reduce((sum, ref) => sum + ref.orders_count, 0)
    : data.referrals.reduce((sum, ref) => sum + ref.orders_count, 0);

  
  const rangePresets = [
    { label: 'Последние 7 дней', value: [dayjs().subtract(7, 'day'), dayjs()] as [Dayjs, Dayjs] },
    { label: 'Последние 30 дней', value: [dayjs().subtract(30, 'day'), dayjs()] as [Dayjs, Dayjs] },
    { label: 'Этот месяц', value: [dayjs().startOf('month'), dayjs()] as [Dayjs, Dayjs] },
    { label: 'Прошлый месяц', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] as [Dayjs, Dayjs] },
  ];

  return (
    <div className="partnerDashboardSection">
      <Card className="partnerDashboardCardSpacing">
        <Space direction="vertical" className="partnerDashboardSpaceFull" size="middle">
          <div className="partnerDashboardPanelHeader">
            <Title level={4} className="partnerDashboardTitleReset">
              <CalendarOutlined /> Выберите период
            </Title>
            {dateRange && (
              <Button onClick={() => onDateRangeChange(null)}>
                Сбросить фильтр
              </Button>
            )}
          </div>
          <RangePicker
            value={dateRange}
            onChange={(dates) => onDateRangeChange(dates as [Dayjs, Dayjs] | null)}
            format="DD.MM.YYYY"
            placeholder={['Начало периода', 'Конец периода']}
            className="partnerDashboardRangePicker"
            presets={rangePresets}
          />
          {dateRange && (
            <Text type="secondary">
              Показаны данные за период: {dateRange[0].format('DD.MM.YYYY')} - {dateRange[1].format('DD.MM.YYYY')}
            </Text>
          )}
        </Space>
      </Card>

      <Row gutter={[16, 16]} className="partnerDashboardStatsRow">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Всего рефералов"
              value={partnerInfo.total_referrals}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Активных рефералов"
              value={partnerInfo.active_referrals}
              prefix={<UserAddOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={dateRange ? "Доход за период" : "Общий доход"}
              value={dateRange ? filteredTotalEarnings : partnerInfo.total_earnings}
              suffix="₽"
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Процент комиссии"
              value={partnerInfo.commission_rate}
              suffix="%"
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};


const ReferralProgram: React.FC<{ data: PartnerDashboardData }> = ({ data }) => {
  const queryClient = useQueryClient();
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  const generateLinkMutation = useMutation({
    mutationFn: () => partnersApi.generateReferralLink(),
    onSuccess: (response) => {
      setGeneratedLink(response.referral_link);
      setLinkModalVisible(true);
      queryClient.invalidateQueries({ queryKey: ['partner-dashboard'] });
      message.success('Реферальная ссылка сгенерирована');
    },
    onError: () => {
      message.error('Не удалось сгенерировать ссылку');
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('Ссылка скопирована в буфер обмена!');
    });
  };

  const partnerInfo = data.partner_info;

  return (
    <div className="partnerDashboardReferralSection">
      <Card title="Реферальная программа" className="partnerDashboardCardReset">
        <Space direction="vertical" className="partnerDashboardSpaceFull" size="large">
          <div>
            <Text strong>Ваш реферальный код: </Text>
            <Tag color="blue" className="partnerDashboardReferralCodeTag">
              {partnerInfo.referral_code}
            </Tag>
          </div>
          <Button
            type="primary"
            icon={<LinkOutlined />}
            onClick={() => generateLinkMutation.mutate()}
            loading={generateLinkMutation.isPending}
            size="large"
          >
            Сгенерировать реферальную ссылку
          </Button>
          <Paragraph type="secondary">
            Поделитесь реферальной ссылкой с друзьями и получайте {partnerInfo.commission_rate}% 
            с каждого их заказа. Вы также получаете бонус за регистрацию новых пользователей.
          </Paragraph>
        </Space>
      </Card>

      <Modal
        title="Ваша реферальная ссылка"
        open={linkModalVisible}
        onCancel={() => setLinkModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setLinkModalVisible(false)}>
            Закрыть
          </Button>,
          <Button
            key="copy"
            type="primary"
            icon={<CopyOutlined />}
            onClick={() => copyToClipboard(generatedLink)}
          >
            Скопировать
          </Button>,
        ]}
      >
        <Space direction="vertical" className="partnerDashboardSpaceFull" size="middle">
          <Text>Поделитесь этой ссылкой для привлечения новых пользователей:</Text>
          <Input.TextArea
            value={generatedLink}
            readOnly
            rows={3}
            className="partnerDashboardMonospaceInput"
          />
          <Text type="secondary">
            Когда пользователь зарегистрируется по этой ссылке, он автоматически станет вашим рефералом
          </Text>
        </Space>
      </Modal>
    </div>
  );
};


const ReferralsList: React.FC<{ data: PartnerDashboardData }> = ({ data }) => {
  const referrals = data.referrals;

  const referralsColumns = [
    {
      title: 'Пользователь',
      dataIndex: 'username',
      key: 'username',
      render: (username: string, record: Referral) => (
        <div>
          <div><strong>{username}</strong></div>
          <div className="partnerDashboardReferralEmail">{record.email}</div>
        </div>
      ),
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'client' ? 'blue' : 'green'}>
          {role === 'client' ? 'Клиент' : 'Эксперт'}
        </Tag>
      ),
    },
    {
      title: 'Заказов',
      dataIndex: 'orders_count',
      key: 'orders_count',
      align: 'center' as const,
    },
    {
      title: 'Дата регистрации',
      dataIndex: 'date_joined',
      key: 'date_joined',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
  ];

  return (
    <Card>
      <Table
        columns={referralsColumns}
        dataSource={referrals}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: 'Пока нет рефералов' }}
        className="partnerDashboardLargeTable"
      />
    </Card>
  );
};


const EarningsHistory: React.FC<{ data: PartnerDashboardData }> = ({ data }) => {
  const earnings = data.recent_earnings;

  const earningsColumns = [
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `${amount.toLocaleString('ru-RU')} ₽`,
      sorter: (a: PartnerEarning, b: PartnerEarning) => a.amount - b.amount,
    },
    {
      title: 'От реферала',
      dataIndex: 'referral',
      key: 'referral',
    },
    {
      title: 'Тип',
      dataIndex: 'earning_type',
      key: 'earning_type',
      render: (type: string) => {
        const typeMap: Record<string, { label: string; color: string }> = {
          order: { label: 'Заказ', color: 'blue' },
          registration: { label: 'Регистрация', color: 'green' },
          bonus: { label: 'Бонус', color: 'purple' },
        };
        const typeInfo = typeMap[type] || { label: type, color: 'default' };
        return <Tag color={typeInfo.color}>{typeInfo.label}</Tag>;
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
      sorter: (a: PartnerEarning, b: PartnerEarning) => 
        dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf(),
    },
  ];

  return (
    <Card>
      <Table
        columns={earningsColumns}
        dataSource={earnings}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: 'Пока нет начислений' }}
        className="partnerDashboardLargeTable"
      />
    </Card>
  );
};

// Новый компонент для детальной статистики по заказам
const OrdersStatisticsTable: React.FC<{ data: PartnerDashboardData }> = ({ data }) => {
  // Фильтруем только заказы (не регистрации и бонусы)
  const orderEarnings = data.recent_earnings.filter(earning => earning.earning_type === 'order');

  const columns = [
    {
      title: '№ Заказа',
      dataIndex: 'order_id',
      key: 'order_id',
      render: (orderId: number | undefined) => orderId ? `#${orderId}` : '-',
    },
    {
      title: 'От реферала',
      dataIndex: 'referral',
      key: 'referral',
    },
    {
      title: 'Тип операции',
      dataIndex: 'is_cancelled',
      key: 'is_cancelled',
      render: (isCancelled: boolean | undefined) => (
        <Tag color={isCancelled ? 'red' : 'green'}>
          {isCancelled ? 'Расход (отмена)' : 'Доход'}
        </Tag>
      ),
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record: PartnerEarning) => {
        const displayAmount = record.is_cancelled ? -amount : amount;
        const color = record.is_cancelled ? '#ff4d4f' : '#52c41a';
        return (
          <span style={{ color, fontWeight: 'bold' }}>
            {displayAmount > 0 ? '+' : ''}{displayAmount.toLocaleString('ru-RU')} ₽
          </span>
        );
      },
      sorter: (a: PartnerEarning, b: PartnerEarning) => {
        const amountA = a.is_cancelled ? -a.amount : a.amount;
        const amountB = b.is_cancelled ? -b.amount : b.amount;
        return amountA - amountB;
      },
    },
    {
      title: 'Статус выплаты',
      dataIndex: 'is_paid',
      key: 'is_paid',
      render: (isPaid: boolean, record: PartnerEarning) => {
        if (record.is_cancelled) {
          return <Tag color="default">Не применимо</Tag>;
        }
        return (
          <Tag color={isPaid ? 'green' : 'orange'}>
            {isPaid ? 'Выплачено' : 'Ожидает'}
          </Tag>
        );
      },
    },
    {
      title: 'Дата',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
      sorter: (a: PartnerEarning, b: PartnerEarning) => 
        dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf(),
      defaultSortOrder: 'descend' as const,
    },
  ];

  // Подсчет итогов
  const totalIncome = orderEarnings
    .filter(e => !e.is_cancelled)
    .reduce((sum, e) => sum + e.amount, 0);
  
  const totalExpense = orderEarnings
    .filter(e => e.is_cancelled)
    .reduce((sum, e) => sum + e.amount, 0);
  
  const netTotal = totalIncome - totalExpense;

  return (
    <Card title="Детальная статистика по заказам">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Доходы"
                value={totalIncome}
                suffix="₽"
                valueStyle={{ color: '#52c41a' }}
                prefix="+"
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Расходы (отмены)"
                value={totalExpense}
                suffix="₽"
                valueStyle={{ color: '#ff4d4f' }}
                prefix="-"
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Итого"
                value={netTotal}
                suffix="₽"
                valueStyle={{ color: netTotal >= 0 ? '#52c41a' : '#ff4d4f' }}
                prefix={netTotal >= 0 ? '+' : ''}
              />
            </Card>
          </Col>
        </Row>
        
        <Table
          columns={columns}
          dataSource={orderEarnings}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Пока нет операций по заказам' }}
          className="partnerDashboardLargeTable"
        />
      </Space>
    </Card>
  );
};

type MenuItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
  component: React.ReactNode;
};

const PartnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const [selectedMenu, setSelectedMenu] = useState<string>('program');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [faqModalVisible, setFaqModalVisible] = useState(false);

  const isMobile = !screens.md;
  const isTablet = screens.md && !screens.lg;

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['partner-dashboard'],
    queryFn: () => partnersApi.getDashboard(),
    retry: false,
    retryOnMount: false,
  });

  const menuItems: MenuItem[] = data ? [
    {
      key: 'program',
      icon: <InfoCircleOutlined />,
      label: 'Партнерская программа',
      component: (
        <PartnerProgram 
          referralLink={`https://okoznaniy.ru/ref/${data.partner_info.referral_code}`}
        />
      ),
    },
    {
      key: 'map',
      icon: <EnvironmentOutlined />,
      label: 'Карта партнеров',
      component: <PartnersMap />,
    },
    {
      key: 'promo',
      icon: <FileImageOutlined />,
      label: 'Промоматериалы',
      component: <PromoMaterials />,
    },
    {
      key: 'chats',
      icon: <MessageOutlined />,
      label: 'Внутренняя коммуникация',
      component: <PartnerChatsSection />,
    },
    {
      key: 'statistics',
      icon: <DollarOutlined />,
      label: 'Статистика',
      component: (
        <div>
          <StatisticsPanel 
            data={data} 
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <OrdersStatisticsTable data={data} />
          <ReferralProgram data={data} />
        </div>
      ),
    },
    {
      key: 'referrals',
      icon: <TeamOutlined />,
      label: 'Мои рефералы',
      component: <ReferralsList data={data} />,
    },
    {
      key: 'earnings',
      icon: <FileTextOutlined />,
      label: 'История начислений',
      component: <EarningsHistory data={data} />,
    },
    {
      key: 'faq',
      icon: <QuestionCircleOutlined />,
      label: 'FAQ',
      component: null, // FAQ открывается в модальном окне
    },
  ] : [];

  const handleLogout = () => {
    Modal.confirm({
      title: 'Выход из системы',
      content: 'Вы уверены, что хотите выйти?',
      okText: 'Выйти',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          authApi.logout();
          message.success('Вы вышли из системы');
          navigate(ROUTES.admin.root);
        } catch (error) {
          authApi.logout();
          message.success('Вы вышли из системы');
          navigate(ROUTES.admin.root);
        }
      },
    });
  };

  const currentMenuItem = menuItems.find((item) => item.key === selectedMenu);

  const handleMenuClick = (key: string) => {
    if (key === 'faq') {
      setFaqModalVisible(true);
      return;
    }
    setSelectedMenu(key);
    if (isMobile) {
      setDrawerVisible(false);
    }
  };

  const renderMenu = () => (
    <Menu
      mode="inline"
      selectedKeys={[selectedMenu]}
      onClick={({ key }) => handleMenuClick(key)}
      className={`partnerDashboardMenu ${isMobile ? 'partnerDashboardMenuMobile' : 'partnerDashboardMenuDesktop'}`}
      items={menuItems.map((item) => ({
        key: item.key,
        icon: item.icon,
        label: item.label,
      }))}
    />
  );

  if (isLoading) {
    return (
      <Layout className="partnerDashboardLayout">
        <Content className="partnerDashboardCenteredContent">
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout className="partnerDashboardLayout">
        <Content className="partnerDashboardErrorContent">
          <Title level={3}>Ошибка загрузки</Title>
          <Button onClick={() => navigate('/login')}>Войти в систему</Button>
        </Content>
      </Layout>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Layout className="partnerDashboardLayout">
      {!isMobile && (
        <Sider
          width={isTablet ? 200 : 250}
          className="partnerDashboardSider"
          breakpoint="lg"
          collapsedWidth="0"
        >
          <div
            className={`partnerDashboardSiderHeader ${isTablet ? 'partnerDashboardSiderHeaderTablet' : ''}`}
          >
            <UserAddOutlined className={`partnerDashboardSiderIcon ${isTablet ? 'partnerDashboardSiderIconTablet' : ''}`} />
            <Title level={4} className={`partnerDashboardSiderTitle ${isTablet ? 'partnerDashboardSiderTitleTablet' : ''}`}>
              {isTablet ? 'ЛК партнера' : 'Партнерский кабинет'}
            </Title>
          </div>
          {renderMenu()}
        </Sider>
      )}

      
      <Drawer
        title="Меню"
        placement="left"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={280}
        className="partnerDashboardDrawer"
      >
        <div
          className="partnerDashboardDrawerHeader"
        >
          <UserAddOutlined className="partnerDashboardDrawerIcon" />
          <Title level={5} className="partnerDashboardDrawerTitle">
            ЛК партнера
          </Title>
        </div>
        {renderMenu()}
      </Drawer>

      <Layout className="partnerDashboardMainLayout">
        <Header
          className="partnerDashboardHeader"
        >
          <div className="partnerDashboardHeaderLeft">
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setDrawerVisible(true)}
              />
            )}
          </div>

          <Button
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            Выйти
          </Button>
        </Header>
        <Content
          className={`partnerDashboardContent ${isMobile ? 'partnerDashboardContentMobile' : ''}`}
        >
          {currentMenuItem?.component}
        </Content>
        <AppFooter userRole="partner" />
      </Layout>
      
      {/* FAQ Modal */}
      <PartnerFaqModal
        visible={faqModalVisible}
        onClose={() => setFaqModalVisible(false)}
        isMobile={isMobile}
      />
    </Layout>
  );
};

export default PartnerDashboard;
