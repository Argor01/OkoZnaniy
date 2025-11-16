import React, { useState } from 'react';
import { Layout, Menu, Button, Typography, Space, message, Modal, Card, Row, Col, Statistic, Table, Tag, Input, Spin, Alert } from 'antd';
import {
  TeamOutlined,
  DollarOutlined,
  LinkOutlined,
  UserAddOutlined,
  TrophyOutlined,
  LogoutOutlined,
  CopyOutlined,
  FileTextOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { partnersApi, type PartnerDashboardData, type Referral, type PartnerEarning } from '../api/partners';

const { Header, Sider, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;

// Компонент статистики
const StatisticsPanel: React.FC<{ data: PartnerDashboardData }> = ({ data }) => {
  const partnerInfo = data.partner_info;

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
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
            title="Общий доход"
            value={partnerInfo.total_earnings}
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
    <div>
      <Card title="Реферальная программа" style={{ marginBottom: 24 }}>
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
  const [selectedMenu, setSelectedMenu] = useState<string>('statistics');

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
          <StatisticsPanel data={data} />
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
          <UserAddOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '8px' }} />
          <Title level={4} style={{ margin: 0, fontSize: '16px' }}>
            Партнерский кабинет
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
            {currentMenuItem?.label || 'Партнерский кабинет'}
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
            borderRadius: '8px',
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          <Alert
            message="Режим тестовых данных"
            description="В данный момент используется режим тестовых данных. Все данные отображаются локально для демонстрации функционала."
            type="info"
            icon={<ExperimentOutlined />}
            showIcon
            style={{ marginBottom: 16 }}
            closable
          />
          {currentMenuItem?.component}
        </Content>
        <Footer style={{ textAlign: 'center', background: '#fff' }}>
          Партнерский кабинет © {new Date().getFullYear()}
        </Footer>
      </Layout>
    </Layout>
  );
};

export default PartnerDashboard;
