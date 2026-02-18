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
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { partnersApi, type PartnerDashboardData, type Referral, type PartnerEarning } from '../api/partners';

const { Header, Sider, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

// Компонент статистики
const StatisticsPanel: React.FC<{ 
  data: PartnerDashboardData;
  dateRange: [Dayjs, Dayjs] | null;
  onDateRangeChange: (dates: [Dayjs, Dayjs] | null) => void;
}> = ({ data, dateRange, onDateRangeChange }) => {
  const partnerInfo = data.partner_info;

  // Фильтруем данные по выбранному периоду
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

  // Предустановленные периоды
  const rangePresets = [
    { label: 'Последние 7 дней', value: [dayjs().subtract(7, 'day'), dayjs()] as [Dayjs, Dayjs] },
    { label: 'Последние 30 дней', value: [dayjs().subtract(30, 'day'), dayjs()] as [Dayjs, Dayjs] },
    { label: 'Этот месяц', value: [dayjs().startOf('month'), dayjs()] as [Dayjs, Dayjs] },
    { label: 'Прошлый месяц', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] as [Dayjs, Dayjs] },
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      <Card style={{ marginBottom: 20 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <Title level={4} style={{ margin: 0 }}>
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
            style={{ width: '100%', maxWidth: 400 }}
            presets={rangePresets}
          />
          {dateRange && (
            <Text type="secondary">
              Показаны данные за период: {dateRange[0].format('DD.MM.YYYY')} - {dateRange[1].format('DD.MM.YYYY')}
            </Text>
          )}
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 0 }}>
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

// Компонент реферальной программы
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
    <div style={{ marginTop: 20 }}>
      <Card title="Реферальная программа" style={{ marginBottom: 0 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>Ваш реферальный код: </Text>
            <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
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
        maskStyle={{
          backdropFilter: 'blur(4px)',
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Text>Поделитесь этой ссылкой для привлечения новых пользователей:</Text>
          <Input.TextArea
            value={generatedLink}
            readOnly
            rows={3}
            style={{ fontFamily: 'monospace' }}
          />
          <Text type="secondary">
            Когда пользователь зарегистрируется по этой ссылке, он автоматически станет вашим рефералом
          </Text>
        </Space>
      </Modal>
    </div>
  );
};

// Компонент списка рефералов
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
          <div style={{ fontSize: '14px', color: '#666' }}>{record.email}</div>
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
        style={{ fontSize: '16px' }}
        className="large-table"
      />
      <style>{`
        .large-table .ant-table {
          font-size: 16px;
        }
        .large-table .ant-table-thead > tr > th {
          font-size: 16px;
          font-weight: 600;
        }
        .large-table .ant-table-tbody > tr > td {
          font-size: 16px;
        }
        .large-table .ant-tag {
          font-size: 14px;
        }
      `}</style>
    </Card>
  );
};

// Компонент истории начислений
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
        style={{ fontSize: '16px' }}
        className="large-table"
      />
      <style>{`
        .large-table .ant-table {
          font-size: 16px;
        }
        .large-table .ant-table-thead > tr > th {
          font-size: 16px;
          font-weight: 600;
        }
        .large-table .ant-table-tbody > tr > td {
          font-size: 16px;
        }
        .large-table .ant-tag {
          font-size: 14px;
        }
      `}</style>
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
  const [selectedMenu, setSelectedMenu] = useState<string>('statistics');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

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
  ] : [];

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
          navigate('/administrator');
        } catch (error) {
          authApi.logout();
          message.success('Вы вышли из системы');
          navigate('/administrator');
        }
      },
    });
  };

  const currentMenuItem = menuItems.find((item) => item.key === selectedMenu);

  const handleMenuClick = (key: string) => {
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
      style={{
        borderRight: 0,
        height: isMobile ? 'auto' : 'calc(100vh - 120px)',
      }}
      items={menuItems.map((item) => ({
        key: item.key,
        icon: item.icon,
        label: item.label,
      }))}
    />
  );

  if (isLoading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: '50px', textAlign: 'center' }}>
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
            <UserAddOutlined style={{ fontSize: isTablet ? '28px' : '32px', color: '#1890ff', marginBottom: '8px' }} />
            <Title level={4} style={{ margin: 0, fontSize: isTablet ? '14px' : '16px' }}>
              {isTablet ? 'ЛК партнера' : 'Партнерский кабинет'}
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
          <UserAddOutlined style={{ fontSize: '28px', color: '#1890ff', marginBottom: '8px' }} />
          <Title level={5} style={{ margin: 0 }}>
            ЛК партнера
          </Title>
        </div>
        {renderMenu()}
      </Drawer>

      <Layout style={{ background: '#f0f2f5' }}>
        <Header
          style={{
            background: '#fff',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setDrawerVisible(true)}
              />
            )}
            <Title level={4} style={{ margin: 0 }}>
              Партнерский кабинет
            </Title>
          </div>

          <Button
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            Выйти
          </Button>
        </Header>
        <Content
          style={{
            margin: isMobile ? '12px' : '16px',
            padding: isMobile ? '16px' : '20px',
            background: '#fff',
            borderRadius: '8px',
            minHeight: 'calc(100vh - 64px)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          {currentMenuItem?.component}
        </Content>
        {!isMobile && (
          <Footer style={{ textAlign: 'center', background: '#fff', padding: isTablet ? '12px' : '24px' }}>
            Партнерский кабинет © {new Date().getFullYear()}
          </Footer>
        )}
      </Layout>
    </Layout>
  );
};

export default PartnerDashboard;
