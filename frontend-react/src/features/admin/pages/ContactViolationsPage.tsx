import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Typography, 
  Tag, 
  Space, 
  Card, 
  Descriptions, 
  message,
  Input,
  Select,
  Badge
} from 'antd';
import { 
  EyeOutlined, 
  CheckOutlined, 
  CloseOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useAdminViolations } from '../hooks/useAdminViolations';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface ContactViolation {
  id: number;
  chat: {
    id: number;
    context_title?: string;
  };
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  message?: {
    id: number;
    text: string;
    created_at: string;
  };
  violation_type: string;
  detected_data: any;
  risk_level: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected' | 'resolved';
  reviewed_by?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  reviewed_at?: string;
  admin_decision?: string;
  created_at: string;
  updated_at: string;
  detected_contacts_summary: string;
}

const ContactViolationsPage: React.FC = () => {
  const [violations, setViolations] = useState<ContactViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState<ContactViolation | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [decision, setDecision] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { 
    fetchViolations, 
    approveViolation, 
    rejectViolation,
    loading: actionLoading 
  } = useAdminViolations();

  useEffect(() => {
    loadViolations();
  }, [statusFilter]);

  const loadViolations = async () => {
    setLoading(true);
    try {
      const data = await fetchViolations(statusFilter === 'all' ? undefined : statusFilter);
      setViolations(data);
    } catch (error) {
      message.error('Ошибка загрузки нарушений');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (violation: ContactViolation) => {
    setSelectedViolation(violation);
    setDetailModalVisible(true);
  };

  const handleAction = (violation: ContactViolation, type: 'approve' | 'reject') => {
    setSelectedViolation(violation);
    setActionType(type);
    setDecision('');
    setActionModalVisible(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedViolation) return;

    try {
      if (actionType === 'approve') {
        await approveViolation(selectedViolation.id, decision);
        message.success('Нарушение одобрено, чат разморожен');
      } else {
        await rejectViolation(selectedViolation.id, decision);
        message.success('Нарушение подтверждено, чат остается замороженным');
      }
      
      setActionModalVisible(false);
      loadViolations();
    } catch (error) {
      message.error('Ошибка при обработке нарушения');
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'processing';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'resolved': return 'default';
      default: return 'default';
    }
  };

  const getViolationTypeText = (type: string) => {
    const types: Record<string, string> = {
      'phone': 'Номер телефона',
      'email': 'Email адрес',
      'telegram': 'Telegram',
      'whatsapp': 'WhatsApp',
      'social': 'Социальные сети',
      'keywords': 'Подозрительные ключевые слова',
      'multiple': 'Несколько типов контактов'
    };
    return types[type] || type;
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Пользователь',
      key: 'user',
      render: (record: ContactViolation) => (
        <div>
          <div>{record.user.first_name} {record.user.last_name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            @{record.user.username}
          </Text>
        </div>
      ),
    },
    {
      title: 'Чат',
      key: 'chat',
      render: (record: ContactViolation) => (
        <div>
          <div>Чат #{record.chat.id}</div>
          {record.chat.context_title && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.chat.context_title}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Тип нарушения',
      key: 'violation_type',
      render: (record: ContactViolation) => (
        <Tag color="blue">
          {getViolationTypeText(record.violation_type)}
        </Tag>
      ),
    },
    {
      title: 'Уровень риска',
      key: 'risk_level',
      render: (record: ContactViolation) => (
        <Tag color={getRiskLevelColor(record.risk_level)}>
          {record.risk_level.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Статус',
      key: 'status',
      render: (record: ContactViolation) => (
        <Badge 
          status={getStatusColor(record.status)} 
          text={
            record.status === 'pending' ? 'Ожидает проверки' :
            record.status === 'approved' ? 'Одобрено' :
            record.status === 'rejected' ? 'Отклонено' :
            'Решено'
          }
        />
      ),
    },
    {
      title: 'Обнаружено',
      dataIndex: 'detected_contacts_summary',
      key: 'detected_contacts_summary',
      render: (text: string) => (
        <Text style={{ fontSize: '12px' }}>{text}</Text>
      ),
    },
    {
      title: 'Дата',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('ru-RU'),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (record: ContactViolation) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
            title="Подробности"
          />
          {record.status === 'pending' && (
            <>
              <Button
                type="text"
                icon={<CheckOutlined />}
                onClick={() => handleAction(record, 'approve')}
                title="Одобрить"
                style={{ color: '#52c41a' }}
              />
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => handleAction(record, 'reject')}
                title="Отклонить"
                style={{ color: '#ff4d4f' }}
              />
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 200 }}
        >
            <Option value="all">Все статусы</Option>
            <Option value="pending">Ожидают проверки</Option>
            <Option value="approved">Одобренные</Option>
            <Option value="rejected">Отклоненные</Option>
            <Option value="resolved">Решенные</Option>
          </Select>
        </div>

        <Card>
          <Table
            columns={columns}
            dataSource={violations}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Всего: ${total}`,
            }}
          />
        </Card>

        {/* Модальное окно с подробностями */}
        <Modal
          title="Подробности нарушения"
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={null}
          width={800}
        >
          {selectedViolation && (
            <div>
              <Descriptions column={2} bordered>
                <Descriptions.Item label="ID нарушения">
                  {selectedViolation.id}
                </Descriptions.Item>
                <Descriptions.Item label="Статус">
                  <Badge 
                    status={getStatusColor(selectedViolation.status)} 
                    text={
                      selectedViolation.status === 'pending' ? 'Ожидает проверки' :
                      selectedViolation.status === 'approved' ? 'Одобрено' :
                      selectedViolation.status === 'rejected' ? 'Отклонено' :
                      'Решено'
                    }
                  />
                </Descriptions.Item>
                <Descriptions.Item label="Пользователь">
                  {selectedViolation.user.first_name} {selectedViolation.user.last_name} (@{selectedViolation.user.username})
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {selectedViolation.user.email}
                </Descriptions.Item>
                <Descriptions.Item label="Чат">
                  Чат #{selectedViolation.chat.id}
                  {selectedViolation.chat.context_title && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {selectedViolation.chat.context_title}
                    </div>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Тип нарушения">
                  <Tag color="blue">
                    {getViolationTypeText(selectedViolation.violation_type)}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Уровень риска">
                  <Tag color={getRiskLevelColor(selectedViolation.risk_level)}>
                    {selectedViolation.risk_level.toUpperCase()}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Дата создания">
                  {new Date(selectedViolation.created_at).toLocaleString('ru-RU')}
                </Descriptions.Item>
              </Descriptions>

              {selectedViolation.message && (
                <div style={{ marginTop: '16px' }}>
                  <Title level={4}>Сообщение с нарушением:</Title>
                  <Card size="small">
                    <Text>{selectedViolation.message.text}</Text>
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                      {new Date(selectedViolation.message.created_at).toLocaleString('ru-RU')}
                    </div>
                  </Card>
                </div>
              )}

              <div style={{ marginTop: '16px' }}>
                <Title level={4}>Обнаруженные данные:</Title>
                <Card size="small">
                  <pre style={{ fontSize: '12px', margin: 0 }}>
                    {JSON.stringify(selectedViolation.detected_data, null, 2)}
                  </pre>
                </Card>
              </div>

              {selectedViolation.reviewed_by && (
                <div style={{ marginTop: '16px' }}>
                  <Title level={4}>Решение администратора:</Title>
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="Проверил">
                      {selectedViolation.reviewed_by.first_name} {selectedViolation.reviewed_by.last_name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Дата проверки">
                      {selectedViolation.reviewed_at && new Date(selectedViolation.reviewed_at).toLocaleString('ru-RU')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Решение">
                      {selectedViolation.admin_decision}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              )}

              {selectedViolation.status === 'pending' && (
                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                  <Space>
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => {
                        setDetailModalVisible(false);
                        handleAction(selectedViolation, 'approve');
                      }}
                    >
                      Одобрить
                    </Button>
                    <Button
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => {
                        setDetailModalVisible(false);
                        handleAction(selectedViolation, 'reject');
                      }}
                    >
                      Отклонить
                    </Button>
                  </Space>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Модальное окно действия */}
        <Modal
          title={actionType === 'approve' ? 'Одобрить нарушение' : 'Отклонить нарушение'}
          open={actionModalVisible}
          onOk={handleConfirmAction}
          onCancel={() => setActionModalVisible(false)}
          confirmLoading={actionLoading}
          okText={actionType === 'approve' ? 'Одобрить' : 'Отклонить'}
          cancelText="Отмена"
        >
          <div style={{ marginBottom: '16px' }}>
            <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: '8px' }} />
            {actionType === 'approve' 
              ? 'Вы уверены, что хотите одобрить это нарушение? Чат будет разморожен.'
              : 'Вы уверены, что хотите отклонить это нарушение? Чат останется замороженным.'
            }
          </div>
          
          <div>
            <Text strong>Комментарий к решению:</Text>
            <TextArea
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              placeholder={
                actionType === 'approve' 
                  ? 'Укажите причину одобрения...'
                  : 'Укажите причину отклонения...'
              }
              rows={3}
              style={{ marginTop: '8px' }}
            />
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ContactViolationsPage;