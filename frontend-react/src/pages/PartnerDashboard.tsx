import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
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
  Modal
} from 'antd';
import { 
  CopyOutlined, 
  LinkOutlined, 
  UserAddOutlined, 
  DollarOutlined,
  TeamOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { partnersApi } from '../api/partners';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const PartnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['partner-dashboard'],
    queryFn: () => partnersApi.getDashboard(),
  });

  const generateLinkMutation = useMutation({
    mutationFn: () => partnersApi.generateReferralLink(),
    onSuccess: (response) => {
      setGeneratedLink(response.referral_link);
      setLinkModalVisible(true);
      queryClient.invalidateQueries({ queryKey: ['partner-dashboard'] });
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

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Title level={3}>Загрузка...</Title>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Title level={3}>Ошибка загрузки</Title>
        <Button onClick={() => navigate('/login')}>Войти в систему</Button>
      </div>
    );
  }

  const partnerInfo = data?.partner_info;
  const referrals = data?.referrals || [];
  const earnings = data?.recent_earnings || [];

  const referralsColumns = [
    {
      title: 'Пользователь',
      dataIndex: 'username',
      key: 'username',
      render: (username: string, record: any) => (
        <div>
          <div><strong>{username}</strong></div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.email}</div>
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
    },
    {
      title: 'Дата регистрации',
      dataIndex: 'date_joined',
      key: 'date_joined',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
  ];

  const earningsColumns = [
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `${amount} ₽`,
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
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '24px auto', padding: '0 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>Партнерский кабинет</Title>
        <Paragraph>
          Приглашайте новых пользователей и получайте процент с их активности
        </Paragraph>
      </div>

      {/* Статистика */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Всего рефералов"
              value={partnerInfo?.total_referrals || 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Активных рефералов"
              value={partnerInfo?.active_referrals || 0}
              prefix={<UserAddOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Общий доход"
              value={partnerInfo?.total_earnings || 0}
              suffix="₽"
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Процент комиссии"
              value={partnerInfo?.commission_rate || 0}
              suffix="%"
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Реферальная ссылка */}
      <Card title="Реферальная ссылка" style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>Ваш реферальный код: </Text>
            <Tag color="blue" style={{ fontSize: '14px' }}>
              {partnerInfo?.referral_code}
            </Tag>
          </div>
          <Button
            type="primary"
            icon={<LinkOutlined />}
            onClick={() => generateLinkMutation.mutate()}
            loading={generateLinkMutation.isPending}
          >
            Сгенерировать ссылку
          </Button>
          <Text type="secondary">
            Поделитесь реферальной ссылкой с друзьями и получайте {partnerInfo?.commission_rate}% 
            с каждого их заказа
          </Text>
        </Space>
      </Card>

      {/* Список рефералов */}
      <Card title="Мои рефералы" style={{ marginBottom: 24 }}>
        <Table
          columns={referralsColumns}
          dataSource={referrals}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Пока нет рефералов' }}
        />
      </Card>

      {/* Последние доходы */}
      <Card title="Последние начисления">
        <Table
          columns={earningsColumns}
          dataSource={earnings}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Пока нет начислений' }}
        />
      </Card>

      {/* Модальное окно с ссылкой */}
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
        <Space direction="vertical" style={{ width: '100%' }}>
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

export default PartnerDashboard;
