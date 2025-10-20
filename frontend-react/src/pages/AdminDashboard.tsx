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
  Modal,
  Form,
  InputNumber,
  Select,
  Tabs
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
  CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { adminApi, type Partner, type PartnerEarning, type UpdatePartnerRequest } from '../api/admin';
import { disputesApi, type Dispute } from '../api/disputes';
import { authApi } from '../api/auth';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;


const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [form] = Form.useForm();


  // Получение данных партнеров
  const { data: partners, isLoading: partnersLoading } = useQuery({
    queryKey: ['admin-partners'],
    queryFn: adminApi.getPartners,
    select: (data: any) => {
      // Обрабатываем разные форматы ответа
      if (Array.isArray(data)) return data;
      if (data?.results && Array.isArray(data.results)) return data.results;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    },
  });

  // Получение начислений
  const { data: earnings, isLoading: earningsLoading } = useQuery({
    queryKey: ['admin-earnings'],
    queryFn: adminApi.getEarnings,
    select: (data: any) => {
      // Обрабатываем разные форматы ответа
      if (Array.isArray(data)) return data;
      if (data?.results && Array.isArray(data.results)) return data.results;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    },
  });

  // Получение споров
  const { data: disputes, isLoading: disputesLoading, error: disputesError } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: disputesApi.getDisputes,
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
    retry: false, // Не повторять запрос при ошибке
  });

  // Получение арбитров
  const { data: arbitrators, isLoading: arbitratorsLoading } = useQuery({
    queryKey: ['admin-arbitrators'],
    queryFn: adminApi.getArbitrators,
    select: (data: any) => {
      if (Array.isArray(data)) return data;
      if (data?.results && Array.isArray(data.results)) return data.results;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    },
  });

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
      render: (record: Dispute) => (
        <Space>
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewDispute(record)}
          >
            Подробно
          </Button>
          {!record.resolved && !record.arbitrator && (
            <Button 
              size="small" 
              type="primary"
              icon={<UserOutlined />}
              onClick={() => handleAssignArbitrator(record)}
            >
              Назначить арбитра
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const handleEditPartner = (partner: Partner) => {
    setSelectedPartner(partner);
    form.setFieldsValue(partner);
    setEditModalVisible(true);
  };

  const handleViewPartner = (partner: Partner) => {
    // Переход к детальному просмотру партнера
    navigate(`/admin/partners/${partner.id}`);
  };

  const markEarningPaidMutation = useMutation({
    mutationFn: adminApi.markEarningPaid,
    onSuccess: () => {
      message.success('Начисление отмечено как выплаченное');
      queryClient.invalidateQueries({ queryKey: ['admin-earnings'] });
    },
    onError: () => {
      message.error('Ошибка при отметке начисления');
    },
  });

  const updatePartnerMutation = useMutation({
    mutationFn: ({ partnerId, data }: { partnerId: number; data: UpdatePartnerRequest }) =>
      adminApi.updatePartner(partnerId, data),
    onSuccess: () => {
      message.success('Партнер обновлен');
      setEditModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] });
    },
    onError: () => {
      message.error('Ошибка обновления партнера');
    },
  });

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
      onOk: () => {
        authApi.logout();
        message.success('Вы вышли из системы');
        navigate('/login');
      },
    });
  };

  // Статистика
  const totalPartners = partners?.length || 0;
  const totalReferrals = partners?.reduce((sum: number, p: any) => sum + p.total_referrals, 0) || 0;
  const totalEarnings = partners?.reduce((sum: number, p: any) => sum + p.total_earnings, 0) || 0;
  const unpaidEarnings = earnings?.filter((e: any) => !e.is_paid).length || 0;
  const totalDisputes = disputes?.length || 0;
  const resolvedDisputes = disputes?.filter((d: any) => d.resolved).length || 0;
  
  const pendingDisputes = totalDisputes - resolvedDisputes;

  return (
    <div style={{ maxWidth: 1400, margin: '24px auto', padding: '0 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2}>Административная панель</Title>
            <Paragraph>
              Управление партнерами, начислениями и системой рефералов
            </Paragraph>
          </div>
          <Button 
            type="primary" 
            danger 
            onClick={handleLogout}
            icon={<UserOutlined />}
          >
            Выйти
          </Button>
        </div>
      </div>

      {/* Статистика */}
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

      {/* Статистика по спорам */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
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

      {/* Основной контент */}
      <Tabs 
        defaultActiveKey="partners"
        items={[
          {
            key: 'partners',
            label: 'Партнеры',
            children: (
              <Card title="Управление партнерами">
                <Table
                  columns={partnersColumns}
                  dataSource={partners || []}
                  rowKey="id"
                  loading={partnersLoading}
                  pagination={{ pageSize: 10 }}
                  locale={{ emptyText: 'Партнеры не найдены' }}
                />
              </Card>
            )
          },
          {
            key: 'earnings',
            label: 'Начисления',
            children: (
              <Card title="История начислений">
                <Table
                  columns={earningsColumns}
                  dataSource={earnings || []}
                  rowKey="id"
                  loading={earningsLoading}
                  pagination={{ pageSize: 10 }}
                  locale={{ emptyText: 'Начисления не найдены' }}
                />
              </Card>
            )
          },
          {
            key: 'disputes',
            label: 'Споры',
            children: (
              <Card title="Управление спорами">
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
            )
          }
        ]}
      />

      {/* Модальное окно редактирования партнера */}
      <Modal
        title="Редактировать партнера"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
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
          <Form.Item label="Статус верификации" name="is_verified" valuePropName="checked">
            <Select>
              <Select.Option value={true}>Верифицирован</Select.Option>
              <Select.Option value={false}>Не верифицирован</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
