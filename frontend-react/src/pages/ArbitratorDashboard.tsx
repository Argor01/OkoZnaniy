import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  Typography, 
  Button, 
  Table, 
  Space, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  message,
  Descriptions,
  Divider,
  Alert
} from 'antd';
import { 
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { disputesApi, type Dispute, type ResolveDisputeRequest } from '../api/disputes';
import { authApi } from '../api/auth';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const ArbitratorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [form] = Form.useForm();

  // Получение споров для арбитра
  const { data: disputes = [], isLoading: disputesLoading } = useQuery({
    queryKey: ['arbitrator-disputes'],
    queryFn: disputesApi.getMyDisputes,
    select: (data: any) => {
      // API возвращает пагинированный ответ: {count: X, next: null, previous: null, results: Array}
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
  });


  // Мутация для решения спора
  const resolveDisputeMutation = useMutation({
    mutationFn: ({ disputeId, data }: { disputeId: number; data: ResolveDisputeRequest }) =>
      disputesApi.resolveDispute(disputeId, data),
    onSuccess: () => {
      message.success('Спор успешно решен');
      setResolveModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['arbitrator-disputes'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.error || 'Ошибка при решении спора');
    },
  });

  const columns = [
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
            icon={<FileTextOutlined />}
            onClick={() => handleViewDispute(record)}
          >
            Подробно
          </Button>
          {!record.resolved && (
            <Button 
              size="small" 
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleResolveDispute(record)}
            >
              Решить
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const handleViewDispute = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setResolveModalVisible(true);
  };

  const handleResolveDispute = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setResolveModalVisible(true);
  };

  const handleResolveSubmit = async (values: ResolveDisputeRequest) => {
    if (!selectedDispute) return;
    resolveDisputeMutation.mutate({ disputeId: selectedDispute.id, data: values });
  };

  const handleModalClose = () => {
    setResolveModalVisible(false);
    setSelectedDispute(null);
    form.resetFields();
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
  const totalDisputes = disputes.length;
  const resolvedDisputes = disputes.filter(d => d.resolved).length;
  const pendingDisputes = totalDisputes - resolvedDisputes;

  return (
    <div style={{ maxWidth: 1400, margin: '24px auto', padding: '0 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2}>Кабинет арбитра</Title>
            <Paragraph>
              Рассмотрение споров между клиентами и экспертами
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
      <div style={{ marginBottom: 24 }}>
        <Space size="large">
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                {totalDisputes}
              </div>
              <div>Всего споров</div>
            </div>
          </Card>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                {resolvedDisputes}
              </div>
              <div>Решено</div>
            </div>
          </Card>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14' }}>
                {pendingDisputes}
              </div>
              <div>В рассмотрении</div>
            </div>
          </Card>
        </Space>
      </div>

      {/* Список споров */}
      <Card title="Споры для рассмотрения">
        <Table
          columns={columns}
          dataSource={disputes}
          rowKey="id"
          loading={disputesLoading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Споры не найдены' }}
        />
      </Card>

      {/* Модальное окно для просмотра/решения спора */}
      <Modal
        title={selectedDispute?.resolved ? "Просмотр спора" : "Решение спора"}
        open={resolveModalVisible}
        onCancel={handleModalClose}
        width={800}
        footer={selectedDispute?.resolved ? [
          <Button key="close" onClick={handleModalClose}>
            Закрыть
          </Button>
        ] : [
          <Button key="cancel" onClick={handleModalClose}>
            Отмена
          </Button>,
          <Button 
            key="resolve" 
            type="primary" 
            onClick={() => form.submit()}
            loading={resolveDisputeMutation.isPending}
          >
            Решить спор
          </Button>
        ]}
      >
        {selectedDispute && (
          <div>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Заказ">
                #{selectedDispute.order.id} - {selectedDispute.order.title || 'Без названия'}
              </Descriptions.Item>
              <Descriptions.Item label="Клиент">
                {selectedDispute.order.client.username}
              </Descriptions.Item>
              <Descriptions.Item label="Эксперт">
                {selectedDispute.order.expert?.username || 'Не назначен'}
              </Descriptions.Item>
              <Descriptions.Item label="Дата создания">
                {dayjs(selectedDispute.created_at).format('DD.MM.YYYY HH:mm')}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <div style={{ marginBottom: 16 }}>
              <Title level={5}>Причина спора:</Title>
              <Alert
                message={selectedDispute.reason}
                type="warning"
                icon={<ExclamationCircleOutlined />}
                showIcon
              />
            </div>

            {selectedDispute.resolved && selectedDispute.result && (
              <div style={{ marginBottom: 16 }}>
                <Title level={5}>Решение арбитра:</Title>
                <Alert
                  message={selectedDispute.result}
                  type="success"
                  icon={<CheckCircleOutlined />}
                  showIcon
                />
              </div>
            )}

            {!selectedDispute.resolved && (
              <Form
                form={form}
                layout="vertical"
                onFinish={handleResolveSubmit}
              >
                <Form.Item
                  name="result"
                  label="Решение арбитра"
                  rules={[
                    { required: true, message: 'Укажите решение по спору' },
                    { min: 10, message: 'Решение должно содержать минимум 10 символов' }
                  ]}
                >
                  <TextArea
                    rows={4}
                    placeholder="Опишите ваше решение по спору..."
                  />
                </Form.Item>
              </Form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ArbitratorDashboard;
