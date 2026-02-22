import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Form, 
  Input, 
  InputNumber,
  Select,
  Switch,
  Modal,
  message,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Tabs,
  Tag,
  Tooltip,
  Popconfirm,
  Alert
} from 'antd';
import { 
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  SettingOutlined,
  DollarOutlined,
  PercentageOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface ServiceTariff {
  id: number;
  name: string;
  description: string;
  category: 'writing' | 'editing' | 'consultation' | 'premium';
  base_price: number;
  price_per_page: number;
  urgency_multipliers: {
    '24h': number;
    '48h': number;
    '72h': number;
    'week': number;
    'month': number;
  };
  complexity_multipliers: {
    'basic': number;
    'standard': number;
    'advanced': number;
    'expert': number;
  };
  subject_multipliers: Record<string, number>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CommissionSettings {
  id: number;
  name: string;
  type: 'percentage' | 'fixed' | 'tiered';
  value: number;
  min_amount?: number;
  max_amount?: number;
  applies_to: 'all' | 'new_users' | 'vip_users' | 'specific_category';
  category_filter?: string;
  is_active: boolean;
}

interface TariffsSettingsSectionProps {
  tariffs?: ServiceTariff[];
  commissions?: CommissionSettings[];
  loading?: boolean;
  onCreateTariff?: (tariffData: Partial<ServiceTariff>) => void;
  onUpdateTariff?: (tariffId: number, tariffData: Partial<ServiceTariff>) => void;
  onDeleteTariff?: (tariffId: number) => void;
  onCreateCommission?: (commissionData: Partial<CommissionSettings>) => void;
  onUpdateCommission?: (commissionId: number, commissionData: Partial<CommissionSettings>) => void;
  onDeleteCommission?: (commissionId: number) => void;
}

export const TariffsSettingsSection: React.FC<TariffsSettingsSectionProps> = ({
  tariffs = [],
  commissions = [],
  loading = false,
  onCreateTariff,
  onUpdateTariff,
  onDeleteTariff,
  onCreateCommission,
  onUpdateCommission,
  onDeleteCommission,
}) => {
  const [tariffModalVisible, setTariffModalVisible] = useState(false);
  const [commissionModalVisible, setCommissionModalVisible] = useState(false);
  const [editingTariff, setEditingTariff] = useState<ServiceTariff | null>(null);
  const [editingCommission, setEditingCommission] = useState<CommissionSettings | null>(null);
  const [tariffForm] = Form.useForm();
  const [commissionForm] = Form.useForm();

  
  const mockTariffs: ServiceTariff[] = [
    {
      id: 1,
      name: 'Стандартное написание работ',
      description: 'Базовый тариф для написания курсовых, рефератов, эссе',
      category: 'writing',
      base_price: 500,
      price_per_page: 300,
      urgency_multipliers: {
        '24h': 2.0,
        '48h': 1.5,
        '72h': 1.3,
        'week': 1.0,
        'month': 0.9,
      },
      complexity_multipliers: {
        'basic': 1.0,
        'standard': 1.2,
        'advanced': 1.5,
        'expert': 2.0,
      },
      subject_multipliers: {
        'mathematics': 1.3,
        'physics': 1.4,
        'chemistry': 1.3,
        'programming': 1.6,
        'law': 1.2,
        'medicine': 1.5,
        'economics': 1.1,
        'literature': 1.0,
      },
      is_active: true,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-02-01T14:30:00Z',
    },
    {
      id: 2,
      name: 'Премиум консультации',
      description: 'Индивидуальные консультации с экспертами',
      category: 'consultation',
      base_price: 1000,
      price_per_page: 0,
      urgency_multipliers: {
        '24h': 1.8,
        '48h': 1.4,
        '72h': 1.2,
        'week': 1.0,
        'month': 1.0,
      },
      complexity_multipliers: {
        'basic': 1.0,
        'standard': 1.3,
        'advanced': 1.7,
        'expert': 2.5,
      },
      subject_multipliers: {
        'programming': 2.0,
        'medicine': 1.8,
        'law': 1.6,
        'economics': 1.4,
      },
      is_active: true,
      created_at: '2024-01-20T12:00:00Z',
      updated_at: '2024-02-03T09:15:00Z',
    },
  ];

  const mockCommissions: CommissionSettings[] = [
    {
      id: 1,
      name: 'Базовая комиссия платформы',
      type: 'percentage',
      value: 15,
      applies_to: 'all',
      is_active: true,
    },
    {
      id: 2,
      name: 'Комиссия для новых пользователей',
      type: 'percentage',
      value: 10,
      applies_to: 'new_users',
      is_active: true,
    },
    {
      id: 3,
      name: 'VIP комиссия',
      type: 'percentage',
      value: 8,
      applies_to: 'vip_users',
      is_active: true,
    },
  ];

  const tariffsData = tariffs.length > 0 ? tariffs : mockTariffs;
  const commissionsData = commissions.length > 0 ? commissions : mockCommissions;

  
  const handleCreateTariff = async () => {
    try {
      const values = await tariffForm.validateFields();
      onCreateTariff?.(values);
      setTariffModalVisible(false);
      tariffForm.resetFields();
      message.success('Тариф создан');
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleUpdateTariff = async () => {
    try {
      const values = await tariffForm.validateFields();
      if (editingTariff) {
        onUpdateTariff?.(editingTariff.id, values);
        setTariffModalVisible(false);
        setEditingTariff(null);
        tariffForm.resetFields();
        message.success('Тариф обновлен');
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleEditTariff = (tariff: ServiceTariff) => {
    setEditingTariff(tariff);
    tariffForm.setFieldsValue(tariff);
    setTariffModalVisible(true);
  };

  const handleDeleteTariff = (tariffId: number) => {
    onDeleteTariff?.(tariffId);
    message.success('Тариф удален');
  };

  
  const handleCreateCommission = async () => {
    try {
      const values = await commissionForm.validateFields();
      onCreateCommission?.(values);
      setCommissionModalVisible(false);
      commissionForm.resetFields();
      message.success('Комиссия создана');
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleUpdateCommission = async () => {
    try {
      const values = await commissionForm.validateFields();
      if (editingCommission) {
        onUpdateCommission?.(editingCommission.id, values);
        setCommissionModalVisible(false);
        setEditingCommission(null);
        commissionForm.resetFields();
        message.success('Комиссия обновлена');
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleEditCommission = (commission: CommissionSettings) => {
    setEditingCommission(commission);
    commissionForm.setFieldsValue(commission);
    setCommissionModalVisible(true);
  };

  const handleDeleteCommission = (commissionId: number) => {
    onDeleteCommission?.(commissionId);
    message.success('Комиссия удалена');
  };

  
  const getCategoryColor = (category: string) => {
    const colors = {
      writing: 'blue',
      editing: 'green',
      consultation: 'orange',
      premium: 'purple',
    };
    return colors[category as keyof typeof colors] || 'gray';
  };

  const getCategoryText = (category: string) => {
    const texts = {
      writing: 'Написание работ',
      editing: 'Редактирование',
      consultation: 'Консультации',
      premium: 'Премиум услуги',
    };
    return texts[category as keyof typeof texts] || 'Другое';
  };

  const getCommissionTypeText = (type: string) => {
    const texts = {
      percentage: 'Процент',
      fixed: 'Фиксированная',
      tiered: 'Ступенчатая',
    };
    return texts[type as keyof typeof texts] || 'Неизвестно';
  };

  const getAppliesToText = (appliesTo: string) => {
    const texts = {
      all: 'Все пользователи',
      new_users: 'Новые пользователи',
      vip_users: 'VIP пользователи',
      specific_category: 'Определенная категория',
    };
    return texts[appliesTo as keyof typeof texts] || 'Неизвестно';
  };

  
  const tariffColumns = [
    {
      title: 'Название',
      key: 'name',
      render: (record: ServiceTariff) => (
        <div>
          <div className="tariffsSettingsTariffName">{record.name}</div>
          <Text type="secondary" className="tariffsSettingsTariffDescription">
            {record.description}
          </Text>
        </div>
      ),
      width: 250,
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag color={getCategoryColor(category)}>
          {getCategoryText(category)}
        </Tag>
      ),
      width: 150,
    },
    {
      title: 'Базовая цена',
      dataIndex: 'base_price',
      key: 'base_price',
      render: (price: number) => `${price.toLocaleString()} ₽`,
      width: 120,
    },
    {
      title: 'Цена за страницу',
      dataIndex: 'price_per_page',
      key: 'price_per_page',
      render: (price: number) => price > 0 ? `${price.toLocaleString()} ₽` : '—',
      width: 130,
    },
    {
      title: 'Множители срочности',
      key: 'urgency',
      render: (record: ServiceTariff) => (
        <div>
          <div className="tariffsSettingsUrgencyText">24ч: ×{record.urgency_multipliers['24h']}</div>
          <div className="tariffsSettingsUrgencyText">Неделя: ×{record.urgency_multipliers.week}</div>
        </div>
      ),
      width: 120,
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Активен' : 'Неактивен'}
        </Tag>
      ),
      width: 100,
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (record: ServiceTariff) => (
        <Space>
          <Button 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEditTariff(record)}
          />
          <Popconfirm
            title="Удалить тариф?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDeleteTariff(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button 
              size="small" 
              danger 
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
      width: 100,
      fixed: 'right' as const,
    },
  ];

  
  const commissionColumns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => getCommissionTypeText(type),
      width: 120,
    },
    {
      title: 'Значение',
      key: 'value',
      render: (record: CommissionSettings) => (
        record.type === 'percentage' ? `${record.value}%` : `${record.value} ₽`
      ),
      width: 100,
    },
    {
      title: 'Применяется к',
      dataIndex: 'applies_to',
      key: 'applies_to',
      render: (appliesTo: string) => getAppliesToText(appliesTo),
      width: 150,
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Активна' : 'Неактивна'}
        </Tag>
      ),
      width: 100,
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (record: CommissionSettings) => (
        <Space>
          <Button 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEditCommission(record)}
          />
          <Popconfirm
            title="Удалить комиссию?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDeleteCommission(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button 
              size="small" 
              danger 
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
      width: 100,
      fixed: 'right' as const,
    },
  ];

  return (
    <div>
      <Alert
        message="Настройки тарифов и цен"
        description="Здесь вы можете управлять тарифами на услуги и настройками комиссий платформы. Изменения влияют на расчет стоимости заказов."
        type="info"
        showIcon
        className="tariffsSettingsAlert"
      />

      <Tabs defaultActiveKey="tariffs">
        <TabPane tab="Тарифы услуг" key="tariffs">
          <Card
            title={
              <div className="tariffsSettingsCardHeader">
                <span>Тарифы услуг</span>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingTariff(null);
                    tariffForm.resetFields();
                    setTariffModalVisible(true);
                  }}
                >
                  Создать тариф
                </Button>
              </div>
            }
          >
            <Table
              columns={tariffColumns}
              dataSource={tariffsData}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} из ${total} тарифов`,
              }}
              scroll={{ x: 1000 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="Комиссии" key="commissions">
          <Card
            title={
              <div className="tariffsSettingsCardHeader">
                <span>Настройки комиссий</span>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingCommission(null);
                    commissionForm.resetFields();
                    setCommissionModalVisible(true);
                  }}
                >
                  Создать комиссию
                </Button>
              </div>
            }
          >
            <Table
              columns={commissionColumns}
              dataSource={commissionsData}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} из ${total} комиссий`,
              }}
            />
          </Card>
        </TabPane>
      </Tabs>

      
      <Modal
        title={editingTariff ? 'Редактировать тариф' : 'Создать тариф'}
        open={tariffModalVisible}
        onOk={editingTariff ? handleUpdateTariff : handleCreateTariff}
        onCancel={() => {
          setTariffModalVisible(false);
          setEditingTariff(null);
          tariffForm.resetFields();
        }}
        okText={editingTariff ? 'Обновить' : 'Создать'}
        cancelText="Отмена"
        width={800}
      >
        <Form form={tariffForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Название тарифа"
                rules={[{ required: true, message: 'Введите название тарифа' }]}
              >
                <Input placeholder="Например: Стандартное написание работ" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Категория"
                rules={[{ required: true, message: 'Выберите категорию' }]}
              >
                <Select placeholder="Выберите категорию">
                  <Option value="writing">Написание работ</Option>
                  <Option value="editing">Редактирование</Option>
                  <Option value="consultation">Консультации</Option>
                  <Option value="premium">Премиум услуги</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Краткое описание тарифа"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="base_price"
                label="Базовая цена (₽)"
                rules={[{ required: true, message: 'Введите базовую цену' }]}
              >
                <InputNumber 
                  min={0} 
                  className="tariffsSettingsNumberInput"
                  placeholder="500"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="price_per_page"
                label="Цена за страницу (₽)"
              >
                <InputNumber 
                  min={0} 
                  className="tariffsSettingsNumberInput"
                  placeholder="300"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Множители срочности</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name={['urgency_multipliers', '24h']}
                label="24 часа"
              >
                <InputNumber 
                  min={1} 
                  step={0.1}
                  className="tariffsSettingsNumberInput"
                  placeholder="2.0"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['urgency_multipliers', '48h']}
                label="48 часов"
              >
                <InputNumber 
                  min={1} 
                  step={0.1}
                  className="tariffsSettingsNumberInput"
                  placeholder="1.5"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['urgency_multipliers', 'week']}
                label="Неделя"
              >
                <InputNumber 
                  min={0.1} 
                  step={0.1}
                  className="tariffsSettingsNumberInput"
                  placeholder="1.0"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="is_active"
            label="Статус"
            valuePropName="checked"
          >
            <Switch checkedChildren="Активен" unCheckedChildren="Неактивен" />
          </Form.Item>
        </Form>
      </Modal>

      
      <Modal
        title={editingCommission ? 'Редактировать комиссию' : 'Создать комиссию'}
        open={commissionModalVisible}
        onOk={editingCommission ? handleUpdateCommission : handleCreateCommission}
        onCancel={() => {
          setCommissionModalVisible(false);
          setEditingCommission(null);
          commissionForm.resetFields();
        }}
        okText={editingCommission ? 'Обновить' : 'Создать'}
        cancelText="Отмена"
        width={600}
      >
        <Form form={commissionForm} layout="vertical">
          <Form.Item
            name="name"
            label="Название комиссии"
            rules={[{ required: true, message: 'Введите название комиссии' }]}
          >
            <Input placeholder="Например: Базовая комиссия платформы" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Тип комиссии"
                rules={[{ required: true, message: 'Выберите тип комиссии' }]}
              >
                <Select placeholder="Выберите тип">
                  <Option value="percentage">Процент</Option>
                  <Option value="fixed">Фиксированная сумма</Option>
                  <Option value="tiered">Ступенчатая</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="value"
                label="Значение"
                rules={[{ required: true, message: 'Введите значение' }]}
              >
                <InputNumber 
                  min={0} 
                  className="tariffsSettingsNumberInput"
                  placeholder="15"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="applies_to"
            label="Применяется к"
            rules={[{ required: true, message: 'Выберите к кому применяется' }]}
          >
            <Select placeholder="Выберите группу пользователей">
              <Option value="all">Все пользователи</Option>
              <Option value="new_users">Новые пользователи</Option>
              <Option value="vip_users">VIP пользователи</Option>
              <Option value="specific_category">Определенная категория</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Статус"
            valuePropName="checked"
          >
            <Switch checkedChildren="Активна" unCheckedChildren="Неактивна" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
